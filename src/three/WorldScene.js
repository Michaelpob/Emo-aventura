import * as THREE from 'three';
import { createIslandMesh, setIslandHover } from './createIslandMesh.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ART PASS - Mejora visual sin tocar lógica de juego
// Antes: renderer sin toneMapping, sombras 1024, Fog lineal, océano plano color #3caed4
// Después: ACES toneMapping, sombras 2048 antialiased, FogExp2, océano shader con olas + fresnel, sky gradiente, partículas

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    darkness: { value: 0.35 },
    offset: { value: 0.95 }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float darkness;
    uniform float offset;
    varying vec2 vUv;
    void main(){
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
      float vig = clamp(1.0 - dot(uv, uv), 0.0, 1.0);
      texel.rgb *= mix(1.0 - darkness * 0.5, 1.0, vig);
      gl_FragColor = texel;
    }
  `
};

export class WorldScene {
  constructor(canvasHost, islands, callbacks) {
    this.canvasHost = canvasHost;
    this.islands = islands;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.islandGroups = new Map();
    this.interactiveMeshes = [];
    this.waves = [];
    this.clouds = [];
    this.completed = new Set();
    this.keys = {};
    // el mapa se recorre con la camara: no hay personaje, se entra tocando la isla
    this.center = new THREE.Vector3(0, 0.35, 0);
    this.drag = {
      active: false,
      moved: false,
      startX: 0,
      startY: 0,
      yaw: -0.35,
      targetYaw: -0.35,
      pitch: 0.72,
      targetPitch: 0.72,
      distance: 9.8,
      targetDistance: 9.8
    };
    this.cameraTarget = new THREE.Vector3(0, 0.35, 0.7);
    this.cameraFocus = new THREE.Vector3(0, 0.35, 0.7);
    this.focusMode = 'map';
    this.focusIsland = null;
    this.hoveredId = null;
  }

  mount() {
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    this.isCoarse = isCoarse;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isCoarse,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(this.getPixelRatio());
    this.renderer.setClearColor('#88d5eb', 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // ART PASS: tone mapping físico para colores no planos
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvasHost.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    // ART PASS: Fog exponencial más físico que lineal
    this.scene.fog = new THREE.FogExp2('#88d5eb', 0.032);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

    this.addLights();
    this.addSky();
    this.addOcean();
    this.addIslands();
    this.addAmbientMotion();
    this.addDustParticles();
    this.setupPostProcessing();

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.resize);

    this.resize();
    this.isRunning = true;
    this.animate();
  }

  dispose() {
    this.isRunning = false;
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.resize);
    this.composer?.dispose();
    this.renderer.dispose();
    this.canvasHost.replaceChildren();
  }

  setCompleted(completedIds) {
    this.completed = new Set(completedIds);
    this.islandGroups.forEach((group, id) => {
      const badge = group.getObjectByName(`${id}-completion-badge`);
      if (badge) badge.visible = this.completed.has(id);
    });
    this.refreshTint();
  }

  /**
   * Color de cada isla segun su estado: apagada (gris) hasta completarla,
   * entonces recupera su paleta completa. Bloqueada: mas oscura y con candado.
   * Solo fija el color objetivo; animate() hace la transicion suave.
   */
  refreshTint() {
    const muted = new THREE.Color('#767c85');
    const shade = new THREE.Color('#5a6472');
    this.islandGroups.forEach((group, id) => {
      const isLocked = this.locked?.has(id) ?? false;
      const isDone = this.completed?.has(id) ?? false;
      group.traverse((child) => {
        if (!child.isMesh || !child.material?.color) return;
        if (!child.userData.baseColor) child.userData.baseColor = child.material.color.clone();
        const color = child.userData.baseColor.clone();
        if (isLocked) color.lerp(shade, 0.6).multiplyScalar(0.78);
        else if (!isDone) color.lerp(muted, 0.78).multiplyScalar(0.86);
        child.userData.targetColor = color;
        // los cristales tampoco brillan hasta completar la isla
        if (child.material.emissive) {
          if (!child.userData.baseEmissive) child.userData.baseEmissive = child.material.emissive.clone();
          const glow = child.userData.baseEmissive.clone();
          if (isLocked || !isDone) glow.lerp(muted, 0.8).multiplyScalar(0.5);
          child.userData.targetEmissive = glow;
        }
        // las islas que nacen apagadas no parpadean al cargar
        if (!child.userData.tintReady) {
          child.material.color.copy(color);
          if (child.userData.targetEmissive) child.material.emissive.copy(child.userData.targetEmissive);
          child.userData.tintReady = true;
        }
      });
      const emoji = group.getObjectByName(`${id}-emoji`);
      if (emoji) emoji.material.opacity = isLocked ? 0.4 : isDone ? 1 : 0.55;
      const label = group.getObjectByName(`${id}-label`);
      if (label) label.material.opacity = isLocked ? 0.5 : 1;
    });
  }

  /** Islas bloqueadas: menor saturacion, oscurecidas y con candado flotante */
  setLocked(lockedIds) {
    this.locked = new Set(lockedIds ?? []);
    this.islandGroups.forEach((group, id) => {
      const isLocked = this.locked.has(id);
      group.userData.locked = isLocked;
      let lock = group.getObjectByName(`${id}-lock`);
      if (!lock) {
        lock = this.createLockSprite();
        lock.name = `${id}-lock`;
        const island = this.islands.find((i) => i.id === id);
        lock.position.y = (island?.height ?? 0.4) * 0.35 + 1.05;
        lock.scale.set(0.55, 0.55, 1);
        group.add(lock);
      }
      lock.visible = isLocked;
    });
    this.refreshTint();
  }

  isLocked(islandId) {
    return this.locked ? this.locked.has(islandId) : false;
  }

  createLockSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = '92px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒', 64, 70);
    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  }

  focusMap() {
    this.focusMode = 'map';
    this.focusIsland = null;
    this.drag.targetDistance = 11.2;
    this.cameraTarget.copy(this.center);
  }

  focusOnIsland(islandId) {
    const island = this.islands.find((item) => item.id === islandId);
    if (!island) return;
    this.focusMode = 'island';
    this.focusIsland = island;
    this.drag.targetDistance = 4.1;
    this.cameraTarget.set(island.position[0], 0.75, island.position[2]);
  }

  setupPostProcessing() {
    // ART PASS: pipeline ligero - solo en escritorio alta calidad, en móvil calidad reducida
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    // Bloom sutil solo para emisivos (cristales, badge) y reflejos agua
    const bloomStrength = this.isCoarse ? 0.18 : 0.32;
    const bloomRadius = 0.45;
    const bloomThreshold = 0.82;
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      bloomStrength,
      bloomRadius,
      bloomThreshold
    );
    this.composer.addPass(this.bloomPass);

    // Vignette muy sutil cinematográfico
    this.vignettePass = new ShaderPass(VignetteShader);
    this.composer.addPass(this.vignettePass);

    this.composer.addPass(new OutputPass());
  }

  addLights() {
    // ART PASS: iluminación PBR físicamente correcta
    const hemi = new THREE.HemisphereLight('#fff6d5', '#4a7a96', 1.4);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight('#ffffff', 2.6);
    sun.position.set(-4, 8, 4);
    sun.castShadow = true;
    // Sombras suaves de mayor resolución, adaptativa según dispositivo
    const shadowSize = this.isCoarse ? 1024 : 2048;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 30;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.015;
    this.scene.add(sun);
    this.sunLight = sun;

    // Luz de relleno fría para contraste
    const rim = new THREE.DirectionalLight('#bfe8ff', 0.32);
    rim.position.set(5, 4, -5);
    this.scene.add(rim);

    // Luz ambiental suave para no dejar sombras negras
    const ambient = new THREE.AmbientLight('#88d5eb', 0.28);
    this.scene.add(ambient);
  }

  addSky() {
    // ART PASS: skybox gradiente sutil sin cambiar paleta - mismo tono #88d5eb pero con profundidad
    const skyGeo = new THREE.SphereGeometry(80, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color('#b8e6f5') },
        midColor: { value: new THREE.Color('#88d5eb') },
        bottomColor: { value: new THREE.Color('#a8dff0') }
      },
      vertexShader: `varying vec3 vWorldPosition; void main(){ vec4 wp = modelMatrix*vec4(position,1.0); vWorldPosition = wp.xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main(){
          float h = normalize(vWorldPosition).y;
          vec3 color = mix(bottomColor, midColor, smoothstep(-0.2, 0.3, h));
          color = mix(color, topColor, smoothstep(0.3, 0.8, h));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }

  addOcean() {
    // ART PASS: shader agua con olas sutiles + fresnel, misma paleta #3caed4 pero con vida
    this.oceanMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        deepColor: { value: new THREE.Color('#2f8fb8') },
        shallowColor: { value: new THREE.Color('#3caed4') },
        sunDir: { value: new THREE.Vector3(-0.4, 0.7, 0.4).normalize() },
        cameraPos: { value: new THREE.Vector3() }
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main(){
          vUv = uv;
          vec3 pos = position;
          float w1 = sin(pos.x * 1.1 + time * 0.3) * 0.05;
          float w2 = sin(pos.z * 1.6 + time * 0.45) * 0.035;
          float w3 = sin((pos.x+pos.z)*0.85 + time * 0.2) * 0.025;
          pos.y += w1 + w2 + w3;
          vec3 n = normal;
          vWorldPos = (modelMatrix * vec4(pos,1.0)).xyz;
          vNormal = normalize(normalMatrix * n);
          vViewDir = normalize(cameraPosition - vWorldPos);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 deepColor;
        uniform vec3 shallowColor;
        uniform vec3 sunDir;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main(){
          float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.0);
          vec3 reflDir = reflect(-vViewDir, vNormal);
          float sunRefl = pow(max(dot(reflDir, sunDir), 0.0), 32.0);
          float wave = sin(vWorldPos.x*1.8 + vWorldPos.z*1.2);
          vec3 base = mix(deepColor, shallowColor, 0.5 + wave*0.07);
          vec3 color = mix(base, vec3(0.9, 0.97, 1.0), fresnel * 0.16);
          color += vec3(1.0) * sunRefl * 0.1;
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    const ocean = new THREE.Mesh(new THREE.CircleGeometry(18, 80), this.oceanMat);
    ocean.name = 'ocean';
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.08;
    ocean.receiveShadow = true;
    this.scene.add(ocean);

    for (let i = 0; i < 8; i += 1) {
      const wave = new THREE.Mesh(
        new THREE.TorusGeometry(2.1 + i * 1.7, 0.012, 6, 72),
        new THREE.MeshBasicMaterial({ color: i % 2 ? '#b7efff' : '#e5fbff', transparent: true, opacity: 0.14 })
      );
      wave.rotation.x = Math.PI / 2;
      wave.position.y = 0.005;
      wave.userData.waveSpeed = 0.08 + i * 0.015;
      wave.userData.wavePhase = i * 0.7;
      this.scene.add(wave);
      this.waves.push(wave);
    }
  }

  addIslands() {
    this.islands.forEach((island) => {
      const group = createIslandMesh(island);
      group.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.userData.islandId) {
            this.interactiveMeshes.push(child);
          }
        }
      });
      const badge = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.18, 0),
        new THREE.MeshStandardMaterial({ color: '#fff7a8', emissive: '#ffc247', emissiveIntensity: 0.45, flatShading: true })
      );
      badge.name = `${island.id}-completion-badge`;
      badge.position.set(0.72, 1.18, 0.2);
      badge.visible = false;
      group.add(badge);
      this.scene.add(group);
      this.islandGroups.set(island.id, group);
    });
  }

  addAmbientMotion() {
    const cloudMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 7; i += 1) {
      const cloud = new THREE.Group();
      for (let p = 0; p < 3; p += 1) {
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + p * 0.04, 0), cloudMaterial);
        puff.position.x = p * 0.28;
        puff.position.y = (p % 2) * 0.08;
        cloud.add(puff);
      }
      cloud.position.set(-7 + i * 2.7, 3.4 + (i % 2) * 0.45, -5.2 - (i % 3) * 0.9);
      cloud.userData.cloudSpeed = 0.05 + i * 0.006;
      cloud.userData.baseY = cloud.position.y;
      cloud.userData.cloudPhase = i * 1.11;
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  addDustParticles() {
    // ART PASS: partículas ambientales muy sutiles, no distraen jugabilidad
    const count = this.isCoarse ? 40 : 70;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 4 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: '#ffffff',
      size: 0.018,
      transparent: true,
      opacity: 0.18,
      sizeAttenuation: true,
      depthWrite: false
    });
    this.dustParticles = new THREE.Points(geo, mat);
    this.scene.add(this.dustParticles);
  }

  updateCamera(delta) {
    if (this.focusMode === 'map') {
      this.cameraTarget.copy(this.center);
      this.drag.targetYaw += delta * 0.035;
    }

    const focusDamping = 1 - Math.exp(-delta * 4.6);
    const cameraDamping = 1 - Math.exp(-delta * 8.5);
    this.cameraFocus.lerp(this.cameraTarget, focusDamping);
    this.drag.yaw += (this.drag.targetYaw - this.drag.yaw) * cameraDamping;
    this.drag.pitch += (this.drag.targetPitch - this.drag.pitch) * cameraDamping;
    this.drag.distance += (this.drag.targetDistance - this.drag.distance) * cameraDamping;

    const pitch = THREE.MathUtils.clamp(this.drag.pitch, 0.46, 1.08);
    const distance = this.drag.distance;
    const x = this.cameraFocus.x + Math.sin(this.drag.yaw) * Math.cos(pitch) * distance;
    const z = this.cameraFocus.z + Math.cos(this.drag.yaw) * Math.cos(pitch) * distance;
    const y = this.cameraFocus.y + Math.sin(pitch) * distance;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraFocus);
  }

  updatePointerFromEvent(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  pickIsland() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactiveMeshes, true);
    const hit = hits.find((item) => item.object.userData.islandId);
    return hit?.object.userData.islandId ?? null;
  }

  onKeyDown = (event) => {
    this.keys[event.key.toLowerCase()] = true;
  };

  onKeyUp = (event) => {
    this.keys[event.key.toLowerCase()] = false;
  };

  onPointerDown = (event) => {
    this.drag.active = true;
    this.drag.moved = false;
    this.drag.startX = event.clientX;
    this.drag.startY = event.clientY;
    this.updatePointerFromEvent(event);
  };

  onPointerMove = (event) => {
    if (this.drag.active) {
      const dx = event.clientX - this.drag.startX;
      const dy = event.clientY - this.drag.startY;
      if (Math.abs(dx) + Math.abs(dy) > 5) this.drag.moved = true;
      this.drag.targetYaw -= dx * 0.0048;
      this.drag.targetPitch += dy * 0.0024;
      this.drag.targetPitch = THREE.MathUtils.clamp(this.drag.targetPitch, 0.46, 1.08);
      this.drag.startX = event.clientX;
      this.drag.startY = event.clientY;
    }
    this.updatePointerFromEvent(event);
    const hoveredId = this.pickIsland();
    this.setHoveredId(hoveredId);
  };

  onPointerUp = (event) => {
    if (!this.drag.active) return;
    this.updatePointerFromEvent(event);
    const islandId = this.pickIsland();
    if (!this.drag.moved && islandId && this.focusMode === 'map') {
      this.callbacks.onIslandSelected(islandId);
    }
    this.drag.active = false;
  };

  setHoveredId(id) {
    if (this.hoveredId === id) return;
    if (this.hoveredId && this.islandGroups.has(this.hoveredId)) {
      setIslandHover(this.islandGroups.get(this.hoveredId), false);
    }
    this.hoveredId = id;
    if (this.hoveredId && this.islandGroups.has(this.hoveredId)) {
      setIslandHover(this.islandGroups.get(this.hoveredId), true);
    }
    this.renderer.domElement.style.cursor = id && this.focusMode === 'map' ? 'pointer' : 'grab';
  }

  resize = () => {
    const rect = this.canvasHost.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(this.getPixelRatio());
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setSize(width, height);
      if (this.bloomPass) this.bloomPass.resolution.set(width, height);
    }
  };

  /** Pausa el hub mientras se juega una isla (ahorra GPU) */
  setPaused(paused) {
    const wasPaused = this.paused;
    this.paused = paused;
    if (wasPaused && !paused && this.isRunning) {
      this.clock.getDelta();
      requestAnimationFrame(this.animate);
    }
  }

  animate = () => {
    if (!this.isRunning || this.paused) return;
    const delta = Math.min(this.clock.getDelta(), 0.033);
    const elapsed = this.clock.elapsedTime;
    const soft = 1 - Math.exp(-delta * 9);

    this.updateCamera(delta);

    if (this.oceanMat) {
      this.oceanMat.uniforms.time.value = elapsed;
      this.oceanMat.uniforms.cameraPos.value.copy(this.camera.position);
    }

    this.waves.forEach((wave) => {
      wave.rotation.z += wave.userData.waveSpeed * delta;
      wave.position.y = 0.005 + Math.sin(elapsed * 0.7 + wave.userData.wavePhase) * 0.006;
    });
    this.clouds.forEach((cloud) => {
      cloud.position.x += cloud.userData.cloudSpeed * delta;
      cloud.position.y = cloud.userData.baseY + Math.sin(elapsed * 0.38 + cloud.userData.cloudPhase) * 0.045;
      if (cloud.position.x > 9) cloud.position.x = -9;
    });

    if (this.dustParticles) {
      const pos = this.dustParticles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i);
        y += delta * 0.02;
        if (y > 4.5) y = 0.3;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(elapsed * 0.3 + i) * delta * 0.01);
      }
      pos.needsUpdate = true;
    }

    this.islandGroups.forEach((group, id) => {
      const phase = group.userData.floatPhase;
      group.position.y = Math.sin(elapsed * 0.48 + phase) * 0.026 + Math.sin(elapsed * 0.91 + phase * 0.4) * 0.01;
      group.scale.setScalar(group.scale.x + ((group.userData.hoverTarget ?? 1) - group.scale.x) * soft);
      // el color de la isla llega a su objetivo poco a poco (al completarla, "se enciende")
      group.traverse((child) => {
        const target = child.userData.targetColor;
        if (target && !child.material.color.equals(target)) child.material.color.lerp(target, soft * 0.5);
        const glow = child.userData.targetEmissive;
        if (glow && !child.material.emissive.equals(glow)) child.material.emissive.lerp(glow, soft * 0.5);
      });
      const badge = group.getObjectByName(`${id}-completion-badge`);
      if (badge) {
        badge.rotation.y += delta * 1.8;
        badge.position.y = 1.18 + Math.sin(elapsed * 2.2) * 0.06;
      }
      const ring = group.getObjectByName(`${id}-selection-ring`);
      if (ring) {
        ring.rotation.z += delta * 0.45;
        ring.material.opacity += ((ring.userData.targetOpacity ?? 0) - ring.material.opacity) * soft;
      }
    });

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    requestAnimationFrame(this.animate);
  };

  getPixelRatio() {
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    // ART PASS: límite adaptativo para no penalizar móviles
    return Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.25 : 1.6);
  }
}
