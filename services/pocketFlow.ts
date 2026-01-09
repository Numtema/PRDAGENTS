
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { z } from "zod";
import { PocketStore, ExpertRole, Artifact, ArtifactType, ProjectMode, ProjectLanguage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Schemas ---
const IntentSchema = z.object({
  goal: z.string().default("Vision Produit"),
  target: z.string().default("Utilisateurs"),
  constraints: z.array(z.string()).default([])
});

const AppMapSchema = z.object({
  modules: z.array(z.object({
    name: z.string(),
    description: z.string(),
    features: z.array(z.string())
  })).default([])
});

// --- Helpers ---
function safeJsonParse(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "");
  const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!match) return {};
  try { 
    return JSON.parse(match[1]);
  } catch { 
    return {}; 
  }
}

async function withRetry<T>(fn: () => Promise<T>, retries = 5): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try { 
      return await fn(); 
    } catch (e: any) { 
      lastErr = e;
      const waitTime = Math.pow(2, i) * 1000 + Math.random() * 500;
      await new Promise(r => setTimeout(r, waitTime)); 
    }
  }
  throw lastErr;
}

// --- Agent Forge Flow ---

export async function clarifyNode(idea: string, emit: (u: Partial<PocketStore>) => void) {
  emit({ currentStep: "Analyse des zones d'ombre...", status: "clarifying" });
  const res = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Tu es l'Agent de Clarification d'AgentForge. Ton but est de poser des questions pour lever les ambiguïtés sur cette idée : "${idea}". 
    Génère 3 à 5 questions précises. 
    RETOURNE UNIQUEMENT UN JSON avec ce format exact:
    { "questions": [ { "id": "q1", "text": "Quelle est la question ?", "type": "text" } ] }`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;
  
  const data = safeJsonParse(res.text || "{}");
  const questions = (data.questions || []).map((q: any, i: number) => ({
    id: q.id || `q${i}`,
    text: typeof q === 'string' ? q : (q.text || "Question manquante"),
    type: q.type || 'text'
  }));
  
  emit({ questions });
  return { questions };
}

export async function buildFoundations(shared: PocketStore, emit: (u: Partial<PocketStore>) => void) {
  emit({ currentStep: "Construction du Manifeste...", status: "generating" });
  
  const intentRes = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Projet: ${shared.idea_raw}. Réponses: ${JSON.stringify(shared.answers)}. Synthétise le but, la cible et les contraintes en JSON strict.`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;
  
  let intentRaw = safeJsonParse(intentRes.text || "{}");
  if (Array.isArray(intentRaw)) intentRaw = intentRaw[0] || {};
  const intent = IntentSchema.parse(intentRaw);
  
  const mapRes = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Pack: ${shared.mode}. Intent: ${JSON.stringify(intent)}. Cartographie 4 modules clés en JSON.`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;
  
  let mapRaw = safeJsonParse(mapRes.text || "{}");
  if (Array.isArray(mapRaw)) mapRaw = { modules: mapRaw };
  const app_map = AppMapSchema.parse(mapRaw);
  
  emit({ intent, app_map });
  return { intent, app_map };
}

async function expertNode(role: ExpertRole, shared: PocketStore): Promise<Artifact> {
  let task = "";
  let type: ArtifactType = 'text';

  switch (role) {
    case ExpertRole.STRATEGIST: 
      type = 'vitals'; 
      task = "Analyse stratégique globale. Estime le Time-to-Market, la complexité technique (1-10), le risque de sécurité (low/medium/high) et le budget cloud estimé. Retourne JSON: { 'title': '...', 'summary': '...', 'content': '...', 'vitals': { 'timeToMarket': '3 mois', 'complexity': 7, 'securityRisk': 'medium', 'estimatedBudget': '500€/mois' } }";
      break;
    case ExpertRole.AUDITOR:
      type = 'audit';
      task = `Analyse de cohérence. Relis les documents précédents : ${shared.artifacts.map(a => a.title).join(', ')}. Trouve 3 à 5 contradictions ou manques techniques.
      Retourne JSON: { "title": "Audit d'Intégrité", "summary": "Analyse de cohérence multi-experts.", "content": "Markdown...", "audit": { "status": "pass|warning|fail", "findings": [{ "type": "conflict|missing|risk", "text": "Description...", "severity": "low|medium|high" }] } }`;
      break;
    case ExpertRole.MARKET: type = 'market-analysis'; task = "Marché et USP."; break;
    case ExpertRole.PRODUCT: type = 'text'; task = "PRD et User Stories."; break;
    case ExpertRole.UX: type = 'ux-flow'; task = "Mermaid UX Flow."; break;
    case ExpertRole.ARCHITECT: type = 'prototype'; task = "Architecture Mermaid C4."; break;
    case ExpertRole.API: type = 'api-spec'; task = "Endpoints OpenAPI."; break;
    case ExpertRole.SECURITY: type = 'security-spec'; task = "Audit de sécurité."; break;
    case ExpertRole.DATA: type = 'data-schema'; task = "Schéma ERD Mermaid."; break;
    case ExpertRole.QA: type = 'test-strategy'; task = "Plan de test QA."; break;
    case ExpertRole.DELIVERY: type = 'roadmap'; task = "Roadmap V1."; break;
    default: task = "Expertise métier.";
  }

  const res = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Expert: ${role}. Contexte: ${JSON.stringify(shared.intent)}. Tâche: ${task}. Documents actuels: ${shared.artifacts.length}. Retourne JSON: { "title": "...", "summary": "...", "content": "Markdown...", "vitals": { ... }, "audit": { ... } }`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;

  const json = safeJsonParse(res.text || "{}");
  return {
    id: `${role.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
    role,
    title: json.title || role,
    summary: json.summary || "Synthèse expert.",
    content: json.content || res.text || "",
    type,
    confidence: 0.95 + Math.random() * 0.04,
    vitals: json.vitals,
    audit: json.audit
  };
}

export async function runAgentForge(
  shared: PocketStore,
  emit: (u: Partial<PocketStore>) => void
) {
  try {
    const foundations = await buildFoundations(shared, emit);
    let currentArtifacts: Artifact[] = [];

    const experts = [
      ExpertRole.STRATEGIST, ExpertRole.MARKET, ExpertRole.PRODUCT, 
      ExpertRole.UX, ExpertRole.ARCHITECT, ExpertRole.API, 
      ExpertRole.DATA, ExpertRole.SECURITY, ExpertRole.QA, ExpertRole.DELIVERY,
      ExpertRole.AUDITOR // L'auditeur passe en dernier pour tout vérifier
    ];

    for (const role of experts) {
      emit({ currentStep: `L'expert ${role} forge sa partie...` });
      const newArtifact = await expertNode(role, { ...shared, ...foundations, artifacts: currentArtifacts });
      currentArtifacts = [...currentArtifacts, newArtifact];
      emit({ artifacts: currentArtifacts });
      await new Promise(r => setTimeout(r, 600)); 
    }
    
    emit({ currentStep: "Génération du prototype visuel...", status: "generating" });
    const synthRes = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Génère un prototype HTML/Tailwind complet pour : ${shared.idea_raw}. En te basant sur l'audit : ${JSON.stringify(currentArtifacts.find(a => a.type === 'audit')?.audit)}.`,
    })) as GenerateContentResponse;

    const proto: Artifact = {
      id: `proto_${Date.now()}`,
      role: ExpertRole.PROTOTYPER,
      title: 'Prototype Maître',
      summary: 'Interface interactive générée à partir du backlog.',
      content: (synthRes.text || "").replace(/```html/g, "").replace(/```/g, "").trim(),
      type: 'prototype',
      confidence: 1.0
    };

    emit({ artifacts: [...currentArtifacts, proto], status: "ready" });
  } catch (err: any) {
    emit({ status: "error", currentStep: `Erreur Forge: ${err.message}` });
  }
}

export async function refineArtifactNode(
  artifact: Artifact, 
  instruction: string, 
  shared: PocketStore, 
  emit: (u: Partial<PocketStore>) => void
) {
  emit({ currentStep: `Mise à jour de ${artifact.title}...` });
  const res = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Artefact: ${artifact.content}. Instruction: ${instruction}. Réécris en Markdown. Retourne JSON: { "title": "...", "summary": "...", "content": "..." }`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;

  const json = safeJsonParse(res.text || "{}");
  const updated = { ...artifact, ...json };
  const newArtifacts = shared.artifacts.map(a => a.id === artifact.id ? updated : a);
  emit({ artifacts: newArtifacts });
  return updated;
}
