
import React from 'react';
import { Artifact, ExpertRole } from '../types';
import { 
  Shield, Code, Layout, Database, Terminal, 
  Search, Target, Rocket, Zap, Users,
  Globe, Briefcase, Cpu, FileText, Activity, Clock, Server, AlertCircle,
  ShieldCheck, ShieldAlert, ScanSearch
} from 'lucide-react';

interface ArtifactCardProps {
  artifact: Artifact;
  delay: number;
  onClick: () => void;
}

const getRoleIcon = (role: ExpertRole) => {
  switch (role) {
    case ExpertRole.STRATEGIST: return <Activity className="w-4 h-4" />;
    case ExpertRole.AUDITOR: return <ScanSearch className="w-4 h-4" />;
    case ExpertRole.MARKET: return <Globe className="w-4 h-4" />;
    case ExpertRole.PRODUCT: return <Target className="w-4 h-4" />;
    case ExpertRole.UX: return <Users className="w-4 h-4" />;
    case ExpertRole.ARCHITECT: return <Cpu className="w-4 h-4" />;
    case ExpertRole.API: return <Terminal className="w-4 h-4" />;
    case ExpertRole.SECURITY: return <Shield className="w-4 h-4" />;
    case ExpertRole.DATA: return <Database className="w-4 h-4" />;
    case ExpertRole.QA: return <ShieldCheck className="w-4 h-4" />;
    case ExpertRole.DELIVERY: return <Rocket className="w-4 h-4" />;
    case ExpertRole.WRITER: return <FileText className="w-4 h-4" />;
    case ExpertRole.PROTOTYPER: return <Zap className="w-4 h-4" />;
    default: return <Code className="w-4 h-4" />;
  }
};

const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, delay, onClick }) => {
  const isVitals = artifact.type === 'vitals' && artifact.vitals;
  const isAudit = artifact.type === 'audit' && artifact.audit;

  return (
    <div 
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className={`border rounded-[28px] p-6 h-[320px] flex flex-col group cursor-pointer transition-all animate-in fade-in slide-in-from-bottom-2 ${
        isVitals 
          ? 'bg-gradient-to-br from-[#18181b] to-[#007BFF]/10 border-[#007BFF]/20 shadow-[0_0_30px_rgba(0,123,255,0.1)]' 
          : isAudit
          ? 'bg-gradient-to-br from-[#18181b] to-zinc-800 border-zinc-700 shadow-xl'
          : 'bg-[#18181b] border-white/5 hover:border-[#007BFF]/40'
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          isVitals ? 'bg-[#007BFF] text-white' : 
          isAudit ? 'bg-zinc-700 text-white border border-white/10' :
          'bg-white/5 group-hover:bg-[#007BFF] group-hover:text-white'
        }`}>
          {getRoleIcon(artifact.role)}
        </div>
        <div className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
          isVitals ? 'text-[#007BFF]' : 
          isAudit ? 'text-zinc-400' :
          'text-zinc-600 group-hover:text-[#007BFF]'
        }`}>
          {(artifact.confidence * 100).toFixed(0)}% CONF
        </div>
      </div>

      <div className="flex-1 space-y-4">
        <h4 className={`text-lg font-bold transition-colors ${
          isVitals ? 'text-white' : 
          isAudit ? 'text-zinc-100' :
          'text-white group-hover:text-[#007BFF]'
        }`}>
          {artifact.title}
        </h4>
        
        {isVitals && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-black/40 rounded-2xl border border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-bold uppercase tracking-widest">
                <Clock className="w-3 h-3" /> Market
              </div>
              <div className="text-sm font-black text-white">{artifact.vitals?.timeToMarket}</div>
            </div>
            <div className="p-3 bg-black/40 rounded-2xl border border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-bold uppercase tracking-widest">
                <Activity className="w-3 h-3" /> Complex.
              </div>
              <div className="flex items-center gap-1.5">
                <div className="text-sm font-black text-white">{artifact.vitals?.complexity}/10</div>
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#007BFF]" style={{ width: `${(artifact.vitals?.complexity || 0) * 10}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {isAudit && (
          <div className="space-y-3">
             <div className="flex items-center gap-3 p-3 bg-black/20 rounded-2xl border border-white/5">
                <div className={`w-3 h-3 rounded-full animate-pulse ${
                  artifact.audit?.status === 'pass' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' :
                  artifact.audit?.status === 'warning' ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' :
                  'bg-red-500 shadow-[0_0_10px_#ef4444]'
                }`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                  SANTÉ : {artifact.audit?.status === 'pass' ? 'EXCELLENTE' : artifact.audit?.status === 'warning' ? 'VIGILANCE' : 'CONFLITS DÉTECTÉS'}
                </span>
             </div>
             <div className="space-y-2">
                {artifact.audit?.findings.slice(0, 2).map((f, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <ShieldAlert className={`w-3 h-3 shrink-0 mt-0.5 ${
                      f.severity === 'high' ? 'text-red-500' : 'text-amber-500'
                    }`} />
                    <p className="text-[10px] text-zinc-500 leading-tight italic line-clamp-2">
                      {f.text}
                    </p>
                  </div>
                ))}
             </div>
          </div>
        )}

        {!isVitals && !isAudit && (
          <p className="text-sm text-zinc-500 line-clamp-4 leading-relaxed font-light italic">
            "{artifact.summary}"
          </p>
        )}
      </div>

      <div className={`pt-6 border-t border-white/5 flex justify-between items-center transition-all ${
        isVitals || isAudit ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'
      }`}>
        <span className="text-[10px] font-black uppercase tracking-widest">{artifact.role}</span>
        <div className={`w-1.5 h-1.5 rounded-full ${
          isVitals ? 'bg-[#007BFF] animate-pulse shadow-[0_0_10px_#007BFF]' : 
          isAudit ? 'bg-zinc-400' : 'bg-[#007BFF]'
        }`} />
      </div>
    </div>
  );
};

export default ArtifactCard;
