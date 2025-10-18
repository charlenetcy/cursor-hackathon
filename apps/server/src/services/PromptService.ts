import { createHash } from 'crypto';
import { IntentSpec } from '../../../../shared/src/types';

export class PromptService {
  static normalize(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  static derivePromptId(prompt: string): string {
    const normalized = this.normalize(prompt);
    return createHash('sha256').update(normalized).digest('hex');
  }

  static parse(prompt: string): IntentSpec {
    const text = this.normalize(prompt);

    const intent: IntentSpec = {
      biome: this.detectBiome(text),
      motifs: this.detectMotifs(text),
      difficultyCaps: this.detectDifficultyCaps(text),
      weights: this.detectWeights(text),
      style: this.detectStyle(text),
    };

    return intent;
  }

  private static detectBiome(text: string): string | undefined {
    if (/(school|campus|classroom)/.test(text)) return 'school';
    if (/(forest|woods|jungle)/.test(text)) return 'forest';
    if (/(urban|city|street|rooftop)/.test(text)) return 'urban';
    if (/(japan|shinto|torii|temple)/.test(text)) return 'japan';
    return undefined;
  }

  private static detectMotifs(text: string): string[] {
    const motifs: string[] = [];
    if (/rail|rails/.test(text)) motifs.push('rails');
    if (/wallrun|wall-run|wall run/.test(text)) motifs.push('wallruns');
    if (/stair|stairs/.test(text)) motifs.push('stairs');
    if (/corridor|hall/.test(text)) motifs.push('corridors');
    return motifs;
  }

  private static detectDifficultyCaps(text: string): IntentSpec['difficultyCaps'] {
    // Defaults tuned to safe values; executor will enforce caps
    let maxGap = 3;
    let maxSlopeDeg = 45;
    let maxRise = 2;

    if (/easy|chill|casual/.test(text)) {
      maxGap = 2.2; maxSlopeDeg = 30; maxRise = 1.5;
    } else if (/(medium|normal|balanced)/.test(text)) {
      maxGap = 2.8; maxSlopeDeg = 40; maxRise = 2;
    } else if (/(hard|expert|difficult)/.test(text)) {
      maxGap = 3; maxSlopeDeg = 45; maxRise = 2.2;
    }

    return { maxGap, maxSlopeDeg, maxRise };
  }

  private static detectWeights(text: string): IntentSpec['weights'] {
    const boost = (cond: boolean, base: number, delta: number) => (cond ? base + delta : base);
    const hasRails = /rail|rails/.test(text);
    const hasWallruns = /wallrun|wall-run|wall run/.test(text);
    const hasCorridors = /corridor|hall/.test(text);
    const hasStairs = /stair|stairs/.test(text);
    const hasRamps = /ramp|ramps/.test(text);

    return {
      rails: boost(hasRails, 0.2, 0.5),
      wallruns: boost(hasWallruns, 0.2, 0.4),
      corridors: boost(hasCorridors, 0.2, 0.3),
      stairs: boost(hasStairs, 0.2, 0.3),
      ramps: boost(hasRamps, 0.2, 0.3),
    };
  }

  private static detectStyle(text: string): IntentSpec['style'] {
    const palette: string[] | undefined = /(school|campus)/.test(text)
      ? ['#b0bec5', '#e0e0e0', '#455a64']
      : /(forest|woods)/.test(text)
      ? ['#2e7d32', '#a5d6a7', '#1b5e20']
      : /(urban|city|street)/.test(text)
      ? ['#212121', '#757575', '#bdbdbd']
      : undefined;

    const skyboxHint = /(sunset|dusk)/.test(text)
      ? 'sunset'
      : /(night)/.test(text)
      ? 'night'
      : undefined;

    return { palette, skyboxHint };
  }
}

export default PromptService;


