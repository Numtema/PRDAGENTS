
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { PocketStore, ExpertRole, Artifact, ArtifactType } from "../types";

function safeJsonParse(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "");
  const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!match) return {};
  try { return JSON.parse(match[1]); } catch { return {}; }
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try { return await fn(); } catch (e: any) { 
      lastErr = e;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); 
    }
  }
  throw lastErr;
}

export async function clarifyNode(idea: string, emit: (u: Partial<PocketStore>) => void) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  emit({ currentStep: "L'Agent Clarificateur cadre votre projet...", status: 'clarifying' });
  const res = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Tu es l'Expert de Cadrage. Pose 4 questions stratégiques pour l'idée : "${idea}". Retourne UNIQUEMENT un JSON: { "questions": [{ "id": "q1", "text": "...", "type": "text" }] }`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;
  emit({ questions: safeJsonParse(res.text || "{}").questions || [] });
}

async function expertNode(role: ExpertRole, shared: PocketStore): Promise<Artifact> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let type: ArtifactType = 'text';
  let rolePrompt = "";

  switch(role) {
    case ExpertRole.AUDITOR:
      type = 'audit';
      rolePrompt = "Effectue un audit d'intégrité critique de l'ensemble du projet. Identifie les risques de sécurité, de performance et les conflits logiques entre les modules.";
      break;
    case ExpertRole.COMPONENTS:
      type = 'design-system';
      rolePrompt = "Génère un Design System minimaliste et une bibliothèque de COMPOSANTS UI Tailwind réutilisables (Boutons, Cards, Inputs, Modals).";
      break;
    case ExpertRole.AGENT_INITIALIZER:
      type = 'agent-spec';
      rolePrompt = `Génère un fichier 'AGENTS.md' (README pour agents IA comme Cursor/Aider). 
      INSTRUCTIONS OBLIGATOIRES :
      - Stack technique suggérée : Bun, Next.js (App Router), FastAPI (Python 3.12+), PostgreSQL.
      - Setup commands : 'pnpm install', 'bun run dev', 'pytest' pour le backend.
      - Code style : TypeScript strict mode, single quotes, ABSOLUMENT AUCUN POINT-VIRGULE (no semicolons).
      - Explique la philosophie AGENTS.md : un espace dédié aux instructions machine qui ne polluent pas le README humain.`;
      break;
    case ExpertRole.ARCHITECT:
      rolePrompt = "Définit l'architecture globale (Clean Architecture, DDD). Inclus des diagrammes Mermaid (Architecture Map, Flow).";
      break;
    case ExpertRole.DATA:
      type = 'data-schema';
      rolePrompt = "Conçoit le schéma de données SQL (Mermaid ERD) et les interfaces TypeScript (DMMF style).";
      break;
    case ExpertRole.QA:
      rolePrompt = "Définit la stratégie de test : Tests unitaires, d'intégration et E2E avec Playwright.";
      break;
  }

  const res = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Expert : ${role}. Projet : ${shared.idea_raw}. Intentions : ${JSON.stringify(shared.intent)}. ${rolePrompt}. 
    Retourne un JSON structuré avec "title", "summary", "content" (Markdown), "vitals" (estimations), "variants" (2 variantes techniques).`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;

  const json = safeJsonParse(res.text || "{}");
  return {
    id: `${role}_${Date.now()}`,
    role,
    title: json.title || role,
    summary: json.summary || "Analyse d'expert.",
    content: json.content || res.text || "",
    type,
    confidence: 0.98,
    vitals: json.vitals,
    audit: json.audit,
    variants: json.variants
  };
}

export async function runAgentForge(shared: PocketStore, emit: (u: Partial<PocketStore>) => void) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    emit({ status: 'generating', currentStep: "Extraction de l'Intention Stratégique..." });
    const intentRes = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Projet : ${shared.idea_raw}. Réponses : ${JSON.stringify(shared.answers)}. Extrais Goal, Target et Constraints en JSON.`,
      config: { responseMimeType: "application/json" }
    });
    const intent = safeJsonParse(intentRes.text || "{}");
    emit({ intent });

    const experts = [
      ExpertRole.STRATEGIST, ExpertRole.MARKET, ExpertRole.PRODUCT, 
      ExpertRole.COMPONENTS, ExpertRole.UX, ExpertRole.ARCHITECT, 
      ExpertRole.DATA, ExpertRole.API, ExpertRole.SECURITY, 
      ExpertRole.QA, ExpertRole.AGENT_INITIALIZER, ExpertRole.AUDITOR
    ];

    let artifacts: Artifact[] = [];
    for (const role of experts) {
      emit({ currentStep: `Forge en cours par : ${role}...` });
      const art = await expertNode(role, { ...shared, intent, artifacts });
      artifacts = [...artifacts, art];
      emit({ artifacts });
    }

    emit({ currentStep: "Génération du Prototype Maître (Interactivité Tailwind)..." });
    const protoRes = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Génère un prototype HTML/Tailwind complet, interactif et ultra-moderne pour : ${shared.idea_raw}.`,
    });
    
    const proto: Artifact = {
      id: `proto_${Date.now()}`,
      role: ExpertRole.PROTOTYPER,
      title: 'Prototype Master UI',
      summary: 'Interface web finale prête pour le développement.',
      content: (protoRes.text || "").replace(/```html/g, "").replace(/```/g, "").trim(),
      type: 'prototype',
      confidence: 1.0
    };

    emit({ artifacts: [...artifacts, proto], status: 'ready', currentStep: 'Forge terminée' });
  } catch (err: any) {
    emit({ status: 'error', currentStep: `Erreur : ${err.message}` });
  }
}

export async function refineArtifactNode(artifact: Artifact, instruction: string, shared: PocketStore, emit: (u: Partial<PocketStore>) => void) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  emit({ currentStep: `Raffinement de ${artifact.title}...` });
  const res = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Raffine ${artifact.content} selon : ${instruction}. Retourne JSON: { "title": "...", "content": "...", "summary": "..." }`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;
  const json = safeJsonParse(res.text || "{}");
  const newArtifacts = shared.artifacts.map(a => a.id === artifact.id ? { ...artifact, ...json } : a);
  emit({ artifacts: newArtifacts });
}
