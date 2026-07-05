/**
 * DUNGEON DECKBUILDER
 * Main Engine File - Phase 1 (With Mechanics)
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
        }
    }

    getMovementVector() {
        let dx = 0;
        let dy = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

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
        Object.values(this.screens).forEach(screen => {
            if(screen) {
                screen.classList.remove('active');
                screen.classList.add('hidden');
            }
        });
        
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
        handContainer.innerHTML = '';

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
// 4. ENTITIES & COMBAT LOGIC
// ==========================================
class Entity {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.baseColor = color;
        this.vx = 0;
        this.vy = 0;
        this.speed = 200;
        
        // Combat mechanics
        this.hp = 100;
        this.maxHp = 100;
        this.invulnerableTimer = 0;
    }

    takeDamage(amount) {
        if (this.invulnerableTimer > 0) return false;
        
        this.hp -= amount;
        this.invulnerableTimer = 0.5; // Half a second of i-frames
        this.color = '#ffffff'; // Flash white when hit
        
        if (this.hp <= 0) {
            this.hp = 0;
        }
        return true;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // Handle i-frames and color reset
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= deltaTime;
            if (this.invulnerableTimer <= 0) this.color = this.baseColor;
        }
    }

    // Helper for circular collision detection
    collidesWith(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + other.radius;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur = 0;
    }
}

class Player extends Entity {
    constructor(x, y) {
        super(x, y, 15, '#66fcf1');
        this.energy = 3;
        this.maxEnergy = 3;
        this.armor = 0;
        this.deck = [
            { id: 'strike', name: 'Strike', cost: 1, type: 'attack', desc: 'Deal 15 dmg to nearest enemy.' },
            { id: 'dash', name: 'Dash', cost: 1, type: 'skill', desc: 'Dash & gain armor.' }
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
        super(x, y, 15, '#ff4c4c');
        this.hp = 30;
        this.maxHp = 30;
        this.speed = 50;
        this.damage = 10;
    }
    
    updateAI(player, deltaTime) {
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
        this.state = 'MENU';
        this.lastTime = 0;
        
        this.input = new InputManager();
        this.ui = new UIManager();
        this.renderer = new RenderManager('gameCanvas');
        
        this.player = null;
        this.enemies = [];
        
        events.on('START_RUN', () => this.initRun());
        events.on('PLAY_CARD', (card) => this.playCard(card));
        
        requestAnimationFrame((t) => this.loop(t));
    }

    initRun() {
        this.state = 'PLAYING';
        this.player = new Player(this.renderer.canvas.width / 2, this.renderer.canvas.height / 2);
        
        this.enemies = [
            new Enemy(200, 200),
            new Enemy(this.renderer.canvas.width - 200, 300)
        ];
        
        this.ui.updateHUD(this.player);
        this.ui.renderHand(this.player.deck);
    }

    playCard(card) {
        if (this.state !== 'PLAYING') return;
        if (this.player.energy < card.cost) {
            console.log("Not enough energy!");
            return;
        }

        this.player.energy -= card.cost;
        console.log(`Executed: ${card.name}`);

        switch(card.id) {
            case 'strike':
                if (this.enemies.length > 0) {
                    let nearest = this.enemies.reduce((prev, curr) => {
                        let d1 = Math.hypot(prev.x - this.player.x, prev.y - this.player.y);
                        let d2 = Math.hypot(curr.x - this.player.x, curr.y - this.player.y);
                        return d1 < d2 ? prev : curr;
                    });
                    nearest.takeDamage(15);
                }
                break;
                
            case 'dash':
                this.player.speed = 600;
                this.player.invulnerableTimer = 0.5;
                setTimeout(() => this.player.speed = 200, 300);
                break;
        }

        this.ui.updateHUD(this.player);
    }

    loop(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        if (deltaTime < 0.1) {
            this.update(deltaTime);
            this.render();
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    update(deltaTime) {
        if (this.state !== 'PLAYING') return;

        this.player.handleInput(this.input);
        this.player.update(deltaTime);

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let enemy = this.enemies[i];
            enemy.updateAI(this.player, deltaTime);
            enemy.update(deltaTime);

            if (enemy.collidesWith(this.player)) {
                if (this.player.takeDamage(enemy.damage)) {
                    console.log(`Player hit! HP: ${this.player.hp}`);
                    this.player.x -= enemy.vx * deltaTime * 5;
                    this.player.y -= enemy.vy * deltaTime * 5;
                }
            }

            if (enemy.hp <= 0) {
                this.enemies.splice(i, 1);
            }
        }
        
        this.ui.updateHUD(this.player);
    }

    render() {
        this.renderer.clear();

        if (this.state === 'PLAYING') {
            this.renderer.drawGrid();
            
            this.enemies.forEach(enemy => enemy.draw(this.renderer.ctx));
            this.player.draw(this.renderer.ctx);
        }
    }
}

// Boot the engine
window.onload = () => {
    const game = new GameManager();
};
