// ISLA DEL DESAGRADO · assets generados por codigo (ASSET PLACEHOLDERS)
// No hay modelos 3D: todo se construye con geometrias primitivas, canvas y
// materiales planos, estilo caricatura low-poly. Cada funcion lleva el nombre
// del asset que sustituye; para cambiarlo por un modelo o un sprite real basta
// con devolver aqui el objeto nuevo con el mismo `userData`.
//
//   PLACEHOLDER_CARA_TOTEM      texturaCara()      caritas de los totems
//   PLACEHOLDER_SPRITE_ELEMENTO spriteElemento()   tarjeta con emoji por elemento
//   PLACEHOLDER_TOTEM           crearTotem()       totem de piedra con carita
//   PLACEHOLDER_CAVERNA         crearCaverna()     paredes y suelo de la cueva
//   PLACEHOLDER_ENTRADA         crearEntrada()     arco luminoso de cada cueva
//   PLACEHOLDER_PANTANO         crearPantano()     charco, burbujas y vapor
//   PLACEHOLDER_MESA_PIEDRA     crearMesaPiedra()  mesa y antorchas
//   PLACEHOLDER_BOSQUE          crearBosque()      arboles y luces flotantes
//   PLACEHOLDER_CRISTALES       crearCristales()   cristales que vibran
//   PLACEHOLDER_ESPEJO          crearEspejo()      marco, luna y grietas
//   PLACEHOLDER_FRAGMENTO       crearFragmento()   trozo de espejo flotante
//   PLACEHOLDER_PROP_ESCENA     crearPropEscena()  recipiente / escupitajo / silla

import * as THREE from 'three';
import { makeTree, makeRock } from '../../engine/worldkit.js';

const FLAT = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra });

/* ------------------------------------------------------------ canvas */

function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

/** PLACEHOLDER_CARA_TOTEM · carita grande: asco | neutra | sonrisa */
export function texturaCara(tipo, color = '#ffd166') {
  const [c, ctx] = lienzo(256, 256);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(128, 128, 116, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.stroke();
  ctx.fillStyle = '#1d1d2a'; ctx.strokeStyle = '#1d1d2a'; ctx.lineCap = 'round'; ctx.lineWidth = 11;
  if (tipo === 'asco') {
    // ojos entrecerrados, nariz arrugada (zigzag) y lengua fuera
    ctx.beginPath(); ctx.moveTo(62, 92); ctx.quadraticCurveTo(88, 76, 112, 96); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(144, 96); ctx.quadraticCurveTo(168, 76, 194, 92); ctx.stroke();
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(108, 122); ctx.lineTo(120, 112); ctx.lineTo(132, 124); ctx.lineTo(144, 112); ctx.lineTo(154, 122); ctx.stroke();
    ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(78, 168); ctx.quadraticCurveTo(128, 148, 178, 168); ctx.stroke();
    ctx.fillStyle = '#ff6b8a';
    ctx.beginPath(); ctx.ellipse(132, 186, 26, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c94a66'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(132, 170); ctx.lineTo(132, 202); ctx.stroke();
  } else if (tipo === 'neutra') {
    ctx.beginPath(); ctx.arc(88, 104, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(168, 104, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(84, 172); ctx.lineTo(172, 172); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(88, 100, 13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(168, 100, 13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(74, 156); ctx.quadraticCurveTo(128, 214, 182, 156); ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,150,0.55)';
    ctx.beginPath(); ctx.arc(64, 146, 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(192, 146, 16, 0, Math.PI * 2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** PLACEHOLDER_SPRITE_ELEMENTO · tarjeta redondeada con un emoji grande */
export function spriteElemento(icono, { fondo = '#ffffff', borde = '#1d1d2a' } = {}) {
  const [c, ctx] = lienzo(256, 256);
  const r = 48;
  ctx.fillStyle = fondo;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(18, 18, 220, 220, r);
  else { ctx.moveTo(18 + r, 18); ctx.arcTo(238, 18, 238, 238, r); ctx.arcTo(238, 238, 18, 238, r); ctx.arcTo(18, 238, 18, 18, r); ctx.arcTo(18, 18, 238, 18, r); ctx.closePath(); }
  ctx.fill();
  ctx.lineWidth = 10; ctx.strokeStyle = borde; ctx.stroke();
  ctx.font = '132px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(icono, 128, 138);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.setScalar(1.6);
  sprite.userData.placeholder = 'PLACEHOLDER_SPRITE_ELEMENTO';
  return sprite;
}

/* ------------------------------------------------------------ totems */

/** PLACEHOLDER_TOTEM · totem de piedra con carita y aro de luz */
export function crearTotem(respuesta) {
  const g = new THREE.Group();
  const piedra = FLAT('#6d6a80');
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 0.5, 8), piedra);
  base.position.y = 0.25;
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.85, 1.7, 8), FLAT('#7d7a92'));
  cuerpo.position.y = 1.35;
  const cabeza = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 1.2), FLAT(respuesta.color));
  cabeza.position.y = 3.05;
  const cara = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: texturaCara(respuesta.cara, respuesta.color), transparent: true }));
  cara.position.set(0, 3.05, 0.62);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: respuesta.color, transparent: true, opacity: 0.55 }));
  aro.rotation.x = -Math.PI / 2;
  aro.position.y = 0.52;
  const luz = new THREE.PointLight(respuesta.color, 0.6, 6, 2);
  luz.position.set(0, 3.4, 1.2);
  [base, cuerpo, cabeza].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
  g.add(base, cuerpo, cabeza, cara, aro, luz);
  g.userData = { id: respuesta.id, cabeza, aro, luz, cara, placeholder: 'PLACEHOLDER_TOTEM' };
  return g;
}

