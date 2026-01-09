
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
    case ExpertRole.MARKET: return <Globe className="w-4 h-4" />;
    case ExpertRole.PRODUCT: return <Target className="w-4 h-4" />;
    case ExpertRole.UX: return <Users className="w-4 h-4" />;
    case ExpertRole.ARCHITECT: return <Cpu className="w-4 h-4" />;
    case ExpertRole.API: return <Terminal className="w-4 h-4" />;
    case ExpertRole.SECURITY: return <Shield className="w-4 h-4" />;
    case ExpertRole.DATA: return <Database className="w-4 h-4" />;
    case ExpertRole.QA: return <Shield className="w-4 h-4" />;
    case ExpertRole.DELIVERY: return <Rocket className="w-4 h-4" />;
    case ExpertRole.WRITER: return <FileText className="w-4 h-4" />;
    case ExpertRole.PROTOTYPER: return <Zap className="w-4 h-4" />;
    default: return <Code className="w-4 h-4" />;
  }
};

const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, delay, onClick }) => {
  return (
    <div 
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className="bg-[#18181b] border border-white/5 rounded-[28px] p-6 h-[320px] flex flex-col group cursor-pointer hover:border-[#007BFF]/40 transition-all animate-in fade-in slide-in-from-bottom-2"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[#007BFF] group-hover:text-white transition-all">
          {getRoleIcon(artifact.role)}
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 group-hover:text-[#007BFF] transition-all">
          {(artifact.confidence * 100).toFixed(0)}% CONF
        </div>
      </div>

      <div className="flex-1 space-y-3">
        <h4 className="text-lg font-bold text-white group-hover:text-[#007BFF] transition-colors">{artifact.title}</h4>
        <p className="text-sm text-zinc-500 line-clamp-4 leading-relaxed font-light italic">
          "{artifact.summary}"
        </p>
      </div>

      <div className="pt-6 border-t border-white/5 flex justify-between items-center opacity-40 group-hover:opacity-100 transition-all">
        <span className="text-[10px] font-black uppercase tracking-widest">{artifact.role}</span>
        <div className="w-1.5 h-1.5 rounded-full bg-[#007BFF]" />
      </div>
    </div>
  );
};

export default ArtifactCard;
