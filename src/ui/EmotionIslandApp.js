import { islands, minigameLabels } from '../data/islands.js';
import { WorldScene } from '../three/WorldScene.js';
import { minigameRegistry } from '../minigames/index.js';
import { getPlayer, savePlayer, hasPlayer, avatars, favoriteColors } from '../data/player.js';
import {
  gameState,
  loadProgress,
  lockedIslands,
  completeIsland,
  allIslandsCompleted,
  addReward,
  ISLAND_CHAIN
} from '../data/gameState.js';
import { openProgress, openFinal } from './screens.js';

export class EmotionIslandApp {
  constructor(root) {
    this.root = root;
    this.state = 'start';
    loadProgress();
    const legacy = JSON.parse(window.localStorage.getItem('emotion-islands-progress') ?? '[]');
    this.completed = new Set([...legacy, ...gameState.completedIslands]);
    this.currentMinigame = null;
    this.player = getPlayer();
  }

  syncWorldState() {
    if (!this.world) return;
    this.completed = new Set([...this.completed, ...gameState.completedIslands]);
    this.world.setCompleted(this.completed);
    this.world.setLocked(lockedIslands());
  }

  start() {
    this.root.innerHTML = `
      <main class="shell">
        <div class="scene-host" data-scene-host></div>
        <div class="overlay-root" data-overlay-root></div>
      </main>
    `;
    this.sceneHost = this.root.querySelector('[data-scene-host]');
    this.overlayRoot = this.root.querySelector('[data-overlay-root]');
    this.world = new WorldScene(this.sceneHost, islands, {
      onIslandSelected: (id) => this.selectIsland(id)
    });
    this.world.mount();
    this.syncWorldState();
    this.setupRotateHint();
    this.showStart();
  }

