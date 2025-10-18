import { ElevenLabsClient } from "elevenlabs";
import { config } from '../config/env';

const client = new ElevenLabsClient({
  apiKey: config.elevenLabsApiKey
});

const randomPhrases = [
  "Meow!",
  "Ah almost fell didn't ya?",
  "Boop!",
  "Watch your step, friend!",
  "Weeee! This is fun!",
  "Ooh, fancy moves!",
  "Did someone say parkour?",
  "Nice day for jumping, isn't it?",
  "Yippee!",
  "Having fun yet?",
  "Woohoo!",
  "You got this darling!",
  "Parkour master incoming!",
  "Ribbit ribbit!",
  "Om nom nom!",
  "Beep boop!",
  "RAWR!",
  "Coffee break anyone?",
  "The floor is lava!",
  "Don't look down!",
  "Feeling jumpy today?",
  "Hop hop hop!",
  "Hehehehehe!",
  "Going up!",
  "Nice view from here!",
  "Parkour? More like par-COOL!",
  "Boing boing!",
  "To infinity and beyond!",
  "Is that a bird? A plane? Ah it is you",
  "You're doing amazing sweetie!",
];

export async function generateRandomVoice(): Promise<Buffer> {
  const randomPhrase = randomPhrases[Math.floor(Math.random() * randomPhrases.length)];
  
  console.log(`🎤 Generating voice: "${randomPhrase}"`);
  
  const audio = await client.generate({
    voice: config.elevenLabsVoiceId,
    text: randomPhrase,
    model_id: "eleven_turbo_v2_5" // Fastest model
  });
  
  // Convert stream to buffer
  const chunks: Buffer[] = [];
  for await (const chunk of audio) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}

