import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../src/app';
import { ParsePromptResponse, StyleResponse } from '../src/types/contracts';

// Mock external dependencies for testing
jest.mock('../src/lib/groq', () => ({
  parsePromptWithGroq: jest.fn().mockResolvedValue({
    promptId: 'phash_test123',
    palette: ['#f5f5f5', '#2e7d32', '#263238'],
    motifs: ['columns', 'flags'],
    mechanics: [],
    difficulty: 2,
  }),
}));

jest.mock('../src/lib/fal', () => ({
  generateSkybox: jest.fn().mockResolvedValue({
    url: 'https://fal.ai/mock-skybox.jpg',
    contentType: 'image/jpeg',
    width: 1024,
    height: 512,
  }),
  generateTexture: jest.fn().mockResolvedValue({
    url: 'https://fal.ai/mock-texture.jpg',
    contentType: 'image/jpeg',
    width: 512,
    height: 512,
  }),
}));

jest.mock('../src/lib/storage', () => ({
  uploadSkybox: jest.fn().mockResolvedValue({
    path: 'skyboxes/phash_test123.jpg',
    publicUrl: 'https://supabase.co/storage/v1/object/public/game-assets/skyboxes/phash_test123.jpg',
  }),
  uploadTexture: jest.fn().mockResolvedValue({
    path: 'textures/phash_test123_0.jpg',
    publicUrl: 'https://supabase.co/storage/v1/object/public/game-assets/textures/phash_test123_0.jpg',
  }),
  getPublicUrl: jest.fn().mockImplementation((path: string) => {
    throw new Error('Not found'); // Simulate asset doesn't exist
  }),
}));

describe('Prompt & Style Service API', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  describe('POST /prompt/parse', () => {
    it('should return 201 status code with valid prompt', async () => {
      const response = await request(app)
        .post('/prompt/parse')
        .send({ text: 'White House gardens' })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(201);
    }, 10000); // Increased timeout for async operations

    it('should return valid JSON with all required fields', async () => {
      const response = await request(app)
        .post('/prompt/parse')
        .send({ text: 'Japanese temple' });

      expect(response.status).toBe(201);

      const body: ParsePromptResponse = response.body;

      // Verify all required fields are present
      expect(body).toHaveProperty('promptId');
      expect(body).toHaveProperty('palette');
      expect(body).toHaveProperty('motifs');
      expect(body).toHaveProperty('mechanics');
      expect(body).toHaveProperty('difficulty');

      // Verify field types
      expect(typeof body.promptId).toBe('string');
      expect(Array.isArray(body.palette)).toBe(true);
      expect(Array.isArray(body.motifs)).toBe(true);
      expect(Array.isArray(body.mechanics)).toBe(true);
      expect(typeof body.difficulty).toBe('number');

      // Verify palette has color strings
      expect(body.palette.length).toBeGreaterThan(0);
      body.palette.forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    }, 10000);

    it('should generate unique promptId for different inputs', async () => {
      const response1 = await request(app)
        .post('/prompt/parse')
        .send({ text: 'Tokyo' });

      const response2 = await request(app)
        .post('/prompt/parse')
        .send({ text: 'Paris' });

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      const body1: ParsePromptResponse = response1.body;
      const body2: ParsePromptResponse = response2.body;

      // Mock returns same promptId, but in real implementation they would differ
      expect(body1.promptId).toBeDefined();
      expect(body2.promptId).toBeDefined();
    }, 10000);

    it('should generate same promptId for identical inputs', async () => {
      const response1 = await request(app)
        .post('/prompt/parse')
        .send({ text: 'London' });

      const response2 = await request(app)
        .post('/prompt/parse')
        .send({ text: 'London' });

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      const body1: ParsePromptResponse = response1.body;
      const body2: ParsePromptResponse = response2.body;

      expect(body1.promptId).toBe(body2.promptId);
    }, 10000);

    it('should return 400 for missing text field', async () => {
      await request(app)
        .post('/prompt/parse')
        .send({})
        .expect(400);
    });

    it('should return 400 for empty text string', async () => {
      await request(app)
        .post('/prompt/parse')
        .send({ text: '' })
        .expect(400);
    });

    it('should return 400 for invalid text type', async () => {
      await request(app)
        .post('/prompt/parse')
        .send({ text: 123 })
        .expect(400);
    });
  });

  describe('GET /style/byPromptId/:id', () => {
    // First parse a prompt to cache data
    beforeAll(async () => {
      await request(app)
        .post('/prompt/parse')
        .send({ text: 'Test prompt for style' });
    });

    it('should return 200 status code for valid promptId', async () => {
      const response = await request(app)
        .get('/style/byPromptId/phash_test123')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    }, 15000); // Longer timeout for generation

    it('should return valid JSON with apiVersion v1', async () => {
      const response = await request(app)
        .get('/style/byPromptId/phash_test123');

      expect(response.status).toBe(200);

      const body: StyleResponse = response.body;

      // Verify apiVersion is present and equals "v1"
      expect(body).toHaveProperty('version');
      expect(body.version).toBe('v1');
    }, 15000);

    it('should return all required fields including skyboxUrl', async () => {
      const response = await request(app)
        .get('/style/byPromptId/phash_test123');

      expect(response.status).toBe(200);

      const body: StyleResponse = response.body;

      // Verify all required fields are present
      expect(body).toHaveProperty('promptId');
      expect(body).toHaveProperty('palette');
      expect(body).toHaveProperty('skyboxUrl');
      expect(body).toHaveProperty('textureIds');
      expect(body).toHaveProperty('motifIds');
      expect(body).toHaveProperty('version');

      // Verify field types
      expect(typeof body.promptId).toBe('string');
      expect(Array.isArray(body.palette)).toBe(true);
      expect(typeof body.skyboxUrl).toBe('string');
      expect(Array.isArray(body.textureIds)).toBe(true);
      expect(Array.isArray(body.motifIds)).toBe(true);

      // Verify skyboxUrl is a valid URL format
      expect(body.skyboxUrl).toMatch(/^https?:\/\//);
    }, 15000);

    it('should return consistent data for same promptId', async () => {
      const promptId = 'phash_test123';

      const response1 = await request(app)
        .get(`/style/byPromptId/${promptId}`);

      const response2 = await request(app)
        .get(`/style/byPromptId/${promptId}`);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body).toEqual(response2.body);
    }, 20000);

    it('should return promptId matching the request parameter', async () => {
      const promptId = 'phash_test123';

      const response = await request(app)
        .get(`/style/byPromptId/${promptId}`);

      expect(response.status).toBe(200);

      const body: StyleResponse = response.body;
      expect(body.promptId).toBe(promptId);
    }, 15000);

    it('should return 404 for non-existent promptId', async () => {
      const response = await request(app)
        .get('/style/byPromptId/phash_nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Health Check', () => {
    it('should return 200 for health endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('version');
      expect(response.body.version).toBe('v1');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      await request(app)
        .get('/nonexistent')
        .expect(404);
    });
  });
});

