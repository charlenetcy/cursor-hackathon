import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { io } from 'socket.io-client';
import { useBackgroundGeneration } from './src/hooks/useBackgroundGeneration';
import BackgroundPromptInput from './src/components/BackgroundPromptInput';
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

    // Player (adjusted for 1.5 sized blocks)
    const playerGeometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
    const playerMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.castShadow = true;
    player.position.set(0, 1.35, 0); // Adjusted to spawn on first 1.5-sized platform
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
      const playerBox = new THREE.Box3().setFromObject(player);
      
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
          if (p.id === localPlayerIdRef.current) continue;
          if (!otherPlayers.has(p.id)) {
            const mesh = new THREE.Mesh(
              new THREE.BoxGeometry(0.6, 1.2, 0.6),
              new THREE.MeshPhongMaterial({ color: 0x00ff7f })
            );
            mesh.castShadow = true;
            mesh.position.set(p.position.x, p.position.y, p.position.z);
            scene.add(mesh);
            otherPlayers.set(p.id, mesh);
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

    // 🎤 Random voice timer - plays a random phrase every 15 seconds
    const voiceInterval = setInterval(() => {
      console.log('🎤 Playing random voice line...');
      fetch(`${serverUrl}/voice/random`)
        .then(r => r.blob())
        .then(blob => {
          const audio = new Audio(URL.createObjectURL(blob));
          audio.play().catch(e => console.log('Audio play failed:', e));
        })
        .catch(e => console.log('Voice fetch failed:', e));
    }, 15000); // Every 15 seconds

    // Authoritative state updates for other players
    socket.on('state', (data) => {
      if (!data || !Array.isArray(data.players)) return;
      const seen = new Set();
      for (const p of data.players) {
        if (p.id === localPlayerIdRef.current) continue;
        seen.add(p.id);
        let mesh = otherPlayers.get(p.id);
        if (!mesh) {
          mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 1.2, 0.6),
            new THREE.MeshPhongMaterial({ color: 0x00ff7f })
          );
          mesh.castShadow = true;
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

    // Cleanup
    return () => {
      clearInterval(voiceInterval); // Stop voice timer
      socket.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', () => {});
      window.removeEventListener('keyup', () => {});
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

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