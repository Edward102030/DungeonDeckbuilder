/**
 * DUNGEON DECKBUILDER
 * Main Engine File - Phase 4 (Relics, Gold, Shop, Status Effects, Audio Hooks)
 */

// ==========================================
// 1. UTILITIES, AUDIO & EVENT BUS
// ==========================================
class EventBus {
    constructor() { this.listeners = {}; }
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }
    emit(event, data) {
        if (this.listeners[event]) this.listeners[event].forEach(cb => cb(data));
    }
}
const events = new EventBus();

class AudioManager {
    constructor() {
        // Hooks for future MP3/WAV files.
        this.sounds = {
            shoot: null, hit: null, buy: null, click: null
        };
    }
    playSound(name) {
        // If you add files later: if(this.sounds[name]) this.sounds[name].play();
        // console.log(`[AUDIO HOOK]: Playing ${name}`);
    }
}
const audio = new AudioManager();

const CardDatabase = [
    { id: 'strike', name: 'Strike', cost: 1, desc: 'Deal 15 dmg.' },
    { id: 'dash', name: 'Dash', cost: 1, desc: 'Dash & gain i-frames.' },
    { id: 'fireball', name: 'Fireball', cost: 2, desc: 'Shoot a fireball (25 dmg).' },
    { id: 'heal', name: 'Heal', cost: 2, desc: 'Restore 20 HP.' },
    { id: 'nova', name: 'Nova', cost: 3, desc: 'Shoot 8 fireballs.' },
    { id: 'snipe', name: 'Snipe', cost: 2, desc: 'Fast projectile (50 dmg).' },
    { id: 'shield', name: 'Shield', cost: 1, desc: 'Gain 20 Block.' },
    { id: 'poison', name: 'Toxic Dart', cost: 1, desc: 'Apply 5 Poison (dmg/sec).' }
];

const RelicDatabase = [
    { id: 'coffee', name: 'Coffee Cup', desc: '+1 Max Energy.', cost: 50 },
    { id: 'apple', name: 'Golden Apple', desc: '+20 Max HP.', cost: 50 },
    { id: 'spikes', name: 'Spiked Armor', desc: 'Deal 5 dmg back when hit.', cost: 75 }
];

function getCardById(id) { return CardDatabase.find(c => c.id === id); }
function getRelicById(id) { return RelicDatabase.find(r => r.id === id); }

// ==========================================
// 2. INPUT MANAGER
// ==========================================
class InputManager {
    constructor() {
        this.keys = {};
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
    }
    getMovementVector() {
        let dx = 0, dy = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
        if (dx !== 0 && dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len; dy /= len;
        }
        return { x: dx, y: dy };
    }
}

// ==========================================
// 3. UI MANAGER & META PROGRESSION
// ==========================================
class UIManager {
    constructor(gameManager) {
        this.gm = gameManager;
        this.screens = {
            mainMenu: document.getElementById('main-menu'),
            hud: document.getElementById('hud'),
            combatUI: document.getElementById('combat-ui')
        };
        this.createDynamicUI();
        this.bindButtons();
    }
    
