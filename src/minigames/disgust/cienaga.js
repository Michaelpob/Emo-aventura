// LA CIENAGA TURBIA · escenario compartido de los dos minijuegos del desagrado
// Agua turbia (shader), niebla morada, juncos y luciernagas. La claridad del
// agua (0..1) es el indicador ambiental: se aclara o se enturbia con las
// decisiones, sin texto. Todo procedural: sin assets externos.

import * as THREE from 'three';
import { createGround, createSky, createLights, scatterInstanced, GEO, colorGroundByHeight } from '../../engine/worldkit.js';
import { gameState } from '../../data/gameState.js';

export const PALETA = {
  aguaTurbia: '#3f5a2c',      // verde acido apagado
  aguaClara: '#a9cfc6',       // blanco frio verdoso
  nieblaTurbia: '#5a4f6a',    // morado apagado
  nieblaClara: '#b9c9c4',
  cieloArriba: ['#3a3450', '#8fb0a6'],
  cieloAbajo: ['#6a5a3a', '#d6e2d8'],
  ocre: '#8a7a3e',
  musgo: '#6e8a3a',
  junco: '#7f8a3e',
  frio: '#e8f1ee'
};

const _c = new THREE.Color();
const mix = (a, b, t) => _c.set(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t))).getHex();

/**
 * Construye la cienaga dentro de la escena del minijuego.
 * @param {import('../../engine/MinigameBase.js').MinigameBase} game
 * @param {object} [opts]
 * @param {number} [opts.claridad]  0 turbia .. 1 clara
 * @param {number} [opts.aguaY]     altura del agua
 * @param {number} [opts.tamano]    lado del terreno
 */
