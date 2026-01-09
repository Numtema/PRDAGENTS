
import React, { useEffect, useState } from 'react';
import { Artifact } from '../types';
import { X, Download, Zap, Info, Loader2, Send, History, RefreshCcw } from 'lucide-react';
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';

interface SideDrawerProps {
  artifact: Artifact | null;
  onClose: () => void;
  onRefine: (artifact: Artifact, instruction: string) => Promise<void>;
}

const SideDrawer: React.FC<SideDrawerProps> = ({ artifact, onClose, onRefine }) => {
  const [refineMode, setRefineMode] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  useEffect(() => {
    if (artifact) {
      mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });
      // Delay to ensure DOM is ready
      setTimeout(() => mermaid.contentLoaded(), 100);
    }
  }, [artifact]);

  if (!artifact) return null;

  const handleRefineSubmit = async () => {
    if (!instruction.trim()) return;
    setIsRefining(true);
    try {
      await onRefine(artifact, instruction);
      setInstruction('');
      setRefineMode(false);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] animate-in fade-in" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-4xl bg-[#09090b] z-[101] border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
        <header className="p-8 border-b border-white/10 flex justify-between items-center bg-[#18181b]/50">
          <div className="flex items-center gap-6">
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all">
              <X className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">{artifact.title}</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#007BFF]">{artifact.role}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 text-zinc-400 hover:text-white transition-all">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 space-y-12 bg-[#09090b] custom-scrollbar">
          {/* Instruction Summary */}
          <div className="flex gap-5 p-6 bg-[#007BFF]/5 border border-[#007BFF]/20 rounded-[24px]">
            <Info className="w-6 h-6 text-[#007BFF] shrink-0" />
            <p className="text-sm italic text-zinc-300 leading-relaxed font-light">"{artifact.summary}"</p>
          </div>

          {/* Content Rendering */}
          <div className="space-y-12">
            {artifact.type === 'prototype' ? (
              <div className="w-full aspect-video bg-white rounded-[32px] overflow-hidden border-[12px] border-zinc-900 shadow-2xl">
                <iframe srcDoc={artifact.content} className="w-full h-full" title="Prototype" />
              </div>
            ) : (
              <div className="prose prose-invert max-w-none">
                <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap font-light text-lg">
                  {artifact.content.split('```mermaid').map((part, i) => {
                    if (i === 0) return part;
                    const [diagram, ...rest] = part.split('```');
                    return (
                      <div key={i} className="my-12 group relative">
                        <div className="absolute -inset-4 bg-[#007BFF]/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="mermaid relative bg-zinc-900/50 rounded-3xl border border-white/5 p-8 flex justify-center overflow-hidden">
                          {diagram.trim()}
                        </div>
                        {rest.join('```')}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Trace Metadata */}
          <div className="pt-12 border-t border-white/5 grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Trace Système</h4>
              <div className="p-4 bg-white/2 rounded-xl border border-white/5 font-mono text-[9px] text-zinc-500">
                UUID: {artifact.id}<br/>
                ENGINE: GEMINI_3_FLASH<br/>
                MODALITY: {artifact.type.toUpperCase()}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Indice de Confiance</h4>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-white">{(artifact.confidence * 100).toFixed(0)}</span>
                <span className="text-xs font-bold text-zinc-500 mb-1">%</span>
              </div>
            </div>
          </div>
        </div>

        <footer className="p-8 border-t border-white/10 bg-[#18181b] relative">
          {refineMode ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-4">
              <div className="flex items-center bg-[#09090b] border border-[#007BFF]/50 rounded-2xl p-2 pr-4 ring-4 ring-[#007BFF]/10">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Ex: Ajoute une section sur les risques de sécurité..." 
                  className="bg-transparent border-none outline-none flex-1 py-4 px-4 text-white placeholder:text-zinc-600"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRefineSubmit()}
                />
                <button 
                  disabled={isRefining || !instruction.trim()}
                  onClick={handleRefineSubmit}
                  className="p-3 bg-[#007BFF] text-white rounded-xl disabled:opacity-50 disabled:grayscale transition-all"
                >
                  {isRefining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
              <button onClick={() => setRefineMode(false)} className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white px-4">Annuler</button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <button 
                onClick={() => setRefineMode(true)}
                className="m3-button-primary h-14 px-10 flex items-center gap-3 text-sm uppercase tracking-widest shadow-2xl"
              >
                <RefreshCcw className="w-5 h-5" /> Raffiner cet Artefact
              </button>
              <div className="flex gap-6">
                <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-all">
                  <History className="w-4 h-4" /> Historique
                </button>
              </div>
            </div>
          )}
        </footer>
      </div>
    </>
  );
};

export default SideDrawer;
