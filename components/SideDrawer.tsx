
import React, { useState, useEffect } from 'react';
import { Artifact } from '../types';
import { X, Send, Loader2, Sparkles, Download, Info } from 'lucide-react';
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';

interface SideDrawerProps {
  artifact: Artifact | null;
  onClose: () => void;
  onRefine: (artifact: Artifact, instruction: string) => Promise<void>;
}

const SideDrawer: React.FC<SideDrawerProps> = ({ artifact, onClose, onRefine }) => {
  const [instruction, setInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  useEffect(() => {
    if (artifact) {
      mermaid.initialize({ startOnLoad: true, theme: 'dark' });
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
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-4xl bg-[#09090b] z-[101] border-l border-white/5 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        <header className="p-8 border-b border-white/5 flex justify-between items-center bg-[#18181b]/50">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all">
              <X className="w-6 h-6 text-zinc-400" />
            </button>
            <div>
              <h2 className="text-2xl font-black text-white leading-none">{artifact.title}</h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#007BFF]">{artifact.role}</span>
            </div>
          </div>
          <button className="p-3 bg-white/5 rounded-xl hover:text-[#007BFF] transition-all">
            <Download className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
          <div className="flex gap-4 p-6 bg-[#007BFF]/5 border border-[#007BFF]/10 rounded-2xl">
            <Info className="w-5 h-5 text-[#007BFF] shrink-0" />
            <p className="text-sm italic text-zinc-400 leading-relaxed">"{artifact.summary}"</p>
          </div>

          <div className="prose prose-invert max-w-none">
            {artifact.type === 'prototype' ? (
              <div className="w-full aspect-video bg-white rounded-3xl overflow-hidden border-8 border-zinc-900">
                <iframe srcDoc={artifact.content} className="w-full h-full" title="Proto" />
              </div>
            ) : (
              <div className="text-zinc-300 whitespace-pre-wrap font-light text-lg leading-relaxed">
                {artifact.content.split('```mermaid').map((part, i) => {
                  if (i === 0) return part;
                  const [diagram, ...rest] = part.split('```');
                  return (
                    <div key={i} className="my-10 p-8 bg-[#18181b] border border-white/5 rounded-3xl overflow-hidden flex justify-center">
                      <div className="mermaid">{diagram.trim()}</div>
                      {rest.join('```')}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <footer className="p-8 border-t border-white/5 bg-[#18181b]/50">
          <div className="flex items-center gap-4 bg-black border border-white/10 rounded-2xl p-2 pl-6 focus-within:border-[#007BFF] transition-all">
            <input 
              type="text" 
              placeholder="Affiner ce document (ex: Ajoute une section sur les risques...)" 
              className="bg-transparent border-none outline-none flex-1 py-4 text-sm"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRefineSubmit()}
            />
            <button 
              disabled={isRefining || !instruction.trim()}
              onClick={handleRefineSubmit}
              className="w-12 h-12 bg-[#007BFF] text-white rounded-xl flex items-center justify-center disabled:opacity-50 transition-all hover:scale-105"
            >
              {isRefining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
            <Sparkles className="w-3 h-3" /> Raffinement contextuel par IA
          </div>
        </footer>
      </div>
    </>
  );
};

export default SideDrawer;