/* ---------------------------------------------------------- caverna */

/** PLACEHOLDER_CAVERNA · paredes (esfera invertida), suelo y estalactitas */
export function crearCaverna({ radio = 26, color = '#3b3550', suelo = '#4a4360', estalactitas = 28 } = {}) {
  const g = new THREE.Group();
  const paredes = new THREE.Mesh(new THREE.SphereGeometry(radio, 18, 12), new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true, side: THREE.BackSide }));
  paredes.position.y = 4;
  const piso = new THREE.Mesh(new THREE.CircleGeometry(radio * 0.98, 32), FLAT(suelo));
  piso.rotation.x = -Math.PI / 2;
  piso.receiveShadow = true;
  g.add(paredes, piso);
  const geo = new THREE.ConeGeometry(0.5, 2.6, 5);
  const mat = FLAT('#2c2740');
  for (let i = 0; i < estalactitas; i += 1) {
    const a = (i / estalactitas) * Math.PI * 2 + (i % 3) * 0.2;
    const r = radio * (0.45 + ((i * 7) % 5) * 0.09);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(Math.cos(a) * r, radio * 0.55 + ((i * 3) % 4) * 0.6, Math.sin(a) * r);
    m.rotation.x = Math.PI;
    m.scale.setScalar(0.8 + ((i * 5) % 4) * 0.3);
    g.add(m);
  }
  g.userData.placeholder = 'PLACEHOLDER_CAVERNA';
  return g;
}

/** PLACEHOLDER_ENTRADA · arco de piedra con el hueco iluminado del color de la cueva */
export function crearEntrada(cueva) {
  const g = new THREE.Group();
  const arco = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.45, 8, 16, Math.PI), FLAT('#59526f'));
  arco.position.y = 1.4;
  const hueco = new THREE.Mesh(new THREE.CircleGeometry(2.0, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: cueva.luz, transparent: true, opacity: 0.55 }));
  hueco.position.y = 1.4;
  const marco = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.5, 0.9), FLAT('#4b455e'));
  marco.position.y = 0.25;
  const luz = new THREE.PointLight(cueva.luz, 1.6, 12, 2);
  luz.position.set(0, 2.2, 1.2);
  const roca1 = makeRock({ color: '#5a5470', scale: 1.1 }); roca1.position.set(-2.9, 0, 0.3);
  const roca2 = makeRock({ color: '#5a5470', scale: 0.8 }); roca2.position.set(2.8, 0, 0.4);
  g.add(arco, hueco, marco, luz, roca1, roca2);
  g.userData = { id: cueva.id, hueco, luz, placeholder: 'PLACEHOLDER_ENTRADA' };
  return g;
}

