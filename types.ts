
export enum ExpertRole {
  // CORE
  INTENT = 'Intent Analyst',
  CLARIFIER = 'Clarification Agent',
  CARTOGRAPHER = 'Product Cartographer',
  
  // STRATEGY
  MARKET = 'Market Analyst',
  PRODUCT = 'Product Manager',
  UX = 'UX Researcher',
  
  // TECH
  ARCHITECT = 'System Architect',
  API = 'API Designer',
  SECURITY = 'Security Analyst',
  DATA = 'Data Architect',
  
  // DELIVERY
  QA = 'QA Lead',
  DELIVERY = 'Release Manager',
  WRITER = 'Technical Writer',
  
  // SYNTHESIS
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
  projection?: any;
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
  idea_raw: string;
  mode: ProjectMode;
  language: ProjectLanguage;
  status: 'idle' | 'clarifying' | 'generating' | 'ready' | 'error';
  currentStep: string;
  
  // Clarification
  questions: Question[];
  answers: Record<string, string>;
  
  // Context
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
