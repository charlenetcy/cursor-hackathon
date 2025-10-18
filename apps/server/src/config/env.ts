/**
 * Environment configuration for the server
 * Loads API keys and configuration from environment variables
 */

// Load environment variables
if (!process.env.GROQ_API_KEY) {
  console.warn('⚠️  GROQ_API_KEY not set. Prompt parsing will not work.');
}

if (!process.env.FAL_KEY) {
  console.warn('⚠️  FAL_KEY not set. Image generation will not work.');
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn('⚠️  Supabase credentials not set. Asset storage will not work.');
}

export const config = {
  // API Keys
  groqApiKey: process.env.GROQ_API_KEY || '',
  falKey: process.env.FAL_KEY || '',
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || '',
  
  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseBucket: process.env.SUPABASE_BUCKET || 'game-assets',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',
};

// Validate critical config
if (!config.groqApiKey || !config.falKey || !config.supabaseUrl) {
  console.error('❌ Missing required environment variables! Please check your .env file.');
  console.error('Required: GROQ_API_KEY, FAL_KEY, SUPABASE_URL, SUPABASE_ANON_KEY');
}