  /**
   * En movil, la aventura se ve mucho mejor en horizontal: se avisa mientras el
   * telefono este en vertical. Se puede seguir jugando igual si el jugador
   * prefiere no girarlo.
   */
  setupRotateHint() {
    const coarse = window.matchMedia('(pointer: coarse)');
    if (!coarse.matches) return;

    const hint = document.createElement('div');
    hint.className = 'rotate-hint';
    hint.hidden = true;
    hint.innerHTML = `
      <div class="rotate-hint__card" role="dialog" aria-live="polite">
        <div class="rotate-hint__icon" aria-hidden="true">📱</div>
        <h2>Gira el teléfono</h2>
        <p>La aventura se ve mucho mejor en horizontal.</p>
        <button class="text-action" type="button" data-rotate-dismiss>Seguir así</button>
      </div>
    `;
    this.root.appendChild(hint);
    this.rotateHint = hint;

    hint.querySelector('[data-rotate-dismiss]').addEventListener('click', () => {
      this.rotateDismissed = true;
      hint.hidden = true;
    });

    const portrait = window.matchMedia('(orientation: portrait)');
    const update = () => {
      hint.hidden = !portrait.matches || this.rotateDismissed;
    };
    // algunos navegadores no disparan el change del media query al girar:
    // se escucha tambien resize y orientationchange
    portrait.addEventListener('change', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    update();
  }

  showStart() {
    this.state = 'start';
    this.world.focusMap();
    this.player = getPlayer();

    if (this.player) {
      this.overlayRoot.innerHTML = `
        <section class="start-screen">
          <div class="brand-mark">${this.player.avatar}</div>
          <p class="start-screen__kicker">EMO-AVENTURA</p>
          <h1>Hola, ${this.player.name}</h1>
          <p>Vive la aventura de descubrir el poder de tus emociones.</p>
          <button class="primary-action" type="button" data-start>${gameState.completedIslands.length ? 'Continuar aventura' : 'Comenzar'}</button>
          <div class="start-screen__links">
            <button class="text-action" type="button" data-edit-profile>Mi perfil</button>
            <button class="text-action" type="button" data-progress>Mi progreso</button>
          </div>
        </section>
      `;
      this.overlayRoot.querySelector('[data-start]').addEventListener('click', () => this.showMap());
      this.overlayRoot.querySelector('[data-edit-profile]').addEventListener('click', () => this.showProfile(true));
      this.overlayRoot.querySelector('[data-progress]').addEventListener('click', () => openProgress(this.root));
    } else {
      this.overlayRoot.innerHTML = `
        <section class="start-screen">
          <div class="brand-mark">EA</div>
          <p class="start-screen__kicker">EMO-AVENTURA</p>
          <h1>Isla de las Emociones</h1>
          <p>Vive la aventura de descubrir el poder de tus emociones: reconocelas, entiende su intensidad y aprende a regularlas.</p>
          <button class="primary-action" type="button" data-create-profile>Crear mi perfil</button>
        </section>
      `;
      this.overlayRoot.querySelector('[data-create-profile]').addEventListener('click', () => this.showProfile(false));
    }
  }

  showProfile(isEditing) {
    this.state = 'profile';
    this.world.focusMap();
    const current = getPlayer();
    const selectedAvatar = current?.avatar ?? avatars[0];
    const selectedColor = current?.favoriteColor ?? favoriteColors[0].value;
    const nameValue = current?.name ?? '';

    this.overlayRoot.innerHTML = `
      <section class="profile-screen">
        <h2>${isEditing ? 'Mi perfil' : 'Crea tu perfil'}</h2>
        <p>${isEditing ? 'Actualiza tu informacion personal.' : 'Cuentanos quien eres para personalizar tu experiencia.'}</p>

        <label class="profile-label" for="player-name">Tu nombre</label>
        <input class="profile-input" id="player-name" type="text" placeholder="Escribe tu nombre..." maxlength="20" value="${nameValue}" />

        <label class="profile-label">Elige tu avatar</label>
        <div class="avatar-grid" data-avatar-grid>
          ${avatars.map((a) => `
            <button class="avatar-option ${a === selectedAvatar ? 'selected' : ''}" type="button" data-avatar="${a}">${a}</button>
          `).join('')}
        </div>

        <label class="profile-label">Tu color favorito</label>
        <div class="color-grid" data-color-grid>
          ${favoriteColors.map((c) => `
            <button class="color-option ${c.value === selectedColor ? 'selected' : ''}" type="button" data-color="${c.value}" style="--swatch:${c.value}" title="${c.name}">
              <span class="color-swatch"></span>
              <span class="color-name">${c.name}</span>
            </button>
          `).join('')}
        </div>

        <div class="profile-actions">
          <button class="primary-action" type="button" data-save-profile>${isEditing ? 'Guardar' : 'Comenzar'}</button>
          ${isEditing ? '<button class="secondary-action" type="button" data-cancel-profile>Cancelar</button>' : ''}
        </div>
      </section>
    `;

    const nameInput = this.overlayRoot.querySelector('#player-name');
    const avatarGrid = this.overlayRoot.querySelector('[data-avatar-grid]');
    const colorGrid = this.overlayRoot.querySelector('[data-color-grid]');

    avatarGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-avatar]');
      if (!btn) return;
      avatarGrid.querySelectorAll('.avatar-option').forEach((el) => el.classList.remove('selected'));
      btn.classList.add('selected');
    });

    colorGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-color]');
      if (!btn) return;
      colorGrid.querySelectorAll('.color-option').forEach((el) => el.classList.remove('selected'));
      btn.classList.add('selected');
    });

    this.overlayRoot.querySelector('[data-save-profile]').addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.classList.add('shake');
        setTimeout(() => nameInput.classList.remove('shake'), 400);
        return;
      }
      const avatar = avatarGrid.querySelector('.avatar-option.selected')?.dataset.avatar ?? avatars[0];
      const color = colorGrid.querySelector('.color-option.selected')?.dataset.color ?? favoriteColors[0].value;
      this.player = { name, avatar, favoriteColor: color };
      savePlayer(this.player);
      this.showMap();
    });

    if (isEditing) {
      this.overlayRoot.querySelector('[data-cancel-profile]').addEventListener('click', () => this.showMap());
    }
  }

  showMap() {
    if (islands.length === 1) {
      this.selectIsland(islands[0].id);
      return;
    }
    this.state = 'map';
    this.world.focusMap();
    this.syncWorldState();
    this.player = getPlayer();

    const doneChain = ISLAND_CHAIN.filter((id) => gameState.completedIslands.includes(id)).length;

    this.overlayRoot.innerHTML = `
      <section class="map-hud">
        <div>
          <p class="eyebrow">EMO-AVENTURA · Mapa principal</p>
          <h2>Elige una isla</h2>
        </div>
        <div class="hud-right">
          ${this.player ? `
            <button class="player-pill" type="button" data-edit-profile style="--pill-color:${this.player.favoriteColor}">
              <span class="pill-avatar">${this.player.avatar}</span>
              <span class="pill-name">${this.player.name}</span>
            </button>
          ` : ''}
          <div class="progress-pill" title="Islas de la aventura completadas">${doneChain}/${ISLAND_CHAIN.length} islas</div>
          <div class="progress-pill progress-pill--points" title="Puntos emocionales">✦ ${gameState.emotionalPoints}</div>
          <button class="hud-icon" type="button" data-progress aria-label="Mi progreso">📊</button>
        </div>
      </section>
      <div class="controls-hint">
        Toca una isla para entrar &middot; arrastra para girar el mapa
      </div>
    `;

    const editBtn = this.overlayRoot.querySelector('[data-edit-profile]');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.showProfile(true));
    }
    this.overlayRoot.querySelector('[data-progress]')?.addEventListener('click', () => openProgress(this.root));
  }

  renderIslandButton(island) {
    const completed = this.completed.has(island.id);
    return `
      <button class="island-chip" style="--chip:${island.palette.ui}" data-island-id="${island.id}" type="button">
        <span class="chip-emoji">${island.emoji || ''}</span>
        <span>
          <strong>${island.name}</strong>
          <small>${minigameLabels[island.minigame]}</small>
        </span>
        <em>${completed ? 'Completada' : 'Entrar'}</em>
      </button>
    `;
  }

  selectIsland(id) {
    const island = islands.find((item) => item.id === id);
    if (!island) return;
    this.state = 'island';
    this.world.focusOnIsland(id);

    // todas las islas estan abiertas: nunca hay panel de "bloqueada"
    const completed = this.completed.has(id);
    const eyebrow = island.chapter ? `Capitulo ${island.chapter} · ${island.name}` : `Isla de la ${island.name}`;
    this.overlayRoot.innerHTML = `
      <section class="island-panel" style="--accent:${island.palette.ui}">
        <p class="eyebrow">${eyebrow}</p>
        <h2>${island.displayName}</h2>
        <p>${island.subtitle}</p>
        ${island.reward ? `
          <div class="island-panel__meta">
            <span>${completed ? '✔ Completada' : `🎁 Recompensa: ${island.reward}`}</span>
          </div>` : ''}
        <div class="panel-actions">
          <button class="primary-action" type="button" data-play>${completed ? 'Volver a jugar' : 'Jugar'}</button>
          <button class="secondary-action" type="button" data-back>Mapa</button>
        </div>
      </section>
    `;
    this.overlayRoot.querySelector('[data-play]').addEventListener('click', () => this.launchMinigame(island));
    this.overlayRoot.querySelector('[data-back]').addEventListener('click', () => this.showMap());
  }

  launchMinigame(island) {
    const Game = minigameRegistry[island.minigame] ?? minigameRegistry['coming-soon'];
    this.state = 'game';
    this.overlayRoot.innerHTML = '';
    this.world.setPaused(true);
    this.currentMinigame = new Game({
      host: this.overlayRoot,
      island,
      player: this.player,
      onComplete: (result) => this.showResult(result),
      onExit: () => this.exitMinigame()
    });
    this.currentMinigame.mount();
  }

  exitMinigame() {
    this.currentMinigame?.dispose();
    this.currentMinigame = null;
    this.world.setPaused(false);
    this.showMap();
  }

  showResult(result) {
    this.currentMinigame?.dispose();
    this.currentMinigame = null;
    this.world.setPaused(false);
    if (result.success) {
      this.completed.add(result.islandId);
      window.localStorage.setItem('emotion-islands-progress', JSON.stringify([...this.completed]));
      if (ISLAND_CHAIN.includes(result.islandId) || result.emoAventura) {
        completeIsland(result.islandId);
      }
      this.syncWorldState();
    }

    if (result.emoAventura && result.success) {
      this.showIslandComplete(result);
      return;
    }

    const playerName = this.player?.name;
    const title = playerName
      ? (result.success ? `${playerName}, completaste ${result.title}` : `${playerName}, ${result.title}`)
      : result.title;

    this.overlayRoot.innerHTML = `
      <section class="result-screen">
        <p class="eyebrow">Resultado</p>
        <h2>${title}</h2>
        <p>${result.message}</p>
        ${result.target ? `<div class="result-score">${result.score}/${result.target} ${result.unit ?? 'destellos'}</div>` : ''}
        <div class="panel-actions">
          <button class="primary-action" type="button" data-back-map>Volver al mapa</button>
          <button class="secondary-action" type="button" data-replay>Volver a jugar</button>
        </div>
      </section>
    `;
    this.overlayRoot.querySelector('[data-back-map]').addEventListener('click', () => this.showMap());
    this.overlayRoot.querySelector('[data-replay]').addEventListener('click', () => this.replay(result.islandId));
  }

  /** Volver a jugar la misma isla sin pasar por el mapa */
  replay(islandId) {
    const island = islands.find((item) => item.id === islandId);
    if (!island) { this.showMap(); return; }
    this.syncWorldState();
    this.launchMinigame(island);
  }

  /** Cierre de una isla de EMO-AVENTURA: progreso y puntos */
  showIslandComplete(result) {
    const island = islands.find((item) => item.id === result.islandId);
    const finished = allIslandsCompleted();
    const doneChain = ISLAND_CHAIN.filter((id) => gameState.completedIslands.includes(id)).length;

    this.overlayRoot.innerHTML = `
      <section class="island-complete">
        <div class="island-complete__sparks" aria-hidden="true">
          ${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}
        </div>
        <p class="eyebrow">Isla completada</p>
        <div class="island-complete__badge">
          <span class="island-complete__badge-icon" aria-hidden="true">${island?.emoji ?? '🏝️'}</span>
        </div>
        <h2>${result.title}</h2>
        <p>${result.message}</p>
        <div class="island-complete__stats">
          <span>🏝️ ${doneChain}/${ISLAND_CHAIN.length} islas</span>
          <span>✦ ${gameState.emotionalPoints} puntos</span>
        </div>
        <div class="panel-actions">
          <button class="primary-action" type="button" data-back-map>${finished ? 'Ver el final' : 'Volver al mapa'}</button>
          <button class="secondary-action" type="button" data-replay>Volver a jugar</button>
        </div>
      </section>
    `;

    this.overlayRoot.querySelector('[data-replay]').addEventListener('click', () => this.replay(result.islandId));

    this.overlayRoot.querySelector('[data-back-map]').addEventListener('click', () => {
      if (finished) {
        openFinal(this.root, () => this.showMap());
        this.world.setCompleted(new Set(ISLAND_CHAIN));
      } else {
        this.showMap();
      }
    });
  }
}
