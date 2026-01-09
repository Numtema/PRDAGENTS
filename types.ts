
export enum ExpertRole {
  INTENT = 'Intent Analyst',
  CLARIFIER = 'Clarification Agent',
  CARTOGRAPHER = 'Product Cartographer',
  MARKET = 'Market Analyst',
  PRODUCT = 'Product Manager',
  UX = 'UX Researcher',
  ARCHITECT = 'System Architect',
  API = 'API Designer',
  SECURITY = 'Security Analyst',
  DATA = 'Data Architect',
  QA = 'QA Lead',
  DELIVERY = 'Release Manager',
  WRITER = 'Technical Writer',
  PROTOTYPER = 'Synthesis Expert'
}

export type ArtifactType = 
  | 'text' 
  | 'ui-layout' 
  | 'data-schema' 
  | 'ux-flow' 
  | 'prototype' 
  | 'api-spec'
  | 'security-spec'
  | 'market-analysis'
  | 'roadmap'
  | 'test-strategy'
  | 'persona-profile';

export interface Artifact {
  id: string;
  role: ExpertRole;
  title: string;
  summary: string;
  content: string;
  type: ArtifactType;
  confidence: number;
}

export interface Question {
  id: string;
  text: string;
  type: 'text' | 'choice';
  options?: string[];
}

export type ProjectMode = 'lite' | 'normal' | 'detailed';
export type ProjectLanguage = 'FR' | 'EN' | 'ES' | 'DE';

export interface PocketStore {
  id: string;
  idea_raw: string;
  createdAt: number;
  mode: ProjectMode;
  language: ProjectLanguage;
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
