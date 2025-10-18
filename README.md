# 🎮 Cursor Hackathon - Prompt-Driven Multiplayer Parkour World

## 📁 Project Structure

This project is organized into **3 main components** that can be developed independently:

```
cursor-hackathon/
├── apps/
│   ├── server/          # 🔹 Developer A - Game Server / Generator
│   │   ├── src/
│   │   │   ├── game/          # Game loop & simulation
│   │   │   ├── generator/     # Tower generation
│   │   │   ├── validator/     # Playability checks
│   │   │   ├── networking/    # Socket.io server
│   │   │   └── services/      # Prompt, assets, metrics
│   │   └── package.json
│   │
│   └── client/          # 🔹 Developer B - Client / Renderer
│       ├── src/
│       │   ├── game/          # Game logic
│       │   ├── networking/    # Socket.io client
│       │   ├── physics/       # Rapier integration
│       │   ├── rendering/     # Three.js setup
│       │   └── ui/            # React UI components
│       └── package.json
│
├── services/
│   └── prompt/          # 🔹 Developer C - Prompt & Style Service
│       ├── src/
│       │   ├── api/           # REST API endpoints
│       │   ├── prompt/         # Prompt parsing logic
│       │   ├── style/          # Style generation
│       │   └── cache/         # CDN caching
│       └── package.json
│
├── shared/              # 🔗 Shared Types & Utilities
│   ├── src/
│   │   ├── types/             # TypeScript interfaces
│   │   ├── utils/             # Common utilities
│   │   └── constants/         # Game constants
│   └── package.json
│
└── assets/              # 🎨 Default Assets
    ├── textures/              # Default textures
    └── skyboxes/              # Default skyboxes
```

## 🚀 Quick Start

### Install Dependencies
```bash
npm run install:all
```

### Development Mode (All Components)
```bash
npm run dev
```

### Individual Components
```bash
# Server only
npm run dev:server

# Client only  
npm run dev:client

# Style service only
npm run dev:style
```

## 🔧 Component Details

### 🔹 Developer A - Game Server (`apps/server`)
**Focus:** Real-time multiplayer, authoritative physics, deterministic chunk generation
- **Port:** 3001
- **Tech:** Node.js, TypeScript, Socket.io, Zod, Pino
- **Key Features:** 20Hz game loop, chunk generation, validation, WebSocket events

### 🔹 Developer B - Client (`apps/client`)  
**Focus:** Three.js scene, physics feel, player control, rendering style
- **Port:** 3000
- **Tech:** React, Three.js, Rapier, Socket.io-client, Vite
- **Key Features:** 3D rendering, player controller, real-time updates, UI

### 🔹 Developer C - Style Service (`services/prompt`)
**Focus:** Prompt parsing, style generation, CDN caching
- **Port:** 3002  
- **Tech:** Express, TypeScript, Groq SDK, Zod
- **Key Features:** REST API, prompt parsing, style generation, caching

## 🔗 Integration Contracts

All components communicate through well-defined interfaces in `shared/src/types/`:

- **WebSocket Events:** Server ↔ Client communication
- **REST API:** Server ↔ Style Service communication  
- **Game Types:** Shared data structures for chunks, players, etc.

## 📋 Development Workflow

1. **Start with shared types** - Define interfaces first
2. **Develop components independently** - Each can run with mocks
3. **Integrate via contracts** - Use shared interfaces for communication
4. **Test end-to-end** - Run all components together

## 🧪 Testing Strategy

- **Unit tests:** Each component tests its own logic
- **Integration tests:** Test component communication via shared contracts
- **E2E tests:** Full game flow with all components running

## 📦 Build & Deploy

```bash
# Build all components
npm run build

# Individual builds
npm run build:server
npm run build:client  
npm run build:style
```

---

**Remember:** Each developer can work independently using the shared contracts as integration points!