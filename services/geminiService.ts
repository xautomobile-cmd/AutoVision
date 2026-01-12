
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysis } from "../types";
import { VEHICLE_PROTECTION_PROMPT } from "../constants";

// Define a type for the return value of generateShowroomImage to ensure consistency
type ShowroomImageResult = { 
  image: string | null; 
  feedback?: string; 
  errorType?: 'QUOTA' | 'GENERIC' | 'READ' 
};

export class GeminiService {
  private getAI() {
    // API key must be obtained exclusively from process.env.API_KEY
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("AutoVision AI: API_KEY not found in environment variables.");
    }
    return new GoogleGenAI({ apiKey: apiKey || "" });
  }

  private async resizeImage(base64: string, maxDimension: number = 1024): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resized = canvas.toDataURL('image/jpeg', 0.85);
          resolve(resized.split(',')[1]);
        } else {
          resolve(base64);
        }
      };
      img.onerror = () => resolve(base64);
      img.src = `data:image/jpeg;base64,${base64}`;
    });
  }

  /**
   * Helper to perform exponential backoff on 429 errors.
   */
  private async withRetry<T>(fn: () => Promise<T>, maxRetries = 2, initialDelay = 2000): Promise<T> {
    let lastError: any;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const errorStr = JSON.stringify(error);
        const isQuotaError = error?.status === 429 || 
                            errorStr.includes("429") || 
                            errorStr.includes("RESOURCE_EXHAUSTED") || 
                            errorStr.includes("quota");

        if (isQuotaError && i < maxRetries) {
          const delay = initialDelay * Math.pow(2, i);
          console.warn(`AutoVision AI: Quota exceeded. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  async generateShowroomImage(
    carBase64: string, 
    backgroundDescription: string, 
    customBackgroundBase64?: string | null,
    keepOriginalPerspective: boolean = true
  ): Promise<ShowroomImageResult> {
    // Fix: Explicitly type withRetry to avoid inference issues with the error union
    return this.withRetry<ShowroomImageResult>(async () => {
      const ai = this.getAI();
      try {
        const resizedCar = await this.resizeImage(carBase64, 1024);
        
        const parts: any[] = [
          {
            inlineData: {
              data: resizedCar,
              mimeType: 'image/jpeg',
            },
          }
        ];

        let taskInstruction = VEHICLE_PROTECTION_PROMPT;
        const bgPart = customBackgroundBase64 ? "dem bereitgestellten Hintergrundbild" : backgroundDescription;

        taskInstruction += `\n\nAUSFÜHRUNGSANWEISUNG:
1. Extrahiere das Fahrzeug aus Bild 1 (Alpha-Kanal).
2. Platziere es auf ${bgPart}.
3. Wende den 1:1 Perspective Lock an. Keine Änderung von Kamera-Winkel oder Position.
4. Überdecke das Kennzeichen mit einer soliden schwarzen Fläche.
5. Halte die Pixel-Integrität des Autos zu 100% ein.`;

        if (customBackgroundBase64) {
          const resizedBG = await this.resizeImage(customBackgroundBase64, 1024);
          parts.push({
            inlineData: {
              data: resizedBG,
              mimeType: 'image/jpeg',
            }
          });
        }

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [...parts, { text: taskInstruction }],
          },
          config: {
            imageConfig: {
              aspectRatio: "16:9"
            }
          }
        });

        let resultImage: string | null = null;
        let feedback: string | undefined;

        // Correctly iterate through parts to find image and text components
        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              resultImage = `data:image/png;base64,${part.inlineData.data}`;
            } else if (part.text) {
              feedback = part.text;
            }
          }
        }

        return { image: resultImage, feedback };
      } catch (error: any) {
        console.error("Gemini Image Generation Error:", error);
        const errorStr = JSON.stringify(error);
        
        // Handle specific image processing errors
        if (error.message?.includes("Unable to process input image")) {
          return { image: null, errorType: 'READ' as const };
        }
        
        // Rethrow quota errors to trigger withRetry logic
        if (error?.status === 429 || errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED")) {
          throw error;
        }

        return { image: null, errorType: 'GENERIC' as const };
      }
    }).catch(err => {
      // Catch final failures after all retries
      const errorStr = JSON.stringify(err);
      if (err?.status === 429 || errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED")) {
        return { image: null, errorType: 'QUOTA' as const };
      }
      return { image: null, errorType: 'GENERIC' as const };
    });
  }

  async analyzeVehicleImage(base64Image: string): Promise<GeminiAnalysis> {
    const ai = this.getAI();
    try {
      const resized = await this.resizeImage(base64Image, 1024);
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: resized } },
            { text: "Analysiere dieses Fahrzeugfoto hinsichtlich Perspektive und Integrität. Listet Details auf." }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              carModel: { type: Type.STRING },
              color: { type: Type.STRING },
              lightingQuality: { type: Type.STRING },
              issues: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["carModel", "lightingQuality", "issues", "suggestions"]
          }
        }
      });
      // Correct: .text is a property, not a method
      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Analysis error:", error);
      return { carModel: "Error", lightingQuality: "Unknown", issues: [], suggestions: [] };
    }
  }
}

export const geminiService = new GeminiService();