export function construirCienaga(game, { claridad = 0.35, aguaY = 0, tamano = 110 } = {}) {
  const scene = game.scene;
  const estado = { claridad, objetivo: claridad, tiempo: 0 };

  scene.fog = new THREE.FogExp2(mix(PALETA.nieblaTurbia, PALETA.nieblaClara, claridad), 0.03);
  const sky = createSky({ top: PALETA.cieloArriba[0], bottom: PALETA.cieloAbajo[0], size: 170 });
  scene.add(sky);

  const lights = createLights({ sunColor: '#e9e3c8', sunIntensity: 1.15, hemiSky: '#8a8fa0', hemiGround: '#3e4a2c', hemiIntensity: 0.85, area: 30 });
  lights.userData.sun.position.set(-10, 20, 12);
  scene.add(lights);

  // orillas: tierra ocre con musgo, hundida bajo el agua en el centro
  const ground = createGround({ size: tamano, segments: 48, color: PALETA.ocre, amplitude: 1.4, scale: 0.06, flatRadius: 0 });
  colorGroundByHeight(ground, { low: '#4f5a2e', high: PALETA.ocre, speckle: PALETA.musgo, amount: 0.35 });
  ground.position.y = aguaY - 0.9;
  scene.add(ground);

  // agua: un plano con shader; el color va de turbio a claro segun `uClaridad`
  const waterGeo = new THREE.PlaneGeometry(tamano, tamano, 40, 40);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTiempo: { value: 0 },
        uClaridad: { value: claridad },
        uTurbia: { value: new THREE.Color(PALETA.aguaTurbia) },
        uClara: { value: new THREE.Color(PALETA.aguaClara) }
      }
    ]),
    vertexShader: `
      #include <fog_pars_vertex>
      uniform float uTiempo;
      varying vec2 vUv;
      varying float vOla;
      void main() {
        vUv = uv;
        vec3 p = position;
        float ola = sin(p.x * 0.45 + uTiempo * 0.7) * 0.05 + cos(p.z * 0.38 - uTiempo * 0.55) * 0.05;
        p.y += ola;
        vOla = ola;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      #include <fog_pars_fragment>
      uniform float uTiempo;
      uniform float uClaridad;
      uniform vec3 uTurbia;
      uniform vec3 uClara;
      varying vec2 vUv;
      varying float vOla;
      void main() {
        // remolinos lentos: el agua turbia se mueve espesa, la clara apenas
        float r = sin((vUv.x + vUv.y) * 26.0 + uTiempo * 0.9) * 0.5 + 0.5;
        float r2 = sin(vUv.x * 40.0 - uTiempo * 0.6) * sin(vUv.y * 34.0 + uTiempo * 0.5);
        float espesor = (1.0 - uClaridad);
        vec3 base = mix(uTurbia, uClara, uClaridad);
        base += (r * 0.06 + r2 * 0.04) * (0.4 + espesor);
        base += vOla * 0.8 * uClaridad;
        float alpha = 0.86 + espesor * 0.1;
        gl_FragColor = vec4(base, alpha);
        #include <fog_fragment>
      }
    `
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = aguaY;
  water.name = 'agua';
  scene.add(water);

  // juncos y juncos altos alrededor, sobre la tierra que asoma
  const juncoMat = new THREE.MeshStandardMaterial({ color: PALETA.junco, roughness: 1, flatShading: true });
  const alto = (x, z) => ground.userData.heightAt(x, z) + aguaY - 0.9;
  const juncos = scatterInstanced(GEO.grass(), juncoMat, 260, (i) => {
    const a = i * 2.399 + 0.7;
    const r = 13 + (i % 30) * 1.1;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = alto(x, z);
    return { x, y: Math.max(y, aguaY - 0.2) + 0.25, z, ry: i, scale: 1.6 + (i % 4) * 0.5 };
  });
  scene.add(juncos);
  const rocaMat = new THREE.MeshStandardMaterial({ color: '#5f6a55', roughness: 1, flatShading: true });
  scene.add(scatterInstanced(GEO.rock(), rocaMat, 22, (i) => {
    const a = i * 1.9 + 0.3;
    const r = 15 + (i % 6) * 2.4;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    return { x, y: Math.max(alto(x, z), aguaY - 0.3) + 0.15, z, ry: a, scale: 0.5 + (i % 3) * 0.3 };
  }));
  // troncos muertos asomando
  const troncoMat = new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 1, flatShading: true });
  scene.add(scatterInstanced(GEO.trunk(), troncoMat, 16, (i) => {
    const a = i * 2.1 + 1.2;
    const r = 11 + (i % 5) * 3;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    return { x, y: aguaY + 0.15, z, ry: a, scale: 1.4 + (i % 3) * 0.6 };
  }));

  // luciernagas: puntos que flotan; con el agua clara brillan mas
  const N = 70;
  const pos = new Float32Array(N * 3);
  const base = new Float32Array(N * 3);
  for (let i = 0; i < N; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const r = 4 + Math.random() * 16;
    base[i * 3] = Math.cos(a) * r;
    base[i * 3 + 1] = aguaY + 0.6 + Math.random() * 3;
    base[i * 3 + 2] = Math.sin(a) * r;
  }
  pos.set(base);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pMat = new THREE.PointsMaterial({ color: '#dfeaa8', size: 0.16, transparent: true, opacity: 0.35, depthWrite: false });
  const luces = new THREE.Points(pGeo, pMat);
  scene.add(luces);

  const aplicar = () => {
    const k = estado.claridad;
    waterMat.uniforms.uClaridad.value = k;
    scene.fog.color.setHex(mix(PALETA.nieblaTurbia, PALETA.nieblaClara, k));
    scene.fog.density = 0.034 - k * 0.016;
    sky.userData.setColors(mix(PALETA.cieloArriba[0], PALETA.cieloArriba[1], k), mix(PALETA.cieloAbajo[0], PALETA.cieloAbajo[1], k));
    pMat.opacity = 0.25 + k * 0.5;
  };
  aplicar();

  return {
    water, ground, sky, luces,
    get claridad() { return estado.claridad; },
    /** Fija la claridad objetivo (0..1); el agua se acerca despacio */
    setClaridad(v) { estado.objetivo = Math.max(0, Math.min(1, v)); },
    sumar(d) { this.setClaridad(estado.objetivo + d); },
    altura: alto,
    update(dt) {
      estado.tiempo += dt;
      waterMat.uniforms.uTiempo.value = estado.tiempo;
      const k = 1 - Math.exp(-dt * 0.9);
      if (Math.abs(estado.objetivo - estado.claridad) > 0.0005) {
        estado.claridad += (estado.objetivo - estado.claridad) * k;
        aplicar();
      }
      const arr = pGeo.attributes.position.array;
      const reduce = gameState.settings.reduceMotion ? 0.3 : 1;
      for (let i = 0; i < N; i += 1) {
        arr[i * 3] = base[i * 3] + Math.sin(estado.tiempo * 0.5 + i) * 0.6 * reduce;
        arr[i * 3 + 1] = base[i * 3 + 1] + Math.sin(estado.tiempo * 0.9 + i * 1.7) * 0.35 * reduce;
        arr[i * 3 + 2] = base[i * 3 + 2] + Math.cos(estado.tiempo * 0.4 + i * 0.5) * 0.6 * reduce;
      }
      pGeo.attributes.position.needsUpdate = true;
    }
  };
}

/** Sustancia viscosa: material oscuro y pegajoso para lo dañino */
export function materialViscoso() {
  return new THREE.MeshStandardMaterial({ color: '#2b2438', emissive: '#3a2a4a', emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.15, flatShading: true });
}

/** Lo que solo es distinto: translucido, palido, sin carga */
export function materialTranslucido() {
  return new THREE.MeshStandardMaterial({ color: '#d9e6e2', emissive: '#a9cfc6', emissiveIntensity: 0.25, roughness: 0.4, transparent: true, opacity: 0.55, flatShading: true });
}


