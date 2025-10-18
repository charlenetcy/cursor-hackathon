import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export default function ParkourGame() {
  const mountRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const textureBackground = new THREE.TextureLoader().load( 'assets/deepfried.jpg' );

    scene.background = textureBackground;
    scene.fog = new THREE.Fog(0x87ceeb, 0, 100);

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

    // Player
    const playerGeometry = new THREE.BoxGeometry(0.5, 1, 0.5);
    const playerMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.castShadow = true;
    player.position.set(0, 0.5, 0);
    scene.add(player);

    // Player physics
    let velocity = new THREE.Vector3();
    let isJumping = false;
    const gravity = -0.02;
    const jumpStrength = 0.4;
    const moveSpeed = 0.15;

    // Platforms
    const texture = new THREE.TextureLoader().load( 'assets/atlas.png' );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;

    const platforms = [];
    const platformGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    // Starting platform
    const createPlatform = (x, y, z, color = 0x228b22) => {
      // const material = new THREE.MeshPhongMaterial({ color });
      const material = new THREE.MeshLambertMaterial( { map: texture, side: THREE.DoubleSide } );
      const platform = new THREE.Mesh(platformGeometry, material);
      platform.receiveShadow = true;
      platform.castShadow = true;
      platform.position.set(x, y, z);
      scene.add(platform);
      platforms.push(platform);
      return platform;
    };

    createPlatform(0, -0.25, 0);
    createPlatform(4, 0, -2);
    createPlatform(8, 0.5, -4);
    createPlatform(12, 1, -2);
    createPlatform(16, 1.5, 0);
    createPlatform(20, 2, -2);
    createPlatform(24, 2.5, -4);
    createPlatform(28, 3, -3, 0xffd700); // Gold finish platform

    // Ground (death zone)
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
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

    // Camera position (first-person view)
    camera.position.set(player.position.x, player.position.y + 0.3, player.position.z);

    // Collision detection
    const checkCollision = () => {
      const playerBox = new THREE.Box3().setFromObject(player);
      
      for (let platform of platforms) {
        const platformBox = new THREE.Box3().setFromObject(platform);
        
        if (playerBox.intersectsBox(platformBox)) {
          const playerBottom = playerBox.min.y;
          const platformTop = platformBox.max.y;
          
          if (velocity.y <= 0 && Math.abs(playerBottom - platformTop) < 0.3) {
            player.position.y = platformTop + 0.5;
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

      // Check if fell off
      if (player.position.y < -4) {
        setGameOver(true);
        player.position.set(0, 0.5, 0);
        velocity.set(0, 0, 0);
        isJumping = false;
      }

      // Check if reached finish
      if (player.position.x > 27 && player.position.z < -2 && player.position.z > -5) {
        setScore(prev => prev + 1);
        player.position.set(0, 0.5, 0);
        velocity.set(0, 0, 0);
        isJumping = false;
      }

      // Camera follow (first-person view) - only update position, not rotation
      camera.position.x = player.position.x;
      camera.position.y = player.position.y + 0.3;
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
          Parkour Game
        </div>
        <div>Completions: {score}</div>
        <div style={{ marginTop: '10px', fontSize: '14px' }}>
          <div>Click to enable mouse look</div>
          <div>WASD or Arrow Keys - Move</div>
          <div>Space or W - Jump</div>
          <div>ESC - Release mouse</div>
        </div>
        {gameOver && (
          <div style={{ marginTop: '10px', color: '#ff6b6b', fontWeight: 'bold' }}>
            You fell! Try again!
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
        Reach the gold platform!
      </div>
    </div>
  );
}