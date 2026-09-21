// Nucleo 3D · Kit de escenario low-poly
// Terreno con relieve deterministico (misma funcion para la malla y para el
// groundCheck del jugador), vegetacion con InstancedMesh, rocas, cielo con
// gradiente y luces con una sola sombra por escena.

import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/** Relieve suave y deterministico: sin ruido aleatorio, reproducible en CPU */
export function terrainHeight(x, z, { amplitude = 1.1, scale = 0.08 } = {}) {
  return (
    Math.sin(x * scale) * Math.cos(z * scale * 1.3) * amplitude +
    Math.sin((x + z) * scale * 2.1) * amplitude * 0.28
  );
}

export function createGround({
  size = 90,
  segments = 60,
  color = '#3d5a45',
  amplitude = 1.1,
  scale = 0.08,
  flatRadius = 0,
  receiveShadow = true
} = {}) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    let h = terrainHeight(x, z, { amplitude, scale });
    if (flatRadius > 0) {
      const d = Math.hypot(x, z);
      if (d < flatRadius) h *= d / flatRadius;
    }
    pos.setY(i, h);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = receiveShadow;
  mesh.name = 'ground';
  mesh.userData.heightAt = (x, z) => {
    let h = terrainHeight(x, z, { amplitude, scale });
    if (flatRadius > 0) {
      const d = Math.hypot(x, z);
      if (d < flatRadius) h *= d / flatRadius;
    }
    return h;
  };
  return mesh;
}

/** Copias repetidas en una sola llamada de dibujo */
export function scatterInstanced(geometry, material, count, place) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  for (let i = 0; i < count; i += 1) {
    const t = place(i) || {};
    _v.set(t.x ?? 0, t.y ?? 0, t.z ?? 0);
    _q.setFromAxisAngle(_up, t.ry ?? Math.random() * Math.PI * 2);
    const sc = t.scale ?? 1;
    _s.set(sc, t.scaleY ?? sc, sc);
    _m.compose(_v, _q, _s);
    mesh.setMatrixAt(i, _m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/* ------------------------------------------------------------- geometrias */

export const GEO = {
  coneTree: () => new THREE.ConeGeometry(0.62, 1.9, 6),
  trunk: () => new THREE.CylinderGeometry(0.13, 0.17, 0.9, 5),
  rock: () => new THREE.DodecahedronGeometry(0.55, 0),
  crystal: () => new THREE.OctahedronGeometry(0.42, 0),
  grass: () => new THREE.ConeGeometry(0.11, 0.55, 3),
  orb: () => new THREE.IcosahedronGeometry(0.34, 1),
  pillar: () => new THREE.CylinderGeometry(0.5, 0.6, 3.4, 6),
  slab: () => new THREE.BoxGeometry(3, 0.5, 3)
};

/** Arbol low-poly (tronco + copa) como grupo reutilizable */
export function makeTree({ color = '#4b8a52', trunkColor = '#6b4a2f', scale = 1 } = {}) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    GEO.trunk(),
    new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 1, flatShading: true })
  );
  trunk.position.y = 0.45;
  const crown = new THREE.Mesh(
    GEO.coneTree(),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true })
  );
  crown.position.y = 1.55;
  group.add(trunk, crown);
  group.scale.setScalar(scale);
  return group;
}

export function makeRock({ color = '#7a7f86', scale = 1 } = {}) {
  const rock = new THREE.Mesh(
    GEO.rock(),
    new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true })
  );
  rock.scale.setScalar(scale);
  return rock;
}

/* ------------------------------------------------------------------ cielo */

