/**
 * Chunk Window Manager
 * Manages a sliding window of chunks for efficient streaming and memory usage
 * 
 * Active window: Last 2 chunks + Next 5 chunks (7 total)
 * Floating origin: Rebase coordinates every 10 chunks to prevent precision loss
 */

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

interface WindowStats {
  activeChunks: number;
  playerChunkIndex: number;
  oldestChunkIndex: number;
  newestChunkIndex: number;
  totalChunksGenerated: number;
  floatingOriginRebaseCount: number;
  memoryUsage: number;
}

// Constants
const WINDOW_LOOKBEHIND = 2; // Keep last 2 chunks
const WINDOW_LOOKAHEAD = 5; // Keep next 5 chunks
const TOTAL_WINDOW_SIZE = WINDOW_LOOKBEHIND + WINDOW_LOOKAHEAD + 1; // +1 for current
const FLOATING_ORIGIN_INTERVAL = 10; // Rebase every 10 chunks

/**
 * Represents the floating origin coordinate system
 * Prevents floating-point precision loss over long distances
 */
class FloatingOrigin {
  private baseChunkIndex: number = 0;
  private baseWorldPosition: Vector3 = { x: 0, y: 0, z: 0 };
  private rebaseCount: number = 0;

  /**
   * Initialize floating origin at a chunk index
   */
  initialize(chunkIndex: number, chunkSize: number = 10): void {
    this.baseChunkIndex = Math.floor(chunkIndex / FLOATING_ORIGIN_INTERVAL) * FLOATING_ORIGIN_INTERVAL;
    this.baseWorldPosition = {
      x: 0,
      y: 0,
      z: this.baseChunkIndex * chunkSize,
    };
  }

  /**
   * Get the world position offset for a chunk
   */
  getWorldOffset(chunkIndex: number, chunkSize: number = 10): Vector3 {
    const relativeIndex = chunkIndex - this.baseChunkIndex;
    return {
      x: 0,
      y: 0,
      z: relativeIndex * chunkSize,
    };
  }

  /**
   * Convert local position to world position
   */
  toWorldPosition(localPos: Vector3, chunkIndex: number, chunkSize: number = 10): Vector3 {
    const offset = this.getWorldOffset(chunkIndex, chunkSize);
    return {
      x: this.baseWorldPosition.x + localPos.x + offset.x,
      y: this.baseWorldPosition.y + localPos.y + offset.y,
      z: this.baseWorldPosition.z + localPos.z + offset.z,
    };
  }

  /**
   * Rebase the floating origin
   */
  rebase(chunkIndex: number, chunkSize: number = 10): void {
    this.initialize(chunkIndex, chunkSize);
    this.rebaseCount++;
  }

  /**
   * Get rebase count
   */
  getRebaseCount(): number {
    return this.rebaseCount;
  }
}

/**
 * Manages the active window of chunks
 */
export class ChunkWindow {
  private chunks: Map<number, Chunk> = new Map();
  private playerChunkIndex: number = 0;
  private floatingOrigin: FloatingOrigin = new FloatingOrigin();
  private chunkSize: number = 10;
  private totalChunksGenerated: number = 0;

  constructor(chunkSize: number = 10) {
    this.chunkSize = chunkSize;
    this.floatingOrigin.initialize(0, chunkSize);
  }

  /**
   * Add a chunk to the window
   */
  addChunk(chunk: Chunk): void {
    this.chunks.set(chunk.index, chunk);
    this.totalChunksGenerated = Math.max(this.totalChunksGenerated, chunk.index + 1);
    this.pruneWindow();
  }

  /**
   * Update player position (chunk index they're on)
   */
  updatePlayerPosition(chunkIndex: number): void {
    this.playerChunkIndex = chunkIndex;

    // Rebase floating origin if needed
    if (chunkIndex % FLOATING_ORIGIN_INTERVAL === 0 && chunkIndex > 0) {
      this.floatingOrigin.rebase(chunkIndex, this.chunkSize);
    }

    this.pruneWindow();
  }

  /**
   * Remove old chunks outside the window
   */
  private pruneWindow(): void {
    const minIndex = Math.max(0, this.playerChunkIndex - WINDOW_LOOKBEHIND);
    const maxIndex = this.playerChunkIndex + WINDOW_LOOKAHEAD;

    const indicesToRemove: number[] = [];
    for (const [index] of this.chunks) {
      if (index < minIndex || index > maxIndex) {
        indicesToRemove.push(index);
      }
    }

    for (const index of indicesToRemove) {
      this.chunks.delete(index);
    }
  }