/* --------------------------------------------------- decorados de cueva */

/** PLACEHOLDER_PANTANO · charco de agua estancada, burbujas y vapor */
export function crearPantano() {
  const g = new THREE.Group();
  const charco = new THREE.Mesh(new THREE.CircleGeometry(3.6, 28), new THREE.MeshStandardMaterial({ color: '#2f6b3a', roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.9 }));
  charco.rotation.x = -Math.PI / 2;
  charco.position.y = 0.03;
  const orilla = new THREE.Mesh(new THREE.RingGeometry(3.5, 4.3, 28), FLAT('#3f5a32'));
  orilla.rotation.x = -Math.PI / 2;
  orilla.position.y = 0.02;
  g.add(charco, orilla);
  const burbujas = [];
  const bmat = new THREE.MeshStandardMaterial({ color: '#9fe08a', transparent: true, opacity: 0.6, roughness: 0.2 });
  for (let i = 0; i < 10; i += 1) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.12 + (i % 3) * 0.06, 8, 6), bmat);
    b.userData = { x: Math.cos(i * 2.1) * 2.4, z: Math.sin(i * 2.1) * 2.4, fase: i * 0.7, vel: 0.5 + (i % 3) * 0.2 };
    b.position.set(b.userData.x, 0.1, b.userData.z);
    g.add(b); burbujas.push(b);
  }
  const vapor = [];
  const vgeo = new THREE.BufferGeometry();
  const n = 60;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) { pos[i * 3] = (Math.random() - 0.5) * 6; pos[i * 3 + 1] = Math.random() * 2.5; pos[i * 3 + 2] = (Math.random() - 0.5) * 6; }
  vgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const puntos = new THREE.Points(vgeo, new THREE.PointsMaterial({ color: '#cfe8c0', size: 0.35, transparent: true, opacity: 0.35, depthWrite: false }));
  g.add(puntos);
  vapor.push(puntos);
  for (let i = 0; i < 6; i += 1) {
    const r = makeRock({ color: '#556b46', scale: 0.7 + (i % 3) * 0.3 });
    r.position.set(Math.cos(i * 1.05) * 6.5, 0, Math.sin(i * 1.05) * 6.5 - 1);
    g.add(r);
  }
  g.userData = { burbujas, vapor, placeholder: 'PLACEHOLDER_PANTANO' };
  return g;
}

/** PLACEHOLDER_MESA_PIEDRA · losa de piedra y dos antorchas */
export function crearMesaPiedra() {
  const g = new THREE.Group();
  const losa = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.5, 3), FLAT('#8a6f52'));
  losa.position.y = 1.0;
  losa.castShadow = true; losa.receiveShadow = true;
  const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.8, 7), FLAT('#6e5842'));
  pata.position.y = 0.4;
  g.add(losa, pata);
  const llamas = [];
  [-3.4, 3.4].forEach((x) => {
    const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 6), FLAT('#4a3320'));
    palo.position.set(x, 1.2, -1.5);
    const llama = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 7), new THREE.MeshBasicMaterial({ color: '#ffb347' }));
    llama.position.set(x, 2.7, -1.5);
    const luz = new THREE.PointLight('#ffa040', 1.4, 10, 2);
    luz.position.set(x, 2.9, -1.4);
    g.add(palo, llama, luz);
    llamas.push({ llama, luz });
  });
  g.userData = { llamas, placeholder: 'PLACEHOLDER_MESA_PIEDRA' };
  return g;
}

