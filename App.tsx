
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  RefreshCcw, 
  Zap, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  Trash2, 
  ArrowRight, 
  Menu, 
  Loader2, 
  Archive, 
  Camera, 
  Box, 
  FileCheck, 
  Settings2, 
  Image as ImageIcon, 
  X, 
  LayoutTemplate, 
  AlignLeft, 
  AlignRight, 
  Languages, 
  Palette, 
  Info, 
  Check, 
  ShieldCheck, 
  ListOrdered, 
  Smartphone, 
  Eye, 
  Activity, 
  User, 
  ClipboardCheck, 
  Key, 
  ThumbsUp, 
  AlertTriangle,
  Monitor,
  Wrench,
  Search,
  CreditCard,
  RotateCcw,
  Car,
  Gauge,
  FileText
} from 'lucide-react';
import { geminiService } from './services/geminiService';
import CompareSlider from './components/CompareSlider';
import { TRANSLATIONS, THEME_SCHEMES, CORPORATE_SHOWROOM_DESCRIPTION, APP_NAME, UIScheme } from './constants';

// JSZip import via esm.sh
import JSZip from 'https://esm.sh/jszip';

interface BatchItem {
  id: string;
  file: File;
  preview: string;
  result: string | null;
  status: 'idle' | 'processing' | 'completed' | 'error';
  error?: string;
  feedback?: string;
}