  /**
   * Get all active chunks in order
   */
  getActiveChunks(): Chunk[] {
    const chunks: Chunk[] = [];
    for (let i = this.playerChunkIndex - WINDOW_LOOKBEHIND; i <= this.playerChunkIndex + WINDOW_LOOKAHEAD; i++) {
      const chunk = this.chunks.get(i);
      if (chunk) {
        chunks.push(chunk);
      }
    }
    return chunks;
  }

  /**
   * Get chunks that need to be generated next
   */
  getMissingChunks(): number[] {
    const missing: number[] = [];
    for (let i = this.playerChunkIndex; i <= this.playerChunkIndex + WINDOW_LOOKAHEAD; i++) {
      if (!this.chunks.has(i)) {
        missing.push(i);
      }
    }
    return missing;
  }

  /**
   * Check if a chunk is in the window
   */
  hasChunk(chunkIndex: number): boolean {
    return this.chunks.has(chunkIndex);
  }

  /**
   * Get a specific chunk
   */
  getChunk(chunkIndex: number): Chunk | undefined {
    return this.chunks.get(chunkIndex);
  }

  /**
   * Get world position for a chunk
   */
  getWorldOffset(chunkIndex: number): Vector3 {
    return this.floatingOrigin.getWorldOffset(chunkIndex, this.chunkSize);
  }

  /**
   * Get current statistics
   */
  getStats(): WindowStats {
    let totalMemory = 0;
    for (const chunk of this.chunks.values()) {
      // Rough estimate: vertices (3 floats) + faces (1 int) + normals (3 floats) + uvs (2 floats)
      totalMemory += (chunk.geometry.vertices.length + chunk.geometry.faces.length + chunk.geometry.normals.length + chunk.geometry.uvs.length) * 4;
    }

    return {
      activeChunks: this.chunks.size,
      playerChunkIndex: this.playerChunkIndex,
      oldestChunkIndex: Math.min(...Array.from(this.chunks.keys()).concat([this.playerChunkIndex])),
      newestChunkIndex: Math.max(...Array.from(this.chunks.keys()).concat([this.playerChunkIndex])),
      totalChunksGenerated: this.totalChunksGenerated,
      floatingOriginRebaseCount: this.floatingOrigin.getRebaseCount(),
      memoryUsage: totalMemory,
    };
  }

  /**
   * Clear all chunks
   */
  clear(): void {
    this.chunks.clear();
  }
}

/**
 * Manages chunk generation and streaming
 */
export class ChunkStreamer {
  private window: ChunkWindow;
  private generationQueue: number[] = [];
  private maxQueueSize: number = 10;

  constructor(chunkSize: number = 10) {
    this.window = new ChunkWindow(chunkSize);
  }

  /**
   * Add chunk to window and manage queue
   */
  receiveChunk(chunk: Chunk): void {
    this.window.addChunk(chunk);
  }

  /**
   * Update player position and manage streaming
   */
  updatePlayerPosition(chunkIndex: number): { chunksToGenerate: number[] } {
    this.window.updatePlayerPosition(chunkIndex);

    const missing = this.window.getMissingChunks();
    return { chunksToGenerate: missing };
  }

  /**
   * Get active chunks for rendering
   */
  getChunksForRendering(): Chunk[] {
    return this.window.getActiveChunks();
  }

  /**
   * Get statistics
   */
  getStats(): WindowStats {
    return this.window.getStats();
  }

  /**
   * Get window
   */
  getWindow(): ChunkWindow {
    return this.window;
  }
}

/**
 * Buffer for pre-generating chunks ahead of time
 */
export class ChunkQueue {
  private queue: Chunk[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  /**
   * Add chunk to queue
   */
  enqueue(chunk: Chunk): boolean {
    if (this.queue.length < this.maxSize) {
      this.queue.push(chunk);
      return true;
    }
    return false;
  }

  /**
   * Remove and return next chunk from queue
   */
  dequeue(): Chunk | undefined {
    return this.queue.shift();
  }

  /**
   * Peek at next chunk without removing
   */
  peek(): Chunk | undefined {
    return this.queue[0];
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is full
   */
  isFull(): boolean {
    return this.queue.length >= this.maxSize;
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
  }
}

export { FloatingOrigin, WindowStats };
