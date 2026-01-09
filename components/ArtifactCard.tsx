
import React from 'react';
import { Artifact, ExpertRole } from '../types';
import { 
  Shield, Code, Layout, Database, Terminal, 
  Search, Target, Rocket, Zap, Users,
  Globe, Briefcase, Cpu, FileText
} from 'lucide-react';

interface ArtifactCardProps {
  artifact: Artifact;
  delay: number;
  onClick: () => void;
}

const getRoleIcon = (role: ExpertRole) => {
  switch (role) {
    case ExpertRole.MARKET: return <Globe className="w-5 h-5" />;
    case ExpertRole.PRODUCT: return <Target className="w-5 h-5" />;
    case ExpertRole.UX: return <Users className="w-5 h-5" />;
    case ExpertRole.ARCHITECT: return <Cpu className="w-5 h-5" />;
    case ExpertRole.API: return <Terminal className="w-5 h-5" />;
    case ExpertRole.SECURITY: return <Shield className="w-5 h-5" />;
    case ExpertRole.DATA: return <Database className="w-5 h-5" />;
    case ExpertRole.QA: return <Shield className="w-5 h-5" />;
    case ExpertRole.DELIVERY: return <Rocket className="w-5 h-5" />;
    case ExpertRole.WRITER: return <FileText className="w-5 h-5" />;
    case ExpertRole.PROTOTYPER: return <Zap className="w-5 h-5" />;
    default: return <Code className="w-5 h-5" />;
  }
};

const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, delay, onClick }) => {
  return (
    <div 
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className="m3-card group cursor-pointer flex flex-col p-6 h-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#007BFF]/10 text-[#007BFF] flex items-center justify-center group-hover:bg-[#007BFF] group-hover:text-white transition-all">
          {getRoleIcon(artifact.role)}
        </div>
        <div className="flex-1 overflow-hidden">
          <h4 className="font-bold text-white truncate">{artifact.title}</h4>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{artifact.role}</span>
        </div>
        <div className="px-2 py-1 bg-white/5 rounded text-[8px] font-mono text-zinc-400">
          CONF {(artifact.confidence * 100).toFixed(0)}%
        </div>
      </div>

      <div className="flex-1 bg-[#09090b] rounded-2xl p-4 overflow-hidden border border-white/5 group-hover:border-[#007BFF]/30 transition-all">
        <p className="text-sm text-zinc-400 leading-relaxed italic line-clamp-6">
          "{artifact.summary}"
        </p>
      </div>

      <div className="mt-6 flex justify-between items-center">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#007BFF]">Consulter l'artefact</span>
        <div className="w-2 h-2 rounded-full bg-[#007BFF] animate-pulse" />
      </div>
    </div>
  );
};

export default ArtifactCard;
