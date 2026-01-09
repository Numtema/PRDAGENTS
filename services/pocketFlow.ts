
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { PocketStore, ExpertRole, Artifact, ArtifactType } from "../types";

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

// --- Clarification Node ---
export async function clarifyNode(idea: string, emit: (u: Partial<PocketStore>) => void) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  emit({ currentStep: "L'Agent Clarificateur analyse votre vision...", status: 'clarifying' });

  const res = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Tu es l'Expert de Cadrage d'AgentForge. Ton but est de poser 4 questions stratégiques pour lever les ambiguïtés sur cette idée : "${idea}".
    Retourne UNIQUEMENT un JSON: { "questions": [{ "id": "q1", "text": "...", "type": "text" }] }`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;

  const data = safeJsonParse(res.text || "{}");
  emit({ questions: data.questions || [] });
}

// --- Expert Logic ---
async function expertNode(role: ExpertRole, shared: PocketStore): Promise<Artifact> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let type: ArtifactType = 'text';
  let roleSpecificPrompt = "";

  if (role === ExpertRole.ARCHITECT) type = 'prototype';
  if (role === ExpertRole.DATA) type = 'data-schema';
  if (role === ExpertRole.AUDITOR) type = 'audit';
  if (role === ExpertRole.COMPONENTS) {
    type = 'design-system';
    roleSpecificPrompt = "Génère un Design System minimal (Palette, Typo) et une liste de COMPOSANTS UI réutilisables avec leur description technique et code Tailwind exemplaire.";
  }

  let instructions = `Tu es l'expert ${role}. Analyse le projet: ${shared.idea_raw}. Intent: ${JSON.stringify(shared.intent)}. ${roleSpecificPrompt}`;

  const res = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `${instructions} Génère un document stratégique exhaustif. Propose toujours 2 VARIANTES (A vs B).
    INCLUS DES DIAGRAMMES MERMAID SI NÉCESSAIRE (Gantt, C4, Sequence, ERD, Quadrant).
    RETOURNE UN JSON: { "title": "...", "summary": "...", "content": "Markdown...", "vitals": {...}, "audit": {...}, "variants": [...] }`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;

  const json = safeJsonParse(res.text || "{}");
  return {
    id: `${role}_${Date.now()}`,
    role,
    title: json.title || role,
    summary: json.summary || "Synthèse de l'expert.",
    content: json.content || res.text || "",
    type,
    confidence: 0.95 + Math.random() * 0.04,
    vitals: json.vitals,
    audit: json.audit,
    variants: json.variants
  };
}

// --- Forge Orchestration ---
export async function runAgentForge(shared: PocketStore, emit: (u: Partial<PocketStore>) => void) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    emit({ currentStep: "Extraction de l'Intention...", status: 'generating' });
    
    // 1. Build Foundations (Intent)
    const intentRes = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Projet: ${shared.idea_raw}. Réponses: ${JSON.stringify(shared.answers)}. Extrais le but, la cible et les contraintes en JSON.`,
      config: { responseMimeType: "application/json" }
    });
    const intent = safeJsonParse(intentRes.text || "{}");
    emit({ intent });

    // 2. Map Modules
    const mapRes = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Intent: ${JSON.stringify(intent)}. Cartographie 4 modules clés en JSON: { "modules": [{ "name": "", "description": "", "features": [] }] }`,
      config: { responseMimeType: "application/json" }
    });
    const app_map = safeJsonParse(mapRes.text || "{}");
    emit({ app_map });

    // 3. Sequential Experts
    let artifacts: Artifact[] = [];
    const experts = [
      ExpertRole.STRATEGIST, 
      ExpertRole.MARKET, 
      ExpertRole.PRODUCT, 
      ExpertRole.COMPONENTS, // New Expert Node
      ExpertRole.UX, 
      ExpertRole.ARCHITECT, 
      ExpertRole.DATA, 
      ExpertRole.SECURITY, 
      ExpertRole.DELIVERY, 
      ExpertRole.AUDITOR
    ];

    for (const role of experts) {
      emit({ currentStep: `L'expert ${role} forge sa partie...` });
      const art = await expertNode(role, { ...shared, intent, app_map, artifacts });
      artifacts = [...artifacts, art];
      emit({ artifacts });
      await new Promise(r => setTimeout(r, 500));
    }

    // 4. Synthesis / Prototype
    emit({ currentStep: "Génération du Prototype Interactif..." });
    const protoRes = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Génère un prototype HTML/Tailwind complet pour: ${shared.idea_raw}. Base-toi sur les intentions: ${JSON.stringify(intent)}. Style épuré, responsive, composants modernes.`,
    });
    
    const proto: Artifact = {
      id: `proto_${Date.now()}`,
      role: ExpertRole.PROTOTYPER,
      title: 'Prototype Maître',
      summary: 'Interface fonctionnelle générée.',
      content: (protoRes.text || "").replace(/```html/g, "").replace(/```/g, "").trim(),
      type: 'prototype',
      confidence: 1.0
    };

    emit({ artifacts: [...artifacts, proto], status: 'ready', currentStep: 'Forge Terminée' });
  } catch (err: any) {
    emit({ status: 'error', currentStep: `Erreur: ${err.message}` });
  }
}

// --- Refinement Node ---
export async function refineArtifactNode(artifact: Artifact, instruction: string, shared: PocketStore, emit: (u: Partial<PocketStore>) => void) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  emit({ currentStep: `Mise à jour de ${artifact.title}...` });

  const res = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Expert ${artifact.role}. Document original: ${artifact.content}. Instruction de modification: ${instruction}. Réécris en conservant les diagrammes Mermaid.
    RETOURNE UN JSON: { "title": "...", "content": "Markdown...", "summary": "..." }`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;

  const json = safeJsonParse(res.text || "{}");
  const updated = { ...artifact, ...json };
  const newArtifacts = shared.artifacts.map(a => a.id === artifact.id ? updated : a);
  emit({ artifacts: newArtifacts });
}
