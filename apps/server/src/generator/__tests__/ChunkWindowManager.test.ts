import { ChunkWindow, ChunkStreamer, ChunkQueue } from '../ChunkWindowManager';

// Mock types
interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Chunk {
  index: number;
  seed: string;
  structureClass: string;
  palette: string[];
  skyboxUrl?: string;
  appliedPromptId?: string;
  geometry: { vertices: number[]; faces: number[]; normals: number[]; uvs: number[] };
  physics: { colliders: any[]; spawnPoints: Vector3[]; checkpoints: Vector3[] };
}

function createChunk(index: number): Chunk {
  return {
    index,
    seed: `seed_${index}`,
    structureClass: 'tower',
    palette: ['#fff', '#000', '#888'],
    skyboxUrl: 'https://test.com/sky.eq',
    appliedPromptId: 'test_prompt',
    geometry: {
      vertices: new Array(300).fill(0),
      faces: new Array(100).fill(0),
      normals: new Array(300).fill(0),
      uvs: new Array(200).fill(0),
    },
    physics: {
      colliders: [],
      spawnPoints: [{ x: 0, y: 1, z: 0 }],
      checkpoints: [],
    },
  };
}

describe('ChunkWindow', () => {
  let window: ChunkWindow;

  beforeEach(() => {
    window = new ChunkWindow(10);
  });

  test('should initialize with correct settings', () => {
    const stats = window.getStats();
    expect(stats.activeChunks).toBe(0);
    expect(stats.playerChunkIndex).toBe(0);
  });

  test('should add chunks to window', () => {
    window.addChunk(createChunk(0));
    window.addChunk(createChunk(1));
    expect(window.hasChunk(0)).toBe(true);
    expect(window.hasChunk(1)).toBe(true);
  });

  test('should retrieve specific chunks', () => {
    const chunk = createChunk(5);
    window.addChunk(chunk);
    const retrieved = window.getChunk(5);
    expect(retrieved?.index).toBe(5);
  });

  test('should maintain sliding window', () => {
    for (let i = 0; i <= 10; i++) {
      window.addChunk(createChunk(i));
    }
    window.updatePlayerPosition(5);
    const active = window.getActiveChunks();
    expect(active.length).toBeGreaterThan(0);
  });

  test('should identify missing chunks', () => {
    window.addChunk(createChunk(0));
    window.updatePlayerPosition(0);
    const missing = window.getMissingChunks();
    expect(Array.isArray(missing)).toBe(true);
  });

  test('should handle floating origin', () => {
    const offset = window.getWorldOffset(0);
    expect(offset.z).toBe(0);
  });

  test('should track statistics', () => {
    for (let i = 0; i < 5; i++) {
      window.addChunk(createChunk(i));
    }
    const stats = window.getStats();
    expect(stats.totalChunksGenerated).toBe(5);
  });

  test('should clear all chunks', () => {
    for (let i = 0; i < 10; i++) {
      window.addChunk(createChunk(i));
    }
    window.clear();
    const stats = window.getStats();
    expect(stats.activeChunks).toBe(0);
  });
});

describe('ChunkStreamer', () => {
  let streamer: ChunkStreamer;

  beforeEach(() => {
    streamer = new ChunkStreamer(10);
  });

  test('should initialize', () => {
    const stats = streamer.getStats();
    expect(stats.activeChunks).toBe(0);
  });

  test('should receive chunks', () => {
    streamer.receiveChunk(createChunk(0));
    streamer.receiveChunk(createChunk(1));
    const chunks = streamer.getChunksForRendering();
    expect(chunks.length).toBeGreaterThan(0);
  });

  test('should identify chunks to generate', () => {
    const result = streamer.updatePlayerPosition(0);
    expect(result.chunksToGenerate).toBeInstanceOf(Array);
  });

  test('should expose statistics', () => {
    for (let i = 0; i < 5; i++) {
      streamer.receiveChunk(createChunk(i));
    }
    const stats = streamer.getStats();
    expect(stats).toHaveProperty('activeChunks');
  });
});

describe('ChunkQueue', () => {
  let queue: ChunkQueue;

  beforeEach(() => {
    queue = new ChunkQueue(5);
  });

  test('should initialize', () => {
    expect(queue.size()).toBe(0);
    expect(queue.isFull()).toBe(false);
  });

  test('should enqueue chunks', () => {
    const chunk = createChunk(0);
    const result = queue.enqueue(chunk);
    expect(result).toBe(true);
    expect(queue.size()).toBe(1);
  });

  test('should dequeue in order', () => {
    queue.enqueue(createChunk(1));
    queue.enqueue(createChunk(2));
    const first = queue.dequeue();
    expect(first?.index).toBe(1);
  });

  test('should peek without removing', () => {
    queue.enqueue(createChunk(0));
    const peeked = queue.peek();
    expect(peeked?.index).toBe(0);
    expect(queue.size()).toBe(1);
  });

  test('should prevent enqueue when full', () => {
    for (let i = 0; i < 5; i++) {
      queue.enqueue(createChunk(i));
    }
    expect(queue.isFull()).toBe(true);
    const result = queue.enqueue(createChunk(99));
    expect(result).toBe(false);
  });

  test('should clear queue', () => {
    for (let i = 0; i < 3; i++) {
      queue.enqueue(createChunk(i));
    }
    queue.clear();
    expect(queue.size()).toBe(0);
  });
});
