
import React from 'react';
import { Package, CheckCircle2 } from 'lucide-react';

interface Module {
  name: string;
  description: string;
  features: string[];
}

const AppMapViewer: React.FC<{ map?: { modules: Module[] } }> = ({ map }) => {
  if (!map) return null;

  return (
    <div className="max-w-5xl mx-auto py-10 animate-in fade-in duration-500">
      <div className="mb-12 text-center md:text-left">
        <h3 className="text-4xl font-bold tracking-tight mb-2 text-white">Application Architecture</h3>
        <p className="text-[#CAC4D0]">Mapped and structured by our Product Cartographer expert.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {map.modules.map((mod, idx) => (
          <div key={idx} className="m3-card bg-[#2B2930] p-8 border border-white/5 elevation-1 hover:elevation-2 transition-all flex flex-col md:flex-row gap-8 items-start">
            <div className="w-16 h-16 rounded-[20px] bg-[#4F378B] flex items-center justify-center text-[#D0BCFF] flex-shrink-0 shadow-lg">
              <Package className="w-8 h-8" />
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="text-2xl font-bold text-white mb-1">{mod.name}</h4>
                <p className="text-[#CAC4D0] leading-relaxed max-w-2xl">{mod.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mod.features.map((feat, fidx) => (
                  <div key={fidx} className="flex items-center gap-3 bg-[#1C1B1F] p-3 rounded-2xl border border-white/5">
                    <CheckCircle2 className="w-4 h-4 text-[#D0BCFF]" />
                    <span className="text-sm text-[#E6E1E5] font-medium">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 opacity-20 hover:opacity-100 transition-opacity">
               <span className="text-4xl font-black text-white">0{idx + 1}</span>
               <span className="text-[10px] uppercase tracking-tighter font-bold">Priority Block</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppMapViewer;
