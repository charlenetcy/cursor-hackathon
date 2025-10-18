import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { io } from 'socket.io-client';
import { useBackgroundGeneration } from './src/hooks/useBackgroundGeneration';
import BackgroundPromptInput from './src/components/BackgroundPromptInput';
import BrainrotPromptInput from './src/components/BrainrotPromptInput';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import characterModelUrl from './assets/model.glb';
import treesUrl from './assets/trees.jpg';
import grassUrl from './assets/grass_dirt.png';

export default function ParkourGame() {
  const mountRef = useRef(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    // Load high score from localStorage on initial mount
    const saved = localStorage.getItem('parkourHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [gameOver, setGameOver] = useState(false);
  
  // Store references to Three.js objects for dynamic background updates
  const skyMaterialRef = useRef(null);
  const skyRef = useRef(null);
  const regularMaterialRef = useRef(null);
  const specialMaterialRef = useRef(null);
  const textureLoaderRef = useRef(null);
  const sceneRef = useRef(null);
  const localPlayerIdRef = useRef(null);
  const socketRef = useRef(null);
  const characterModelRef = useRef(null);
  const [avatarStatus, setAvatarStatus] = useState('idle');
  const [avatarError, setAvatarError] = useState(null);
  const applyAvatarForPlayerRef = useRef(null);
  
  // Brainrot prompt state
  const [brainrotStatus, setBrainrotStatus] = useState('idle');
  const [brainrotError, setBrainrotError] = useState(null);
  const brainrotAudioRef = useRef(null);

  // Handle background generation - receives both skybox and texture URLs
  const handleBackgroundReady = (skyboxUrl, textureUrl) => {
    console.log('🎨 New images ready!');
    console.log('  - Skybox:', skyboxUrl);
    console.log('  - Texture:', textureUrl);
    
    // Broadcast to all players via server
    if (socketRef.current) {
      console.log('📡 Emitting background_change to server:', { skyboxUrl, textureUrl });
      socketRef.current.emit('background_change', { skyboxUrl, textureUrl });
    } else {
      console.error('❌ Socket not available - cannot broadcast background change');
    }
    
    // Apply skybox to the sky sphere
    if (textureLoaderRef.current && skyMaterialRef.current && skyboxUrl) {
      const newSkyTexture = textureLoaderRef.current.load(skyboxUrl, () => {
        console.log('✅ Skybox texture loaded successfully');
      });
      skyMaterialRef.current.map = newSkyTexture;
      skyMaterialRef.current.needsUpdate = true;
    }

    // Apply texture to block materials (both regular and special)
    // Since materials are shared, this updates ALL current and future blocks automatically!
    if (textureLoaderRef.current && textureUrl) {
      const newBlockTexture = textureLoaderRef.current.load(textureUrl, (loadedTexture) => {
        console.log('✅ Block texture loaded successfully');
        
        // Configure texture settings for proper tiling
        loadedTexture.wrapS = THREE.RepeatWrapping;
        loadedTexture.wrapT = THREE.RepeatWrapping;
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.magFilter = THREE.NearestFilter; // Pixelated look
        
        // Update regular material
        if (regularMaterialRef.current) {
          regularMaterialRef.current.map = loadedTexture;
          regularMaterialRef.current.needsUpdate = true;
          console.log('✅ Regular block material updated');
        }
        
        // Update special material (keep emissive glow)
        if (specialMaterialRef.current) {
          specialMaterialRef.current.map = loadedTexture;
          specialMaterialRef.current.needsUpdate = true;
          console.log('✅ Special block material updated');
        }
      });
    }
  };

  const { status, error: genError, progress, generateBackground, reset: resetGeneration } = useBackgroundGeneration(handleBackgroundReady);

  // Handle brainrot script generation - ONLY AI mode plays audio
  const handleBrainrotPrompt = async (prompt, mode = 'ai') => {
    setBrainrotStatus('generating');
    setBrainrotError(null);
    
    try {
      console.log(`🎤 Generating brainrot voice for ${mode} mode:`, prompt);
      
      const isDev = import.meta.env.DEV;
      const serverUrl = (import.meta.env.VITE_SERVER_URL ?? import.meta.env.VITE_BACKEND_URL ?? (isDev ? 'http://localhost:3001' : ''));
      
      // Only generate and play audio for AI mode
      if (mode === 'ai') {
        const requestBody = { prompt };
        
        const response = await fetch(`${serverUrl}/voice/brainrot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
      const blob = await response.blob();
      // Stop any currently playing brainrot audio
      try {
        if (brainrotAudioRef.current) {
          brainrotAudioRef.current.pause();
          brainrotAudioRef.current.currentTime = 0;
        }
      } catch {}
      const audio = new Audio(URL.createObjectURL(blob));
      brainrotAudioRef.current = audio;
      // Play the audio (new one only)
      await audio.play();
        
        // Broadcast to all players via server
        if (socketRef.current) {
          console.log('📡 Broadcasting AI brainrot voice to all players');
          socketRef.current.emit('brainrot_voice', { 
            script: prompt, 
            mode,
            timestamp: Date.now()
          });
        }
      } else {
        // Custom mode - just show success without playing audio
        console.log('📝 Custom script mode - no audio playback');
        setBrainrotStatus('success');
        
        // Reset status after 2 seconds for custom mode
        setTimeout(() => {
          setBrainrotStatus('idle');
        }, 2000);
        return;
      }
      
      setBrainrotStatus('success');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setBrainrotStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error('❌ Brainrot voice generation error:', error);
      setBrainrotError(error.message || 'Failed to generate brainrot voice');
      setBrainrotStatus('idle');
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const isDev = import.meta.env.DEV;
  const serverUrl = (import.meta.env.VITE_SERVER_URL ?? import.meta.env.VITE_BACKEND_URL ?? (isDev ? 'http://localhost:3001' : ''));
    if (!serverUrl) {
      console.error('[client] Missing server URL (set VITE_SERVER_URL)');
      return;
    }
    const scene = new THREE.Scene();
    const socket = io(serverUrl, {
      transports: isDev ? ['websocket', 'polling'] : ['polling', 'websocket'],
      withCredentials: false,
    });
    socketRef.current = socket; // Store ref for background updates
    
    // Socket connection debugging
    socket.on('connect', () => {
      console.log('✅ Socket connected to server:', socket.id);
    });
    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });
    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });
    
    // Create a large sphere for the background (skybox effect)
    const textureLoader = new THREE.TextureLoader();
    textureLoaderRef.current = textureLoader; // Store ref for dynamic updates
    
    // Load default initial background
    const initialImageUrl = treesUrl;
    const textureBackground = textureLoader.load(initialImageUrl);
    
    const skyGeometry = new THREE.SphereGeometry(500, 60, 40);
    // Flip the sphere inside-out so we see the texture from inside
    skyGeometry.scale(-1, 1, 1);
    const skyMaterial = new THREE.MeshBasicMaterial({ 
      map: textureBackground,
      fog: false // Don't let fog affect the skybox
    });
    skyMaterialRef.current = skyMaterial; // Store ref for dynamic updates
    
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    skyRef.current = sky;
    scene.add(sky);
    
    scene.fog = new THREE.Fog(0x87ceeb, 50, 150); // Start fog at distance 50 instead of 0
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Set initial camera rotation to look towards negative X (where blocks grow)
    camera.rotation.y = Math.PI / 2; // -90 degrees to look left (towards -X)
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87ceeb, 1);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // PointerLockControls for mouse look
    const controls = new PointerLockControls(camera, renderer.domElement);
    
    // Click to enable pointer lock
    renderer.domElement.addEventListener('click', () => {
      controls.lock();
    });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);

    // Player root with invisible collider; visual model attaches later
    const player = new THREE.Group();
    const collider = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.2, 0.6),
      new THREE.MeshPhongMaterial({ color: 0xff0000, visible: false })
    );
    collider.castShadow = true;
    collider.name = 'player_collider';
    player.add(collider);
    player.position.set(0, 1.35, 0);
    scene.add(player);

    // Player physics (adjusted for 1.5 sized blocks)
    let velocity = new THREE.Vector3();
    let isJumping = false;
    const gravity = -0.02;
    const jumpStrength = 0.45; // Slightly increased for bigger gaps
    const moveSpeed = 0.18; // Slightly faster for bigger platforms

    // Platforms - server-authoritative
    const texture = new THREE.TextureLoader().load( grassUrl );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;

    const platforms = new Map(); // id -> mesh
    const otherPlayers = new Map(); // playerId -> mesh
    const platformGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    
    // Shared materials for all platforms (more memory efficient)
    const regularMaterial = new THREE.MeshLambertMaterial({ 
      map: texture, 
      side: THREE.DoubleSide,
      emissive: 0x000000
    });
    const specialMaterial = new THREE.MeshLambertMaterial({ 
      map: texture, 
      side: THREE.DoubleSide,
      emissive: 0x664400 // Special platforms glow
    });
    
    // Store material refs for dynamic texture updates
    regularMaterialRef.current = regularMaterial;
    specialMaterialRef.current = specialMaterial;
    
    // Track state
    let startX = 0; // Track starting position for score calculation
    let maxDistanceReached = 0; // Track the maximum distance reached to prevent score from decreasing
    const removalDistance = 35; // Remove platforms this far behind player
    const PLATFORM_SPACING = 7; // Distance between platforms (matches server spacing)
    
    // Local helper no longer used (server streams platforms)

    // Fixed character model loader
    const loader = new GLTFLoader();
    const fixedModelUrl = (import.meta.env.VITE_CHARACTER_MODEL_URL || characterModelUrl);
    loader.load(
      fixedModelUrl,
      (gltf) => {
        characterModelRef.current = gltf.scene;
        // Attach to any already-spawned remote players (local player stays first-person only)
        for (const [, grp] of otherPlayers.entries()) {
          attachCharacterTo(grp);
        }
      },
      undefined,
      (err) => {
        console.warn('Failed to load character model, fallback to invisible collider only', err);
      }
    );

    const attachCharacterTo = (group) => {
      if (!characterModelRef.current) return;
      if (group.userData && group.userData.hasCharacter) return;
      const instance = characterModelRef.current.clone(true);
      // Fit model height to 2 blocks (each block is 1.5 → total 3.0 units)
      const box = new THREE.Box3().setFromObject(instance);
      const size = new THREE.Vector3();
      box.getSize(size);
      const targetHeight = 2.25; // 1.5 blocks tall (blocks are 1.5 units)
      const s = targetHeight / (size.y || 1);
      instance.scale.setScalar(s);
      instance.position.set(0, 0, 0);
      instance.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
      group.add(instance);
      group.userData.hasCharacter = true;
    };

    // Server initial platforms
    const upsertPlatforms = (list) => {
      for (const p of list) {
        if (platforms.has(p.id)) continue;
        const material = p.isSpecial ? specialMaterial : regularMaterial;
        const mesh = new THREE.Mesh(platformGeometry, material);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        mesh.position.set(p.position.x, p.position.y, p.position.z);
        mesh.userData.xPosition = p.position.x;
        scene.add(mesh);
        platforms.set(p.id, mesh);
      }
    };

    // Avatar visuals (per-player Three.js groups)
    const avatarVisuals = new Map();

    function buildMinecraftPlayerMesh(texture) {
      const group = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), mat);
      head.position.set(0, 1.6, 0);
      group.add(head);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.4), mat);
      body.position.set(0, 0.8, 0);
      group.add(body);
      const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.4), mat);
      leftArm.position.set(-0.6, 0.8, 0);
      group.add(leftArm);
      const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.4), mat);
      rightArm.position.set(0.6, 0.8, 0);
      group.add(rightArm);
      const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.4), mat);
      leftLeg.position.set(-0.2, 0.2, 0);
      group.add(leftLeg);
      const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.4), mat);
      rightLeg.position.set(0.2, 0.2, 0);
      group.add(rightLeg);
      return group;
    }

    const materialFromColor = (color) => new THREE.MeshPhongMaterial({ color: color ?? 0x00ff7f });

    const loadAvatarMaterialForPrompt = async (promptId) => {
      if (!promptId) return materialFromColor(0x00ff7f);
      try {
        const res = await fetch(`${serverUrl}/style/byPromptId/${promptId}`);
        if (!res.ok) throw new Error('style fetch failed');
        const styleData = await res.json();
        const textureUrl = styleData.textureIds?.[0];
        if (!textureUrl || !textureLoaderRef.current) return materialFromColor(0x00ff7f);
        const texture = await new Promise((resolve, reject) => {
          const t = textureLoaderRef.current.load(textureUrl, () => resolve(t), undefined, reject);
          t.colorSpace = THREE.SRGBColorSpace;
          t.wrapS = THREE.RepeatWrapping;
          t.wrapT = THREE.RepeatWrapping;
          t.magFilter = THREE.NearestFilter;
        });
        const mat = new THREE.MeshPhongMaterial({ map: texture });
        return mat;
      } catch {
        return materialFromColor(0x00ff7f);
      }
    };

    const applyAvatarForPlayer = async (playerId, avatar) => {
      const isLocal = playerId === localPlayerIdRef.current;
      const baseMesh = isLocal ? player : otherPlayers.get(playerId);
      if (!baseMesh) return;

      // Remove existing visual if present
      const existingVisual = avatarVisuals.get(playerId);
      if (existingVisual) {
        baseMesh.remove(existingVisual);
        avatarVisuals.delete(playerId);
      }

      if (!avatar || avatar.type === 'box') {
        baseMesh.material = materialFromColor(avatar?.color ?? (isLocal ? 0xff0000 : 0x00ff7f));
        return;
      }

      if (avatar.type === 'generated' && avatar.promptId) {
        const mat = await loadAvatarMaterialForPrompt(avatar.promptId);
        baseMesh.material = mat;
        baseMesh.material.needsUpdate = true;
        return;
      }

      if (avatar.type === 'minecraft_skin' && avatar.url) {
        try {
          const texture = await new Promise((resolve, reject) => {
            const t = textureLoaderRef.current.load(avatar.url, () => resolve(t), undefined, reject);
            t.colorSpace = THREE.SRGBColorSpace;
            t.magFilter = THREE.NearestFilter;
          });
          const visual = buildMinecraftPlayerMesh(texture);
          baseMesh.add(visual);
          avatarVisuals.set(playerId, visual);
        } catch (e) {
          console.error('Failed to load skin texture', e);
        }
      }
    };

    // Expose to outer scope via ref so upload handler can call it
    applyAvatarForPlayerRef.current = applyAvatarForPlayer;

    // Ground (death zone) - Make it large for infinite mode
    const groundGeometry = new THREE.PlaneGeometry(10000, 100);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x444444,
      transparent: true,
      opacity: 0
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    ground.receiveShadow = true;
    scene.add(ground);

    // Controls
    const keys = {};
    window.addEventListener('keydown', (e) => {
      // Ignore input if user is typing in a text field
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA'
      );
      
      if (isTyping) return;
      keys[e.key.toLowerCase()] = true;
      if ((e.key === ' ') && !isJumping) {
        velocity.y = jumpStrength;
        isJumping = true;
      }
    });
    window.addEventListener('keyup', (e) => {
      // Ignore input if user is typing in a text field
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA'
      );
      
      if (isTyping) return;
      keys[e.key.toLowerCase()] = false;
    });

    // Camera position (first-person view at eye level)
    camera.position.set(player.position.x, player.position.y + 0.4, player.position.z); // Adjusted for taller player

    // Collision detection (adjusted for 1.5 sized blocks)
    const checkCollision = () => {
      const collider = player.getObjectByName('player_collider');
      const playerBox = new THREE.Box3().setFromObject(collider || player);
      
      for (const platform of platforms.values()) {
        const platformBox = new THREE.Box3().setFromObject(platform);
        
        // Expand platform collision box for more forgiving landing (invisible extra space)
        const landingBuffer = 0.5; // Extra landing space on each side
        platformBox.min.x -= landingBuffer;
        platformBox.max.x += landingBuffer;
        platformBox.min.z -= landingBuffer;
        platformBox.max.z += landingBuffer;
        
        // Check if player is horizontally over the platform
        const playerCenterX = player.position.x;
        const playerCenterZ = player.position.z;
        
        if (playerCenterX >= platformBox.min.x && playerCenterX <= platformBox.max.x &&
            playerCenterZ >= platformBox.min.z && playerCenterZ <= platformBox.max.z) {
          
          const playerBottom = playerBox.min.y;
          const platformTop = platformBox.max.y;
          
          // More generous tolerance to catch fast-falling players
          // If player is falling and within range of platform top (above or slightly below)
          if (velocity.y <= 0 && playerBottom <= platformTop + 0.3 && playerBottom >= platformTop - 1.0) {
            player.position.y = platformTop + 0.6; // Player half-height (1.2/2 = 0.6)
            velocity.y = 0;
            isJumping = false;
            return true;
          }
        }
      }
      return false;
    };

    // Helper function to find the first (rightmost/highest X) platform
    const findFirstPlatform = () => {
      let firstPlatform = null;
      let maxX = -Infinity;
      
      for (const platform of platforms.values()) {
        const x = platform.userData.xPosition;
        if (x > maxX) {
          maxX = x;
          firstPlatform = platform;
        }
      }
      
      return firstPlatform;
    };

    // Helper function to spawn player above first available platform
    const spawnPlayerAtFirstPlatform = () => {
      const firstPlatform = findFirstPlatform();
      if (firstPlatform) {
        player.position.set(
          firstPlatform.position.x,
          firstPlatform.position.y + 1.35, // Platform top + player offset
          firstPlatform.position.z
        );
        startX = firstPlatform.position.x; // Update startX for score calculation
        maxDistanceReached = 0; // Reset max distance for new run
      } else {
        // Fallback to origin if no platforms exist yet
        player.position.set(0, 1.35, 0);
        startX = 0;
        maxDistanceReached = 0;
      }
      velocity.set(0, 0, 0);
      isJumping = false;
    };

    // Socket events
    socket.on('world_init', (data) => {
      if (data && data.playerId) {
        localPlayerIdRef.current = data.playerId;
      }
      if (Array.isArray(data.platforms)) {
        upsertPlatforms(data.platforms);
        // Spawn at first platform after platforms are loaded
        spawnPlayerAtFirstPlatform();
      }
      // Seed existing other players
      if (Array.isArray(data.players)) {
        for (const p of data.players) {
          if (p.id === localPlayerIdRef.current) continue; // never render local visual
          if (!otherPlayers.has(p.id)) {
            const group = new THREE.Group();
            const oc = new THREE.Mesh(
              new THREE.BoxGeometry(0.6, 1.2, 0.6),
              new THREE.MeshPhongMaterial({ visible: false })
            );
            oc.castShadow = true;
            oc.name = 'player_collider';
            group.add(oc);
            group.position.set(p.position.x, p.position.y, p.position.z);
            attachCharacterTo(group);
            scene.add(group);
            otherPlayers.set(p.id, group);
          }
        }
      }
    });

    socket.on('platforms_add', (data) => {
      if (Array.isArray(data.platforms)) {
        upsertPlatforms(data.platforms);
      }
    });

    socket.on('background_update', (data) => {
      const { skyboxUrl, textureUrl } = data;
      console.log('🌍 Received background update from server:', { skyboxUrl, textureUrl });
      
      // Apply textures from another player's prompt
      if (textureLoaderRef.current && skyMaterialRef.current && skyboxUrl) {
        const newSkyTexture = textureLoaderRef.current.load(
          skyboxUrl,
          () => {
            console.log('✅ Skybox updated from server broadcast');
          },
          undefined,
          (error) => {
            console.error('❌ Failed to load skybox from server:', error);
          }
        );
        skyMaterialRef.current.map = newSkyTexture;
        skyMaterialRef.current.needsUpdate = true;
      }
      if (textureLoaderRef.current && textureUrl) {
        const newBlockTexture = textureLoaderRef.current.load(
          textureUrl, 
          (loaded) => {
            loaded.wrapS = THREE.RepeatWrapping;
            loaded.wrapT = THREE.RepeatWrapping;
            loaded.colorSpace = THREE.SRGBColorSpace;
            loaded.magFilter = THREE.NearestFilter;
            if (regularMaterialRef.current) {
              regularMaterialRef.current.map = loaded;
              regularMaterialRef.current.needsUpdate = true;
              console.log('✅ Block texture updated from server broadcast');
            }
            if (specialMaterialRef.current) {
              specialMaterialRef.current.map = loaded;
              specialMaterialRef.current.needsUpdate = true;
            }
          },
          undefined,
          (error) => {
            console.error('❌ Failed to load block texture from server:', error);
          }
        );
      }
    });

    // Brainrot voice handler - ONLY play AI-generated scripts from other players
    // Simple dedupe: avoid replaying the same script within a short window
    let lastBrainrot = { text: '', at: 0 };
    socket.on('brainrot_voice_update', async (data) => {
      const { script, mode } = data;
      console.log(`🎤 Received brainrot voice update from another player (${mode} mode):`, script?.substring(0, 100) + '...');
      
      // Only play AI-generated scripts, skip custom scripts
      if (mode !== 'ai') {
        console.log('📝 Skipping custom script - only AI scripts play audio');
        return;
      }

      // Dedupe guard: skip if identical script arrived within the last 4 seconds
      const now = Date.now();
      if (lastBrainrot.text === script && now - lastBrainrot.at < 4000) {
        console.log('⏭️ Skipping duplicate AI brainrot playback');
        return;
      }
      lastBrainrot = { text: script, at: now };
      
      try {
        const isDev = import.meta.env.DEV;
        const serverUrl = (import.meta.env.VITE_SERVER_URL ?? import.meta.env.VITE_BACKEND_URL ?? (isDev ? 'http://localhost:3001' : ''));
        
        const requestBody = { prompt: script };
        
        const response = await fetch(`${serverUrl}/voice/brainrot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
        
        if (response.ok) {
          const blob = await response.blob();
          // Stop any currently playing brainrot audio
          try {
            if (brainrotAudioRef.current) {
              brainrotAudioRef.current.pause();
              brainrotAudioRef.current.currentTime = 0;
            }
          } catch {}
          const audio = new Audio(URL.createObjectURL(blob));
          brainrotAudioRef.current = audio;
          await audio.play();
          console.log('🎤 Played AI brainrot voice from another player');
        }
      } catch (error) {
        console.error('❌ Failed to play brainrot voice from other player:', error);
      }
    });

    // Authoritative state updates for other players
    socket.on('state', (data) => {
      if (!data || !Array.isArray(data.players)) return;
      const seen = new Set();
      for (const p of data.players) {
        if (p.id === localPlayerIdRef.current) continue; // never render local visual
        seen.add(p.id);
        let mesh = otherPlayers.get(p.id);
        if (!mesh) {
          mesh = new THREE.Group();
          const oc = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 1.2, 0.6),
            new THREE.MeshPhongMaterial({ visible: false })
          );
          oc.castShadow = true;
          oc.name = 'player_collider';
          mesh.add(oc);
          attachCharacterTo(mesh);
          scene.add(mesh);
          otherPlayers.set(p.id, mesh);
        }
        mesh.position.set(p.position.x, p.position.y, p.position.z);
      }
      // Remove players that disappeared
      for (const [id, mesh] of otherPlayers.entries()) {
        if (!seen.has(id)) {
          scene.remove(mesh);
          otherPlayers.delete(id);
        }
      }
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Movement relative to camera direction
      const moveDirection = new THREE.Vector3();
      const forward = new THREE.Vector3();
      const right = new THREE.Vector3();
      
      // Get camera direction
      camera.getWorldDirection(forward);
      forward.y = 0; // Keep movement horizontal
      forward.normalize();
      
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      if (keys['w'] || keys['arrowup']) {
        moveDirection.add(forward.multiplyScalar(moveSpeed));
      }
      if (keys['s'] || keys['arrowdown']) {
        moveDirection.add(forward.multiplyScalar(-moveSpeed));
      }
      if (keys['a'] || keys['arrowleft']) {
        moveDirection.add(right.multiplyScalar(-moveSpeed));
      }
      if (keys['d'] || keys['arrowright']) {
        moveDirection.add(right.multiplyScalar(moveSpeed));
      }

      player.position.add(moveDirection);

      // Apply gravity
      velocity.y += gravity;
      player.position.y += velocity.y;

      // Check collisions
      checkCollision();

      // Send client state to server (authoritative positions)
      socket.emit('client_state', { 
        position: { x: player.position.x, y: player.position.y, z: player.position.z },
        yaw: camera.rotation.y,
      });

      // Remove old platforms behind player to save memory
      for (const [id, platform] of platforms.entries()) {
        if (platform.userData.xPosition > player.position.x + removalDistance) {
          scene.remove(platform);
          platforms.delete(id);
        }
      }

      // Update score based on number of blocks passed (platforms are spaced PLATFORM_SPACING apart)
      // Calculate distance traveled from start
      const distanceTraveled = startX - player.position.x;
      
      // Update max distance to ensure score never decreases during a run
      if (distanceTraveled > maxDistanceReached) {
        maxDistanceReached = distanceTraveled;
      }
      
      // Calculate score based on max distance reached, adding 0.5 offset so score increments 
      // when player reaches the center of each platform (more intuitive)
      const distanceScore = Math.floor(Math.max(0, (maxDistanceReached + (PLATFORM_SPACING * 0.2)) / PLATFORM_SPACING));
      
      // Update score (continuously, even when jumping)
      if (distanceScore > score) {
        setScore(distanceScore);
      }

      // Check for death and respawn
      if (player.position.y < -30 && !gameOver) {
        const finalScore = distanceScore;
        
        setGameOver(true);
        setScore(0); // Reset score immediately
        
        // Update and save high score
        if (finalScore > highScore) {
          const newHighScore = finalScore;
          setHighScore(newHighScore);
          localStorage.setItem('parkourHighScore', newHighScore.toString());
        }
        
        // Respawn at first available platform (not at origin, since blocks may have despawned)
        spawnPlayerAtFirstPlatform();
        
        // Note: Background is NOT reset on game restart - user's custom background persists
        
        // Hide "You fell!" message after 2 seconds
        setTimeout(() => {
          setGameOver(false);
        }, 2000);
      }

      // Camera follow (first-person view at eye level) - only update position, not rotation
      camera.position.x = player.position.x;
      camera.position.y = player.position.y + 0.4; // Adjusted for taller player
      camera.position.z = player.position.z;

      if (skyRef.current) {
        skyRef.current.position.copy(camera.position);
      }
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 🎤 Random voice timer - DISABLED to avoid conflicts with brainrot scripts
    // const voiceInterval = setInterval(() => {
    //   console.log('🎤 Playing random voice line...');
    //   fetch(`${serverUrl}/voice/random`)
    //     .then(response => response.blob())
    //     .then(blob => {
    //       const audio = new Audio(URL.createObjectURL(blob));
    //       audio.play().catch(e => console.log('Audio play failed:', e));
    //     })
    //     .catch(e => console.log('Voice fetch failed:', e));
    // }, 15000); // 15 seconds
    const voiceInterval = null; // No random voice timer

    // Cleanup
    return () => {
      if (voiceInterval) clearInterval(voiceInterval); // Stop voice timer if it exists
      // Stop any brainrot audio still playing
      try {
        if (brainrotAudioRef.current) {
          brainrotAudioRef.current.pause();
          brainrotAudioRef.current.currentTime = 0;
          brainrotAudioRef.current = null;
        }
      } catch {}
      socket.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', () => {});
      window.removeEventListener('keyup', () => {});
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // No avatar upload anymore; fixed model is used for all players

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <div ref={mountRef} />
      
      {/* Background Generation UI */}
      <BackgroundPromptInput
        onSubmit={generateBackground}
        status={status}
        progress={progress}
        error={genError}
      />
      
      {/* Brainrot Script UI */}
      <BrainrotPromptInput
        onSubmit={handleBrainrotPrompt}
        status={brainrotStatus}
        error={brainrotError}
      />
      
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: '15px',
        borderRadius: '8px',
        userSelect: 'none'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
          Infinite Parkour
        </div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4CAF50' }}>
          Distance: {score}
        </div>
        {highScore > 0 && (
          <div style={{ fontSize: '14px', color: '#FFD700', marginTop: '5px' }}>
            Best: {highScore} 🏆
          </div>
        )}
        <div style={{ marginTop: '10px', fontSize: '14px' }}>
          <div>Click to enable mouse look</div>
          <div>WASD or Arrow Keys - Move</div>
          <div>Space - Jump</div>
          <div>ESC - Release mouse</div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.7 }}>
          Platforms generate infinitely!
        </div>
      </div>
      
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: '10px 20px',
        borderRadius: '8px',
        userSelect: 'none'
      }}>
        🏃 How far can you go? 🏃
      </div>
      
      {/* Crosshair */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 1000
      }}>
        {/* Horizontal line */}
        <div style={{
          position: 'absolute',
          width: '20px',
          height: '2px',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 3px rgba(0, 0, 0, 0.8)'
        }} />
        {/* Vertical line */}
        <div style={{
          position: 'absolute',
          width: '2px',
          height: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 3px rgba(0, 0, 0, 0.8)'
        }} />
        {/* Center dot */}
        <div style={{
          position: 'absolute',
          width: '4px',
          height: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '50%',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 3px rgba(0, 0, 0, 0.8)'
        }} />
      </div>
    </div>
  );
}