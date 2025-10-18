# 🧱 Team Split + Shared Contracts Overview

## 🔹 Developer A — Game Server / Generator
**Focus:** Real-time multiplayer, authoritative physics, deterministic chunk generation, and validation.

**Owns**
- WebSocket game server (`apps/server`)
- Tick loop (20 Hz), interpolation corrections  
- Chunk generator + path validator  
- Rate-limited prompt queue (+3…+5 future chunks)  
- Emits `world_init`, `state`, `chunk_add`, `prompt_ack`, `corr`, `error`

**Consumes**
- `GET /style/byPromptId/:id` (from Style Service)  
- Uses cached fallback if not ready.

**Mock Needed**
- Simple REST returning static palette + skybox URL.

---

## 🔹 Developer B — Client / Renderer
**Focus:** Three.js scene, physics feel, player control, rendering style (palette, skybox, textures).

**Owns**
- Client app (`apps/client`)  
- Scene graph (Three.js or Babylon.js)  
- Player controller (Rapier or cannon-es)  
- WS connection to server; renders updates in real time  
- Style runtime (palette binding, skybox swap, prop placement)  
- UI: prompt input, latency, “Next theme in N chunks”

**Consumes**
- All WebSocket events from Server.  
- CDN asset URLs (skybox/texture).  

**Mock Needed**
- Fake server that emits periodic `world_init`, `state`, and `chunk_add`.

---

## 🔹 Developer C — Prompt & Style Service
**Focus:** Prompt parsing, style generation, and CDN caching.

**Owns**
- REST API (`services/prompt`)
- `POST /prompt/parse` → JSON tags `{palette, motifs, mechanics}`  
- `GET /style/byPromptId/:id` → URLs + palette  
- Optional Groq LLM fallback for open-vocab tags  
- 2D texture/skybox generator (Fal.ai, Meshy, or cached)  
- StylePack fallback (safe default palette + gradient)

**Provides**
- Style data consumed by Server + Client.  
- Cache via CDN (R2/S3).

**Mock Needed**
- JSON fixture file keyed by `promptId`.

---

# 🔁 Shared JSON Contracts (Frozen Interfaces)

## ✅ WebSocket (Server ↔ Client)
| Event | Direction | Purpose |
|--------|------------|----------|
| `join` | C→S | Connect to world |
| `world_init` | S→C | Send worldSeed, chunks, player list |
| `input` | C→S | Player controls or pose @20 Hz |
| `state` | S→C | Broadcast player snapshots |
| `prompt` | C→S | New user prompt |
| `prompt_ack` | S→C | Prompt accepted/rejected |
| `chunk_add` | S→C | Add validated + styled chunk |
| `corr` | S→C | Correct client position |
| `error` | S→C | Rate limit or invalid prompt |

**Example**
```json
{
  "apiVersion":"v1",
  "index":121,
  "seed":"1577836800000121",
  "structureClass":"tower",
  "palette":["#fffcee","#2e7d32","#263238"],
  "skyboxUrl":"https://cdn/sky/sha2.eq",
  "appliedPromptId":"phash_9c0f"
}
```

---

## ✅ REST (Server ↔ Style Service)

### `POST /prompt/parse`
```json
{ "text":"White House gardens" }
```
→
```json
{
  "promptId":"phash_9c0f",
  "palette":["#f5f5f5","#2e7d32","#263238"],
  "motifs":["columns","flags"],
  "mechanics":[],
  "difficulty":2
}
```

### `GET /style/byPromptId/{id}`
```json
{
  "promptId":"phash_9c0f",
  "palette":["#f5f5f5","#2e7d32","#263238"],
  "skyboxUrl":"https://cdn/sky/sha2.eq",
  "textureIds":["tx_stone_002"],
  "motifIds":["columns","flags"],
  "version":"v1"
}
```

---

# 🔗 Integration Flow
1. **Client → Server:** `prompt(text)`  
2. **Server → StyleService:** `GET /style/byPromptId/:id`  
3. **Server → All Clients:** `chunk_add` (includes palette + URLs)  
4. **Clients:** Apply visuals locally while maintaining identical physics.

---

# 🧩 Key Integration Rules
- All payloads include `"apiVersion":"v1"`.  
- Fields only added as optional; no breaking renames.  
- Prompts affect *future* chunks only.  
- Server/game loop never blocks on REST; uses fallback style.  
- CDN always public-read, content-hashed URLs.

---

# 🧠 TL;DR for Dev Coordination
| Role | Focus | Depends On | Outputs |
|------|--------|-------------|----------|
| Dev A | Multiplayer server + tower gen | Style REST (`palette`, `skyboxUrl`) | WebSocket events |
| Dev B | 3D client + rendering | WS events, CDN assets | Player UI & visuals |
| Dev C | Prompt parser + texture gen | none | Style REST + CDN URLs |

All three devs can work fully **independently** using mocks, with integration via the shared contracts above.