/** PLACEHOLDER_BOSQUE · arboles al fondo y luces flotantes que proyectan */
export function crearBosque() {
  const g = new THREE.Group();
  for (let i = 0; i < 12; i += 1) {
    const t = makeTree({ color: i % 2 ? '#3f9a5c' : '#57b36e', trunkColor: '#6b4a2f', scale: 1.1 + (i % 3) * 0.35 });
    const a = -Math.PI * 0.85 + (i / 11) * Math.PI * 0.7;
    t.position.set(Math.cos(a) * 12, 0, Math.sin(a) * 12 - 2);
    g.add(t);
  }
  const luces = [];
  for (let i = 0; i < 7; i += 1) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: '#dff3ff' }));
    l.userData = { fase: i * 0.9, r: 3 + (i % 3), y: 3 + (i % 4) * 0.5 };
    const luz = new THREE.PointLight('#bfe2ff', 0.5, 6, 2);
    l.add(luz);
    g.add(l); luces.push(l);
  }
  const haz = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.2, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#dff3ff', transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
  haz.position.set(0, 3.9, 0);
  haz.rotation.x = Math.PI;
  g.add(haz);
  g.userData = { luces, haz, placeholder: 'PLACEHOLDER_BOSQUE' };
  return g;
}

/** PLACEHOLDER_CRISTALES · cristales que vibran y brillan con cada sonido */
export function crearCristales(color = '#b58cff') {
  const g = new THREE.Group();
  const cristales = [];
  for (let i = 0; i < 9; i += 1) {
    const h = 1.6 + (i % 4) * 0.8;
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.45 + (i % 2) * 0.2, h, 5), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, roughness: 0.3, flatShading: true, transparent: true, opacity: 0.9 }));
    const a = (i / 9) * Math.PI * 2;
    const r = 4.2 + (i % 3) * 1.2;
    m.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r - 1);
    m.rotation.z = (i % 2 ? 1 : -1) * 0.15;
    m.userData = { base: m.position.clone(), fase: i * 0.6 };
    g.add(m); cristales.push(m);
  }
  const luz = new THREE.PointLight(color, 0.8, 14, 2);
  luz.position.set(0, 3, 0);
  g.add(luz);
  g.userData = { cristales, luz, placeholder: 'PLACEHOLDER_CRISTALES' };
  return g;
}

/* ------------------------------------------------------------ espejo */

/** Textura de grietas (lineas irregulares desde el centro) */
function texturaGrietas() {
  const [c, ctx] = lienzo(512, 640);
  ctx.strokeStyle = 'rgba(16, 20, 36, 1)';
  ctx.lineCap = 'round';
  const centro = [256, 300];
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    let [x, y] = centro;
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 6; k += 1) {
      x += Math.cos(a + (k % 2 ? 0.35 : -0.3)) * 42;
      y += Math.sin(a + (k % 2 ? 0.35 : -0.3)) * 42;
      ctx.lineTo(x, y);
      ctx.lineWidth = Math.max(2, 9 - k * 1.5);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

/** Luna del espejo: degradado frio con un brillo diagonal */
function texturaLuna() {
  const [c, ctx] = lienzo(256, 320);
  const g = ctx.createLinearGradient(0, 0, 256, 320);
  g.addColorStop(0, '#d9e6f2'); g.addColorStop(0.45, '#9fb7cc'); g.addColorStop(0.5, '#e8f1fa'); g.addColorStop(0.55, '#9fb7cc'); g.addColorStop(1, '#6f879c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 320);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** PLACEHOLDER_ESPEJO · marco antiguo, luna y capa de grietas (opacidad = dano) */
export function crearEspejo({ ancho = 5, alto = 6.4 } = {}) {
  const g = new THREE.Group();
  const marcoMat = FLAT('#b08a3e', { metalness: 0.4, roughness: 0.5 });
  const grosor = 0.42;
  const arriba = new THREE.Mesh(new THREE.BoxGeometry(ancho + grosor * 2, grosor, 0.5), marcoMat); arriba.position.y = alto / 2 + grosor / 2;
  const abajo = arriba.clone(); abajo.position.y = -alto / 2 - grosor / 2;
  const izq = new THREE.Mesh(new THREE.BoxGeometry(grosor, alto, 0.5), marcoMat); izq.position.x = -ancho / 2 - grosor / 2;
  const der = izq.clone(); der.position.x = ancho / 2 + grosor / 2;
  const corona = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.9, 6), marcoMat); corona.position.y = alto / 2 + grosor + 0.4;
  const luna = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshStandardMaterial({ map: texturaLuna(), roughness: 0.2, metalness: 0.35 }));
  luna.position.z = 0.05;
  const grietas = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshBasicMaterial({ map: texturaGrietas(), transparent: true, opacity: 1, depthWrite: false }));
  grietas.position.z = 0.07;
  const huecos = [];
  // huecos negros donde faltan fragmentos: se tapan al encajar cada uno
  const posicionesHueco = [[-1.6, 2.1], [1.7, 1.6], [-1.2, -0.4], [1.4, -1.3], [0.2, 2.5], [-1.9, -2.2], [1.9, -2.6], [0.4, -0.2], [-0.6, 1.1], [1.1, 0.4], [-1.7, 0.9], [0.9, -2.0], [-0.3, -1.6], [1.8, 2.7]];
  posicionesHueco.forEach(([x, y]) => {
    const h = new THREE.Mesh(new THREE.CircleGeometry(0.3, 5), new THREE.MeshBasicMaterial({ color: '#121624' }));
    h.position.set(x, y, 0.08);
    h.rotation.z = x * 1.3;
    g.add(h); huecos.push(h);
  });
  g.add(arriba, abajo, izq, der, corona, luna, grietas);
  g.userData = { luna, grietas, huecos, placeholder: 'PLACEHOLDER_ESPEJO' };
  return g;
}

