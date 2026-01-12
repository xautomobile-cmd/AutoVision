import React, { useState, useRef } from 'react';
// Import RefreshCcw from lucide-react to resolve the missing component error on line 51
import { RefreshCcw } from 'lucide-react';

interface CompareSliderProps {
  before: string;
  after: string;
}

const CompareSlider: React.FC<CompareSliderProps> = ({ before, after }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const relativeX = x - rect.left;
    const percentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
    setSliderPos(percentage);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video rounded-3xl overflow-hidden cursor-ew-resize select-none bg-black"
      onMouseMove={handleMove}
      onTouchMove={handleMove}
    >
      <div className="absolute inset-0">
        <img src={after} alt="Optimiert" className="w-full h-full object-cover" />
      </div>
      <div 
        className="absolute inset-0 overflow-hidden border-r-2 border-brand z-10"
        style={{ width: `${sliderPos}%` }}
      >
        <img 
          src={before} 
          alt="Original" 
          className="w-full h-full object-cover max-w-none" 
          style={{ width: containerRef.current?.offsetWidth }} 
        />
        <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-black/30 pointer-events-none"></div>
      </div>
      
      {/* Handle */}
      <div 
        className="absolute top-0 bottom-0 z-20"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-brand text-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white/10 transition-transform hover:scale-110">
           <RefreshCcw size={16} className="rotate-90" />
        </div>
      </div>

      {/* Badges */}
      <div className="absolute top-4 left-4 z-30 pointer-events-none">
        <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white/50 text-[9px] font-bold uppercase tracking-widest rounded-lg border border-white/10">Vorher</span>
      </div>
      <div className="absolute top-4 right-4 z-30 pointer-events-none text-right">
        <span className="px-3 py-1 bg-brand text-white text-[9px] font-bold uppercase tracking-widest rounded-lg shadow-xl">Optimiert</span>
      </div>
    </div>
  );
};

export default CompareSlider;