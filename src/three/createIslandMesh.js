import * as THREE from 'three';

export function createIslandMesh(island) {
  const group = new THREE.Group();
  group.name = island.displayName;
  group.userData.islandId = island.id;
  group.userData.hoverTarget = 1;
  group.userData.floatPhase = Math.abs(island.position[0] * 0.7 + island.position[2] * 1.4);
  group.position.set(...island.position);

  const land = createLowPolyCylinder(island.radius, island.height, island.palette.land);
  land.name = `${island.id}-land`;
  land.userData.islandId = island.id;
  land.position.y = island.height * 0.35;
  group.add(land);

  const beach = createLowPolyCylinder(island.radius * 1.12, 0.08, '#f6e6a9');
  beach.name = `${island.id}-beach`;
  beach.userData.islandId = island.id;
  beach.position.y = island.height * 0.06;
  group.add(beach);

  const base = createLowPolyCylinder(island.radius * 0.82, island.height * 1.5, island.palette.accent);
  base.name = `${island.id}-base`;
  base.userData.islandId = island.id;
  base.position.y = -island.height * 0.62;
  group.add(base);

  addDecorations(group, island);

  if (island.emoji) {
    const sprite = createEmojiSprite(island.emoji);
    sprite.name = `${island.id}-emoji`;
    sprite.position.y = island.height * 0.35 + 1.78;
    sprite.scale.set(0.7, 0.7, 1);
    group.add(sprite);
  }

  // nombre de la isla, flotando entre la tierra y el emoji
  const label = createLabelSprite(island.name, island.palette.ui);
  label.name = `${island.id}-label`;
  label.position.y = island.height * 0.35 + 1.12;
  label.scale.set(1.9, 0.475, 1);
  // siempre legible: se dibuja por encima de arboles y cristales
  label.material.depthTest = false;
  label.renderOrder = 20;
  group.add(label);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(island.radius * 1.35, 0.035, 8, 48),
    new THREE.MeshBasicMaterial({
      color: island.palette.glow,
      transparent: true,
      opacity: 0
    })
  );
  ring.name = `${island.id}-selection-ring`;
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.04;
  ring.userData.isSelectionRing = true;
  ring.userData.targetOpacity = 0;
  group.add(ring);

  return group;
}

function createEmojiSprite(emoji) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  // fuentes de emoji a color: sin esto Windows cae en glifos de linea monocromos
  ctx.font = '92px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 64, 70);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  return new THREE.Sprite(material);
}

/** Pildora con el nombre: fondo del color de la isla, texto blanco */
function createLabelSprite(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = '700 62px "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = Math.min(500, ctx.measureText(text).width + 72);
  const x = (512 - w) / 2;
  ctx.fillStyle = 'rgba(8, 20, 30, 0.35)';
  roundRect(ctx, x + 3, 22, w, 92, 46);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x, 16, w, 92, 46);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 6;
  ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  return new THREE.Sprite(material);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function setIslandHover(group, isHovered) {
  const ring = group.children.find((child) => child.userData.isSelectionRing);
  if (ring) {
    ring.userData.targetOpacity = isHovered ? 0.72 : 0;
  }
  group.userData.hoverTarget = isHovered ? 1.07 : 1;
}

function createLowPolyCylinder(radius, height, color) {
  const geometry = new THREE.CylinderGeometry(radius * 0.88, radius, height, 9, 1, false);
  geometry.computeVertexNormals();
  // ART PASS: PBR ajustado - roughness específico por superficie, mismo color pero respuesta física más creíble
  const isBeach = color === '#f6e6a9';
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: isBeach ? 0.9 : 0.78,
    metalness: 0.02,
    flatShading: true
  });
  return new THREE.Mesh(geometry, material);
}

function addDecorations(group, island) {
  const decorations = decorationBlueprints[island.id] ?? decorationBlueprints.default;
  decorations.forEach((item, index) => {
    const mesh = makeDecoration(item, island);
    mesh.name = `${island.id}-decor-${index}`;
    mesh.userData.islandId = island.id;
    group.add(mesh);
  });
}

function makeDecoration(item, island) {
  if (item.kind === 'tree') {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.45, 6),
      new THREE.MeshStandardMaterial({ color: '#7a4a2e', roughness: 0.88, flatShading: true })
    );
    trunk.position.y = 0.45;
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(item.size ?? 0.28, 0.62, 7),
      new THREE.MeshStandardMaterial({ color: island.palette.foliage, roughness: 0.82, flatShading: true })
    );
    top.position.y = 0.88;
    tree.add(trunk, top);
    tree.position.set(item.x, item.y, item.z);
    return tree;
  }

  if (item.kind === 'crystal') {
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(item.size ?? 0.25, 0),
      new THREE.MeshStandardMaterial({
        color: island.palette.glow,
        emissive: island.palette.glow,
        emissiveIntensity: 0.42,
        roughness: 0.35,
        metalness: 0.1,
        flatShading: true
      })
    );
    crystal.position.set(item.x, item.y, item.z);
    crystal.rotation.set(item.rx ?? 0, item.ry ?? 0, item.rz ?? 0);
    return crystal;
  }

  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(item.size ?? 0.18, 0),
    new THREE.MeshStandardMaterial({ color: island.palette.accent, roughness: 0.88, flatShading: true })
  );
  rock.position.set(item.x, item.y, item.z);
  return rock;
}

const decorationBlueprints = {
  joy: [
    { kind: 'tree', x: -0.42, y: 0.32, z: 0.12, size: 0.32 },
    { kind: 'tree', x: 0.48, y: 0.32, z: -0.25, size: 0.26 },
    { kind: 'crystal', x: 0.1, y: 0.78, z: 0.45, size: 0.2, ry: 0.7 }
  ],
  sadness: [
    { kind: 'tree', x: -0.35, y: 0.27, z: -0.15, size: 0.27 },
    { kind: 'rock', x: 0.4, y: 0.37, z: 0.32, size: 0.21 },
    { kind: 'crystal', x: 0.06, y: 0.62, z: 0.05, size: 0.16 }
  ],
  anger: [
    { kind: 'crystal', x: -0.28, y: 0.75, z: 0.2, size: 0.23, rz: 0.4 },
    { kind: 'rock', x: 0.36, y: 0.5, z: -0.24, size: 0.26 },
    { kind: 'tree', x: 0.05, y: 0.36, z: 0.45, size: 0.22 }
  ],
  fear: [
    { kind: 'tree', x: -0.45, y: 0.28, z: -0.12, size: 0.31 },
    { kind: 'tree', x: 0.3, y: 0.28, z: 0.28, size: 0.24 },
    { kind: 'crystal', x: 0.08, y: 0.68, z: -0.38, size: 0.18 }
  ],
  frustration: [
    { kind: 'rock', x: 0.05, y: 0.42, z: 0.05, size: 0.26 },
    { kind: 'rock', x: 0.05, y: 0.72, z: 0.05, size: 0.2 },
    { kind: 'crystal', x: 0.05, y: 1.0, z: 0.05, size: 0.14 },
    { kind: 'tree', x: -0.46, y: 0.3, z: -0.2, size: 0.22 }
  ],
  surprise: [
    { kind: 'crystal', x: -0.2, y: 0.63, z: 0.38, size: 0.18, ry: 0.6 },
    { kind: 'tree', x: 0.34, y: 0.29, z: -0.1, size: 0.25 },
    { kind: 'rock', x: -0.46, y: 0.35, z: -0.22, size: 0.17 }
  ],
  default: [
    { kind: 'tree', x: 0, y: 0.3, z: 0, size: 0.25 }
  ]
};
