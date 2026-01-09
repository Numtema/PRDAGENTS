
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
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
  // On force le status clarifying immédiatement
  emit({ currentStep: "Génération des questions de cadrage...", status: 'clarifying', questions: [] });
  
  try {
    const res = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Tu es l'Expert de Cadrage Stratégique. Analyse l'idée : "${idea}". 
      Génère 4 questions essentielles pour définir le MVP sur une stack Bun, FastAPI et NextJS.
      Retourne UNIQUEMENT un JSON : { "questions": [{ "id": "q1", "text": "...", "type": "text" }] }`,
      config: { responseMimeType: "application/json" }
    })) as GenerateContentResponse;
    
    const data = safeJsonParse(res.text || "{}");
    emit({ questions: data.questions || [], currentStep: "Veuillez répondre aux questions pour lancer la forge." });
  } catch (err) {
    emit({ status: 'error', currentStep: "Erreur lors de la clarification." });
  }
}

async function expertNode(role: ExpertRole, shared: PocketStore): Promise<Artifact> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let type: ArtifactType = 'text';
  let rolePrompt = "";

  switch(role) {
    case ExpertRole.STRATEGIST:
      rolePrompt = "Roadmap stratégique 6 mois. INCLUS: Mermaid gantt.";
      break;
    case ExpertRole.MARKET:
      rolePrompt = "Positionnement concurrentiel. INCLUS: Mermaid quadrantChart (Value vs Complexity).";
      break;
    case ExpertRole.ARCHITECT:
      rolePrompt = "Architecture Bun/NextJS/FastAPI. INCLUS: Mermaid sequenceDiagram pour Auth Flow.";
      break;
    case ExpertRole.DATA:
      type = 'data-schema';
      rolePrompt = "Schéma Prisma/PostgreSQL. INCLUS: Mermaid erDiagram.";
      break;
    case ExpertRole.AGENT_INITIALIZER:
      type = 'agent-spec';
      rolePrompt = "Génère AGENTS.md (Instructions Cursor/Aider). Stack Bun, FastAPI, NextJS. No semicolons.";
      break;
    case ExpertRole.AUDITOR:
      type = 'audit';
      rolePrompt = "Audit critique final de la cohérence technique et métier.";
      break;
    default:
      rolePrompt = "Analyse experte détaillée du domaine.";
  }

  const res = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Rôle : ${role}. Projet : ${shared.idea_raw}. Réponses : ${JSON.stringify(shared.answers)}. Stack : Bun/FastAPI/NextJS. ${rolePrompt}. 
    Retourne JSON: { "title": "...", "summary": "...", "content": "Markdown...", "vitals": {...} }`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;

  const json = safeJsonParse(res.text || "{}");
  return {
    id: `${role}_${Date.now()}`,
    role,
    title: json.title || role,
    summary: json.summary || "Analyse en cours.",
    content: json.content || res.text || "",
    type,
    confidence: 0.95,
    vitals: json.vitals
  };
}

export async function runAgentForge(shared: PocketStore, emit: (u: Partial<PocketStore>) => void) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    emit({ status: 'generating', currentStep: "Analyse des intentions..." });
    const intentRes = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Projet : ${shared.idea_raw}. Réponses : ${JSON.stringify(shared.answers)}. Extrais Goal, Target, Constraints en JSON.`,
      config: { responseMimeType: "application/json" }
    });
    const intent = safeJsonParse(intentRes.text || "{}");
    emit({ intent });

    const experts = [
      ExpertRole.STRATEGIST, ExpertRole.MARKET, ExpertRole.PRODUCT, 
      ExpertRole.UX, ExpertRole.COMPONENTS, ExpertRole.ARCHITECT, 
      ExpertRole.DATA, ExpertRole.API, ExpertRole.SECURITY, 
      ExpertRole.QA, ExpertRole.AGENT_INITIALIZER, ExpertRole.AUDITOR
    ];

    let artifacts: Artifact[] = [];
    for (const role of experts) {
      emit({ currentStep: `Forge par ${role}...` });
      const art = await expertNode(role, { ...shared, intent, artifacts });
      artifacts = [...artifacts, art];
      emit({ artifacts });
    }

    emit({ currentStep: "Génération du Prototype Maître (NextJS/Tailwind)..." });
    const protoRes = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Génère un prototype HTML/Tailwind complet et interactif pour : ${shared.idea_raw}. Style ultra-moderne.`,
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

    emit({ artifacts: [...artifacts, proto], status: 'ready', currentStep: 'Forge terminée avec succès.' });
  } catch (err: any) {
    emit({ status: 'error', currentStep: `Erreur : ${err.message}` });
  }
}

export async function refineArtifactNode(artifact: Artifact, instruction: string, shared: PocketStore, emit: (u: Partial<PocketStore>) => void) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  emit({ currentStep: `Raffinement de ${artifact.title}...` });
  const res = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Raffine ce document : ${artifact.content} selon : ${instruction}. JSON: { "title": "...", "content": "..." }`,
    config: { responseMimeType: "application/json" }
  })) as GenerateContentResponse;
  const json = safeJsonParse(res.text || "{}");
  const newArtifacts = shared.artifacts.map(a => a.id === artifact.id ? { ...artifact, ...json } : a);
  emit({ artifacts: newArtifacts, currentStep: "Raffinement terminé." });
}