/** PLACEHOLDER_FRAGMENTO · trozo de espejo irregular (poligono plano) */
export function crearFragmento(indice = 0) {
  const forma = new THREE.Shape();
  const n = 5 + (indice % 2);
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + indice * 0.4;
    const r = 0.55 + ((i * 3 + indice) % 3) * 0.14;
    const x = Math.cos(a) * r; const y = Math.sin(a) * r;
    if (i === 0) forma.moveTo(x, y); else forma.lineTo(x, y);
  }
  forma.closePath();
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshStandardMaterial({ color: '#cfe0ee', emissive: '#6f9cc4', emissiveIntensity: 0.25, roughness: 0.25, metalness: 0.4, side: THREE.DoubleSide, transparent: true }));
  const borde = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 }));
  mesh.add(borde);
  mesh.userData = { borde, placeholder: 'PLACEHOLDER_FRAGMENTO' };
  return mesh;
}

/** PLACEHOLDER_PROP_ESCENA · objeto de cada vineta: recipiente | escupitajo | silla */
export function crearPropEscena(tipo) {
  const g = new THREE.Group();
  if (tipo === 'recipiente') {
    const caja = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.7), FLAT('#e8e4d8'));
    caja.position.y = 0.25;
    const tapa = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.75), FLAT('#c94a66'));
    tapa.position.set(0.5, 0.75, 0); tapa.rotation.z = 0.9;
    const nube = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshStandardMaterial({ color: '#9fd18a', transparent: true, opacity: 0.55, flatShading: true }));
    nube.position.set(-0.1, 0.9, 0);
    g.add(caja, tapa, nube);
    g.userData.nube = nube;
  } else if (tipo === 'escupitajo') {
    const gota = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshStandardMaterial({ color: '#bfe4f5', transparent: true, opacity: 0.8, roughness: 0.2 }));
    gota.scale.set(1.4, 0.35, 1.4);
    gota.position.y = 0.08;
    const otro = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.6, 4, 8), FLAT('#7a8ca8'));
    otro.position.set(-0.9, 0.7, -0.3);
    const cabeza = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), FLAT('#e6cfb6'));
    cabeza.position.set(-0.9, 1.3, -0.3);
    g.add(gota, otro, cabeza);
  } else {
    const asiento = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 1.0), FLAT('#8a5a3c'));
    asiento.position.y = 0.6;
    const respaldo = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.12), FLAT('#8a5a3c'));
    respaldo.position.set(0, 1.1, -0.45);
    g.add(asiento, respaldo);
    [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]].forEach(([x, z]) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), FLAT('#6e4530'));
      p.position.set(x, 0.3, z);
      g.add(p);
    });
    const chicle = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), FLAT('#ff8fd0'));
    chicle.scale.set(1.3, 0.5, 1.3);
    chicle.position.set(0.15, 0.7, 0.2);
    g.add(chicle);
  }
  g.userData.placeholder = 'PLACEHOLDER_PROP_ESCENA';
  return g;
}