    createDynamicUI() {
        // Continue Button
        const continueBtn = document.createElement('button');
        continueBtn.id = 'btn-menu-continue';
        continueBtn.innerText = 'CONTINUE RUN';
        continueBtn.className = 'menu-btn hidden'; 
        continueBtn.style.cssText = 'margin-top: 10px; background: #45a29e; color: #0b0c10; padding: 15px 30px; font-size: 24px; font-weight: bold; border: none; border-radius: 5px; cursor: pointer; text-transform: uppercase; display: block; width: 300px; margin-left: auto; margin-right: auto;';
        document.getElementById('btn-menu-start').parentNode.insertBefore(continueBtn, document.getElementById('btn-menu-start').nextSibling);

        // Shop Screen
        const shopDiv = document.createElement('div');
        shopDiv.id = 'shop-screen';
        shopDiv.className = 'hidden';
        shopDiv.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #0b0c10; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 50;';
        shopDiv.innerHTML = `
            <h1 style="color: #ffd700; margin-bottom: 10px;">META SHOP</h1>
            <h2 id="shop-gold" style="color: #c5c6c7; margin-bottom: 30px;">Gold: 0</h2>
            <div id="shop-items" style="display: flex; gap: 20px; margin-bottom: 40px;"></div>
            <button id="btn-shop-back" style="background: #ff4c4c; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 18px;">Back to Menu</button>
        `;
        document.body.appendChild(shopDiv);
        this.screens.shop = shopDiv;

        // Shop Button on Main Menu
        const shopBtn = document.createElement('button');
        shopBtn.id = 'btn-menu-shop';
        shopBtn.innerText = 'ENTER SHOP';
        shopBtn.style.cssText = 'margin-top: 10px; background: #ffd700; color: #0b0c10; padding: 15px 30px; font-size: 24px; font-weight: bold; border: none; border-radius: 5px; cursor: pointer; text-transform: uppercase; display: block; width: 300px; margin-left: auto; margin-right: auto;';
        document.getElementById('btn-menu-start').parentNode.appendChild(shopBtn);

        // Draft Screen
        const draftDiv = document.createElement('div');
        draftDiv.id = 'draft-screen';
        draftDiv.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(11, 12, 16, 0.9); z-index: 100; flex-direction: column; align-items: center; justify-content: center;';
        draftDiv.innerHTML = `<h1 style="color: #66fcf1;">Wave Cleared! Choose Reward:</h1><div id="draft-choices" style="display: flex; gap: 20px;"></div>`;
        document.body.appendChild(draftDiv);
        this.screens.draft = draftDiv;

        // Gold & Relic HUD Tracker
        const hudTop = document.createElement('div');
        hudTop.id = 'hud-stats';
        hudTop.style.cssText = 'position: absolute; top: 10px; right: 20px; color: #c5c6c7; font-size: 20px; font-weight: bold; font-family: sans-serif; text-align: right; pointer-events: none;';
        hudTop.innerHTML = `<div id="wave-text">WAVE 1/500</div><div id="gold-text" style="color:#ffd700;">Gold: 0</div><div id="relic-text" style="color:#45a29e; font-size:16px; margin-top:5px;"></div>`;
        document.body.appendChild(hudTop);
    }
    
    bindButtons() {
        document.getElementById('btn-menu-start').addEventListener('click', () => {
            audio.playSound('click');
            this.switchScreen('hud');
            this.screens.combatUI.classList.remove('hidden');
            events.emit('START_RUN', false); 
        });
        document.getElementById('btn-menu-continue').addEventListener('click', () => {
            audio.playSound('click');
            this.switchScreen('hud');
            this.screens.combatUI.classList.remove('hidden');
            events.emit('START_RUN', true); 
        });
        document.getElementById('btn-menu-shop').addEventListener('click', () => {
            audio.playSound('click');
            this.openShop();
        });
        document.getElementById('btn-shop-back').addEventListener('click', () => {
            audio.playSound('click');
            this.switchScreen('mainMenu');
        });
        document.getElementById('btn-end-turn').addEventListener('click', () => {
            events.emit('END_TURN');
        });
    }

    openShop() {
        this.switchScreen('shop');
        document.getElementById('shop-gold').innerText = `Gold: ${this.gm.metaData.gold}`;
        const container = document.getElementById('shop-items');
        container.innerHTML = '';
        
        RelicDatabase.forEach(relic => {
            const isOwned = this.gm.metaData.unlockedRelics.includes(relic.id);
            const el = document.createElement('div');
            el.style.cssText = `background: #1f2833; border: 2px solid ${isOwned ? '#66ff66' : '#ffd700'}; border-radius: 8px; padding: 20px; width: 180px; text-align: center; color: white;`;
            el.innerHTML = `<h3>${relic.name}</h3><p style="font-size: 14px;">${relic.desc}</p><br/>`;
            
            if (isOwned) {
                el.innerHTML += `<span style="color:#66ff66; font-weight:bold;">OWNED</span>`;
            } else {
                const btn = document.createElement('button');
                btn.innerText = `Buy (${relic.cost}g)`;
                btn.style.cssText = 'background: #ffd700; color: black; border:none; padding: 5px 10px; cursor: pointer; font-weight:bold;';
                btn.onclick = () => events.emit('BUY_RELIC', relic);
                el.appendChild(btn);
            }
            container.appendChild(el);
        });
    }
    
    switchScreen(key) {
        Object.values(this.screens).forEach(s => {
            if (!s) return;
            if (s.id === 'draft-screen') s.style.display = 'none';
            else { s.classList.remove('active'); s.classList.add('hidden'); }
        });
        if (this.screens[key]) {
            if (key === 'draft') this.screens[key].style.display = 'flex';
            else { this.screens[key].classList.remove('hidden'); this.screens[key].classList.add('active'); }
        }
    }
    
