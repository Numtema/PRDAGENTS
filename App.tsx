
import React, { useState, useEffect } from 'react';
import { 
  Plus, LayoutGrid, History, Briefcase, 
  ShieldCheck, Zap, ArrowRight, Download, 
  Loader2, AlertTriangle, Send
} from 'lucide-react';
import { PocketStore, Artifact, ProjectMode } from './types';
import { clarifyNode, runAgentForge, refineArtifactNode } from './services/pocketFlow';
import ArtifactCard from './components/ArtifactCard';
import SideDrawer from './components/SideDrawer';
import DottedBackground from './components/DottedBackground';

const PACKS = [
  { id: 'lite', name: 'MVP Rapide', icon: <Zap className="w-5 h-5"/>, desc: 'Focus vitesse' },
  { id: 'normal', name: 'SaaS Standard', icon: <Briefcase className="w-5 h-5"/>, desc: 'Équilibre pro' },
  { id: 'detailed', name: 'Fintech / Sec', icon: <ShieldCheck className="w-5 h-5"/>, desc: 'Haute rigueur' },
];

const App: React.FC = () => {
  const [store, setStore] = useState<PocketStore>(() => {
    const saved = localStorage.getItem('agentforge_active');
    return saved ? JSON.parse(saved) : {
      idea_raw: '',
      mode: 'normal',
      language: 'FR',
      status: 'idle',
      currentStep: '',
      questions: [],
      answers: {},
      artifacts: []
    };
  });

  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    localStorage.setItem('agentforge_active', JSON.stringify(store));
  }, [store]);

  const handleStartClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const initial = { ...store, idea_raw: inputValue, status: 'clarifying' as const, artifacts: [] };
    setStore(initial);
    await clarifyNode(inputValue, (u) => setStore(prev => ({ ...prev, ...u })));
  };

  const handleLaunchForge = async () => {
    setStore(prev => ({ ...prev, status: 'generating', currentStep: 'Orchestration...' }));
    await runAgentForge(store, (u) => setStore(prev => ({ ...prev, ...u })));
  };

  const handleRefine = async (artifact: Artifact, instruction: string) => {
    await refineArtifactNode(artifact, instruction, store, (u) => {
      setStore(prev => ({ ...prev, ...u }));
      if (selectedArtifact?.id === artifact.id) {
        const updated = u.artifacts?.find(a => a.id === artifact.id);
        if (updated) setSelectedArtifact(updated);
      }
    });
  };

  const handleReset = () => {
    if (confirm("Réinitialiser ?")) {
      setStore({ idea_raw: '', mode: 'normal', language: 'FR', status: 'idle', currentStep: '', questions: [], answers: {}, artifacts: [] });
      setInputValue('');
    }
  };

  return (
    <div className="h-screen flex bg-[#09090b] text-[#E6E1E5] overflow-hidden">
      <DottedBackground />

      {/* Navigation Rail - Stable pattern */}
      <nav className="w-20 border-r border-white/5 flex flex-col items-center py-8 gap-10 z-50 bg-[#09090b]">
        <div className="w-10 h-10 bg-[#007BFF] rounded-xl flex items-center justify-center text-white shadow-lg">
          <Zap className="w-5 h-5" />
        </div>
        <div className="flex flex-col gap-6 flex-1">
          <button onClick={handleReset} className="p-3 rounded-full text-zinc-500 hover:text-white transition-all">
            <Plus className="w-6 h-6" />
          </button>
          <button className="p-3 rounded-full bg-white/5 text-[#007BFF]"><LayoutGrid className="w-6 h-6" /></button>
          <button className="p-3 rounded-full text-zinc-500 hover:text-white"><History className="w-6 h-6" /></button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-20 px-10 flex justify-between items-center border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tighter af-gradient-text uppercase">AgentForge</h1>
            {store.status !== 'idle' && (
              <span className="text-[9px] px-3 py-1 bg-white/5 border border-white/10 rounded-full text-zinc-400 uppercase tracking-widest font-black">
                {store.status}
              </span>
            )}
          </div>
          {store.status === 'ready' && (
            <button className="px-6 py-2 bg-[#007BFF] text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:scale-105 transition-all">
              <Download className="w-4 h-4" /> EXPORT ZIP
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {store.status === 'idle' && (
            <div className="max-w-3xl mx-auto mt-20 space-y-16 animate-in fade-in duration-700">
              <div className="space-y-4 text-center">
                <h2 className="text-7xl font-black tracking-tighter af-gradient-text leading-none">Forge Ta Vision.</h2>
                <p className="text-zinc-500 text-lg">Multi-agents spécialisés pour documentation produit de grade industriel.</p>
              </div>

              <div className="space-y-10">
                <form onSubmit={handleStartClarification} className="relative">
                  <div className="flex items-center bg-[#18181b] border border-white/10 rounded-[24px] p-2 pl-6 focus-within:border-[#007BFF] transition-all">
                    <input 
                      type="text" 
                      placeholder="Quelle est ton idée de projet ?" 
                      className="bg-transparent border-none outline-none flex-1 py-4 text-lg text-white"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                    />
                    <button type="submit" className="w-12 h-12 bg-[#007BFF] text-white rounded-full flex items-center justify-center hover:scale-110 transition-all">
                      <ArrowRight className="w-6 h-6" />
                    </button>
                  </div>
                </form>

                <div className="grid grid-cols-3 gap-4">
                  {PACKS.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => setStore(prev => ({ ...prev, mode: p.id as any }))}
                      className={`p-6 rounded-3xl border flex flex-col gap-4 transition-all ${store.mode === p.id ? 'bg-[#007BFF]/10 border-[#007BFF] text-[#007BFF]' : 'bg-white/5 border-white/5 text-zinc-500 hover:border-white/20'}`}
                    >
                      {p.icon}
                      <div className="text-left">
                        <div className="text-xs font-black uppercase tracking-widest">{p.name}</div>
                        <div className="text-[10px] opacity-60 uppercase">{p.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {store.status === 'clarifying' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
              <h3 className="text-3xl font-black text-center">Clarification</h3>
              {store.questions.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-20">
                  <Loader2 className="w-8 h-8 text-[#007BFF] animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">L'Agent analyse...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {store.questions.map(q => (
                    <div key={q.id} className="p-8 bg-[#18181b] border border-white/5 rounded-3xl space-y-4">
                      <div className="text-lg font-bold">{q.text}</div>
                      <input 
                        type="text" 
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:border-[#007BFF] outline-none"
                        placeholder="Ta réponse..."
                        value={store.answers[q.id] || ''}
                        onChange={(e) => setStore(prev => ({ ...prev, answers: { ...prev.answers, [q.id]: e.target.value } }))}
                      />
                    </div>
                  ))}
                  <button onClick={handleLaunchForge} className="w-full py-5 bg-[#007BFF] text-white rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all">
                    Lancer la Forge Multi-Agents
                  </button>
                </div>
              )}
            </div>
          )}

          {(store.status === 'generating' || store.status === 'ready') && (
            <div className="max-w-6xl mx-auto space-y-12">
              {store.status === 'generating' && (
                <div className="sticky top-0 z-30 bg-[#09090b]/80 backdrop-blur-xl py-6 flex flex-col items-center gap-3">
                  <div className="text-2xl font-black">{store.currentStep}</div>
                  <div className="flex gap-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-8 h-1 bg-[#007BFF]/20 rounded-full overflow-hidden">
                        <div className="h-full bg-[#007BFF] animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {store.artifacts.map((a, i) => (
                  <ArtifactCard key={a.id} artifact={a} delay={i * 50} onClick={() => setSelectedArtifact(a)} />
                ))}
              </div>
            </div>
          )}

          {store.status === 'error' && (
            <div className="max-w-md mx-auto mt-20 p-10 bg-red-500/10 border border-red-500/20 rounded-3xl text-center space-y-6">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
              <div className="font-bold text-red-500">{store.currentStep}</div>
              <button onClick={() => setStore(prev => ({ ...prev, status: 'idle' }))} className="px-6 py-2 bg-white/5 rounded-lg text-xs font-bold">RETOUR</button>
            </div>
          )}
        </main>
      </div>

      <SideDrawer artifact={selectedArtifact} onClose={() => setSelectedArtifact(null)} onRefine={handleRefine} />
    </div>
  );
};

export default App;
