
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, LayoutGrid, Settings, 
  ArrowRight, Download, Zap, Target, Search,
  ShieldCheck, CheckCircle2, Loader2, Plus, 
  History, Briefcase, Cpu, Globe, AlertTriangle
} from 'lucide-react';
import { PocketStore, Artifact, ProjectMode, ProjectLanguage } from './types';
import { clarifyNode, runAgentForge, refineArtifactNode } from './services/pocketFlow';
import ArtifactCard from './components/ArtifactCard';
import SideDrawer from './components/SideDrawer';
import DottedBackground from './components/DottedBackground';

const PACKS = [
  { id: 'normal', name: 'SaaS Standard', icon: <Briefcase className="w-5 h-5"/> },
  { id: 'detailed', name: 'Fintech / Security', icon: <ShieldCheck className="w-5 h-5"/> },
  { id: 'lite', name: 'MVP Rapide', icon: <Zap className="w-5 h-5"/> },
];

const App: React.FC = () => {
  const [store, setStore] = useState<PocketStore>(() => {
    const saved = localStorage.getItem('agentforge_current');
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
    localStorage.setItem('agentforge_current', JSON.stringify(store));
  }, [store]);

  const handleStartClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const initialStore = { ...store, idea_raw: inputValue, status: 'clarifying' as const, artifacts: [] };
    setStore(initialStore);
    await clarifyNode(inputValue, (u) => setStore(prev => ({ ...prev, ...u })));
  };

  const handleAnswer = (qId: string, value: string) => {
    setStore(prev => ({
      ...prev,
      answers: { ...prev.answers, [qId]: value }
    }));
  };

  const handleLaunchForge = async () => {
    setStore(prev => ({ ...prev, status: 'generating', currentStep: 'Initialisation des agents...' }));
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

  const handleNewProject = () => {
    if (confirm("Démarrer un nouveau projet ? Le projet actuel sera réinitialisé.")) {
      setStore({
        idea_raw: '',
        mode: 'normal',
        language: 'FR',
        status: 'idle',
        currentStep: '',
        questions: [],
        answers: {},
        artifacts: []
      });
      setInputValue('');
    }
  };

  return (
    <div className="h-screen flex bg-[#09090b] text-[#E6E1E5] overflow-hidden font-sans">
      <DottedBackground />

      {/* Nav Rail */}
      <nav className="w-20 md:w-24 border-r border-white/5 flex flex-col items-center py-8 gap-8 z-50 bg-[#09090b]">
        <div className="w-12 h-12 bg-[#007BFF] rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,123,255,0.4)]">
          <Zap className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-6 flex-1 pt-12">
          <button onClick={handleNewProject} className="p-3 rounded-full text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
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
              <span className={`text-[10px] px-3 py-1 border rounded-full uppercase tracking-widest font-bold ${store.status === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-[#007BFF]/10 border-[#007BFF]/20 text-[#007BFF]'}`}>
                {store.status}
              </span>
            )}
          </div>
          
          <div className="flex gap-4">
            {store.status === 'ready' && (
              <button onClick={() => {}} className="m3-button-primary h-10 px-5 flex items-center gap-2 text-xs uppercase tracking-widest">
                <Download className="w-4 h-4" /> Download ZIP
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar relative">
          {/* STEP 1: IDLE */}
          {store.status === 'idle' && (
            <div className="max-w-4xl mx-auto mt-20 space-y-16 animate-in fade-in zoom-in-95 duration-700">
              <div className="text-center space-y-6">
                <h2 className="text-8xl font-black af-gradient-text leading-none tracking-tighter">Votre vision,<br/>notre forge.</h2>
                <p className="text-xl text-zinc-400 font-light max-w-2xl mx-auto">L'usine IA multi-agents qui transforme vos idées en dossiers techniques de grade industriel.</p>
              </div>

              <div className="space-y-8">
                <form onSubmit={handleStartClarification} className="relative group">
                  <div className="flex items-center bg-[#18181b] border-2 border-white/5 focus-within:border-[#007BFF] rounded-[32px] p-2 pl-8 shadow-2xl transition-all">
                    <input 
                      type="text" 
                      placeholder="Quelle est votre idée de produit ?" 
                      className="bg-transparent border-none outline-none flex-1 text-lg py-5 text-white"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                    />
                    <button type="submit" className="w-14 h-14 bg-[#007BFF] text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
                      <ArrowRight className="w-7 h-7" />
                    </button>
                  </div>
                </form>

                <div className="flex justify-center gap-4">
                  {PACKS.map(pack => (
                    <button 
                      key={pack.id}
                      onClick={() => setStore(prev => ({ ...prev, mode: pack.id as any }))}
                      className={`px-6 py-4 rounded-2xl border flex items-center gap-3 transition-all ${store.mode === pack.id ? 'bg-[#007BFF]/10 border-[#007BFF] text-[#007BFF]' : 'bg-white/5 border-white/10 text-zinc-500 hover:border-white/20'}`}
                    >
                      {pack.icon}
                      <span className="text-xs font-bold uppercase tracking-widest">{pack.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CLARIFYING */}
          {store.status === 'clarifying' && (
            <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in duration-500">
              <div className="space-y-2 text-center">
                <h3 className="text-4xl font-black tracking-tight">Cadrage Intelligent</h3>
                <p className="text-zinc-500">Nos agents analysent votre idée. Précisons quelques points clés.</p>
              </div>
              
              <div className="space-y-6">
                {store.questions.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 py-20">
                    <Loader2 className="w-10 h-10 text-[#007BFF] animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#007BFF] animate-pulse">L'Agent Clarificateur réfléchit...</span>
                  </div>
                ) : (
                  <>
                    {store.questions.map((q) => (
                      <div key={q.id} className="m3-card p-8 space-y-6">
                        <label className="text-xl font-bold text-white block">{q.text}</label>
                        {q.type === 'choice' ? (
                          <div className="grid grid-cols-2 gap-3">
                            {q.options?.map(opt => (
                              <button 
                                key={opt}
                                onClick={() => handleAnswer(q.id, opt)}
                                className={`p-4 rounded-xl border text-sm font-bold transition-all ${store.answers[q.id] === opt ? 'bg-[#007BFF] border-[#007BFF] text-white shadow-lg' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'}`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input 
                            type="text" 
                            className="w-full bg-[#09090b] border border-white/10 rounded-xl p-5 text-white focus:border-[#007BFF] outline-none text-lg"
                            placeholder="Saisissez votre réponse..."
                            value={store.answers[q.id] || ''}
                            onChange={(e) => handleAnswer(q.id, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                    <button 
                      onClick={handleLaunchForge}
                      className="w-full py-6 m3-button-primary text-xl flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(0,123,255,0.2)]"
                    >
                      Lancer la Forge Multi-Agents <Zap className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {store.status === 'error' && (
            <div className="max-w-xl mx-auto mt-20 p-10 m3-card border-red-500/30 flex flex-col items-center text-center gap-6">
              <AlertTriangle className="w-16 h-16 text-red-500" />
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Quota API Dépassé</h3>
                <p className="text-zinc-400">{store.currentStep}</p>
                <p className="text-sm text-zinc-500">L'API Gemini limite le nombre de requêtes gratuites. Nous avons activé l'orchestration séquentielle, mais la limite a tout de même été atteinte. Veuillez réessayer dans quelques minutes.</p>
              </div>
              <button 
                onClick={() => setStore(prev => ({ ...prev, status: 'idle' }))}
                className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all"
              >
                Retour à l'accueil
              </button>
            </div>
          )}

          {/* STEP 3: GENERATING / READY */}
          {(store.status === 'generating' || store.status === 'ready') && (
            <div className="max-w-7xl mx-auto space-y-12">
              {store.status === 'generating' && (
                <div className="flex flex-col items-center gap-8 py-10 text-center sticky top-0 z-30 bg-[#09090b]/80 backdrop-blur-xl rounded-b-3xl pb-10">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#007BFF] blur-2xl opacity-20 animate-pulse" />
                    <Loader2 className="w-12 h-12 text-[#007BFF] animate-spin relative" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-3xl font-black">{store.currentStep}</h4>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center justify-center gap-3 text-zinc-500 font-mono text-[10px] uppercase tracking-[0.2em]">
                        <span>Phase: {store.artifacts.length + 1} / 10</span>
                        <div className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span>Orchestration séquentielle</span>
                      </div>
                      <p className="text-[9px] text-zinc-600 italic">Respect des limites de quota API en cours...</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {store.artifacts.map((artifact, i) => (
                  <ArtifactCard 
                    key={artifact.id} 
                    artifact={artifact} 
                    delay={i * 100} 
                    onClick={() => setSelectedArtifact(artifact)} 
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      <SideDrawer 
        artifact={selectedArtifact} 
        onClose={() => setSelectedArtifact(null)} 
        onRefine={handleRefine}
      />
    </div>
  );
};

export default App;
