
import React, { useState, useEffect } from 'react';
import { 
  Plus, LayoutGrid, History, Briefcase, 
  ShieldCheck, Zap, ArrowRight, Download, 
  Loader2, AlertTriangle, Trash2, ExternalLink,
  ChevronRight, FileText, CheckCircle
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
  const [projects, setProjects] = useState<PocketStore[]>(() => {
    const saved = localStorage.getItem('agentforge_library');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [view, setView] = useState<'editor' | 'history'>('editor');
  
  const currentProject = projects.find(p => p.id === activeProjectId) || null;

  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    localStorage.setItem('agentforge_library', JSON.stringify(projects));
  }, [projects]);

  const updateCurrentProject = (update: Partial<PocketStore>) => {
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId ? { ...p, ...update } : p
    ));
  };

  const handleStartClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newId = crypto.randomUUID();
    const newProject: PocketStore = {
      id: newId,
      idea_raw: inputValue,
      createdAt: Date.now(),
      mode: 'normal',
      language: 'FR',
      status: 'clarifying',
      currentStep: 'Initialisation...',
      questions: [],
      answers: {},
      artifacts: []
    };

    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newId);
    setView('editor');
    
    await clarifyNode(inputValue, (u) => {
      setProjects(prev => prev.map(p => p.id === newId ? { ...p, ...u } : p));
    });
  };

  const handleLaunchForge = async () => {
    if (!currentProject) return;
    updateCurrentProject({ status: 'generating', currentStep: 'Orchestration...' });
    await runAgentForge(currentProject, (u) => {
      setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, ...u } : p));
    });
  };

  const handleRefine = async (artifact: Artifact, instruction: string) => {
    if (!currentProject) return;
    await refineArtifactNode(artifact, instruction, currentProject, (u) => {
      setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, ...u } : p));
      if (selectedArtifact?.id === artifact.id) {
        const updated = u.artifacts?.find(a => a.id === artifact.id);
        if (updated) setSelectedArtifact(updated);
      }
    });
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Supprimer définitivement ce projet ?")) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeProjectId === id) setActiveProjectId(null);
    }
  };

  const downloadFullProject = (project: PocketStore) => {
    const content = project.artifacts.map(a => 
      `# ${a.title}\nRole: ${a.role}\nSummary: ${a.summary}\n\n${a.content}\n\n---`
    ).join('\n\n');
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AgentForge_${project.idea_raw.slice(0, 20)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex bg-[#09090b] text-[#E6E1E5] overflow-hidden">
      <DottedBackground />

      {/* Navigation Rail */}
      <nav className="w-20 border-r border-white/5 flex flex-col items-center py-8 gap-10 z-50 bg-[#09090b]">
        <div className="w-12 h-12 bg-[#007BFF] rounded-2xl flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-105 transition-all" onClick={() => setView('editor')}>
          <Zap className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-6 flex-1">
          <button 
            onClick={() => { setActiveProjectId(null); setView('editor'); setInputValue(''); }} 
            className={`p-3 rounded-full transition-all ${!activeProjectId && view === 'editor' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
          >
            <Plus className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setView('history')}
            className={`p-3 rounded-full transition-all ${view === 'history' ? 'bg-white/10 text-[#007BFF]' : 'text-zinc-500 hover:text-white'}`}
          >
            <History className="w-6 h-6" />
          </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-20 px-10 flex justify-between items-center border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tighter af-gradient-text uppercase">AgentForge</h1>
            {currentProject && (
              <span className="text-[9px] px-3 py-1 bg-white/5 border border-white/10 rounded-full text-zinc-400 uppercase tracking-widest font-black">
                {currentProject.status}
              </span>
            )}
          </div>
          {currentProject?.status === 'ready' && view === 'editor' && (
            <button 
              onClick={() => downloadFullProject(currentProject)}
              className="px-6 py-2 bg-[#007BFF] text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,123,255,0.3)]"
            >
              <Download className="w-4 h-4" /> EXPORT ALL
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {view === 'history' ? (
            <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
              <div className="space-y-2">
                <h2 className="text-5xl font-black tracking-tighter">Mes Projets</h2>
                <p className="text-zinc-500">Gérez et téléchargez les artefacts cumulés de vos sessions passées.</p>
              </div>

              {projects.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px] text-zinc-600 font-bold uppercase tracking-widest text-sm">
                   Aucun projet forgé pour le moment.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {projects.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => { setActiveProjectId(p.id); setView('editor'); }}
                      className="group bg-[#18181b] border border-white/5 rounded-[32px] p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 cursor-pointer hover:border-[#007BFF]/40 transition-all"
                    >
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                           <div className={`w-3 h-3 rounded-full ${p.status === 'ready' ? 'bg-green-500' : 'bg-[#007BFF]'}`} />
                           <h3 className="text-2xl font-bold group-hover:text-[#007BFF] transition-colors">{p.idea_raw}</h3>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                           {p.artifacts.map(art => (
                             <div key={art.id} className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-black uppercase tracking-tighter text-zinc-400 flex items-center gap-1.5">
                                <FileText className="w-3 h-3" /> {art.role.split(' ')[0]}
                             </div>
                           ))}
                           {p.status !== 'ready' && <div className="px-3 py-1 bg-[#007BFF]/10 text-[#007BFF] rounded-full text-[9px] font-black animate-pulse">EN COURS...</div>}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); downloadFullProject(p); }}
                          className="flex items-center gap-2 px-5 py-2.5 bg-white/5 rounded-xl text-xs font-bold hover:bg-[#007BFF] transition-all"
                        >
                          <Download className="w-4 h-4" /> EXPORT MD
                        </button>
                        <button 
                          onClick={(e) => handleDeleteProject(p.id, e)}
                          className="p-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <ChevronRight className="w-6 h-6 text-zinc-700 group-hover:text-[#007BFF] transition-all translate-x-0 group-hover:translate-x-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {(!currentProject || (currentProject.status === 'idle' && !activeProjectId)) && (
                <div className="max-w-4xl mx-auto mt-20 space-y-16 animate-in fade-in duration-700">
                  <div className="space-y-6 text-center">
                    <div className="inline-block px-4 py-1.5 bg-[#007BFF]/10 border border-[#007BFF]/20 rounded-full text-[10px] font-black text-[#007BFF] tracking-[0.3em] uppercase mb-4">
                      Système de Forge Multi-Agents
                    </div>
                    <h2 className="text-8xl font-black tracking-tighter af-gradient-text leading-[0.9]">Forge Ta Vision.</h2>
                    <p className="text-zinc-500 text-xl max-w-2xl mx-auto font-light">Transformez une idée vague en architecture technique et documentation produit complète en quelques minutes.</p>
                  </div>

                  <div className="space-y-12">
                    <form onSubmit={handleStartClarification} className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-[#007BFF] to-[#0056B3] rounded-[32px] blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
                      <div className="relative flex items-center bg-[#09090b] border border-white/10 rounded-[30px] p-3 pl-8 focus-within:border-[#007BFF] transition-all shadow-2xl">
                        <input 
                          type="text" 
                          placeholder="Décris ton idée (ex: Plateforme SaaS de gestion de flotte logistique...)" 
                          className="bg-transparent border-none outline-none flex-1 py-5 text-xl text-white placeholder-zinc-700"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                        />
                        <button type="submit" className="px-8 py-5 bg-[#007BFF] text-white rounded-[24px] flex items-center gap-3 font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(0,123,255,0.4)]">
                          Générer <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    </form>

                    <div className="grid grid-cols-3 gap-6">
                      {PACKS.map(p => (
                        <div 
                          key={p.id}
                          className="p-8 rounded-[32px] border border-white/5 bg-white/[0.02] flex flex-col gap-6 text-zinc-500 group transition-all hover:bg-white/[0.04]"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-[#007BFF]/10 group-hover:text-[#007BFF] transition-all">
                            {p.icon}
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm font-black uppercase tracking-widest text-zinc-400">{p.name}</div>
                            <div className="text-xs uppercase opacity-40">{p.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentProject?.status === 'clarifying' && (
                <div className="max-w-2xl mx-auto space-y-10 animate-in slide-in-from-bottom-8">
                   <div className="text-center space-y-2">
                    <h3 className="text-4xl font-black tracking-tighter">Cadrage Produit</h3>
                    <p className="text-zinc-500 font-medium italic">Répondez à ces questions pour orienter les agents.</p>
                   </div>
                  
                  {currentProject.questions.length === 0 ? (
                    <div className="flex flex-col items-center gap-6 py-24 bg-white/[0.02] rounded-[40px] border border-white/5">
                      <div className="relative">
                        <div className="absolute inset-0 bg-[#007BFF] blur-2xl opacity-20 animate-pulse"></div>
                        <Loader2 className="w-12 h-12 text-[#007BFF] animate-spin relative" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500">Synthèse de l'idée...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {currentProject.questions.map(q => (
                        <div key={q.id} className="p-8 bg-[#18181b] border border-white/5 rounded-[32px] space-y-6 focus-within:border-[#007BFF]/40 transition-all shadow-xl">
                          <div className="text-xl font-bold leading-tight">{q.text}</div>
                          <input 
                            type="text" 
                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white focus:border-[#007BFF] outline-none transition-all"
                            placeholder="Votre vision..."
                            value={currentProject.answers[q.id] || ''}
                            onChange={(e) => {
                              const newAnswers = { ...currentProject.answers, [q.id]: e.target.value };
                              updateCurrentProject({ answers: newAnswers });
                            }}
                          />
                        </div>
                      ))}
                      <button 
                        onClick={handleLaunchForge} 
                        className="w-full py-6 bg-[#007BFF] text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-sm hover:brightness-110 hover:scale-[1.02] active:scale-100 transition-all shadow-2xl"
                      >
                        Lancer l'Expertise Multi-Agents
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(currentProject?.status === 'generating' || currentProject?.status === 'ready') && (
                <div className="max-w-7xl mx-auto space-y-12">
                  {currentProject.status === 'generating' && (
                    <div className="sticky top-4 z-30 bg-[#18181b]/60 backdrop-blur-2xl py-8 px-10 rounded-[32px] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl animate-in slide-in-from-top-4">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-[#007BFF]/10 flex items-center justify-center">
                          <Loader2 className="w-7 h-7 text-[#007BFF] animate-spin" />
                        </div>
                        <div className="space-y-1 text-center md:text-left">
                           <div className="text-2xl font-black tracking-tight">{currentProject.currentStep}</div>
                           <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#007BFF]">Phase de construction active</div>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className={`w-8 h-1.5 rounded-full transition-all duration-1000 ${i < (currentProject.artifacts.length / 10 * 10) ? 'bg-[#007BFF] shadow-[0_0_10px_rgba(0,123,255,0.5)]' : 'bg-white/5'}`} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-500">
                    {currentProject.artifacts.map((a, i) => (
                      <ArtifactCard key={a.id} artifact={a} delay={i * 80} onClick={() => setSelectedArtifact(a)} />
                    ))}
                    {currentProject.status === 'generating' && (
                      <div className="h-[320px] rounded-[28px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-4 text-zinc-700 animate-pulse">
                         <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                            <Plus className="w-5 h-5" />
                         </div>
                         <span className="text-[10px] font-black uppercase tracking-widest">En attente...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <SideDrawer artifact={selectedArtifact} onClose={() => setSelectedArtifact(null)} onRefine={handleRefine} />
    </div>
  );
};

export default App;