/** Punto en el plano y=altura bajo el puntero, o null si no lo cruza */
export function puntoEnPlano(raycaster, camera, ndc, plane, out) {
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.intersectPlane(plane, out) ? out : null;
}

/** Coordenadas NDC de un evento de puntero sobre un canvas */
export function ndcDe(e, canvas, out) {
  const r = canvas.getBoundingClientRect();
  out.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  out.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  return out;
}

export function escapar(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function barajar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ------------------------------------------------------------- guia y pistas */

/**
 * Linea de guia: el UNICO sitio donde el jugador lee que tiene que hacer.
 * `guiar` fija la instruccion del momento; `avisar` muestra un resultado breve
 * encima y despues vuelve sola a la instruccion. Nada mas compite por la vista.
 */
export function crearGuia(game) {
  const el = document.createElement('div');
  el.className = 'dg-guia';
  el.hidden = true;
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = '<span class="dg-guia__icono" aria-hidden="true"></span><span class="dg-guia__cuerpo"><span class="dg-guia__texto"></span><b class="dg-guia__extra"></b></span>';
  game.el.hud.appendChild(el);
  const icono = el.querySelector('.dg-guia__icono');
  const texto = el.querySelector('.dg-guia__texto');
  const extra = el.querySelector('.dg-guia__extra');
  const ICONOS = { ok: '✅', mal: '⚠️', info: '💬', grima: '🫧' };
  let base = { texto: '', icono: '' };
  let timer = null;
  let boton = null;
  const pintar = (t, i, tipo) => {
    icono.textContent = i;
    texto.innerHTML = t;
    extra.textContent = '';
    el.className = `dg-guia${tipo ? ` dg-guia--${tipo}` : ''}`;
    el.classList.remove('is-pop');
    void el.offsetWidth;                 // reinicia la animacion de entrada
    el.classList.add('is-pop');
    el.hidden = !t;
  };
  const volver = () => { timer = null; pintar(base.texto, base.icono, ''); if (boton) el.appendChild(boton); };
  return {
    el,
    /** Instruccion del momento (se queda hasta la siguiente) */
    guiar(t, i = '👉') { base = { texto: t, icono: i }; if (!timer) { pintar(t, i, ''); if (boton) el.appendChild(boton); } },
    /** Dato que acompana a la instruccion (progreso, contador) sin reanimar */
    progreso(t) { if (!timer) extra.textContent = t; },
    /** Resultado breve: ok | mal | info | grima. Luego vuelve la instruccion. */
    avisar(t, tipo = 'ok', ms = 2600) {
      if (timer) clearTimeout(timer);
      pintar(t, ICONOS[tipo] ?? '💬', tipo);
      timer = setTimeout(volver, ms);
    },
    /** Boton opcional dentro de la guia (por ejemplo, saltar la practica) */
    boton(t, fn) {
      this.sinBoton();
      if (!t) return;
      boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'dg-guia__btn';
      boton.textContent = t;
      boton.addEventListener('click', fn);
      el.appendChild(boton);
    },
    sinBoton() { boton?.remove(); boton = null; },
    ocultar() { el.hidden = true; },
    mostrar() { el.hidden = !(base.texto || timer); },
    dispose() { if (timer) clearTimeout(timer); el.remove(); }
  };
}

/**
 * Pistas animadas ancladas a un punto del mundo (se proyectan cada frame).
 * Tipos: corte (✂️ que cruza), hold (👆 que late), baliza (🕯️ que bota),
 * frotar (🖐️ que va y viene), destino (⬇️ que bota).
 */
export function crearPistas(game, contenedor) {
  const ICONOS = { corte: '✂️', hold: '👆', baliza: '🕯️', frotar: '🖐️', destino: '⬇️' };
  const lista = [];
  const v = new THREE.Vector3();
  const quitar = (id) => {
    const i = lista.findIndex((p) => p.id === id);
    if (i >= 0) { lista[i].el.remove(); lista.splice(i, 1); }
  };
  return {
    poner(id, tipo, pos, texto = '') {
      quitar(id);
      const el = document.createElement('div');
      el.className = `dg-pista dg-pista--${tipo}`;
      el.innerHTML = `<b>${ICONOS[tipo] ?? '👉'}</b>${texto ? `<span>${texto}</span>` : ''}`;
      contenedor.appendChild(el);
      lista.push({ id, el, pos: pos.clone() });
    },
    quitar,
    limpiar() { while (lista.length) quitar(lista[0].id); },
    update() {
      if (!lista.length || !game.renderer) return;
      const r = game.renderer.domElement.getBoundingClientRect();
      for (const p of lista) {
        v.copy(p.pos).project(game.camera);
        p.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * r.width}px, ${(-v.y * 0.5 + 0.5) * r.height}px) translate(-50%, -50%)`;
      }
    },
    dispose() { this.limpiar(); }
  };
}
