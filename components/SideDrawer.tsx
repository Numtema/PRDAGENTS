
import React, { useState, useEffect, useRef } from 'react';
import { Artifact, ArtifactVariant } from '../types';
import { X, Send, Loader2, Sparkles, Download, Info, Layers, CheckCircle2 } from 'lucide-react';
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';

interface SideDrawerProps {
  artifact: Artifact | null;
  onClose: () => void;
  onRefine: (artifact: Artifact, instruction: string) => Promise<void>;
}

const SideDrawer: React.FC<SideDrawerProps> = ({ artifact, onClose, onRefine }) => {
  const [instruction, setInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [localContent, setLocalContent] = useState('');
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (artifact) {
      setLocalContent(artifact.content);
      setActiveVariantId(null);
    }
  }, [artifact]);

  useEffect(() => {
    if (artifact && localContent.includes('```mermaid')) {
      mermaid.initialize({ 
        startOnLoad: false, 
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'Inter',
        gantt: { fontSize: 12, sectionFontSize: 14 },
        sequence: { showSequenceNumbers: true },
      });
      
      const renderMermaid = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 200));
          await mermaid.run();
        } catch (err) {
          console.error("Mermaid error:", err);
        }
      };
      
      renderMermaid();
    }
  }, [artifact, localContent]);

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

  const selectVariant = (variant: ArtifactVariant) => {
    setLocalContent(variant.content);
    setActiveVariantId(variant.id);
  };

  const resetToRecommended = () => {
    setLocalContent(artifact.content);
    setActiveVariantId(null);
  };

  const handleDownload = () => {
    const isHtml = artifact.type === 'prototype';
    const blob = new Blob([localContent], { type: isHtml ? 'text/html' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.replace(/\s+/g, '_')}.${isHtml ? 'html' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderContent = () => {
    if (artifact.type === 'prototype') {
      return (
        <div className="w-full aspect-video bg-white rounded-3xl overflow-hidden border-8 border-zinc-900 shadow-2xl">
          <iframe srcDoc={localContent} className="w-full h-full" title="Proto" />
        </div>
      );
    }

    const parts = localContent.split('```mermaid');
    
    return parts.map((part, i) => {
      if (i === 0) return <div key={i} className="whitespace-pre-wrap">{part}</div>;
      
      const [diagram, ...rest] = part.split('```');
      return (
        <div key={i}>
          <div className="my-10 p-8 bg-zinc-900 border border-white/5 rounded-3xl overflow-x-auto flex flex-col items-center justify-center min-h-[300px] shadow-inner">
             <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#007BFF] mb-6 self-start opacity-50">Visualisation Interactive</div>
             <pre className="mermaid w-full flex justify-center">{diagram.trim()}</pre>
          </div>
          <div className="whitespace-pre-wrap">{rest.join('```')}</div>
        </div>
      );
    });
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
          <button 
            onClick={handleDownload}
            className="p-3 bg-white/5 rounded-xl hover:text-[#007BFF] transition-all group relative"
          >
            <Download className="w-5 h-5" />
            <span className="absolute -bottom-10 right-0 bg-[#007BFF] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Télécharger ce fichier</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar" ref={containerRef}>
          {/* Section Variantes */}
          {artifact.variants && artifact.variants.length > 0 && (
            <section className="space-y-6 animate-in slide-in-from-top-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#007BFF]">
                <Layers className="w-4 h-4" /> Variantes Stratégiques
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={resetToRecommended}
                  className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-2 ${
                    activeVariantId === null 
                      ? 'bg-[#007BFF]/10 border-[#007BFF] shadow-[0_0_15px_rgba(0,123,255,0.2)]' 
                      : 'bg-white/5 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-white">Recommandé</span>
                    {activeVariantId === null && <CheckCircle2 className="w-4 h-4 text-[#007BFF]" />}
                  </div>
                  <span className="text-[10px] text-zinc-500 line-clamp-2 italic">Solution optimisée par l'agent.</span>
                </button>

                {artifact.variants.map((v) => (
                  <button 
                    key={v.id}
                    onClick={() => selectVariant(v)}
                    className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-2 ${
                      activeVariantId === v.id 
                        ? 'bg-[#007BFF]/10 border-[#007BFF] shadow-[0_0_15px_rgba(0,123,255,0.2)]' 
                        : 'bg-white/5 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-white line-clamp-1">{v.label}</span>
                      {activeVariantId === v.id && <CheckCircle2 className="w-4 h-4 text-[#007BFF]" />}
                    </div>
                    <span className="text-[10px] text-zinc-500 line-clamp-2 italic">{v.description}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="flex gap-4 p-6 bg-[#007BFF]/5 border border-[#007BFF]/10 rounded-2xl">
            <Info className="w-5 h-5 text-[#007BFF] shrink-0" />
            <p className="text-sm italic text-zinc-400 leading-relaxed">"{artifact.summary}"</p>
          </div>

          <div className="prose prose-invert max-w-none text-zinc-300 font-light text-lg leading-relaxed">
            {renderContent()}
          </div>
        </div>

        <footer className="p-8 border-t border-white/5 bg-[#18181b]/50">
          <div className="flex items-center gap-4 bg-black border border-white/10 rounded-2xl p-2 pl-6 focus-within:border-[#007BFF] transition-all">
            <input 
              type="text" 
              placeholder="Affiner ce document (ex: Ajoute une section sur les risques...)" 
              className="bg-transparent border-none outline-none flex-1 py-4 text-sm text-white"
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
