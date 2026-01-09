
export enum ExpertRole {
  INTENT = 'Analyste d\'Intention',
  CLARIFIER = 'Agent de Clarification',
  STRATEGIST = 'Stratège Business',
  MARKET = 'Analyste Marché',
  PRODUCT = 'Product Manager',
  COMPONENTS = 'Expert Design System',
  UX = 'UX Researcher',
  ARCHITECT = 'Architecte Système',
  DATA = 'Data Architect',
  API = 'API Designer',
  SECURITY = 'Expert Sécurité',
  QA = 'QA Lead / Test Strategy',
  AGENT_INITIALIZER = 'Agent d\'Intégration (AGENTS.md)',
  AUDITOR = 'Auditeur d\'Intégrité',
  PROTOTYPER = 'Expert Synthèse (Prototype)'
}

export type ArtifactType = 
  | 'text' 
  | 'prototype' 
  | 'data-schema' 
  | 'audit' 
  | 'design-system' 
  | 'agent-spec';

export interface ArtifactVariant {
  id: string;
  label: string;
  description: string;
  content: string;
}

export interface Artifact {
  id: string;
  role: ExpertRole;
  title: string;
  summary: string;
  content: string;
  type: ArtifactType;
  confidence: number;
  vitals?: {
    timeToMarket: string;
    complexity: number;
    securityRisk: 'low' | 'medium' | 'high';
    estimatedBudget: string;
  };
  audit?: {
    status: 'pass' | 'warning' | 'fail';
    findings: { type: 'conflict' | 'missing' | 'risk'; text: string; severity: 'low' | 'medium' | 'high' }[];
  };
  variants?: ArtifactVariant[];
}

export interface Question {
  id: string;
  text: string;
  type: 'text' | 'choice';
  options?: string[];
}

export interface PocketStore {
  id: string;
  idea_raw: string;
  createdAt: number;
  status: 'idle' | 'clarifying' | 'generating' | 'ready' | 'error';
  currentStep: string;
  questions: Question[];
  answers: Record<string, string>;
  intent?: {
    goal: string;
    target: string;
    constraints: string[];
  };
  app_map?: {
    modules: { name: string; description: string; features: string[] }[];
  };
  artifacts: Artifact[];
}