export function createSky({ top = '#0d1b2a', bottom = '#3d5a80', size = 210 } = {}) {
  const geo = new THREE.SphereGeometry(size, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(top) },
      bottomColor: { value: new THREE.Color(bottom) },
      offset: { value: 12 },
      exponent: { value: 0.9 }
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorld;
      void main() {
        float h = normalize(vWorld + vec3(0.0, offset, 0.0)).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, pow(max(h, 0.0), exponent)), 1.0);
      }
    `
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'sky';
  mesh.userData.setColors = (t, b) => {
    if (t) mat.uniforms.topColor.value.set(t);
    if (b) mat.uniforms.bottomColor.value.set(b);
  };
  mesh.userData.uniforms = mat.uniforms;
  return mesh;
}

/* ------------------------------------------------- decorado compartido */

/** Sol: un sprite con degradado radial, muy lejos, sin niebla */
export function makeSun({ color = '#fff6dc', halo = '#ffdea0', size = 46, position = [-12, 22, -150] } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
  g.addColorStop(0, color);
  g.addColorStop(0.35, halo);
  g.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sun.position.set(position[0], position[1], position[2]);
  sun.scale.setScalar(size);
  return sun;
}

/**
 * Nubes low-poly (tres esferas aplastadas) en anillo, muy lejos y muy lentas.
 * Devuelve el grupo; `group.userData.update(dt)` las hace derivar.
 */
export function makeClouds({ count = 7, radius = 95, height = 26, scale = 1.4, color = '#ffffff', opacity = 0.85, speed = 0.006 } = {}) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, fog: false });
  const geo = new THREE.SphereGeometry(2.2, 8, 6);
  const clouds = [];
  for (let i = 0; i < count; i += 1) {
    const c = new THREE.Group();
    [[0, 0, 0, 1], [1.6, -0.2, 0.4, 0.75], [-1.5, -0.25, -0.3, 0.7]].forEach(([x, y, z, sc]) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x * 2, y * 2, z * 2);
      m.scale.set(sc * 1.6, sc * 0.55, sc);
      c.add(m);
    });
    const a = (i / count) * Math.PI * 2 + 0.4;
    c.position.set(Math.cos(a) * radius, height + (i % 3) * 5, Math.sin(a) * radius);
    c.userData.a = a;
    c.scale.setScalar(scale + (i % 3) * 0.4);
    group.add(c);
    clouds.push(c);
  }
  group.userData.material = mat;
  group.userData.update = (dt) => {
    clouds.forEach((c) => {
      c.userData.a += dt * speed;
      c.position.x = Math.cos(c.userData.a) * radius;
      c.position.z = Math.sin(c.userData.a) * radius;
    });
  };
  return group;
}

/** Cordillera al fondo: conos en anillo, se funden con la niebla */
export function makeMountains({ count = 16, radius = 70, spread = 14, color = '#6f7f8a', height = 18, base = -4 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
  return scatterInstanced(new THREE.ConeGeometry(9, height, 6), mat, count, (i) => {
    const a = (i / count) * Math.PI * 2 + (i % 2) * 0.17;
    const r = radius + (i % 3) * spread;
    return { x: Math.cos(a) * r, y: base + height / 2 - (i % 3) * 2, z: Math.sin(a) * r, ry: i * 0.7, scale: 0.75 + (i % 4) * 0.28, scaleY: 0.9 + (i % 3) * 0.35 };
  });
}

/**
 * Pinta el terreno por vertices segun la altura: color bajo, alto y una pizca
 * de variacion para que no parezca plastico. Hay que crear el suelo antes.
 */
export function colorGroundByHeight(ground, { low = '#5f8a4a', high = '#8fcf6c', speckle = '#a6d98a', amount = 0.35 } = {}) {
  const geo = ground.geometry;
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cLow = new THREE.Color(low);
  const cHigh = new THREE.Color(high);
  const cSpk = new THREE.Color(speckle);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < pos.count; i += 1) { const y = pos.getY(i); if (y < min) min = y; if (y > max) max = y; }
  const span = Math.max(0.001, max - min);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const t = (pos.getY(i) - min) / span;
    c.copy(cLow).lerp(cHigh, t);
    if ((i * 7) % 5 === 0) c.lerp(cSpk, amount);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  ground.material.vertexColors = true;
  ground.material.color.set('#ffffff');
  ground.material.needsUpdate = true;
  return ground;
}

/** Contorno oscuro de una caja (aspecto de dibujo): lineas de sus aristas */
export function makeOutline(geometry, { color = '#3a2a1a', opacity = 0.35 } = {}) {
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.LineSegments(new THREE.EdgesGeometry(geometry), mat);
}

/* ------------------------------------------------------------------ luces */

/** Una sola luz con sombras por escena, mapa 1024 */
export function createLights({
  sunColor = '#ffe6bf',
  sunIntensity = 1.6,
  hemiSky = '#8fc7ff',
  hemiGround = '#3a4a3a',
  hemiIntensity = 0.55,
  shadows = true,
  area = 40
} = {}) {
  const group = new THREE.Group();
  const hemi = new THREE.HemisphereLight(hemiSky, hemiGround, hemiIntensity);
  group.add(hemi);

  const sun = new THREE.DirectionalLight(sunColor, sunIntensity);
  sun.position.set(18, 26, 12);
  if (shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 90;
    sun.shadow.camera.left = -area;
    sun.shadow.camera.right = area;
    sun.shadow.camera.top = area;
    sun.shadow.camera.bottom = -area;
    sun.shadow.bias = -0.0012;
  }
  group.add(sun);
  group.userData.sun = sun;
  group.userData.hemi = hemi;
  return group;
}

/* ------------------------------------------------------------- personaje */

/** Avatar low-poly estilizado (capsula + cabeza + brazos) para tercera persona */
export function makeAvatar({ color = '#f5b942', accent = '#ffffff', emoji = null } = {}) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, flatShading: true });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.62, 4, 8), bodyMat);
  body.position.y = 0.78;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.28, 1),
    new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5, flatShading: true })
  );
  head.position.y = 1.45;
  head.castShadow = true;
  group.add(head);

  const armGeo = new THREE.CapsuleGeometry(0.1, 0.4, 3, 6);
  const armL = new THREE.Mesh(armGeo, bodyMat);
  armL.position.set(-0.4, 0.9, 0);
  const armR = new THREE.Mesh(armGeo, bodyMat);
  armR.position.set(0.4, 0.9, 0);
  group.add(armL, armR);
  group.userData.arms = [armL, armR];
  group.userData.head = head;
  group.userData.body = body;

  if (emoji) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = '104px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 70);
    const tex = new THREE.CanvasTexture(canvas);
    const face = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    face.scale.set(0.5, 0.5, 1);
    face.position.set(0, 1.46, 0.26);
    group.add(face);
  }
  return group;
}

/** Animacion simple del avatar segun su estado (idle/walk/run/jump) */
export function animateAvatar(avatar, t) {
  const state = avatar.userData.state || 'idle';
  const [armL, armR] = avatar.userData.arms || [];
  if (!armL) return;
  const speed = state === 'run' ? 12 : state === 'walk' ? 7 : 2;
  const amp = state === 'run' ? 0.9 : state === 'walk' ? 0.55 : 0.12;
  armL.rotation.x = Math.sin(t * speed) * amp;
  armR.rotation.x = -Math.sin(t * speed) * amp;
  if (state === 'jump') {
    armL.rotation.x = -1.2;
    armR.rotation.x = -1.2;
  }
  if (avatar.userData.head) {
    avatar.userData.head.position.y = 1.45 + Math.sin(t * speed * 0.5) * 0.02;
  }
}
