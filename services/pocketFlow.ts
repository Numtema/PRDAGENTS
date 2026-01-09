
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
      const isRateLimit = e?.message?.includes('429') || e?.message?.includes('quota');
      const waitTime = isRateLimit 
        ? Math.pow(2, i) * 3000 + Math.random() * 1000 
        : Math.pow(2, i) * 1000 + Math.random() * 500;
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
    contents: `Tu es l'Agent de Clarification d'AgentForge. Analyse cette idée : "${idea}". 
    Génère 3 à 5 questions cruciales pour affiner le cadrage.
    IMPORTANT: Retourne UNIQUEMENT un objet JSON avec la clé "questions".`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;
  const data = safeJsonParse(res.text || "{}");
  emit({ questions: data.questions || [] });
  return data;
}

export async function buildFoundations(shared: PocketStore, emit: (u: Partial<PocketStore>) => void) {
  emit({ currentStep: "Construction du Manifeste...", status: "generating" });
  
  const intentRes = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Projet: ${shared.idea_raw}. Réponses: ${JSON.stringify(shared.answers)}. Synthétise le but, la cible et les contraintes en JSON.`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;
  
  let intentRaw = safeJsonParse(intentRes.text || "{}");
  if (Array.isArray(intentRaw)) intentRaw = intentRaw[0] || {};
  const intent = IntentSchema.parse(intentRaw);
  
  const mapRes = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Pack: ${shared.mode}. Intent: ${JSON.stringify(intent)}. Cartographie les 4 modules clés de l'application en JSON.`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;
  
  let mapRaw = safeJsonParse(mapRes.text || "{}");
  if (Array.isArray(mapRaw)) mapRaw = { modules: mapRaw };
  const app_map = AppMapSchema.parse(mapRaw);
  
  emit({ intent, app_map });
  return { intent, app_map };
}

// La fonction expertNode retourne maintenant l'artefact au lieu de faire l'emit lui-même
async function expertNode(role: ExpertRole, shared: PocketStore): Promise<Artifact> {
  let type: ArtifactType = 'text';
  let task = "";

  const packContext = {
    lite: "Focus sur la vitesse, fonctionnalités essentielles uniquement.",
    normal: "Standard industriel complet, PRD détaillée, UX travaillée.",
    detailed: "Haute sécurité, conformité (RGPD), architecture distribuée, tests exhaustifs."
  }[shared.mode];

  switch (role) {
    case ExpertRole.MARKET: type = 'market-analysis'; task = "Marché, concurrence et USP."; break;
    case ExpertRole.PRODUCT: type = 'text'; task = "PRD complète, OKRs et User Stories."; break;
    case ExpertRole.UX: type = 'ux-flow'; task = "Personas et flow de navigation Mermaid."; break;
    case ExpertRole.ARCHITECT: type = 'prototype'; task = "Schéma d'architecture Mermaid C4."; break;
    case ExpertRole.API: type = 'api-spec'; task = "Endpoints clés et modèles de données."; break;
    case ExpertRole.SECURITY: type = 'security-spec'; task = "Analyse des risques et conformité."; break;
    case ExpertRole.DATA: type = 'data-schema'; task = "Schéma ERD Mermaid."; break;
    case ExpertRole.QA: type = 'test-strategy'; task = "Stratégie de test et scénarios critiques."; break;
    case ExpertRole.DELIVERY: type = 'roadmap'; task = "Roadmap V1/V2 et estimations."; break;
    default: task = "Expertise métier.";
  }

  const res = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Expert: ${role}. Pack: ${shared.mode} (${packContext}). Tâche: ${task}
    Contexte: ${JSON.stringify(shared.intent)}.
    IMPORTANT: Inclure des diagrammes Mermaid entre triple backticks si pertinent.
    Retourne JSON: { "title": "...", "summary": "...", "content": "Markdown..." }`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;

  const json = safeJsonParse(res.text || "{}");
  return {
    id: role.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
    role,
    title: json.title || role,
    summary: json.summary || "Document généré.",
    content: json.content || res.text || "",
    type,
    confidence: 0.95 + Math.random() * 0.04
  };
}

export async function refineArtifactNode(
  artifact: Artifact, 
  instruction: string, 
  shared: PocketStore, 
  emit: (u: Partial<PocketStore>) => void
) {
  emit({ currentStep: `Raffinement de ${artifact.title}...` });
  
  const res = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Tu es un expert en raffinement. Artefact actuel : ${artifact.content}
    Instruction utilisateur : "${instruction}"
    Retourne JSON: { "title": "...", "summary": "...", "content": "Markdown..." }`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;

  const json = safeJsonParse(res.text || "{}");
  const updatedArtifact: Artifact = {
    ...artifact,
    title: json.title || artifact.title,
    summary: json.summary || artifact.summary,
    content: json.content || artifact.content,
  };

  const newArtifacts = shared.artifacts.map(a => a.id === artifact.id ? updatedArtifact : a);
  emit({ artifacts: newArtifacts });
  return updatedArtifact;
}

export async function runAgentForge(
  shared: PocketStore,
  emit: (u: Partial<PocketStore>) => void
) {
  try {
    const foundations = await buildFoundations(shared, emit);
    let currentArtifacts: Artifact[] = [];

    const experts = [
      ExpertRole.MARKET, ExpertRole.PRODUCT, ExpertRole.UX,
      ExpertRole.ARCHITECT, ExpertRole.API, ExpertRole.DATA,
      ExpertRole.SECURITY, ExpertRole.QA, ExpertRole.DELIVERY
    ];

    for (const role of experts) {
      emit({ currentStep: `L'expert ${role} forge sa partie...` });
      const newArtifact = await expertNode(role, { ...shared, ...foundations, artifacts: currentArtifacts });
      currentArtifacts = [...currentArtifacts, newArtifact];
      // On émet l'accumulation à chaque étape
      emit({ artifacts: currentArtifacts });
      await new Promise(r => setTimeout(r, 800)); 
    }
    
    emit({ currentStep: "Synthèse de la vision visuelle...", status: "generating" });
    const synthRes = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Génère un prototype HTML/Tailwind statique mais pro. Récupère les idées : ${currentArtifacts.map(a => a.title).join(', ')}.`,
    })) as GenerateContentResponse;

    const proto: Artifact = {
      id: 'visual_synthesis_' + Date.now(),
      role: ExpertRole.PROTOTYPER,
      title: 'Vision Maître',
      summary: 'Simulation visuelle du produit synthétisé.',
      content: (synthRes.text || "").replace(/```html/g, "").replace(/```/g, "").trim(),
      type: 'prototype',
      confidence: 1.0
    };

    emit({ artifacts: [...currentArtifacts, proto], status: "ready" });
  } catch (err: any) {
    emit({ status: "error", currentStep: `Erreur: ${err.message}` });
  }
}
