
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
  try { return JSON.parse(match[1]); } catch { return {}; }
}

/**
 * Exponential Backoff with Jitter to handle 429 errors gracefully.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 5): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try { 
      return await fn(); 
    } catch (e: any) { 
      lastErr = e;
      // If 429 or 500, wait longer
      const isRateLimit = e?.message?.includes('429') || e?.message?.includes('quota');
      const waitTime = isRateLimit 
        ? Math.pow(2, i) * 3000 + Math.random() * 1000 
        : Math.pow(2, i) * 1000 + Math.random() * 500;
      
      console.warn(`API Error (Attempt ${i + 1}/${retries}). Retrying in ${Math.round(waitTime)}ms...`, e.message);
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
    contents: `Tu es l'Agent de Clarification d'AgentForge. Analyse cette idée de projet : "${idea}". 
    Génère 3 à 5 questions cruciales pour affiner le cadrage.
    Retourne uniquement du JSON: { "questions": [{ "id": "q1", "text": "...", "type": "choice/text", "options": [] }] }`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;
  const data = safeJsonParse(res.text || "{}");
  emit({ questions: data.questions || [] });
  return data;
}

export async function buildFoundations(shared: PocketStore, emit: (u: Partial<PocketStore>) => void) {
  emit({ currentStep: "Construction du Project Manifest...", status: "generating" });
  
  const intentRes = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Projet: ${shared.idea_raw}. Réponses clarification: ${JSON.stringify(shared.answers)}. 
    Synthétise le but, la cible et les contraintes en JSON.`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;
  const intent = IntentSchema.parse(safeJsonParse(intentRes.text || "{}"));
  
  // Petit délai entre les fondations
  await new Promise(r => setTimeout(r, 1000));

  const mapRes = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Basé sur l'Intent: ${JSON.stringify(intent)}, cartographie les 4 modules clés de l'application en JSON.`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;
  const app_map = AppMapSchema.parse(safeJsonParse(mapRes.text || "{}"));
  
  emit({ intent, app_map });
  return { intent, app_map };
}

async function expertNode(role: ExpertRole, shared: PocketStore, emit: (u: Partial<PocketStore>) => void) {
  let type: ArtifactType = 'text';
  let task = "";

  switch (role) {
    case ExpertRole.MARKET: type = 'market-analysis'; task = "Analyse de marché, opportunités, concurrence et positionnement stratégique."; break;
    case ExpertRole.PRODUCT: type = 'text'; task = "Rédaction de la PRD complète incluant les objectifs, OKRs et metrics de succès."; break;
    case ExpertRole.UX: type = 'ux-flow'; task = "User personas détaillés (besoins/frustrations) et flows de navigation."; break;
    case ExpertRole.ARCHITECT: type = 'prototype'; task = "Architecture système, choix techniques et diagramme Mermaid C4 (Container)."; break;
    case ExpertRole.API: type = 'api-spec'; task = "Spécifications des endpoints API principaux (REST/GraphQL)."; break;
    case ExpertRole.SECURITY: type = 'security-spec'; task = "Analyse des risques, conformité (RGPD) et mesures de protection."; break;
    case ExpertRole.DATA: type = 'data-schema'; task = "Modèle de données relationnel et schéma Entité-Relation Mermaid."; break;
    case ExpertRole.QA: type = 'test-strategy'; task = "Stratégie de test, scénarios critiques et plan de validation."; break;
    case ExpertRole.DELIVERY: type = 'roadmap'; task = "Roadmap itérative (V1/V2), estimations d'efforts en Story Points et dépendances."; break;
    default: task = "Expertise métier spécialisée.";
  }

  const context = `Intent: ${JSON.stringify(shared.intent)}. Map: ${JSON.stringify(shared.app_map)}.`;
  
  const res = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Rôle: ${role}. Langue: ${shared.language}. Pack: ${shared.mode}. Contexte: ${context}. Tâche: ${task}
    IMPORTANT: Si pertinent, inclus un diagramme Mermaid valide (entre triple backticks mermaid). 
    Retourne un JSON: { "title": "...", "summary": "...", "content": "Markdown..." }`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;

  const json = safeJsonParse(res.text || "{}");
  const artifact: Artifact = {
    id: role.toLowerCase().replace(/\s+/g, '_'),
    role,
    title: json.title || `${role} Output`,
    summary: json.summary || "Analyse terminée.",
    content: json.content || res.text || "",
    type,
    confidence: 0.98
  };

  emit({ artifacts: [...shared.artifacts, artifact] });
  return artifact;
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
    contents: `Tu es un expert en raffinement de documentation. 
    Artefact actuel (${artifact.role}): 
    ${artifact.content}
    
    Instruction de modification de l'utilisateur : "${instruction}"
    
    Réécris l'artefact en tenant compte de l'instruction tout en gardant la cohérence avec le projet global : ${JSON.stringify(shared.intent)}.
    Retourne un JSON avec 'title', 'summary' et 'content' (Markdown).`,
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
    
    const experts = [
      ExpertRole.MARKET, ExpertRole.PRODUCT, ExpertRole.UX,
      ExpertRole.ARCHITECT, ExpertRole.API, ExpertRole.DATA,
      ExpertRole.SECURITY, ExpertRole.QA, ExpertRole.DELIVERY
    ];

    // PASSAGE EN SÉQUENTIEL POUR ÉVITER LES ERREURS 429
    for (const role of experts) {
      emit({ currentStep: `L'expert ${role} travaille...` });
      await expertNode(role, { ...shared, ...foundations }, emit);
      // Pause de sécurité entre agents
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
    
    // Synthesis final
    emit({ currentStep: "Génération du prototype visuel maître..." });
    const synthRes = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Génère un prototype HTML/Tailwind interactif pour: ${shared.idea_raw}. 
      Utilise le contexte des artefacts générés: ${shared.artifacts.map(a => a.summary).join('; ')}.
      Retourne uniquement du HTML brut.`,
    })) as GenerateContentResponse;

    const proto: Artifact = {
      id: 'visual_synthesis',
      role: ExpertRole.PROTOTYPER,
      title: 'Visual Master Projection',
      summary: 'Simulation interactive de la vision produit synthétisée.',
      content: (synthRes.text || "").replace(/```html/g, "").replace(/```/g, "").trim(),
      type: 'prototype',
      confidence: 1.0
    };

    emit({ artifacts: [...shared.artifacts, proto], status: "ready" });
  } catch (err: any) {
    console.error(err);
    emit({ 
      status: "error", 
      currentStep: `Erreur critique: ${err.message || "Quota API dépassé"}.` 
    });
  }
}
