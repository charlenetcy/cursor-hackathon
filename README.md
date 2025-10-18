# 🌟 Lucid Dream - AI-Powered Multiplayer Parkour World

## ⚡ The Innovation

**Imagine Minecraft meets AI image generation in real-time multiplayer.** Players type creative prompts ("cyberpunk city", "enchanted forest", "retro arcade") and watch as upcoming parkour chunks instantly transform their visual theme while maintaining deterministic, fair gameplay physics. The AI also generates brainrot scripts that get converted to synchronized audio, creating a multiplayer lucid dream brainrot experience.

This isn't just a game—it's a **real-time AI art installation** and **multiplayer lucid dream** where player creativity drives an ever-evolving 3D world, with sophisticated fallback systems ensuring smooth gameplay even when AI services hiccup.

---

## 🏗️ Architecture Overview

<div align="center">
  <img src="https://img.shields.io/badge/Tech%20Stack-Advanced-blue" alt="Tech Stack Badge">
  <img src="https://img.shields.io/badge/Architecture-Microservices-green" alt="Architecture Badge">
  <img src="https://img.shields.io/badge/AI%20Integration-Real--time-red" alt="AI Integration Badge">
</div>

### **Two services locally (Server + Client); AI integrated into Server**

```
┌─────────────────────────────────────────────────────────────────┐
│  🎮 Lucid Dream - Prompt-Driven Multiplayer Parkour World       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ 🎯 Game     │  │ 🌐 3D        │  │ 🤖 AI       │              │
│  │ Server      │  │ Client      │  │ Prompt      │              │
│  │             │  │             │  │ Service     │              │
│  │ • Authoritative│ • Three.js  │  │ • Groq LLM  │              │
│  │ • Socket.io │  │ • React     │  │ • Fal.ai    │              │
│  │ • Validation│  │ • Physics   │  │ • ElevenLabs│              │
│  │ • Supabase  │  │ • Vercel    │  │ • Supabase  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
│  🔄 Real-time WebSocket Communication                           │
│  📡 REST APIs for AI Asset Generation                           │
│  🎨 Shared TypeScript Contracts                                 │
└─────────────────────────────────────────────────────────────────┘
```

Note: In this repo, the AI prompt/style/voice endpoints are integrated into the game server; you only run two localhost processes (server + client).

---

## 🚀 Key Features

### **🧠 AI-Powered World Generation**
- **Text-to-Visual Pipeline**: Players type prompts → AI parses intent → generates custom skyboxes/textures
- **Future-Only Application**: Prompts affect upcoming chunks (+3 to +5 ahead), maintaining fair play
- **Smart Fallbacks**: Last-good palette + generic skybox if generation fails
- **CDN Caching**: AI-generated assets cached on Supabase for instant loading

### **⚡ Real-Time Multiplayer Physics**
- **Authoritative Server**: 20Hz game loop with client-side prediction and reconciliation
- **Sophisticated Validation**: Jump gaps, slopes, reachable paths automatically verified
- **Path Building & Streaming**: Server generates and streams platform paths/chunks ahead of players
- **Floating Origin**: World rebasing every 10 chunks to maintain precision
- **Smooth Interpolation**: Lag compensation with position corrections

### **🎨 Advanced Rendering Pipeline**
- **Three.js + React**: Modern 3D rendering with declarative component architecture
- **Runtime Style Application**: Palette binding, skybox swapping, texture updates
- **Physics Integration**: Custom physics system with collision detection
- **Asset Streaming**: Progressive chunk loading with visual consistency

---

## 🛠️ Technical Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Game Server** | Node.js + TypeScript + Express + Socket.io | Authoritative multiplayer, physics simulation, path building/streaming (hosted on Heroku) |
| **3D Client** | React + TypeScript + Three.js + Vite | Real-time 3D rendering, physics feel (hosted on Vercel) |
| **AI Service** | Groq SDK + Fal.ai + ElevenLabs | Prompt parsing, image generation, brainrot script → TTS |
| **Storage & DB** | Supabase (PostgreSQL + Storage Bucket) | Persist prompts/metrics and host textures/skyboxes (public CDN) |
| **Architecture** | Monorepo + Shared Contracts + Socket.io-client | Type-safe microservice communication |

---

## 🎯 Innovation Highlights

### **🔬 Technical Sophistication**
- **Deterministic Rebuilds**: Identical world generation across all clients using `(worldSeed, promptId, chunkIndex)`
- **Non-Blocking AI**: Async texture generation that never interrupts gameplay
- **Microservice Independence**: Each component develops independently with shared contracts
- **Production-Ready**: Comprehensive error handling, metrics, logging, and fallbacks

### **🎮 Game Design Brilliance**
- **Player Creativity**: Every prompt becomes a visual theme, encouraging experimentation
- **Fair Play**: Physics remain deterministic while visuals transform
- **Progressive Difficulty**: AI can inject mechanics/difficulty tags for varied challenge
- **Social Experience**: Multiplayer parkour with shared creative expression

### **🏗️ Software Engineering Excellence**
- **Type Safety**: Full TypeScript coverage with shared interfaces
- **Scalable Architecture**: Microservices that can scale independently
- **Developer Experience**: Hot reloading, comprehensive tooling, clear separation of concerns
- **Production Monitoring**: Structured logging, metrics collection, health checks

---

## 🚀 Quick Start

```bash
# Install all dependencies
npm run install:all

# Launch entire ecosystem
npm run dev
```

**Two terminals will open:**
- **Game Server (with AI)**: `http://localhost:3001` (WebSocket + REST APIs: prompt/style/voice; path building + platform streaming)
- **3D Client**: `http://localhost:3000` (React + Three.js)

---

## 🎪 Demo Experience

1. **Open multiple browser tabs** to `http://localhost:3000`
2. **Type creative prompts** like:
   - `"neon cyberpunk city"`
   - `"enchanted forest glade"`
   - `"ancient temple ruins"`
   - `"candy wonderland"`
3. **Watch the magic happen**: Upcoming parkour chunks transform before your eyes!
4. **Listen to some brainrot!**: Prompt a topic and have some relaxing brainrot script fill your ears!
4. **Race your friends**: Physics remain fair while visuals evolve with each prompt

---