    showDraftChoices(cards) {
        this.switchScreen('draft');
        const container = document.getElementById('draft-choices');
        container.innerHTML = '';
        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.style.cssText = 'background: #1f2833; border: 2px solid #45a29e; border-radius: 8px; padding: 20px; width: 150px; cursor: pointer; text-align: center; color: white; transition: 0.2s;';
            cardEl.innerHTML = `<div style="color: #66fcf1; font-weight: bold;">${card.cost} Energy</div><h3>${card.name}</h3><p style="font-size: 14px;">${card.desc}</p>`;
            cardEl.onclick = () => { audio.playSound('click'); events.emit('DRAFT_CARD', card); }
            container.appendChild(cardEl);
        });
    }
    
    updateHUD(player, wave, runGold) {
        const hpText = player.block > 0 ? `${Math.floor(player.hp)} HP (+${player.block} Block)` : `${Math.floor(player.hp)}/${player.maxHp}`;
        document.getElementById('health-text').innerText = hpText;
        document.getElementById('health-fill').style.width = `${(player.hp / player.maxHp) * 100}%`;
        document.getElementById('energy-text').innerText = `${player.energy}/${player.maxEnergy}`;
        
        document.getElementById('wave-text').innerText = `WAVE ${wave}/500`;
        document.getElementById('gold-text').innerText = `Run Gold: ${runGold}`;
        
        let relicStr = player.relics.length > 0 ? "Relics: " + player.relics.map(r=>r.name).join(', ') : "";
        document.getElementById('relic-text').innerText = relicStr;
    }
    
    renderHand(player) {
        const hand = document.getElementById('card-hand');
        hand.innerHTML = '';
        player.hand.forEach((c, i) => {
            const el = document.createElement('div');
            el.className = 'card animate-slide-up';
            el.innerHTML = `<div class="card-cost">${c.cost}</div><div class="card-name">${c.name}</div><div class="card-desc">${c.desc}</div>`;
            el.addEventListener('click', () => events.emit('PLAY_CARD', i));
            hand.appendChild(el);
        });
        document.getElementById('draw-count').innerText = player.drawPile.length;
        document.getElementById('discard-count').innerText = player.discardPile.length;
    }
}

// ==========================================
// 4. VFX & VISUAL POLISH
// ==========================================
class FloatingText {
    constructor(x, y, text, color) {
        this.x = x; this.y = y; this.text = text; this.color = color;
        this.life = 1.0; this.vy = -50;
    }
    update(dt) { this.y += this.vy * dt; this.life -= dt; }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color; ctx.font = 'bold 20px sans-serif';
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1.0;
    }
}

// ==========================================
// 5. ENTITIES & LOGIC
// ==========================================
class Entity {
    constructor(x, y, radius, color) {
        this.x = x; this.y = y; this.radius = radius;
        this.color = color; this.baseColor = color;
        this.vx = 0; this.vy = 0; this.speed = 200;
        this.hp = 100; this.maxHp = 100; this.block = 0;
        this.invulnerableTimer = 0;
        this.poison = 0;
        this.poisonTimer = 0;
    }
    takeDamage(amount, isPoison = false) {
        if (this.invulnerableTimer > 0 && !isPoison) return false;
        
        let dmg = amount;
        if (this.block > 0 && !isPoison) {
            if (this.block >= dmg) { this.block -= dmg; dmg = 0; } 
            else { dmg -= this.block; this.block = 0; }
        }
        
        this.hp -= dmg;
        if (!isPoison) {
            this.invulnerableTimer = 0.2;
            this.color = '#ffffff';
            audio.playSound('hit');
        }
        if (this.hp <= 0) this.hp = 0;
        
        if (dmg > 0) events.emit('SPAWN_TEXT', { x: this.x, y: this.y - 20, text: `-${Math.floor(dmg)}`, color: isPoison ? '#a333c8' : '#ff4c4c' });
        return dmg > 0;
    }
    update(dt) {
        this.x += this.vx * dt; this.y += this.vy * dt;
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= dt;
            if (this.invulnerableTimer <= 0) this.color = this.baseColor;
        }
        if (this.poison > 0) {
            this.poisonTimer += dt;
            if (this.poisonTimer >= 1.0) {
                this.takeDamage(this.poison, true);
                this.poisonTimer = 0;
                this.poison--; // Poison ticks down by 1 each second
            }
            this.color = this.invulnerableTimer > 0 ? '#ffffff' : '#a333c8'; // Turn purple if poisoned
        } else if (this.invulnerableTimer <= 0) {
            this.color = this.baseColor;
        }
    }
    draw(ctx) {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.fill(); ctx.closePath();
        if (this.block > 0) {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#45a29e'; ctx.lineWidth = 2; ctx.stroke(); ctx.closePath();
        }
    }
}

