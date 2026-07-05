/**
 * DUNGEON DECKBUILDER
 * Main Engine File - Phase 1 Core Architecture
 */

// ==========================================
// 1. UTILITIES & EVENT BUS
// ==========================================
class EventBus {
    constructor() {
        this.listeners = {};
    }
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }
}
const events = new EventBus();

// ==========================================
// 2. INPUT MANAGER
// ==========================================
class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, active: false };
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        window.addEventListener('mousedown', () => this.mouse.active = true);
        window.addEventListener('mouseup', () => this.mouse.active = false);

        if (this.isMobile) {
            document.getElementById('mobile-controls').classList.remove('hidden');
            // Joystick logic would bind here
        }
    }

    getMovementVector() {
        let dx = 0;
        let dy = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

        // Normalize
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }
        return { x: dx, y: dy };
    }
}

// ==========================================
// 3. UI MANAGER
// ==========================================
class UIManager {
    constructor() {
        this.screens = {
            mainMenu: document.getElementById('main-menu'),
            hud: document.getElementById('hud'),
            combatUI: document.getElementById('combat-ui'),
            characterSelect: document.getElementById('character-select-screen')
        };

        this.bindButtons();
    }

    bindButtons() {
        document.getElementById('btn-menu-start').addEventListener('click', () => {
            this.switchScreen('hud');
            this.screens.combatUI.classList.remove('hidden');
            events.emit('START_RUN');
        });

        document.getElementById('btn-menu-characters').addEventListener('click', () => {
            this.switchScreen('characterSelect');
        });

        document.getElementById('btn-back-from-chars').addEventListener('click', () => {
            this.switchScreen('mainMenu');
        });
    }

    switchScreen(activeScreenKey) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            if(screen) {
                screen.classList.remove('active');
                screen.classList.add('hidden');
            }
        });
        
        // Show target screen
        if (this.screens[activeScreenKey]) {
            this.screens[activeScreenKey].classList.remove('hidden');
            this.screens[activeScreenKey].classList.add('active');
        }
    }

    updateHUD(player) {
        document.getElementById('health-text').innerText = `${Math.floor(player.hp)}/${player.maxHp}`;
        document.getElementById('health-fill').style.width = `${(player.hp / player.maxHp) * 100}%`;
        document.getElementById('energy-text').innerText = `${player.energy}/${player.maxEnergy}`;
    }

    renderHand(cards) {
        const handContainer = document.getElementById('card-hand');
        handContainer.innerHTML = ''; // Clear existing

        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card animate-slide-up';
            cardEl.innerHTML = `
                <div class="card-cost">${card.cost}</div>
                <div class="card-name">${card.name}</div>
                <div class="card-desc">${card.desc}</div>
            `;
            cardEl.addEventListener('click', () => events.emit('PLAY_CARD', card));
            handContainer.appendChild(cardEl);
        });
    }
}

// ==========================================
// 4. ENTITIES (Player & Enemies)
// ==========================================
class Entity {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.vx = 0;
        this.vy = 0;
        this.speed = 200; // pixels per second
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur = 0; // Reset
    }
}

class Player extends Entity {
    constructor(x, y) {
        super(x, y, 15, '#66fcf1'); // Neon cyan
        this.hp = 100;
        this.maxHp = 100;
        this.energy = 3;
        this.maxEnergy = 3;
        this.deck = [
            { id: 1, name: 'Strike', cost: 1, desc: 'Deal 10 damage.' },
            { id: 2, name: 'Dash', cost: 1, desc: 'Move quickly & gain armor.' },
            { id: 3, name: 'Fireball', cost: 2, desc: 'Explosive AoE damage.' }
        ];
    }

    handleInput(inputManager) {
        const move = inputManager.getMovementVector();
        this.vx = move.x * this.speed;
        this.vy = move.y * this.speed;
    }
}

class Enemy extends Entity {
    constructor(x, y) {
        super(x, y, 15, '#ff4c4c'); // Neon red
        this.hp = 30;
        this.speed = 50;
    }
    
    // Future Utility AI Hook
    updateAI(player, deltaTime) {
        // MVP: Simple seek behavior
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 30) {
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
        } else {
            this.vx = 0;
            this.vy = 0;
        }
    }
}

// ==========================================
// 5. RENDER MANAGER
// ==========================================
class RenderManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    clear() {
        this.ctx.fillStyle = '#0b0c10';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        const size = 50;
        for(let i = 0; i < this.canvas.width; i += size) {
            this.ctx.beginPath(); this.ctx.moveTo(i, 0); this.ctx.lineTo(i, this.canvas.height); this.ctx.stroke();
        }
        for(let i = 0; i < this.canvas.height; i += size) {
            this.ctx.beginPath(); this.ctx.moveTo(0, i); this.ctx.lineTo(this.canvas.width, i); this.ctx.stroke();
        }
    }
}

// ==========================================
// 6. MAIN GAME LOOP (GameManager)
// ==========================================
class GameManager {
    constructor() {
        this.state = 'MENU'; // MENU, PLAYING, PAUSED
        this.lastTime = 0;
        
        // Initialize Systems
        this.input = new InputManager();
        this.ui = new UIManager();
        this.renderer = new RenderManager('gameCanvas');
        
        // Game State Data
        this.player = null;
        this.enemies = [];
        
        // Bind Events
        events.on('START_RUN', () => this.initRun());
        events.on('PLAY_CARD', (card) => this.playCard(card));
        
        // Start Loop
        requestAnimationFrame((t) => this.loop(t));
    }

    initRun() {
        this.state = 'PLAYING';
        this.player = new Player(this.renderer.canvas.width / 2, this.renderer.canvas.height / 2);
        
        // Spawn Dummy Enemies
        this.enemies = [
            new Enemy(200, 200),
            new Enemy(this.renderer.canvas.width - 200, 300)
        ];
        
        this.ui.updateHUD(this.player);
        this.ui.renderHand(this.player.deck); // Draw initial hand
    }

    playCard(card) {
        if (this.state !== 'PLAYING') return;
        if (this.player.energy >= card.cost) {
            this.player.energy -= card.cost;
            this.ui.updateHUD(this.player);
            console.log(`Played ${card.name}`);
            // Future: Card Resolver Engine hooks here
        } else {
            console.log("Not enough energy!");
        }
    }

    loop(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Cap deltaTime to prevent huge jumps if tab is inactive
        if (deltaTime < 0.1) {
            this.update(deltaTime);
            this.render();
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    update(deltaTime) {
        if (this.state !== 'PLAYING') return;

        // 1. Player Update
        this.player.handleInput(this.input);
        this.player.update(deltaTime);

        // 2. Enemy AI Update
        this.enemies.forEach(enemy => {
            enemy.updateAI(this.player, deltaTime);
            enemy.update(deltaTime);
        });
        
        // 3. Update HUD Data
        this.ui.updateHUD(this.player);
    }

    render() {
        this.renderer.clear();

        if (this.state === 'PLAYING') {
            this.renderer.drawGrid(); // Procedural floor texture
            
            // Draw Entities
            this.enemies.forEach(enemy => enemy.draw(this.renderer.ctx));
            this.player.draw(this.renderer.ctx);
        }
    }
}

// Boot the engine
window.onload = () => {
    const game = new GameManager();
};
