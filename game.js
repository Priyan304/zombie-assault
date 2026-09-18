(() => {
  const $ = id => document.getElementById(id);
  const ui = {
    menu: $('menu'),
    game: $('game'),
    overlay: $('overlay'),
    entities: $('entities'),
    toast: $('toast'),
    level: $('levelText'),
    wave: $('waveText'),
    score: $('scoreText'),
    xp: $('xpText'),
    weapon: $('weaponText'),
    weaponSub: $('weaponSub'),
    ammo: $('ammoText'),
    reloadText: $('reloadText'),
    hp: $('healthText'),
    hpBar: $('healthBar'),
    reloadBar: $('reloadBar'),
    bossHud: $('bossHud'),
    bossBar: $('bossBar'),
    bossHp: $('bossHp'),
    upgrade: $('upgradeBtn'),
    upgradeCost: $('upgradeCost')
  };

  const WEAPONS = [
    { name: 'PISTOL', damage: 22, rate: 270, pellets: 1, speed: 820, cost: 150, mag: 12, reload: 1.4, sub: '12 RDS · 1.4s RELOAD' },
    { name: 'SMG', damage: 14, rate: 95, pellets: 1, speed: 880, cost: 320, mag: 30, reload: 1.9, sub: '30 RDS · 1.9s RELOAD' },
    { name: 'SHOTGUN', damage: 22, rate: 560, pellets: 5, speed: 720, cost: 600, mag: 6, reload: 2.4, sub: '6 SHELLS · 2.4s RELOAD' },
    { name: 'PLASMA RIFLE', damage: 42, rate: 80, pellets: 1, speed: 980, cost: null, mag: 22, reload: 2.1, sub: '22 CELLS · 2.1s RELOAD' }
  ];

  const BASE_TYPES = {
    normal: { hp: 42, speed: 32, damage: 8, xp: 10, score: 15, cls: 'normal' },
    runner: { hp: 28, speed: 64, damage: 7, xp: 15, score: 25, cls: 'runner' },
    tank: { hp: 125, speed: 20, damage: 16, xp: 25, score: 40, cls: 'tank' }
  };

  let g, keys = {}, last = 0, firing = false, audioCtx;

  function sound(type) {
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'shot') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'plasma') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(640, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'shotgun') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'hit') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.06);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'reload') {
        // Mechanical click-slide
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(560, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'reload_done') {
        // Crisp chamber lock
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.setValueAtTime(780, now + 0.05);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'empty') {
        // Dry metallic click
        osc.type = 'square';
        osc.frequency.setValueAtTime(850, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'upgrade') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'enrage') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.linearRampToValueAtTime(160, now + 0.25);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {}
  }

  function reset() {
    g = {
      level: 1,
      wave: 1,
      score: 0,
      xp: 0,
      hp: 100,
      maxHp: 100,
      weapon: 0,
      ammo: WEAPONS[0].mag,
      reloading: false,
      reloadTimer: 0,
      reloadMax: WEAPONS[0].reload,
      entities: [],
      projectiles: [],
      spawnQueue: [],
      spawnTimer: 0,
      state: 'playing',
      lastShot: 0,
      playerX: 85,
      player: null,
      playerReloadEl: null,
      boss: false
    };
    ui.bossHud.classList.add('hidden');
    clearEntities();
    renderPlayer();
    startWave();
    updateHud();
  }

  function startWave() {
    g.boss = false;
    g.state = 'playing';

    // Difficulty increases per level: more enemies, tougher composition
    const count = 6 + g.level * 3 + (g.wave - 1) * 4;
    g.spawnQueue = [];

    for (let i = 0; i < count; i++) {
      let kind = 'normal';
      const rand = Math.random();

      if (g.level === 1) {
        // Level 1: mostly normal, wave 3 has slight runner surprise
        if (g.wave === 3 && rand < 0.25) kind = 'runner';
      } else if (g.level === 2) {
        // Level 2: runners introduced frequently
        if (rand < 0.40) kind = 'runner';
      } else if (g.level === 3) {
        // Level 3: tanks introduced, runners common
        if (rand < 0.25) kind = 'tank';
        else if (rand < 0.65) kind = 'runner';
      } else if (g.level === 4) {
        // Level 4: heavy armor and fast sprinters
        if (rand < 0.35) kind = 'tank';
        else if (rand < 0.75) kind = 'runner';
      } else {
        // Level 5+: nightmare sector!
        if (rand < 0.40) kind = 'tank';
        else if (rand < 0.85) kind = 'runner';
      }

      g.spawnQueue.push(kind);
    }

    // Faster initial spawn at higher levels
    g.spawnTimer = Math.max(0.2, 0.55 - (g.level - 1) * 0.05);
    showToast(`SECTOR ${String(g.level).padStart(2, '0')} · WAVE ${g.wave} / 3`);
  }

  function startBoss() {
    g.boss = true;
    g.state = 'playing';
    g.spawnQueue = [];

    // Correct boss scaling: strictly set maxHp equal to hp (fixes level 5 overflow bug)
    const baseBossHp = Math.round(550 + (g.level - 1) * 420);
    const bossSpeed = 15 + (g.level - 1) * 3;
    const bossDamage = 18 + (g.level - 1) * 4;

    spawnEnemy('boss', {
      hp: baseBossHp,
      maxHp: baseBossHp,
      speed: bossSpeed,
      damage: bossDamage,
      xp: 120 + g.level * 30,
      score: 500 + g.level * 150
    });

    ui.bossHud.classList.remove('hidden');
    ui.bossBar.style.width = '100%';
    ui.bossHp.textContent = `${baseBossHp} / ${baseBossHp}`;
    showToast('☠ BOSS DETECTED: MUTANT OVERLORD ☠');
    sound('upgrade');
  }

  function renderPlayer() {
    const el = document.createElement('div');
    el.className = 'entity player';
    el.innerHTML = `
      <div class="helmet"></div>
      <div class="head"></div>
      <div class="body"></div>
      <div class="leg a"></div>
      <div class="leg b"></div>
      <div class="gun"></div>
      <div id="playerReload" class="player-reload hidden"><i></i></div>
    `;
    ui.entities.append(el);
    g.player = el;
    g.playerReloadEl = el.querySelector('#playerReload');
  }

  function spawnEnemy(kind, custom) {
    let t, e;
    const isBoss = kind === 'boss';

    if (custom) {
      // Boss or custom enemy: use custom values directly, no double scaling!
      t = custom;
      e = {
        kind,
        ...t,
        hp: t.hp,
        maxHp: t.maxHp || t.hp,
        speed: t.speed,
        damage: t.damage,
        attackCooldown: Math.max(0.65, 1.0 - (g.level - 1) * 0.06),
        x: innerWidth + 60,
        attack: 0,
        enraged: false
      };
    } else {
      // Regular enemies: scale stats dynamically with sector level
      t = BASE_TYPES[kind];
      const hpScale = 1 + (g.level - 1) * 0.32;
      const spdScale = 1 + (g.level - 1) * 0.12;
      const dmgScale = 1 + (g.level - 1) * 0.22;
      const scaledHp = Math.round(t.hp * hpScale);

      e = {
        kind,
        ...t,
        hp: scaledHp,
        maxHp: scaledHp,
        speed: t.speed * spdScale,
        damage: Math.round(t.damage * dmgScale),
        attackCooldown: Math.max(0.65, 1.05 - (g.level - 1) * 0.08),
        x: innerWidth + 60,
        attack: 0
      };
    }

    const el = document.createElement('div');
    const isElite = g.level >= 4 && !isBoss && Math.random() < 0.45;
    const clsList = ['entity', 'zombie', t.cls || 'boss'];
    if (isElite) clsList.push('elite');
    el.className = clsList.join(' ');

    el.innerHTML = `
      <div class="hp"><i style="width:100%"></i></div>
      <div class="zhead"><i class="zeye a"></i><i class="zeye b"></i></div>
      <div class="zbody"></div>
      <div class="zleg a"></div>
      <div class="zleg b"></div>
    `;

    ui.entities.append(el);
    e.el = el;
    g.entities.push(e);
  }

  function startReload() {
    if (!g || g.reloading) return;
    const w = WEAPONS[g.weapon];
    if (g.ammo >= w.mag) return; // already full

    g.reloading = true;
    g.reloadMax = w.reload;
    g.reloadTimer = w.reload;
    if (g.playerReloadEl) g.playerReloadEl.classList.remove('hidden');
    sound('reload');
  }

  function finishReload() {
    if (!g) return;
    const w = WEAPONS[g.weapon];
    g.reloading = false;
    g.reloadTimer = 0;
    g.ammo = w.mag;
    if (g.playerReloadEl) g.playerReloadEl.classList.add('hidden');
    sound('reload_done');
  }

  function shoot() {
    if (!g || g.state !== 'playing') return;

    // If currently reloading, cannot fire
    if (g.reloading) {
      if (Date.now() - g.lastShot > 250) {
        g.lastShot = Date.now();
        sound('empty');
      }
      return;
    }

    // If out of ammo, trigger auto-reload
    if (g.ammo <= 0) {
      sound('empty');
      startReload();
      return;
    }

    // Rate of fire check
    const w = WEAPONS[g.weapon];
    if (Date.now() - g.lastShot < w.rate) return;
    g.lastShot = Date.now();

    // Consume ammo
    g.ammo--;

    // EXACT MUZZLE POSITION:
    // Gun barrel tip is located at playerX + 80px horizontally.
    // Gun center is at 56px above player feet (player is at bottom: 25%).
    const startX = g.playerX + 80;
    const startY = 56; // px above player feet

    // Spawn projectiles
    if (w.pellets > 1) {
      // SHOTGUN: Fan spread with angular velocity from the exact nozzle!
      // Angles in degrees: fan out gracefully (-8° to +8°)
      const angles = [-8, -4, 0, 4, 8];
      for (let i = 0; i < w.pellets; i++) {
        const el = document.createElement('div');
        el.className = 'projectile shotgun';
        ui.entities.append(el);

        const rad = ((angles[i] || 0) + (Math.random() - 0.5) * 2) * (Math.PI / 180);
        const speed = w.speed + (Math.random() - 0.5) * 70;
        const vx = Math.cos(rad) * speed;
        const vy = Math.sin(rad) * speed;

        g.projectiles.push({
          el,
          x: startX,
          y: startY,
          vx,
          vy,
          damage: w.damage
        });
      }
      sound('shotgun');
    } else {
      // PISTOL / SMG / PLASMA: Straight laser/bullet from the nozzle
      const el = document.createElement('div');
      el.className = 'projectile' + (g.weapon === 3 ? ' plasma' : '');
      ui.entities.append(el);

      g.projectiles.push({
        el,
        x: startX,
        y: startY,
        vx: w.speed,
        vy: 0,
        damage: w.damage
      });

      sound(g.weapon === 3 ? 'plasma' : 'shot');
    }

    // Muzzle flash
    const flash = document.createElement('div');
    flash.className = 'muzzle';
    flash.textContent = '✦';
    g.player.append(flash);
    setTimeout(() => flash.remove(), 50);

    // Auto reload when last bullet fired
    if (g.ammo === 0) {
      setTimeout(() => {
        if (g && g.state === 'playing' && !g.reloading && g.ammo === 0) {
          startReload();
        }
      }, 100);
    }
  }

  function update(dt) {
    if (!g) return;

    if (g.state === 'playing') {
      // Player movement
      const move = (keys.a || keys.arrowleft ? -1 : 0) + (keys.d || keys.arrowright ? 1 : 0);
      g.playerX = Math.max(25, Math.min(innerWidth * 0.38, g.playerX + move * 290 * dt));
      g.player.style.left = g.playerX + 'px';

      // Reload timer
      if (g.reloading) {
        g.reloadTimer -= dt;
        const progress = Math.min(1, Math.max(0, 1 - g.reloadTimer / g.reloadMax));
        if (g.playerReloadEl) {
          const bar = g.playerReloadEl.querySelector('i');
          if (bar) bar.style.width = (progress * 100) + '%';
        }
        if (g.reloadTimer <= 0) {
          finishReload();
        }
      }

      // Continuous firing
      if (firing) shoot();

      // Enemy Spawner
      if (g.spawnQueue.length) {
        g.spawnTimer -= dt;
        if (g.spawnTimer <= 0) {
          spawnEnemy(g.spawnQueue.shift());
          // Faster spawning as levels increase
          const spawnDelay = Math.max(0.32, 0.65 - (g.level - 1) * 0.06 + Math.random() * 0.35);
          g.spawnTimer = spawnDelay;
        }
      }

      // Projectiles update
      for (const p of [...g.projectiles]) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Position accurately with calc(25% + Ypx)
        p.el.style.left = Math.round(p.x) + 'px';
        p.el.style.bottom = `calc(25% + ${Math.round(p.y)}px)`;

        // Offscreen check
        if (p.x > innerWidth + 40 || p.y < -30 || p.y > 220) {
          removeP(p);
          continue;
        }

        // Hit detection
        let hit = false;
        for (const e of [...g.entities]) {
          const isBoss = e.kind === 'boss';
          const targetWidth = isBoss ? 110 : 50;
          const targetHeight = isBoss ? 150 : 90;

          // Check X overlap
          if (p.x >= e.x && p.x <= e.x + targetWidth) {
            // Check Y height overlap (zombie body height)
            if (p.y >= 5 && p.y <= targetHeight) {
              damage(e, p.damage);
              removeP(p);
              hit = true;
              break;
            }
          }
        }
      }

      // Enemies update
      for (const e of [...g.entities]) {
        e.x -= e.speed * dt;
        e.el.style.left = Math.round(e.x) + 'px';

        // Boss enrage logic at < 35% HP
        if (e.kind === 'boss' && !e.enraged && e.hp <= e.maxHp * 0.35) {
          e.enraged = true;
          e.speed *= 1.4;
          e.damage = Math.round(e.damage * 1.3);
          e.el.classList.add('enraged');
          showToast('⚠ MUTANT OVERLORD ENRAGED! ⚠');
          sound('enrage');
        }

        // Zombie attack player
        if (e.x < g.playerX + 58) {
          e.attack -= dt;
          if (e.attack <= 0) {
            g.hp = Math.max(0, g.hp - e.damage);
            e.attack = e.attackCooldown || 0.95;
            e.el.classList.add('hit');
            setTimeout(() => e.el && e.el.classList.remove('hit'), 180);
            sound('hit');
            if (g.hp <= 0) {
              gameOver();
              break;
            }
          }
        }
      }

      // Wave completion check
      if (!g.spawnQueue.length && !g.entities.length) {
        if (g.boss) {
          levelClear();
        } else if (g.wave < 3) {
          g.wave++;
          startWave();
        } else {
          startBoss();
        }
      }
    }

    updateHud();
  }

  function damage(e, n) {
    e.hp = Math.max(0, e.hp - n);
    const hpBar = e.el.querySelector('.hp i');
    if (hpBar) {
      const pct = Math.min(100, Math.max(0, (e.hp / e.maxHp) * 100));
      hpBar.style.width = pct + '%';
    }

    e.el.classList.add('hit');
    setTimeout(() => e.el && e.el.classList.remove('hit'), 90);
    sound('hit');

    if (e.hp <= 0) {
      g.score += e.score;
      g.xp += e.xp;
      e.el.remove();
      g.entities.splice(g.entities.indexOf(e), 1);
      if (e.kind === 'boss') {
        ui.bossHud.classList.add('hidden');
      }
    }
  }

  function removeP(p) {
    p.el.remove();
    const idx = g.projectiles.indexOf(p);
    if (idx !== -1) g.projectiles.splice(idx, 1);
  }

  function updateHud() {
    if (!g) return;
    const w = WEAPONS[g.weapon];

    // Basic stats
    ui.level.textContent = String(g.level).padStart(2, '0');
    ui.wave.textContent = g.boss ? 'BOSS BATTLE' : `WAVE ${g.wave} / 3`;
    ui.score.textContent = String(g.score).padStart(6, '0');
    ui.xp.textContent = String(g.xp).padStart(3, '0');
    ui.weapon.textContent = w.name;
    ui.weaponSub.textContent = w.sub;

    // Ammo & Reload UI
    ui.ammo.textContent = `${g.ammo} / ${w.mag}`;
    if (g.reloading) {
      ui.reloadText.textContent = 'RELOADING';
      ui.reloadText.classList.add('reloading');
      const pct = Math.min(100, Math.max(0, (1 - g.reloadTimer / g.reloadMax) * 100));
      ui.reloadBar.style.width = pct + '%';
    } else {
      ui.reloadText.textContent = g.ammo === 0 ? 'EMPTY [R]' : (g.ammo <= Math.ceil(w.mag * 0.25) ? 'LOW [R]' : 'READY');
      ui.reloadText.classList.remove('reloading');
      ui.reloadBar.style.width = (g.ammo / w.mag * 100) + '%';
    }

    // Health
    ui.hp.textContent = `${Math.ceil(g.hp)} / ${g.maxHp}`;
    ui.hpBar.style.width = Math.max(0, (g.hp / g.maxHp) * 100) + '%';

    // Upgrade button
    ui.upgrade.disabled = !w.cost || g.xp < w.cost;
    ui.upgradeCost.textContent = w.cost ? `${w.cost} XP` : 'MAXED';

    // Boss HUD with fixed clamping so it never overflows
    if (g.boss && g.entities.length) {
      const b = g.entities.find(e => e.kind === 'boss') || g.entities[0];
      if (b) {
        const pct = Math.min(100, Math.max(0, (b.hp / b.maxHp) * 100));
        ui.bossBar.style.width = pct.toFixed(1) + '%';
        ui.bossHp.textContent = `${Math.max(0, Math.ceil(b.hp)).toLocaleString()} / ${Math.ceil(b.maxHp).toLocaleString()}`;
      }
    }
  }

  function clearEntities() {
    ui.entities.innerHTML = '';
    if (g) {
      g.entities = [];
      g.projectiles = [];
    }
  }

  function levelClear() {
    g.state = 'clear';
    sound('upgrade');
    openOverlay(
      'SECTOR CLEARED!',
      `SECTOR ${String(g.level).padStart(2, '0')} COMPLETE`,
      `The outbreak in Sector ${String(g.level).padStart(2, '0')} has been contained. Next sector threat level is escalating!`,
      'ENTER NEXT SECTOR',
      () => {
        g.level++;
        g.wave = 1;
        g.hp = Math.min(g.maxHp, g.hp + 35); // heal 35 on clear
        g.ammo = WEAPONS[g.weapon].mag;
        g.reloading = false;
        clearEntities();
        renderPlayer();
        startWave();
        ui.overlay.classList.remove('open');
        updateHud();
      }
    );
  }

  function gameOver() {
    g.state = 'dead';
    openOverlay(
      'GAME OVER',
      'DEFENSE COMPROMISED',
      `Your squad fell in Sector ${String(g.level).padStart(2, '0')}. The infected have broken through the barricade.`,
      'TRY AGAIN',
      () => {
        clearEntities();
        ui.overlay.classList.remove('open');
        reset();
      }
    );
  }

  function openOverlay(title, eyebrow, copy, btn, action) {
    $('overlayTitle').textContent = title;
    $('overlayEyebrow').textContent = eyebrow;
    $('overlayCopy').textContent = copy;
    $('overlayBtn').textContent = btn;
    $('overlayStats').innerHTML = `
      <div><span>FINAL SCORE</span><b>${String(g.score).padStart(6, '0')}</b></div>
      <div><span>TOTAL XP</span><b>${g.xp}</b></div>
      <div><span>SECTOR REACHED</span><b>${String(g.level).padStart(2, '0')}</b></div>
    `;
    $('overlayBtn').onclick = action;
    ui.overlay.classList.add('open');
  }

  function showToast(msg) {
    ui.toast.textContent = msg;
    ui.toast.classList.add('show');
    clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1700);
  }

  function tick(t) {
    const dt = Math.min(0.035, (t - last) / 1000 || 0);
    last = t;
    update(dt);
    requestAnimationFrame(tick);
  }

  // Event Listeners
  $('startBtn').onclick = () => {
    ui.menu.classList.remove('active');
    ui.game.classList.add('active');
    reset();
    requestAnimationFrame(tick);
  };

  $('controlsBtn').onclick = () => {
    $('menuInfo').textContent = 'MOVE: A / D OR ← / → · FIRE: SPACE / LEFT CLICK · RELOAD: R · UPGRADE: XP';
  };

  $('creditsBtn').onclick = () => {
    $('menuInfo').textContent = 'RETRO ZOMBIE ASSAULT · ENHANCED EDITION · SURVIVE THE DEAD';
  };

  $('upgradeBtn').onclick = () => {
    const w = WEAPONS[g.weapon];
    if (w.cost && g.xp >= w.cost) {
      g.xp -= w.cost;
      g.weapon++;
      const nextW = WEAPONS[g.weapon];
      g.ammo = nextW.mag;
      g.reloading = false;
      if (g.playerReloadEl) g.playerReloadEl.classList.add('hidden');
      showToast(`${nextW.name} EQUIPPED!`);
      sound('upgrade');
      updateHud();
    }
  };

  $('menuBtn').onclick = () => {
    ui.overlay.classList.remove('open');
    ui.game.classList.remove('active');
    ui.menu.classList.add('active');
    g = null;
    clearEntities();
  };

  // Keyboard controls
  addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    keys[key] = true;

    if (e.code === 'Space') {
      e.preventDefault();
      firing = true;
    }

    if (key === 'r') {
      if (g && g.state === 'playing') {
        startReload();
      }
    }
  });

  addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    keys[key] = false;
    if (e.code === 'Space') firing = false;
  });

  // Mouse firing controls
  ui.game.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    firing = true;
  });

  addEventListener('mouseup', () => { firing = false; });
  addEventListener('mouseleave', () => { firing = false; });
})();
