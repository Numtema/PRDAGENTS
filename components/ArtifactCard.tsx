
import React from 'react';
import { Artifact, ExpertRole } from '../types';
import { 
  Shield, Code, Layout, Database, Terminal, 
  Target, Rocket, Zap, Users, Globe, Cpu, FileText, 
  Activity, Clock, ScanSearch, ShieldCheck, ShieldAlert,
  ChevronRight, MessageSquare, Layers
} from 'lucide-react';

interface ArtifactCardProps {
  artifact: Artifact;
  delay: number;
  onClick: () => void;
}

const getRoleIcon = (role: ExpertRole) => {
  // Fix: Replaced nonexistent ExpertRole references and updated mapping to align with ExpertRole enum
  switch (role) {
    case ExpertRole.STRATEGIST: return <Activity className="w-5 h-5" />;
    case ExpertRole.AUDITOR: return <ScanSearch className="w-5 h-5" />;
    case ExpertRole.MARKET: return <Globe className="w-5 h-5" />;
    case ExpertRole.PRODUCT: return <Target className="w-5 h-5" />;
    case ExpertRole.UX: return <Users className="w-5 h-5" />;
    case ExpertRole.ARCHITECT: return <Cpu className="w-5 h-5" />;
    case ExpertRole.API: return <Terminal className="w-5 h-5" />;
    case ExpertRole.SECURITY: return <Shield className="w-5 h-5" />;
    case ExpertRole.DATA: return <Database className="w-5 h-5" />;
    case ExpertRole.COMPONENTS: return <Layout className="w-5 h-5" />;
    case ExpertRole.PROTOTYPER: return <Zap className="w-5 h-5" />;
    case ExpertRole.AGENT_INITIALIZER: return <Rocket className="w-5 h-5" />;
    case ExpertRole.INTENT: return <Layers className="w-5 h-5" />;
    case ExpertRole.CLARIFIER: return <MessageSquare className="w-5 h-5" />;
    default: return <FileText className="w-5 h-5" />;
  }
};

const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, delay, onClick }) => {
  // Fix: Removed invalid 'artifact.type === "vitals"' check as 'vitals' is not a member of ArtifactType union. 
  // Checked for the presence of the optional 'vitals' property instead.
  const isVitals = !!artifact.vitals;
  const isAudit = artifact.type === 'audit' && artifact.audit;

  return (
    <div 
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className={`relative h-[300px] flex flex-col p-6 rounded-[28px] border transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-2 ${
        isVitals 
          ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-500/20' 
          : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-blue-500/50 hover:shadow-lg'
      }`}
    >
      <header className="flex justify-between items-center mb-6">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
          isVitals ? 'bg-white text-blue-600' : 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-600 group-hover:text-white'
        }`}>
          {getRoleIcon(artifact.role)}
        </div>
        <div className={`text-[10px] font-black uppercase tracking-widest ${
          isVitals ? 'text-blue-100' : 'text-slate-500'
        }`}>
          {(artifact.confidence * 100).toFixed(0)}% Conf.
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-hidden">
        <h4 className={`text-lg font-black leading-tight ${
          isVitals ? 'text-white' : 'text-[var(--text-primary)] group-hover:text-blue-500'
        }`}>
          {artifact.title}
        </h4>
        
        {isVitals ? (
          <div className="grid grid-cols-2 gap-2 mt-4">
             <div className="p-3 bg-white/10 rounded-xl space-y-1">
                <span className="text-[9px] font-black uppercase text-blue-100/50">Time to market</span>
                <p className="text-xs font-bold text-white">{artifact.vitals?.timeToMarket}</p>
             </div>
             <div className="p-3 bg-white/10 rounded-xl space-y-1">
                <span className="text-[9px] font-black uppercase text-blue-100/50">Budget</span>
                <p className="text-xs font-bold text-white">{artifact.vitals?.estimatedBudget}</p>
             </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 line-clamp-4 leading-relaxed italic">
            "{artifact.summary}"
          </p>
        )}

        {isAudit && (
          <div className="mt-2 p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center gap-3">
             <div className={`w-2 h-2 rounded-full ${artifact.audit?.status === 'pass' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Statut: {artifact.audit?.status}</span>
          </div>
        )}
      </div>

      <footer className="mt-auto pt-6 border-t border-[var(--border)] group-hover:border-blue-500/20 flex justify-between items-center transition-all">
        <span className={`text-[9px] font-black uppercase tracking-widest ${isVitals ? 'text-blue-200' : 'text-slate-500'}`}>
          {artifact.role}
        </span>
        <ChevronRight className={`w-4 h-4 transition-all ${isVitals ? 'text-white' : 'text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1'}`} />
      </footer>
    </div>
  );
};

export default ArtifactCard;
