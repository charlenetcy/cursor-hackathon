import { Chunk, ChunkBundle, ConnectorSpec, GenerateNextChunkRequest, GenerateNextChunkResponse, IntentSpec, Vector3 } from '../../../../shared/src/types';
import { TowerGenerator } from './TowerGenerator';
import { ChunkValidator } from './ChunkValidator';
import { GeneratorFactory, SeedHasher } from './SeedSystem';
import PromptService from '../services/PromptService';
import GeminiBuildPlanService from '../services/GeminiBuildPlanService';
import { GENERATION_CONFIG } from '../../../../shared/src/constants';
import PlanExecutor from './PlanExecutor';

function last<T>(arr: T[]): T | undefined { return arr.length ? arr[arr.length - 1] : undefined; }

export class ChunkCompiler {
  static async compile(req: GenerateNextChunkRequest): Promise<{ bundle: ChunkBundle; promptId: string }> {
    const effectivePrompt = (req.prompt && req.prompt.trim().length > 0) ? req.prompt : GENERATION_CONFIG.DEFAULT_PROMPT;
    const promptId = PromptService.derivePromptId(effectivePrompt);
    const intent = PromptService.parse(effectivePrompt);

    const params = { worldSeed: req.worldSeed, promptId, chunkIndex: req.chunkIndex };
    const prng = GeneratorFactory.createPRNG(params);

    // Choose plan: Gemini or fallback
    const buildPlan = GeminiBuildPlanService.isEnabled()
      ? await GeminiBuildPlanService.generate(intent)
      : {
          dsl: `ENTRY -> ${3 + (params.chunkIndex % 3)} platforms -> EXIT`,
          steps: [
            { type: 'entry', params: { face: 'south' } },
            { type: 'platforms', params: { count: 3 + (params.chunkIndex % 3) } },
            { type: 'exit', params: { face: 'north' } },
          ],
          repaired: false,
        };

    const layout: Chunk = PlanExecutor.execute({ worldSeed: req.worldSeed, promptId, chunkIndex: req.chunkIndex, plan: buildPlan });

    // Basic exit connector: aim at last checkpoint or end of colliders chain
    const pathCheckpoints: Vector3[] = layout.physics.checkpoints.length > 0
      ? layout.physics.checkpoints
      : layout.physics.spawnPoints;

    const entry: ConnectorSpec = req.entry;
    const lastPoint = last(pathCheckpoints) || last(layout.physics.spawnPoints) || { x: 0, y: 1, z: 0 };
    const exit: ConnectorSpec = {
      face: 'north',
      position: lastPoint,
      clearance: 1.5,
      type: 'flat',
    };

    const validation = ChunkValidator.validate(layout);

    const textureHash = SeedHasher.hashSeeds(req.worldSeed, promptId, req.chunkIndex);

    const bundle: ChunkBundle = {
      intent,
      buildPlan,
      layout,
      solution: { pathCheckpoints },
      entry,
      exit,
      style: { palette: layout.palette, skyboxUrl: layout.skyboxUrl },
      textureJobs: [
        { id: `tx_palette_${textureHash.slice(0, 8)}`, kind: 'palette', status: 'ready', hash: textureHash },
        { id: `tx_sky_${textureHash.slice(0, 8)}`, kind: 'skybox', status: 'ready', hash: textureHash, url: layout.skyboxUrl },
      ],
    };

    return { bundle, promptId };
  }
}

export default ChunkCompiler;


