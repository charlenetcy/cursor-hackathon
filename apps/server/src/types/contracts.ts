/**
 * Shared JSON Contracts (v1)
 * These interfaces enforce the frozen API contracts between services.
 */

/**
 * POST /prompt/parse - Request Body
 */
export interface ParsePromptRequest {
  text: string;
}

/**
 * POST /prompt/parse - Response Body
 */
export interface ParsePromptResponse {
  promptId: string;
  palette: string[];
  motifs: string[];
  mechanics: string[];
  difficulty: number;
}

/**
 * GET /style/byPromptId/:id - Response Body
 */
export interface StyleResponse {
  promptId: string;
  palette: string[];
  skyboxUrl: string;
  textureIds: string[];
  motifIds: string[];
  version: string;
}

/**
 * Error Response
 */
export interface ErrorResponse {
  error: string;
  message: string;
}

