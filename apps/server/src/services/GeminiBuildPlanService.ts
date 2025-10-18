import { BuildPlan, IntentSpec } from '../../../../shared/src/types';

export interface GeminiOptions {
  apiKey?: string;
  model?: string;
}

/**
 * Placeholder Gemini-backed build plan generator.
 * For offline/local dev, returns a deterministic plan based on intent.
 */
export class GeminiBuildPlanService {
  private static getOptions(): GeminiOptions {
    return {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'models/gemini-1.5-flash',
    };
  }

  static isEnabled(): boolean {
    return process.env.USE_GEMINI_BUILDPLAN === '1' && !!process.env.GEMINI_API_KEY;
  }

  /**
   * Generate a build plan using Gemini, or fall back to a simple deterministic plan.
   */
  static async generate(intent: IntentSpec): Promise<BuildPlan> {
    if (this.isEnabled()) {
      try {
        const plan = await this.callGemini(intent);
        if (plan) return plan;
      } catch {}
    }
    // Deterministic fallback
    const motif = intent.motifs?.[0] || 'platforms';
    const count = Math.min(6, Math.max(3, Math.round((intent.weights?.ramps ?? 0.2) * 10)));
    const dsl = `ENTRY -> ${count} ${motif} -> EXIT`;
    return { dsl, steps: [
      { type: 'entry', params: { face: 'south' } },
      { type: motif, params: { count } },
      { type: 'exit', params: { face: 'north' } },
    ], repaired: false };
  }

  private static async callGemini(intent: IntentSpec): Promise<BuildPlan | null> {
    const { apiKey, model } = this.getOptions();
    if (!apiKey) return null;
    const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;

    const systemFromEnv = process.env.GEMINI_SYSTEM_PROMPT;
    const system = (systemFromEnv && systemFromEnv.trim().length > 0)
      ? systemFromEnv
      : `You are a level designer. Output a compact JSON object with fields { dsl: string, steps: [{type:string, params:object}], repaired: boolean }. Follow constraints: max gap ${intent.difficultyCaps?.maxGap ?? 3}u, max slope ${intent.difficultyCaps?.maxSlopeDeg ?? 45}°, motifs ${intent.motifs?.join(',') ?? 'platforms'}.`;
    const prompt = `Biome: ${intent.biome ?? 'default'}; Motifs: ${intent.motifs?.join(',') ?? 'platforms'}; Weights: ${JSON.stringify(intent.weights ?? {})}; Style: ${JSON.stringify(intent.style ?? {})}. Generate a BuildPlan.`;

    const body = {
      contents: [
        { role: 'user', parts: [{ text: system + '\n' + prompt }] }
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 256 }
    } as any;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) return null;
    const firstJson = this.extractFirstJson(text);
    if (!firstJson) return null;
    // Basic shape check
    if (typeof firstJson.dsl === 'string' && Array.isArray(firstJson.steps)) {
      return { dsl: firstJson.dsl, steps: firstJson.steps, repaired: !!firstJson.repaired };
    }
    return null;
  }

  private static extractFirstJson(text: string): any | null {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

export default GeminiBuildPlanService;


