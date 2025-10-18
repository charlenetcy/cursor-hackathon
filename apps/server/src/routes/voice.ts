import { Router, Request, Response } from 'express';
import { generateRandomVoice } from '../lib/elevenlabs';

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

export default router;

