import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Environment configuration with validation
 */
export const config = {
  // Server
  port: process.env.PORT || '3001',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Groq API
  groqApiKey: process.env.GROQ_API_KEY || '',

  // Fal.ai API
  falKey: process.env.FAL_KEY || '',

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseBucket: process.env.SUPABASE_BUCKET || 'game-assets',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',
};

/**
 * Validate required environment variables
 */
export function validateEnv(): void {
  const required = [
    { key: 'GROQ_API_KEY', value: config.groqApiKey },
    { key: 'FAL_KEY', value: config.falKey },
    { key: 'SUPABASE_URL', value: config.supabaseUrl },
    { key: 'SUPABASE_ANON_KEY', value: config.supabaseAnonKey },
  ];

  const missing = required.filter(({ value }) => !value);

  if (missing.length > 0) {
    console.warn(
      '⚠️  Warning: Missing environment variables:',
      missing.map(({ key }) => key).join(', ')
    );
    console.warn('⚠️  Service will run with limited functionality');
  }
}

