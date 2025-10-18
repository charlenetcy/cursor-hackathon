import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export default function ParkourGame() {
  const mountRef = useRef(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    // Load high score from localStorage on initial mount
    const saved = localStorage.getItem('parkourHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const textureBackground = new THREE.TextureLoader().load( './assets/deepfried.jpg' );

    scene.background = textureBackground;
    scene.fog = new THREE.Fog(0x87ceeb, 50, 150); // Start fog at distance 50 instead of 0
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
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

    // Platforms - Infinite generation system
    const texture = new THREE.TextureLoader().load( './assets/grass_dirt.png' );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;

    const platforms = [];
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
    
    // Track generation progress (adjusted for 1.5 sized blocks)
    let lastGeneratedX = 0;
    let startX = 0; // Track starting position for score calculation
    const chunkSize = 4; // Number of platforms per chunk
    const platformSpacing = 7; // Distance between platform centers (1.5 gap)
    const generationDistance = 50; // Generate when player is within this distance
    const removalDistance = 35; // Remove platforms this far behind player
    
    // Create a single platform
    const createPlatform = (x, y, z, isSpecial = false) => {
      const material = isSpecial ? specialMaterial : regularMaterial;
      const platform = new THREE.Mesh(platformGeometry, material);
      platform.receiveShadow = true;
      platform.castShadow = true;
      platform.position.set(x, y, z);
      platform.userData.xPosition = x; // Store for cleanup
      scene.add(platform);
      platforms.push(platform);
      return platform;
    };

    // Generate a chunk of platforms
    const generateChunk = (startX, isFirstChunk = false) => {
      for (let i = 0; i < chunkSize; i++) {
        const x = startX + (i * platformSpacing);
        
        let y, z;
        
        // First platform should be at fixed position for spawning
        if (isFirstChunk && i === 0) {
          y = 0; // Platform center at 0, top at 0.75 for 1.5 sized blocks
          z = 0;
        } else {
          // Procedural height variation (adjusted for 1.5 sized blocks)
          const heightWave = Math.sin(x * 0.1) * 2.5;
          const randomHeight = (Math.random() - 0.5) * 1.2;
          y = heightWave + randomHeight;
          
          // Procedural Z position (side-to-side movement, scaled for bigger blocks)
          const zWave = Math.sin(x * 0.15) * 3.5;
          const randomZ = (Math.random() - 0.5) * 2.5;
          z = zWave + randomZ;
        }
        
        // Every 20th platform is special (gold)
        const isSpecial = Math.floor(x / platformSpacing) % 20 === 0 && x > 0;
        
        createPlatform(x, y, z, isSpecial);
      }
      lastGeneratedX = startX + (chunkSize * platformSpacing);
    };

    // Generate initial chunks (first one is special to ensure proper spawn)
    generateChunk(0, true);
    const secondChunkStart = lastGeneratedX;
    generateChunk(secondChunkStart);
    const thirdChunkStart = lastGeneratedX;
    generateChunk(thirdChunkStart);

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
      keys[e.key.toLowerCase()] = true;
      if ((e.key === ' ') && !isJumping) {
        velocity.y = jumpStrength;
        isJumping = true;
      }
    });
    window.addEventListener('keyup', (e) => {
      keys[e.key.toLowerCase()] = false;
    });

    // Camera position (first-person view at eye level)
    camera.position.set(player.position.x, player.position.y + 0.4, player.position.z); // Adjusted for taller player

    // Collision detection (adjusted for 1.5 sized blocks)
    const checkCollision = () => {
      const playerBox = new THREE.Box3().setFromObject(player);
      
      for (let platform of platforms) {
        const platformBox = new THREE.Box3().setFromObject(platform);
        
        // Expand platform collision box for more forgiving landing (invisible extra space)
        const landingBuffer = 0.5; // Extra landing space on each side
        platformBox.min.x -= landingBuffer;
        platformBox.max.x += landingBuffer;
        platformBox.min.z -= landingBuffer;
        platformBox.max.z += landingBuffer;
        
        if (playerBox.intersectsBox(platformBox)) {
          const playerBottom = playerBox.min.y;
          const platformTop = platformBox.max.y;
          
          // Increased tolerance for bigger blocks
          if (velocity.y <= 0 && Math.abs(playerBottom - platformTop) < 0.4) {
            player.position.y = platformTop + 0.6; // Player half-height (1.2/2 = 0.6)
            velocity.y = 0;
            isJumping = false;
            return true;
          }
        }
      }
      return false;
    };

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

      // Infinite generation: Generate new chunks ahead
      if (player.position.x > lastGeneratedX - generationDistance) {
        generateChunk(lastGeneratedX);
      }

      // Remove old platforms behind player to save memory
      for (let i = platforms.length - 1; i >= 0; i--) {
        const platform = platforms[i];
        if (platform.userData.xPosition < player.position.x - removalDistance) {
          scene.remove(platform);
          // Don't dispose geometry/material - they're shared across all platforms
          platforms.splice(i, 1);
        }
      }

      // Update score based on distance traveled (using platformSpacing for accurate counting)
      // Add offset so score updates at the start of each block, not halfway through
      const scoreOffset = platformSpacing / 2; // Half a platform spacing
      const distanceScore = Math.floor(Math.max(0, player.position.x - startX + scoreOffset) / platformSpacing);
      if (distanceScore > score) {
        setScore(distanceScore);
      }

      // Check if fell off (lowered threshold to allow for lower platforms)
      if (player.position.y < -15 && !gameOver) {
        const finalScore = distanceScore;
        setGameOver(true);
        setScore(0); // Reset score immediately
        
        // Update and save high score
        if (finalScore > highScore) {
          const newHighScore = finalScore;
          setHighScore(newHighScore);
          localStorage.setItem('parkourHighScore', newHighScore.toString());
        }
        
        // Clean up ALL existing platforms
        for (let i = platforms.length - 1; i >= 0; i--) {
          const platform = platforms[i];
          scene.remove(platform);
          // Don't dispose geometry/material - they're shared across all platforms
          platforms.splice(i, 1);
        }
        
        // Reset player to starting position
        player.position.set(0, 1.35, 0);
        startX = 0;
        lastGeneratedX = 0;
        velocity.set(0, 0, 0);
        isJumping = false;
        
        // Regenerate initial chunks from scratch
        generateChunk(0, true);
        const secondChunkStart = lastGeneratedX;
        generateChunk(secondChunkStart);
        const thirdChunkStart = lastGeneratedX;
        generateChunk(thirdChunkStart);
        
        // Hide "You fell!" message after 2 seconds
        setTimeout(() => {
          setGameOver(false);
        }, 2000);
      }

      // Camera follow (first-person view at eye level) - only update position, not rotation
      camera.position.x = player.position.x;
      camera.position.y = player.position.y + 0.4; // Adjusted for taller player
      camera.position.z = player.position.z;

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
        {gameOver && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px',
            backgroundColor: 'rgba(255, 107, 107, 0.3)',
            borderRadius: '5px',
            border: '2px solid #ff6b6b'
          }}>
            <div style={{ color: '#ff6b6b', fontWeight: 'bold', fontSize: '18px' }}>
              You fell!
            </div>
            <div style={{ color: '#fff', marginTop: '5px' }}>
              Restarting in 2s...
            </div>
          </div>
        )}
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