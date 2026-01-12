
export interface ProcessingState {
  isProcessing: boolean;
  preview: string | null;
  result: string | null;
  error: string | null;
}

/**
 * Interface for the vehicle analysis results from Gemini.
 */
export interface GeminiAnalysis {
  carModel: string;
  color?: string;
  lightingQuality: string;
  issues: string[];
  suggestions: string[];
}

/**
 * Interface for segmentation results.
 */
export interface SegmentationResult {
  mask: string;
  confidence: number;
}