const App: React.FC = () => {
  // State initialization with LocalStorage recovery
  const [items, setItems] = useState<BatchItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'optimizer' | 'guide'>('optimizer');
  
  // Persistent Settings
  const [language, setLanguage] = useState<'de' | 'en'>(() => (localStorage.getItem('av_lang') as 'de' | 'en') || 'de');
  const [uiScheme, setUiScheme] = useState<UIScheme>(() => (localStorage.getItem('av_scheme') as UIScheme) || 'grey');
  const [customLogo, setCustomLogo] = useState<string | null>(() => localStorage.getItem('av_logo'));
  const [logoPosition, setLogoPosition] = useState<'left' | 'right'>(() => (localStorage.getItem('av_logo_pos') as 'left' | 'right') || 'left'); 
  const [customBackground, setCustomBackground] = useState<string | null>(() => localStorage.getItem('av_bg'));
  const [keepOriginalPerspective, setKeepOriginalPerspective] = useState<boolean>(() => localStorage.getItem('av_perspective') !== 'false');

  // Persistence Sync
  useEffect(() => { localStorage.setItem('av_lang', language); }, [language]);
  useEffect(() => { localStorage.setItem('av_scheme', uiScheme); }, [uiScheme]);
  useEffect(() => { if (customLogo) localStorage.setItem('av_logo', customLogo); else localStorage.removeItem('av_logo'); }, [customLogo]);
  useEffect(() => { localStorage.setItem('av_logo_pos', logoPosition); }, [logoPosition]);
  useEffect(() => { if (customBackground) localStorage.setItem('av_bg', customBackground); else localStorage.removeItem('av_bg'); }, [customBackground]);
  useEffect(() => { localStorage.setItem('av_perspective', String(keepOriginalPerspective)); }, [keepOriginalPerspective]);

  const t = TRANSLATIONS[language];
  const theme = THEME_SCHEMES[uiScheme];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const incomingFiles = Array.from(files);
    if (items.length + incomingFiles.length > 10) {
      setGlobalError(language === 'de' ? "Maximal 10 Bilder gleichzeitig möglich." : "Maximum 10 images at once.");
      return;
    }
    setGlobalError(null);
    const newItems: BatchItem[] = incomingFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      result: null,
      status: 'idle'
    }));
    setItems(prev => [...prev, ...newItems]);
    setActiveTab('optimizer');
  };

  const handleBrandingUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'bg') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (type === 'logo') setCustomLogo(base64);
      else setCustomBackground(base64.split(',')[1]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const bakeWatermarkIntoImage = async (base64Img: string, logoUrl: string, position: 'left' | 'right'): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const logo = new Image();

      img.onload = () => {
        canvas.width = 1920;
        canvas.height = 1080;
        if (ctx) ctx.drawImage(img, 0, 0, 1920, 1080);
        if (logoUrl) {
          logo.onload = () => {
            const logoWidth = canvas.width * 0.15;
            const logoHeight = (logo.height / logo.width) * logoWidth;
            const padding = canvas.width * 0.04;
            const x = position === 'left' ? padding : canvas.width - logoWidth - padding;
            const y = padding;
            if (ctx) {
              ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
              ctx.shadowBlur = 10;
              ctx.drawImage(logo, x, y, logoWidth, logoHeight);
            }
            resolve(canvas.toDataURL('image/png'));
          };
          logo.src = logoUrl;
        } else {
          resolve(canvas.toDataURL('image/png'));
        }
      };
      img.src = base64Img;
    });
  };

  const processBatch = async () => {
    if (items.length === 0) return;
    setIsProcessingBatch(true);
    setGlobalError(null);
    for (let i = 0; i < items.length; i++) {
      const currentItem = items[i];
      if (currentItem.status === 'completed') continue;
      setItems(prev => prev.map(item => item.id === currentItem.id ? { ...item, status: 'processing' } : item));
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(currentItem.file);
        });
        const carBase64 = await base64Promise;
        
        const result = await geminiService.generateShowroomImage(
          carBase64, 
          CORPORATE_SHOWROOM_DESCRIPTION, 
          customBackground, 
          keepOriginalPerspective
        );

        if (result.image) {
          let finalImage = result.image;
          if (customLogo) finalImage = await bakeWatermarkIntoImage(result.image, customLogo, logoPosition);
          setItems(prev => prev.map(item => item.id === currentItem.id ? { ...item, status: 'completed', result: finalImage, feedback: result.feedback } : item));
        } else if (result.errorType === 'QUOTA') {
          throw new Error("QUOTA_EXCEEDED");
        } else if (result.errorType === 'READ') {
          throw new Error("IMAGE_UNREADABLE");
        } else {
          throw new Error("API_ERROR");
        }
      } catch (err: any) {
        let errorMsg = t.errorGeneral;
        if (err.message === "QUOTA_EXCEEDED") {
          errorMsg = t.errorQuota;
          setGlobalError(errorMsg);
        } else if (err.message === "IMAGE_UNREADABLE") {
          errorMsg = language === 'de' ? "Bild konnte nicht gelesen werden" : "Image could not be read";
        }
        setItems(prev => prev.map(item => item.id === currentItem.id ? { ...item, status: 'error', error: errorMsg } : item));
        if (err.message === "QUOTA_EXCEEDED") break;
      }
    }
    setIsProcessingBatch(false);
  };

  const downloadAsZip = async () => {
    const completedItems = items.filter(i => i.result);
    if (completedItems.length === 0) return;
    const zip = new JSZip();
    for (const item of completedItems) {
      if (item.result) {
        const base64Data = item.result.split(',')[1];
        zip.file(`AutoVision-HD-${item.id}.png`, base64Data, { base64: true });
      }
    }
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `HD-Batch-${Date.now()}.zip`;
    link.click();
  };

  const resetAll = () => { 
    setItems([]); 
    setSelectedItemIndex(0);
    setGlobalError(null); 
    setIsProcessingBatch(false); 
  };

  const factoryReset = () => {
    if (confirm(language === 'de' ? 'Alle Einstellungen wirklich zurücksetzen?' : 'Reset all settings to factory defaults?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const allProcessed = items.length > 0 && items.every(i => i.status === 'completed' || i.status === 'error');
  const completedCount = items.filter(i => i.status === 'completed').length;
  const dynamicStyles = { '--brand-color': theme.primary, '--bg-color': theme.dark, '--card-color': theme.card, '--text-color': theme.text } as React.CSSProperties;

  const currentPreviewItem = items[selectedItemIndex] || items[0];

  // LEITFADEN DATEN
  const guideData = {
    de: {
      exteriorMandatory: {
        title: "Pflichtansichten – außen",
        subtitle: "(verkaufsentscheidend)",
        points: ["Frontansicht (gerade)", "Heckansicht (gerade)", "Seitenansicht links (90°)", "Seitenansicht rechts (90°)", "Schräg vorne links (45° / Hero Shot)", "Schräg hinten rechts (45°)"],
        icon: <Car size={32} />
      },
      exteriorOptional: {
        title: "Ergänzungen – außen",
        subtitle: "(wertsteigernd)",
        points: ["Felgen / Reifen (Detail)", "Frontscheinwerfer (Detail)", "Heckleuchten (Detail)", "Dach / Panorama / Cabrio", "Außenspiegel", "Ausstattungs-Embleme (AMG, M, etc.)"],
        icon: <Camera size={32} />
      },
      interiorMandatory: {
        title: "Innenraum – Pflicht",
        subtitle: "(Transparenz & Qualität)",
        points: ["Cockpit / Armaturenbrett", "Vordersitze", "Rücksitzbank", "Lenkrad + Kombiinstrument", "Infotainment / Mittelkonsole", "Kofferraum (offen)"],
        icon: <Gauge size={32} />
      },
      techCondition: {
        title: "Technik & Zustand",
        subtitle: "(vertrauensbildend)",
        points: ["Motorraum", "Serviceheft / digitale Anzeige", "Kilometerstand", "Fahrzeugschlüssel (1–2)", "Zubehör (Ladekabel, Räder)"],
        icon: <Wrench size={32} />
      },
      damages: {
        title: "Schäden & Besonderheiten",
        subtitle: "(Pflicht zur Transparenz)",
        points: ["Kratzer / Dellen / Steinschläge", "Abnutzung Sitze / Lenkrad", "Felgenschäden (Bordsteinkontakt)"],
        icon: <AlertTriangle size={32} />
      },
      order: {
        title: "Best Practice Reihenfolge",
        subtitle: "(Online-Inserat)",
        points: ["1. Schräg vorne (Hero Shot)", "2. Seitenansicht", "3. Heck schräg", "4. Front / Heck gerade", "5. Innenraum", "6. Details & Technik", "7. Mängel (falls vorhanden)"],
        icon: <ListOrdered size={32} />
      }
    },
    en: {
      exteriorMandatory: {
        title: "Mandatory – Exterior",
        subtitle: "(Sales Critical)",
        points: ["Front view (straight)", "Rear view (straight)", "Side view left (90°)", "Side view right (90°)", "Front quarter left (45° / Hero Shot)", "Rear quarter right (45°)"],
        icon: <Car size={32} />
      },
      exteriorOptional: {
        title: "Optional – Exterior",
        subtitle: "(Value Adding)",
        points: ["Wheels / Tires (Detail)", "Headlights (Detail)", "Tail lights (Detail)", "Roof / Panorama / Cabrio", "Mirrors", "Badging (AMG, M-Power, etc.)"],
        icon: <Camera size={32} />
      },
      interiorMandatory: {
        title: "Interior – Mandatory",
        subtitle: "(Transparency)",
        points: ["Cockpit / Dashboard", "Front seats", "Rear bench", "Steering wheel & Cluster", "Infotainment / Console", "Trunk (open)"],
        icon: <Gauge size={32} />
      },
      techCondition: {
        title: "Tech & Condition",
        subtitle: "(Trust Building)",
        points: ["Engine bay", "Service history / Digital display", "Mileage", "Vehicle keys (1–2)", "Accessories (Cables, wheels)"],
        icon: <Wrench size={32} />
      },
      damages: {
        title: "Damages & Details",
        subtitle: "(Transparency Duty)",
        points: ["Scratches / Dents / Stone chips", "Wear on seats / wheel", "Rim curb rash"],
        icon: <AlertTriangle size={32} />
      },
      order: {
        title: "Best Practice Order",
        subtitle: "(Online Listing)",
        points: ["1. Front Quarter (Hero Shot)", "2. Side View", "3. Rear Quarter", "4. Front / Rear straight", "5. Interior", "6. Details & Tech", "7. Damages (if any)"],
        icon: <ListOrdered size={32} />
      }
    }
  }[language];

  return (
    <div className="min-h-screen transition-colors duration-500 font-sans" style={{ ...dynamicStyles, backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
      {/* Settings Sidebar Overlay */}
      {showSettings && (
        <div 
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" 
          onClick={() => setShowSettings(false)}
        />
      )}
      
      {/* Right Sidebar */}
      <aside 
        className={`fixed right-0 top-0 h-full z-[70] w-full max-w-sm bg-white/95 backdrop-blur-3xl shadow-2xl transition-transform duration-500 ease-out flex flex-col border-l border-black/5 ${showSettings ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ backgroundColor: 'var(--card-color)', color: 'var(--text-color)' }}
      >
        <div className="p-8 flex items-center justify-between border-b border-black/5">
          <div className="flex items-center gap-3">
            <Settings2 className="w-6 h-6" style={{ color: 'var(--brand-color)' }} />
            <h2 className="font-orbitron font-black text-sm uppercase tracking-widest">{t.settingsTitle}</h2>
          </div>
          <button 
            onClick={() => setShowSettings(false)}
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
          >
            <X size={24} className="opacity-40" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-12">
          {/* Section: System */}
          <section className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">{t.langTitle} & {t.schemeTitle}</h3>
            <div className="space-y-4">
              <div className="flex bg-black/5 p-1 rounded-2xl">
                <button onClick={() => setLanguage('de')} className={`flex-1 py-3 text-[11px] rounded-xl font-black tracking-widest transition-all ${language === 'de' ? 'bg-white shadow-xl text-black' : 'opacity-40'}`}>DEUTSCH</button>
                <button onClick={() => setLanguage('en')} className={`flex-1 py-3 text-[11px] rounded-xl font-black tracking-widest transition-all ${language === 'en' ? 'bg-white shadow-xl text-black' : 'opacity-40'}`}>ENGLISH</button>
              </div>
              <div className="grid grid-cols-5 gap-3">
                 {(Object.keys(THEME_SCHEMES) as UIScheme[]).map(s => (
                   <button 
                    key={s} 
                    onClick={() => setUiScheme(s)} 
                    className={`aspect-square rounded-2xl border-4 transition-all shadow-md active:scale-90 ${uiScheme === s ? 'border-black/20' : 'border-transparent'}`} 
                    style={{ backgroundColor: THEME_SCHEMES[s].primary }} 
                   />
                 ))}
               </div>
            </div>
          </section>

          {/* Section: Branding */}
          <section className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">{t.brandingTitle}</h3>
            <div className="p-6 bg-black/5 rounded-[2rem] border border-black/5 space-y-6">
               <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase opacity-60">Logo / Watermark</span>
                  {customLogo ? (
                    <div className="relative group aspect-square max-w-[140px] mx-auto bg-white rounded-3xl overflow-hidden border border-black/10 shadow-2xl p-4">
                      <img src={customLogo} className="w-full h-full object-contain" alt="Logo Preview" />
                      <button onClick={() => setCustomLogo(null)} className="absolute inset-0 bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={24} />
                      </button>
                    </div>
                  ) : (
                    <div onClick={() => logoInputRef.current?.click()} className="aspect-square max-w-[140px] mx-auto bg-black/5 rounded-3xl border-2 border-dashed border-black/10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-black/10 transition-colors opacity-50">
                       <ImageIcon size={32} />
                       <span className="text-[9px] font-black uppercase">Upload</span>
                    </div>
                  )}
                  <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleBrandingUpload(e, 'logo')} />
               </div>
               
               <div className="flex items-center justify-between pt-4 border-t border-black/5">
                 <span className="text-[11px] font-bold opacity-60 uppercase">{t.logoPos}</span>
                 <div className="flex bg-black/10 p-1 rounded-xl">
                   <button onClick={() => setLogoPosition('left')} className={`p-2.5 rounded-lg ${logoPosition === 'left' ? 'bg-white shadow-md text-black' : 'opacity-30'}`}><AlignLeft size={20} /></button>
                   <button onClick={() => setLogoPosition('right')} className={`p-2.5 rounded-lg ${logoPosition === 'right' ? 'bg-white shadow-md text-black' : 'opacity-30'}`}><AlignRight size={20} /></button>
                 </div>
               </div>
            </div>
          </section>

          {/* Section: Showroom */}
          <section className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">{t.showroomTitle}</h3>
            <div className="p-6 bg-black/5 rounded-[2rem] border border-black/5 space-y-6">
               <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase opacity-60">Corporate Environment</span>
                  {customBackground ? (
                    <div className="relative group aspect-video rounded-2xl overflow-hidden border border-black/10 shadow-xl">
                      <img src={`data:image/jpeg;base64,${customBackground}`} className="w-full h-full object-cover" alt="BG Preview" />
                      <button onClick={() => setCustomBackground(null)} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => bgInputRef.current?.click()} className="w-full py-4 bg-white/80 text-[10px] font-black uppercase rounded-2xl border border-black/10 shadow-sm hover:shadow-md transition-shadow">
                      {t.bgBtn}
                    </button>
                  )}
                  <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={(e) => handleBrandingUpload(e, 'bg')} />
               </div>

               <div className="pt-4 border-t border-black/5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase">{t.perspectiveToggle}</span>
                    <span className="text-[8px] opacity-40 uppercase font-black">AI Pixel-Lock</span>
                  </div>
                  <button onClick={() => setKeepOriginalPerspective(!keepOriginalPerspective)} className={`w-14 h-7 rounded-full relative transition-all ${keepOriginalPerspective ? 'bg-green-600' : 'bg-gray-400'}`}>
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-all ${keepOriginalPerspective ? 'left-8' : 'left-1'}`} />
                  </button>
               </div>
            </div>
          </section>

          {/* Factory Reset */}
          <button 
            onClick={factoryReset}
            className="w-full py-4 mt-8 flex items-center justify-center gap-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-2xl transition-colors border border-red-100"
          >
            <RotateCcw size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">{language === 'de' ? 'Reset auf Werkszustand' : 'Factory Reset'}</span>
          </button>
        </div>

        <div className="p-8 border-t border-black/5 bg-black/5">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-30 text-center">AutoVision Persistent Settings Engine v11.4</p>
        </div>
      </aside>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-opacity-80 backdrop-blur-2xl border-b border-black border-opacity-10 h-20" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { resetAll(); setActiveTab('optimizer'); }}>
            {customLogo ? (
              <img src={customLogo} alt="Corporate Logo" className="h-10 w-auto object-contain" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl group-hover:rotate-12 transition-transform shadow-lg" style={{ backgroundColor: 'var(--brand-color)' }}>
                  <Box className="w-8 h-8 text-white" />
                </div>
                <h1 className="font-orbitron text-xl font-bold tracking-tighter uppercase">
                  AUTO<span style={{ color: 'var(--brand-color)' }}>VISION</span> AI
                </h1>
              </div>
            )}
          </div>
          <div className="hidden md:flex items-center gap-1 bg-black bg-opacity-5 p-1 rounded-2xl">
            <button onClick={() => setActiveTab('optimizer')} className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'optimizer' ? 'bg-white shadow-md' : 'opacity-40 hover:opacity-100'}`} style={activeTab === 'optimizer' ? { color: 'var(--brand-color)' } : {}}>{t.navOptimizer}</button>
            <button onClick={() => setActiveTab('guide')} className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'guide' ? 'bg-white shadow-md' : 'opacity-40 hover:opacity-100'}`} style={activeTab === 'guide' ? { color: 'var(--brand-color)' } : {}}>{t.navGuide}</button>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowSettings(true)} 
              className={`p-3 rounded-2xl border transition-all shadow-xl bg-white/60 border-black/10 text-gray-700 hover:text-black hover:bg-white active:scale-95`}
            >
              <Settings2 size={24} />
            </button>
          </div>
        </div>
      </nav>

      {activeTab === 'optimizer' ? (
        <>
          <header className="relative py-24 overflow-hidden text-center">
            <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 50% 50%, var(--brand-color), transparent 70%)` }}></div>
            <div className="relative max-w-7xl mx-auto px-6">
              <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-white/80 border border-black/10 rounded-full mb-10 shadow-xl backdrop-blur-md">
                <span className="text-[11px] font-black uppercase tracking-[0.3em]"><ShieldCheck size={16} className="inline mr-2 text-green-600" />Vehicle Shield Protected Engine v11.4</span>
              </div>
              <h1 className="font-orbitron text-4xl md:text-5xl font-black mb-8 tracking-tight uppercase">{t.heroTitle.split(' ')[0]} <span style={{ color: 'var(--brand-color)' }}>{t.heroTitle.split(' ').slice(1).join(' ')}</span></h1>
              <p className="opacity-80 text-lg max-w-2xl mx-auto mb-14 font-semibold">{t.heroDesc}</p>
              {globalError && (
                <div className="max-w-md mx-auto mb-8 p-4 bg-red-100 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3 animate-pulse">
                  <AlertCircle size={20} />
                  <span className="text-xs font-black uppercase">{globalError}</span>
                </div>
              )}
              {items.length === 0 && <button onClick={() => fileInputRef.current?.click()} className="px-16 py-6 text-white font-black uppercase tracking-[0.25em] text-[13px] rounded-2xl hover:scale-105 transition-all shadow-2xl mx-auto flex items-center gap-4" style={{ backgroundColor: 'var(--brand-color)', boxShadow: `0 25px 55px -12px ${theme.primary}80` }}>{t.uploadBtn} <Upload size={22} /></button>}
              <input type="file" ref={fileInputRef} multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" accept="image/*" />
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-6 py-6 pb-40">
            {items.length > 0 && (
              <div className="space-y-16">
                <div className="p-10 border border-black/10 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl" style={{ backgroundColor: 'var(--card-color)' }}>
                  <div className="flex items-center gap-8 w-full md:w-auto">
                    <div className="p-6 rounded-[2rem] shadow-2xl bg-white/50" style={{ color: 'var(--brand-color)' }}><Layers className="w-10 h-10" /></div>
                    <div className="flex-1 min-w-[240px]">
                      <div className="flex justify-between items-end mb-3"><h2 className="text-lg font-black font-orbitron uppercase tracking-[0.2em]">{isProcessingBatch ? t.runningBtn : 'Batch Progress'}</h2><span className="text-[12px] font-black opacity-40 tracking-[0.4em]">{completedCount}/{items.length}</span></div>
                      <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden shadow-inner"><div className="h-full transition-all duration-1000" style={{ backgroundColor: 'var(--brand-color)', width: `${(completedCount / items.length) * 100}%` }} /></div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-5 w-full md:w-auto">
                    {!allProcessed ? <button disabled={isProcessingBatch} onClick={processBatch} className="flex-1 md:flex-none px-12 py-5 text-white font-black rounded-[1.5rem] hover:brightness-110 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-[12px] shadow-2xl disabled:opacity-40" style={{ backgroundColor: 'var(--brand-color)' }}>{isProcessingBatch ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}{isProcessingBatch ? t.runningBtn : t.startBtn}</button> : <button onClick={downloadAsZip} className="flex-1 md:flex-none px-12 py-5 bg-black text-white font-black rounded-[1.5rem] hover:bg-opacity-80 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-[12px] shadow-2xl"><Archive size={20} /> {t.zipBtn}</button>}
                    {!isProcessingBatch && <button onClick={resetAll} className="p-5 bg-black/5 rounded-[1.5rem] transition-all border border-black/5"><RefreshCcw size={24} className="opacity-30" /></button>}
                  </div>
                </div>

                <div className="max-w-5xl mx-auto w-full">
                  <h2 className="text-[12px] font-black uppercase tracking-[0.5em] opacity-40 mb-8 text-center">
                    {t.previewTitle} - Bild {selectedItemIndex + 1}
                  </h2>
                  <div className="border border-black/10 rounded-[4rem] p-6 overflow-hidden relative shadow-2xl bg-white/50 aspect-video">
                    {currentPreviewItem.result ? (
                      <CompareSlider before={currentPreviewItem.preview} after={currentPreviewItem.result} />
                    ) : (
                      <div className="w-full h-full bg-black/10 rounded-[3.5rem] relative flex items-center justify-center overflow-hidden">
                        <img src={currentPreviewItem.preview} className={`w-full h-full object-cover ${currentPreviewItem.status === 'processing' ? 'blur-3xl opacity-20' : 'opacity-40'}`} />
                        {currentPreviewItem.status === 'processing' && <Loader2 className="w-16 h-16 animate-spin opacity-40" style={{ color: 'var(--brand-color)' }} />}
                        {!currentPreviewItem.result && currentPreviewItem.status !== 'processing' && (
                           <div className="absolute inset-0 flex items-center justify-center">
                             {currentPreviewItem.status === 'error' ? (
                               <div className="flex flex-col items-center gap-4 text-red-600 bg-red-50 p-6 rounded-2xl border border-red-100">
                                 <AlertCircle size={40} />
                                 <span className="text-[12px] font-black uppercase tracking-[0.2em] text-center">{currentPreviewItem.error || "Failed"}</span>
                               </div>
                             ) : (
                               <div className="flex flex-col items-center gap-3">
                                 <Eye size={48} className="opacity-10" />
                                 <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Ready for Optimization</span>
                               </div>
                             )}
                           </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {items.map((item, idx) => (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedItemIndex(idx)}
                      className={`p-8 border rounded-[2.5rem] flex items-center justify-between transition-all group relative overflow-hidden shadow-lg cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${item.status === 'processing' ? 'scale-[1.02]' : 'border-opacity-10'} ${selectedItemIndex === idx ? 'ring-4 ring-offset-4' : ''}`} 
                      style={{ 
                        backgroundColor: 'var(--card-color)', 
                        borderColor: item.status === 'processing' ? 'var(--brand-color)' : item.status === 'error' ? '#ef4444' : 'black',
                        ringColor: 'var(--brand-color)'
                      }}
                    >
                      <div className="flex items-center gap-8">
                        <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center font-orbitron font-black text-sm shadow-2xl ${item.status === 'completed' ? 'text-green-700 bg-green-100' : item.status === 'error' ? 'text-red-700 bg-red-100' : 'opacity-30 bg-black/5'}`}>{idx + 1}</div>
                        <div className="min-w-0">
                          <h3 className="text-base font-black truncate opacity-80">{item.file.name}</h3>
                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] mt-2 inline-block ${item.status === 'completed' ? 'text-green-600' : item.status === 'error' ? 'text-red-600' : item.status === 'processing' ? '' : 'opacity-30'}`} style={item.status === 'processing' ? { color: 'var(--brand-color)' } : {}}>{item.status === 'completed' ? 'Success' : item.status === 'error' ? 'Failed' : item.status === 'processing' ? 'Optimizing...' : 'Queued'}</span>
                        </div>
                      </div>
                      {item.status === 'completed' && <div className="bg-green-600 bg-opacity-20 p-3 rounded-full"><FileCheck className="text-green-700" size={24} /></div>}
                      {item.status === 'error' && <div className="bg-red-600 bg-opacity-20 p-3 rounded-full"><AlertCircle className="text-red-700" size={24} /></div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </>
      ) : (
        /* NEUER LEITFADEN VIEW */
        <main className="max-w-7xl mx-auto px-6 py-16 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center mb-20">
            <h1 className="font-orbitron text-4xl font-black mb-6 tracking-tight uppercase">{t.guideTitle}</h1>
            <p className="text-xl opacity-60 font-semibold max-w-3xl mx-auto">{t.guideSub}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.values(guideData).map((section: any, idx) => (
              <div 
                key={idx} 
                className="p-10 rounded-[3rem] border border-black/5 shadow-2xl space-y-8 flex flex-col hover:scale-[1.02] transition-transform relative overflow-hidden group" 
                style={{ backgroundColor: 'var(--card-color)' }}
              >
                {/* Decoration */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand/5 rounded-full blur-3xl group-hover:bg-brand/10 transition-colors" />

                <div className="flex items-center gap-6">
                  <div className="p-4 rounded-2xl bg-brand/10 text-brand shadow-inner">
                    {section.icon}
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-lg font-black uppercase tracking-widest leading-tight">
                      {section.title}
                    </h2>
                    <span className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em]">{section.subtitle}</span>
                  </div>
                </div>

                <ul className="space-y-4 flex-1">
                  {section.points.map((pt: string, pidx: number) => (
                    <li key={pidx} className="flex gap-4 items-start">
                      <div className="mt-1 bg-green-500/10 p-1 rounded-full"><Check size={14} className="text-green-500"/></div>
                      <span className="text-[12px] font-black uppercase tracking-wider opacity-80 leading-relaxed">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-20 p-12 rounded-[3.5rem] border border-black/5 bg-brand/5 text-center space-y-6 shadow-xl backdrop-blur-sm">
             <div className="inline-flex p-3 rounded-full bg-brand/10 text-brand mb-2">
                <ThumbsUp size={24} />
             </div>
             <h3 className="text-2xl font-black uppercase tracking-widest">{language === 'de' ? 'Profi-Tipp für maximalen Erfolg' : 'Pro Tip for Success'}</h3>
             <p className="max-w-4xl mx-auto opacity-70 font-semibold text-lg">
               {language === 'de' 
                 ? "Achten Sie auf einen Abstand von ca. 5-7 Metern zum Fahrzeug und nutzen Sie eine leichte Tele-Brennweite, um Verzerrungen zu vermeiden. Die besten Fotos entstehen bei bewölktem Himmel für weiches Licht ohne harte Schatten. Offenheit bei Schäden wirkt professionell und reduziert Reklamationen."
                 : "Keep a distance of about 5-7 meters from the vehicle and use a slight telephoto lens to avoid distortion. The best photos are taken under cloudy skies for soft light without harsh shadows. Transparency regarding damages looks professional and reduces complaints."}
             </p>
             <div className="pt-4 text-[11px] font-black uppercase tracking-[0.5em] opacity-30">➡️ {language === 'de' ? 'Mindestens 6 Außenbilder gelten als Branchenstandard' : 'At least 6 exterior photos are industry standard'}</div>
          </div>
        </main>
      )}

      <footer className="border-t border-black/10 py-20" style={{ backgroundColor: 'var(--card-color)' }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
          {customLogo ? (
            <img src={customLogo} alt="Branding Logo" className="h-10 w-auto object-contain opacity-50 grayscale hover:grayscale-0 transition-all" />
          ) : (
            <h2 className="font-orbitron text-xl font-black tracking-tighter opacity-50 uppercase">AUTO<span style={{ color: 'var(--brand-color)' }}>VISION</span> AI</h2>
          )}
          <p className="opacity-30 text-[9px] uppercase tracking-[0.8em] font-black text-center md:text-right">VEHICLE PROTECTION: PIXEL LOCK v11.4 // PERSISTENT CACHE ACTIVE</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
