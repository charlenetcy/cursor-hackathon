import { Router, Request, Response } from 'express';
import { generateRandomVoice, generateBrainrotVoice, generateCustomBrainrotVoice } from '../lib/elevenlabs';

const router = Router();

router.get('/random', async (req: Request, res: Response) => {
  try {
    const audioBuffer = await generateRandomVoice();
    
    // Send audio directly
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
    });
    res.send(audioBuffer);
  } catch (error) {
    console.error('❌ Voice generation error:', error);
    res.status(500).json({ error: 'Failed to generate voice' });
  }
});

router.get('/brainrot', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.query;
    const userPrompt = typeof prompt === 'string' ? prompt : undefined;
    
    const audioBuffer = await generateBrainrotVoice(userPrompt);
    
    // Send audio directly
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
    });
    res.send(audioBuffer);
  } catch (error) {
    console.error('❌ Brainrot voice generation error:', error);
    res.status(500).json({ error: 'Failed to generate brainrot voice' });
  }
});

router.post('/brainrot', async (req: Request, res: Response) => {
  try {
    const { script, prompt } = req.body;
    
    // If a custom script is provided, use it directly
    if (script && typeof script === 'string') {
      console.log(`🎤 Generating custom brainrot voice for script: "${script.substring(0, 100)}..."`);
      const audioBuffer = await generateCustomBrainrotVoice(script);
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
      });
      res.send(audioBuffer);
    } 
    // If a prompt is provided, generate AI script first
    else if (prompt && typeof prompt === 'string') {
      console.log(`🎤 Generating AI brainrot voice for prompt: "${prompt}"`);
      const audioBuffer = await generateBrainrotVoice(prompt);
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
      });
      res.send(audioBuffer);
    } 
    // If neither provided, generate random AI script
    else {
      console.log(`🎤 Generating random AI brainrot voice`);
      const audioBuffer = await generateBrainrotVoice();
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
      });
      res.send(audioBuffer);
    }
  } catch (error) {
    console.error('❌ Brainrot voice generation error:', error);
    res.status(500).json({ error: 'Failed to generate brainrot voice' });
  }
});

export default router;

