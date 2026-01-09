
import React, { useState, useEffect } from 'react';
import { 
  Plus, History, Briefcase, ShieldCheck, Zap, ArrowRight, Download, 
  Loader2, Trash2, ChevronRight, Moon, Sun, Layout, Layers, 
  MessageSquare, Box, FileOutput, FileText, Archive, Terminal, Cpu, CheckCircle
} from 'lucide-react';
import JSZip from 'jszip';
import { PocketStore, Artifact, ExpertRole } from './types';
import { clarifyNode, runAgentForge, refineArtifactNode } from './services/pocketFlow';
import ArtifactCard from './components/ArtifactCard';
import SideDrawer from './components/SideDrawer';
import DottedBackground from './components/DottedBackground';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('af_theme') as 'light' | 'dark') || 'dark');
  const [projects, setProjects] = useState<PocketStore[]>(() => JSON.parse(localStorage.getItem('agentforge_library_v2') || '[]'));
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [view, setView] = useState<'editor' | 'history' | 'landing'>('landing');
  const [inputValue, setInputValue] = useState('');
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const currentProject = projects.find(p => p.id === activeProjectId) || null;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('af_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('agentforge_library_v2', JSON.stringify(projects));
  }, [projects]);

  const updateCurrentProject = (update: Partial<PocketStore>) => {
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, ...update } : p));
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    const newId = crypto.randomUUID();
    const newProject: PocketStore = {
      id: newId, idea_raw: inputValue, createdAt: Date.now(),
      status: 'idle', currentStep: 'Analyse initiale...',
      questions: [], answers: {}, artifacts: []
    };
    
    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newId);
    setView('editor');
    setInputValue('');
    
    // Appel au service de clarification
    await clarifyNode(newProject.idea_raw, (u) => {
      setProjects(prev => prev.map(p => p.id === newId ? { ...p, ...u } : p));
    });
  };

  const handleLaunchForge = async () => {
    if (!currentProject) return;
    await runAgentForge(currentProject, (u) => {
      setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, ...u } : p));
    });
  };

  const handleRefine = async (artifact: Artifact, instruction: string) => {
    if (!currentProject) return;
    await refineArtifactNode(artifact, instruction, currentProject, (u) => {
      setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, ...u } : p));
    });
  };

  const exportProjectToZip = async (project: PocketStore) => {
    if (!project) return;
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const safeTitle = project.idea_raw.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      zip.file("README.md", `# Projet : ${project.idea_raw}\n\nArchitecture : Bun, FastAPI, NextJS.\n`);
      const agentSpec = project.artifacts.find(a => a.role === ExpertRole.AGENT_INITIALIZER);
      if (agentSpec) zip.file("AGENTS.md", agentSpec.content);
      const docF = zip.folder("1_Documentation");
      project.artifacts.forEach(art => {
        if (art.type !== 'prototype') docF?.file(`${art.title}.md`, `# ${art.title}\n\n${art.content}`);
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `forge_${safeTitle}.zip`;
      link.click();
    } catch (err) { alert("Erreur d'exportation."); } finally { setIsExporting(false); }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <DottedBackground />
      <nav className="w-16 md:w-20 border-r border-[var(--border)] flex flex-col items-center py-8 gap-10 z-[60] bg-[var(--bg-secondary)] h-screen sticky top-0">
        <div onClick={() => setView('landing')} className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white cursor-pointer shadow-xl hover:scale-105 active:scale-95 transition-all"><Zap className="w-6 h-6" /></div>
        <div className="flex flex-col gap-8 flex-1">
          <button onClick={() => setView('landing')} className={`p-3 rounded-full transition-all ${view === 'landing' ? 'bg-blue-600/10 text-blue-600' : 'text-slate-500 hover:text-blue-600'}`}><Plus /></button>
          <button onClick={() => setView('history')} className={`p-3 rounded-full transition-all ${view === 'history' ? 'bg-blue-600/10 text-blue-600' : 'text-slate-500 hover:text-blue-600'}`}><History /></button>
        </div>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-3 text-slate-500 hover:text-yellow-500 transition-all">{theme === 'dark' ? <Sun /> : <Moon />}</button>
      </nav>

      <div className="flex-1 flex flex-col relative min-w-0">
        <header className="h-16 md:h-20 px-6 md:px-10 flex justify-between items-center border-b border-[var(--border)] glass sticky top-0 z-50">
          <div className="flex items-center gap-4 truncate">
            <h1 className="text-xl font-black af-gradient-text tracking-tighter uppercase">AgentForge</h1>
            {currentProject && <span className="text-xs font-bold text-slate-500 truncate max-w-xs">{currentProject.idea_raw}</span>}
          </div>
          <div className="flex items-center gap-3">
            {currentProject && currentProject.artifacts.length > 0 && (
              <button disabled={isExporting} onClick={() => exportProjectToZip(currentProject)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-50 shadow-lg">
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                <span className="hidden sm:inline">Exporter ZIP de Production</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-10 relative z-10 custom-scrollbar">
          {view === 'landing' && (
            <div className="max-w-4xl mx-auto mt-24 space-y-16 animate-in fade-in zoom-in-95">
              <div className="text-center space-y-6">
                <div className="px-4 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-widest rounded-full inline-block">Product Engineering Multi-Agent</div>
                <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-none af-gradient-text">Forge ta vision.</h2>
                <p className="text-slate-500 text-xl font-light">Transformez votre idée brute en un projet structuré : Bun • FastAPI • NextJS.</p>
              </div>
              <form onSubmit={createProject} className="max-w-3xl mx-auto px-4 relative group">
                <div className="absolute -inset-1 bg-blue-600 rounded-[32px] blur opacity-10 group-focus-within:opacity-30 transition"></div>
                <div className="relative flex items-center bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[28px] p-2 shadow-2xl">
                  <input type="text" placeholder="Décrivez votre idée de SaaS..." className="bg-transparent border-none outline-none flex-1 py-4 px-6 text-xl placeholder:text-slate-400" value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
                  <button type="submit" className="px-8 py-5 bg-blue-600 text-white rounded-[22px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"><ArrowRight /></button>
                </div>
              </form>
            </div>
          )}

          {view === 'editor' && currentProject && (
            <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4">
              <div className="p-8 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[32px] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600">{currentProject.status === 'ready' ? <CheckCircle className="w-8 h-8" /> : <Loader2 className="w-8 h-8 animate-spin" />}</div>
                    <div>
                      <h3 className="text-xl font-black">{currentProject.currentStep}</h3>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {currentProject.status === 'clarifying' ? 'Phase de Cadrage' : `${currentProject.artifacts.length} / 13 experts consultés`}
                      </p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <div className="px-3 py-1 bg-slate-500/10 rounded-full text-[9px] font-black text-slate-500 uppercase border border-slate-500/10">NextJS</div>
                    <div className="px-3 py-1 bg-slate-500/10 rounded-full text-[9px] font-black text-slate-500 uppercase border border-slate-500/10">FastAPI</div>
                    <div className="px-3 py-1 bg-slate-500/10 rounded-full text-[9px] font-black text-slate-500 uppercase border border-slate-500/10">Bun</div>
                 </div>
              </div>

              {currentProject.status === 'clarifying' && (
                <div className="max-w-4xl mx-auto space-y-10 py-10">
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black">Précision de la Vision</h2>
                    <p className="text-slate-500">Nos agents ont besoin de ces détails pour forger votre architecture.</p>
                  </div>
                  
                  {currentProject.questions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                       <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                       <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Génération des questions stratégiques...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-8">
                      {currentProject.questions.map(q => (
                        <div key={q.id} className="p-8 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[32px] space-y-4 hover:border-blue-600/40 transition-all shadow-sm">
                          <p className="font-bold text-lg leading-tight">{q.text}</p>
                          <input className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4 text-sm focus:border-blue-600 outline-none transition-all shadow-inner" placeholder="Votre réponse experte..." value={currentProject.answers[q.id] || ''} onChange={(e) => updateCurrentProject({ answers: { ...currentProject.answers, [q.id]: e.target.value } })} />
                        </div>
                      ))}
                      <button onClick={handleLaunchForge} className="md:col-span-2 py-7 bg-blue-600 text-white rounded-[24px] font-black uppercase tracking-widest shadow-2xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3">
                        <Zap className="w-6 h-6" /> Lancer la Forge Complète
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(currentProject.status === 'generating' || currentProject.status === 'ready') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-32">
                  {currentProject.artifacts.map((art, idx) => (
                    <ArtifactCard key={art.id} artifact={art} delay={idx * 50} onClick={() => setSelectedArtifact(art)} />
                  ))}
                  {currentProject.status === 'generating' && (
                    <div className="h-[300px] border-2 border-dashed border-[var(--border)] rounded-[28px] flex flex-col items-center justify-center gap-4 bg-slate-500/5 animate-pulse">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center px-6">Forgeage par l'expert en cours...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {view === 'history' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
              <h2 className="text-4xl font-black af-gradient-text tracking-tighter">Mes Forges Archivées</h2>
              <div className="grid grid-cols-1 gap-4">
                {projects.map(p => (
                  <div key={p.id} onClick={() => { setActiveProjectId(p.id); setView('editor'); }} className="p-8 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[32px] flex justify-between items-center group cursor-pointer hover:border-blue-600/40 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 shrink-0"><Box /></div>
                      <div className="truncate">
                        <h4 className="font-bold text-xl group-hover:text-blue-500 transition-colors truncate">{p.idea_raw}</h4>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{p.artifacts.length} Assets forgerés • {new Date(p.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-blue-600 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
      <SideDrawer artifact={selectedArtifact} onClose={() => setSelectedArtifact(null)} onRefine={handleRefine} />
    </div>
  );
};

export default App;