class Player extends Entity {
    constructor(x, y) {
        super(x, y, 15, '#66fcf1');
        this.energy = 3; this.maxEnergy = 3;
        this.deck = [CardDatabase[0], CardDatabase[0], CardDatabase[6], CardDatabase[1], CardDatabase[2], CardDatabase[7]];
        this.drawPile = []; this.hand = []; this.discardPile = [];
        this.relics = [];
    }
    applyMetaRelics(metaRelicsIDs) {
        metaRelicsIDs.forEach(id => {
            const relic = getRelicById(id);
            if (relic) {
                this.relics.push(relic);
                if (relic.id === 'coffee') { this.maxEnergy += 1; this.energy += 1; }
                if (relic.id === 'apple') { this.maxHp += 20; this.hp += 20; }
            }
        });
    }
    shuffle(arr) { for(let i = arr.length-1; i>0; i--){ const j = Math.floor(Math.random()*(i+1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } }
    drawCards(amt) {
        for (let i = 0; i < amt; i++) {
            if (this.drawPile.length === 0) {
                if (this.discardPile.length === 0) break; 
                this.drawPile = [...this.discardPile]; this.shuffle(this.drawPile); this.discardPile = [];
            }
            this.hand.push(this.drawPile.pop());
        }
    }
    handleInput(input) {
        const m = input.getMovementVector();
        this.vx = m.x * this.speed; this.vy = m.y * this.speed;
        this.x = Math.max(this.radius, Math.min(window.innerWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(window.innerHeight - this.radius, this.y));
    }
}

class Enemy extends Entity {
    constructor(x, y, type="melee", waveScaler = 1) {
        super(x, y, type==="boss" ? 40 : 15, type==="boss" ? '#990000' : (type==="ranged" ? '#ff9900' : '#ff4c4c'));
        this.type = type;
        this.hp = (type === "boss" ? 300 : 30) + (waveScaler * (type === "boss" ? 50 : 10)); 
        this.maxHp = this.hp;
        this.speed = type === "boss" ? 30 : (type==="ranged" ? 40 : 70); 
        this.damage = (type === "boss" ? 25 : 10) + Math.floor(waveScaler / 2); 
        this.goldValue = type === "boss" ? 50 : 5;
        this.attackTimer = 0;
    }
    updateAI(player, dt) {
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        
        if (this.type === "ranged") {
            if (dist < 200) { this.vx = -(dx/dist)*this.speed; this.vy = -(dy/dist)*this.speed; }
            else if (dist > 300) { this.vx = (dx/dist)*this.speed; this.vy = (dy/dist)*this.speed; }
            else { this.vx = 0; this.vy = 0; }
            
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                events.emit('ENEMY_SHOOT', { x: this.x, y: this.y, angle: Math.atan2(dy, dx), damage: this.damage });
                this.attackTimer = 2.0;
            }
        } else {
            if (dist > (this.type==="boss" ? 50 : 30)) { this.vx = (dx/dist)*this.speed; this.vy = (dy/dist)*this.speed; }
            else { this.vx = 0; this.vy = 0; }
        }
    }
}

class Projectile {
    constructor(x, y, angle, speed = 500, damage = 25, color = '#ffd700', isEnemy = false, effect = null) {
        this.x = x; this.y = y; this.radius = 8;
        this.speed = speed; this.damage = damage;
        this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed;
        this.color = color; this.life = 2.0; this.isEnemy = isEnemy;
        this.effect = effect; // Used for passing statuses like poison via projectiles
    }
    update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt; }
    draw(ctx) {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fillStyle = this.color; ctx.shadowBlur = 10; ctx.shadowColor = this.color;
        ctx.fill(); ctx.closePath(); ctx.shadowBlur = 0;
    }
}

// ==========================================
// 6. RENDER MANAGER
// ==========================================
class RenderManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.shakeTime = 0; this.shakeIntensity = 0;
        this.resize(); window.addEventListener('resize', () => this.resize());
    }
    resize() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }
    applyShake(dt) {
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            this.ctx.translate((Math.random()-0.5)*this.shakeIntensity, (Math.random()-0.5)*this.shakeIntensity);
        }
    }
    clear() {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = '#0b0c10'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// ==========================================
// 7. GAME LOOP & META SAVING
// ==========================================
class GameManager {
    constructor() {
        this.state = 'MENU'; this.lastTime = 0; this.waveNumber = 0; this.runGold = 0;
        
        // Load Meta Progression
        this.metaData = JSON.parse(localStorage.getItem('deckbuilder_meta')) || { gold: 0, unlockedRelics: [] };
        
        this.input = new InputManager(); 
        this.ui = new UIManager(this); 
        this.renderer = new RenderManager('gameCanvas');
        
        this.player = null; this.enemies = []; this.projectiles = []; this.texts = [];
        this.checkSaveData();
        
        events.on('START_RUN', (loadSave) => this.initRun(loadSave));
        events.on('PLAY_CARD', (idx) => this.playCard(idx));
        events.on('END_TURN', () => this.endTurn());
        events.on('DRAFT_CARD', (c) => this.completeDraft(c));
        events.on('BUY_RELIC', (r) => this.buyRelic(r));
        events.on('SPAWN_TEXT', (data) => this.texts.push(new FloatingText(data.x, data.y, data.text, data.color)));
        events.on('SCREEN_SHAKE', (intensity) => { this.renderer.shakeTime = 0.2; this.renderer.shakeIntensity = intensity; });
        events.on('ENEMY_SHOOT', (data) => {
            audio.playSound('shoot');
            this.projectiles.push(new Projectile(data.x, data.y, data.angle, 300, data.damage, '#ff4c4c', true));
        });
        
        requestAnimationFrame((t) => this.loop(t));
    }

    saveMeta() { localStorage.setItem('deckbuilder_meta', JSON.stringify(this.metaData)); }

    buyRelic(relic) {
        if (this.metaData.gold >= relic.cost) {
            audio.playSound('buy');
            this.metaData.gold -= relic.cost;
            this.metaData.unlockedRelics.push(relic.id);
            this.saveMeta();
            this.ui.openShop(); // Refresh shop UI
        } else {
            alert("Not enough gold!");
        }
    }

    checkSaveData() {
        if (localStorage.getItem('deckbuilder_run_save')) {
            const btn = document.getElementById('btn-menu-continue');
            if(btn) btn.classList.remove('hidden');
        }
    }

    saveGame() {
        localStorage.setItem('deckbuilder_run_save', JSON.stringify({
            wave: this.waveNumber, runGold: this.runGold,
            player: { hp: this.player.hp, maxHp: this.player.maxHp, deck: this.player.deck.map(c => c.id) }
        }));
    }

    clearSave() {
        localStorage.removeItem('deckbuilder_run_save');
        const btn = document.getElementById('btn-menu-continue');
        if(btn) btn.classList.add('hidden');
    }

    initRun(loadSave) {
        this.state = 'PLAYING'; this.projectiles = []; this.enemies = []; this.texts = [];
        this.player = new Player(this.renderer.canvas.width/2, this.renderer.canvas.height/2);
        this.player.applyMetaRelics(this.metaData.unlockedRelics);

        if (loadSave) {
            const data = JSON.parse(localStorage.getItem('deckbuilder_run_save'));
            if (data) {
                this.waveNumber = data.wave; this.runGold = data.runGold;
                this.player.hp = data.player.hp; this.player.maxHp = data.player.maxHp;
                this.player.deck = data.player.deck.map(id => getCardById(id));
            }
        } else {
            this.waveNumber = 0; this.runGold = 0; this.clearSave();
        }

        this.player.drawPile = [...this.player.deck]; this.player.shuffle(this.player.drawPile); this.player.drawCards(4); 
        this.ui.updateHUD(this.player, this.waveNumber, this.runGold); 
        this.ui.renderHand(this.player);
        this.spawnNextWave();
    }

    spawnNextWave() {
        if (!this.player) return;
        if (this.waveNumber >= 500) { this.endRun('VICTORY'); return; }

        this.waveNumber++; this.saveGame();
        this.ui.updateHUD(this.player, this.waveNumber, this.runGold);

        if (this.waveNumber % 5 === 0) {
            this.enemies.push(new Enemy(this.renderer.canvas.width/2, 100, "boss", this.waveNumber));
            events.emit('SPAWN_TEXT', {x: this.renderer.canvas.width/2, y: 50, text: "BOSS WAVE", color: "#990000"});
        } else {
            const num = Math.min(this.waveNumber * 2, 20); 
            for (let i = 0; i < num; i++) {
                let x = Math.random() > 0.5 ? 50 : this.renderer.canvas.width - 50;
                let y = Math.random() * this.renderer.canvas.height;
                let type = Math.random() > 0.7 ? "ranged" : "melee";
                this.enemies.push(new Enemy(x, y, type, this.waveNumber));
            }
        }
    }

    playCard(idx) {
        if (this.state !== 'PLAYING') return;
        const c = this.player.hand[idx];
        if (!c || this.player.energy < c.cost) return;
        
        audio.playSound('click');
        this.player.energy -= c.cost; this.player.hand.splice(idx, 1); this.player.discardPile.push(c);

        let near = this.enemies[0];
        if (near && this.enemies.length > 1) {
            near = this.enemies.reduce((p, curr) => Math.hypot(p.x-this.player.x, p.y-this.player.y) < Math.hypot(curr.x-this.player.x, curr.y-this.player.y) ? p : curr);
        }

        switch(c.id) {
            case 'strike': if(near) near.takeDamage(15); break;
            case 'dash': this.player.speed = 600; this.player.invulnerableTimer = 0.5; setTimeout(()=>this.player.speed=200, 300); break;
            case 'fireball': if(near) { audio.playSound('shoot'); this.projectiles.push(new Projectile(this.player.x, this.player.y, Math.atan2(near.y-this.player.y, near.x-this.player.x))); } break;
            case 'heal': this.player.hp = Math.min(this.player.hp + 20, this.player.maxHp); events.emit('SPAWN_TEXT', {x:this.player.x,y:this.player.y,text:"+20",color:"#66ff66"}); break;
            case 'shield': this.player.block += 20; events.emit('SPAWN_TEXT', {x:this.player.x,y:this.player.y,text:"+20 Armor",color:"#45a29e"}); break;
            case 'nova': audio.playSound('shoot'); for(let i=0;i<Math.PI*2;i+=Math.PI/4) this.projectiles.push(new Projectile(this.player.x, this.player.y, i, 400, 15)); break;
            case 'snipe': if(near) { audio.playSound('shoot'); this.projectiles.push(new Projectile(this.player.x, this.player.y, Math.atan2(near.y-this.player.y, near.x-this.player.x), 1000, 50)); } break;
            case 'poison': if(near) { audio.playSound('shoot'); this.projectiles.push(new Projectile(this.player.x, this.player.y, Math.atan2(near.y-this.player.y, near.x-this.player.x), 600, 5, '#a333c8', false, 'poison')); } break;
        }
        this.ui.updateHUD(this.player, this.waveNumber, this.runGold); this.ui.renderHand(this.player); 
    }

    endTurn() {
        if (this.state !== 'PLAYING') return;
        this.player.block = 0; 
        while(this.player.hand.length > 0) this.player.discardPile.push(this.player.hand.pop());
        this.player.energy = this.player.maxEnergy; this.player.drawCards(4);
        this.ui.updateHUD(this.player, this.waveNumber, this.runGold); this.ui.renderHand(this.player);
    }

    completeDraft(c) {
        this.player.deck.push(c); this.player.discardPile.push(c);
        this.ui.switchScreen('hud'); this.ui.screens.combatUI.classList.remove('hidden');
        this.ui.renderHand(this.player); this.state = 'PLAYING'; this.spawnNextWave();
    }
    
    endRun(finalState) {
        this.state = finalState;
        this.metaData.gold += this.runGold; // Add run gold to meta gold
        this.saveMeta();
        this.clearSave();
    }

    loop(t) {
        const dt = (t - this.lastTime) / 1000; this.lastTime = t;
        if (dt < 0.1) { this.update(dt); this.render(dt); }
        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        if (this.state !== 'PLAYING') return;
        this.player.handleInput(this.input); this.player.update(dt);
        
        if (this.player.hp <= 0) { this.endRun('GAME_OVER'); return; }
        
        if (this.enemies.length === 0) {
            this.state = 'DRAFTING'; 
            let choices = [...CardDatabase].sort(()=>0.5-Math.random()).slice(0,3);
            this.ui.showDraftChoices(choices); return;
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i]; p.update(dt);
            let hit = false;
            if (p.isEnemy) {
                if (Math.hypot(p.x-this.player.x, p.y-this.player.y) < p.radius+this.player.radius) {
                    if (this.player.takeDamage(p.damage)) {
                        hit = true;
                        if (this.player.relics.find(r => r.id === 'spikes')) {
                            events.emit('SPAWN_TEXT', {x: this.player.x, y: this.player.y-30, text: "Thorns!", color: "#fff"});
                            // Deal 5 damage to random enemy
                            let rEnemy = this.enemies[Math.floor(Math.random() * this.enemies.length)];
                            if (rEnemy) rEnemy.takeDamage(5);
                        }
                    }
                }
            } else {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    let e = this.enemies[j];
                    if (Math.hypot(p.x-e.x, p.y-e.y) < p.radius+e.radius) {
                        e.takeDamage(p.damage); 
                        if (p.effect === 'poison') e.poison += 5;
                        hit = true; e.x += p.vx*dt*2; e.y += p.vy*dt*2; break; 
                    }
                }
            }
            if (hit || p.life <= 0) this.projectiles.splice(i, 1);
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i]; e.updateAI(this.player, dt); e.update(dt);
            if (Math.hypot(e.x-this.player.x, e.y-this.player.y) < e.radius+this.player.radius) {
                if (this.player.takeDamage(e.damage)) { 
                    this.player.x -= e.vx*dt*5; this.player.y -= e.vy*dt*5; 
                    if (this.player.relics.find(r => r.id === 'spikes')) e.takeDamage(5);
                }
            }
            if (e.hp <= 0) {
                this.runGold += e.goldValue;
                events.emit('SPAWN_TEXT', {x: e.x, y: e.y, text: `+${e.goldValue}g`, color: "#ffd700"});
                this.enemies.splice(i, 1);
            }
        }

        for (let i = this.texts.length - 1; i >= 0; i--) {
            this.texts[i].update(dt);
            if (this.texts[i].life <= 0) this.texts.splice(i, 1);
        }
        
        this.ui.updateHUD(this.player, this.waveNumber, this.runGold);
    }

    render(dt) {
        this.renderer.clear();
        this.renderer.applyShake(dt);
        if (['PLAYING', 'GAME_OVER', 'DRAFTING', 'VICTORY'].includes(this.state)) {
            this.projectiles.forEach(p => p.draw(this.renderer.ctx));
            this.enemies.forEach(e => e.draw(this.renderer.ctx));
            if (this.player && this.player.hp > 0) this.player.draw(this.renderer.ctx);
            this.texts.forEach(t => t.draw(this.renderer.ctx));
        }
        if (this.state === 'GAME_OVER' || this.state === 'VICTORY') {
            this.renderer.ctx.setTransform(1, 0, 0, 1, 0, 0); 
            const ctx = this.renderer.ctx; ctx.fillStyle = 'rgba(11,12,16,0.9)'; ctx.fillRect(0,0,this.renderer.canvas.width,this.renderer.canvas.height);
            
            ctx.fillStyle = this.state === 'VICTORY' ? '#ffd700' : '#ff4c4c'; 
            ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center'; 
            ctx.fillText(this.state === 'VICTORY' ? 'RUN CLEARED' : 'YOU DIED', this.renderer.canvas.width/2, this.renderer.canvas.height/2 - 40);
            
            ctx.fillStyle = '#c5c6c7'; ctx.font = '24px sans-serif';
            ctx.fillText(`Gold earned: ${this.runGold}`, this.renderer.canvas.width/2, this.renderer.canvas.height/2 + 20);
            ctx.fillText(`Total Meta Gold: ${this.metaData.gold}`, this.renderer.canvas.width/2, this.renderer.canvas.height/2 + 60);
            
            ctx.fillStyle = '#66fcf1'; ctx.font = '18px sans-serif';
            ctx.fillText('Refresh page to return to menu.', this.renderer.canvas.width/2, this.renderer.canvas.height/2 + 120);
        }
    }
}
window.onload = () => new GameManager();
