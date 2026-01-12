
export const APP_NAME = "AutoVision AI";

export type UIScheme = 'white' | 'grey' | 'black' | 'red' | 'green';

export const THEME_SCHEMES: Record<UIScheme, { primary: string; dark: string; card: string; text: string }> = {
  grey: { primary: "#2563eb", dark: "#f1f5f9", card: "#FFFFFF", text: "#0f172a" },
  white: { primary: "#d946ef", dark: "#faf5ff", card: "#FFFFFF", text: "#4c1d95" },
  black: { primary: "#3b82f6", dark: "#020617", card: "#0f172a", text: "#f8fafc" },
  red: { primary: "#dc2626", dark: "#fef2f2", card: "#FFFFFF", text: "#7f1d1d" },
  green: { primary: "#16a34a", dark: "#f0fdf4", card: "#FFFFFF", text: "#14532d" }
};

export const TRANSLATIONS = {
  de: {
    navOptimizer: "KI-Optimierer",
    navGuide: "Richtig Fotografieren",
    heroTitle: "Automatische Hintergrund Optimierung",
    heroDesc: "Optimieren Sie Ihren Fahrzeugbestand in Sekunden. Unveränderte Autos auf Ihrem Corporate-Background.",
    uploadBtn: "Bilder hochladen",
    settingsTitle: "Einstellungen",
    brandingTitle: "Corporate Identity",
    logoPos: "Logo Position",
    logoLeft: "Links",
    logoRight: "Rechts",
    showroomTitle: "Showroom Standard",
    bgBtn: "Hintergrund Ändern",
    statusActive: "Fahrzeug-Schutz aktiv",
    statusFidelity: "Farbtreue garantiert",
    integrityNote: "Das Fahrzeug wird pixelgenau erhalten. Keine AI-Retusche.",
    startBtn: "Batch Starten",
    runningBtn: "Wird verarbeitet...",
    zipBtn: "ZIP Paket",
    previewTitle: "Vorschau (Bild 1)",
    schemeTitle: "UI Farbschema",
    langTitle: "Sprache",
    schemeNames: { white: "Vivid Pink", grey: "Pro Blue", black: "Deep Night", red: "Power Red", green: "Safe Green" },
    guideTitle: "Profi-Fotografie Leitfaden",
    guideSub: "Standardisierte Ansichten für maximalen Verkaufserfolg",
    perspectiveToggle: "Original-Perspektive beibehalten",
    perspectiveNote: "Deaktiviert: Nur Standard-Verkaufsansichten erlaubt.",
    logoError: "Logo-Integration fehlgeschlagen oder unmöglich.",
    errorQuota: "API-Limit überschritten. Bitte kurz warten oder Plan prüfen.",
    errorGeneral: "Ein Fehler ist aufgetreten. Bitte erneut versuchen."
  },
  en: {
    navOptimizer: "AI Optimizer",
    navGuide: "Photo Guide",
    heroTitle: "Automatic Background Optimization",
    heroDesc: "Optimize your vehicle inventory in seconds. Unchanged cars on your corporate background.",
    uploadBtn: "Upload Images",
    settingsTitle: "Settings",
    brandingTitle: "Corporate Identity",
    logoPos: "Logo Position",
    logoLeft: "Left",
    logoRight: "Right",
    showroomTitle: "Showroom Standard",
    bgBtn: "Change Background",
    statusActive: "Vehicle Protection Active",
    statusFidelity: "Color Fidelity Guaranteed",
    integrityNote: "The vehicle is preserved pixel-perfect. No AI retouching.",
    startBtn: "Start Batch",
    runningBtn: "Processing...",
    zipBtn: "ZIP Package",
    previewTitle: "Preview (Image 1)",
    schemeTitle: "UI Color Scheme",
    langTitle: "Language",
    schemeNames: { white: "Vivid Pink", grey: "Pro Blue", black: "Deep Night", red: "Power Red", green: "Safe Green" },
    guideTitle: "Professional Photo Guide",
    guideSub: "Standardized views for maximum sales success",
    perspectiveToggle: "Keep original perspective",
    perspectiveNote: "Disabled: Only standard sales views allowed.",
    logoError: "Logo integration failed or impossible.",
    errorQuota: "API quota exceeded. Please wait a moment or check your plan.",
    errorGeneral: "An error occurred. Please try again."
  }
};

/**
 * VERBINDLICHE REGELN – NICHT INTERPRETIEREN
 * Strikte Systemvorgaben für die Bildverarbeitung.
 */
export const VEHICLE_PROTECTION_PROMPT = `
VERBINDLICHE REGELN – NICHT INTERPRETIEREN:

1. GEOMETRY LOCK & SUBJECT INTEGRITY:
   - 1:1 perspective lock.
   - Maintain original camera angle.
   - Exact pixel-wise geometry preservation.
   - Zero deformation.
   - No re-framing.
   - Fixed focal length.
   - Absolute subject integrity.
   - Static object coordinates.
   - Das Fahrzeug darf in keiner Weise verändert werden (Form, Proportionen, Farbe, Details).

2. STRENGSTES VERBOT (STRICT NEGATIVE PROMPT):
   - NO perspective change, NO rotation, NO re-centering.
   - NO angle normalization, NO distortion, NO morphing.
   - NO scaling, NO warping, NO camera move.
   - NO focal length shift, NO image correction.
   - NO car modification, NO vertical alignment.
   - NO change car shape, NO deform vehicle, NO distorted wheels.
   - NO body kit, NO change car model, NO warped lines.
   - NO stretching, NO skewing, NO modified chassis.
   - NO change wheels, NO distorted grill, NO change headlights.

3. KENNZEICHEN-BEHANDLUNG (DATENSCHUTZ):
   - Das Nummernschild (License Plate) MUSS zwingend und vollständig mit einer soliden, tiefschwarzen Fläche überdeckt werden (Black-out).
   - Es dürfen KEINE Buchstaben, Zahlen, Symbole oder Logos sichtbar sein. Nur reine schwarze Fläche.

4. HINTERGRUND-AUSTAUSCH:
   - Nur Alpha-Freistellung des Fahrzeugs ist erlaubt.
   - Keine Rekonstruktion von Boden, künstlichen Schatten oder Tiefe.
   - Das Fahrzeug muss exakt dort "stehen", wo es im Original steht.

5. LAYOUT-CONSTRAINTS:
   - Vehicle coverage: 75–85 % of image area.
   - Bottom margin: minimum 100 pixels.
   - Keep original aspect ratio of the vehicle.

6. FAIL-SAFE:
   - Falls eine Perspektivänderung technisch erforderlich erscheint: VORGANG ABBRECHEN. Kein alternatives Bild erzeugen.

7. AUSGABE:
   - 16:9 Format, 1920x1080 Pixel.
`;

export const CORPORATE_SHOWROOM_DESCRIPTION = "High-end minimalist automotive showroom with a light grey textured concrete wall. Dark polished charcoal concrete floor with realistic reflections.";
