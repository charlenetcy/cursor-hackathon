import { createApp } from './app';
import { config } from './config/env';

/**
 * Start the Express server
 */
function startServer() {
  const app = createApp();
  const port = config.port;

  app.listen(port, () => {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  🚀 Prompt & Style Service - Production Ready               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\n📡 Server running on port ${port}`);
    console.log(`🏥 Health check: http://localhost:${port}/health\n`);
    console.log('📋 Available Endpoints:');
    console.log(`   POST   /prompt/parse          - Parse text prompts with Groq AI`);
    console.log(`   GET    /style/byPromptId/:id  - Generate & retrieve style assets\n`);
    console.log('🔌 Integrations:');
    console.log(`   ${config.groqApiKey ? '✅' : '❌'} Groq AI (LLM parsing)`);
    console.log(`   ${config.falKey ? '✅' : '❌'} Fal.ai (Image generation)`);
    console.log(`   ${config.supabaseUrl && config.supabaseAnonKey ? '✅' : '❌'} Supabase (Asset storage)`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });
}

// Start server if this file is executed directly
if (require.main === module) {
  startServer();
}

export { startServer };

