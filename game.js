/**
 * DUNGEON DECKBUILDER
 * Main Engine File
 */

// --- Global Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial sizing

// --- Core Architecture ---

class GameManager {
    constructor() {
        this.lastTime = 0;
        this.isRunning = true;
        
        // Future manager instantiations will go here
        // this.input = new InputManager();
        // this.player = new PlayerSystem();
    }

    start() {
        // Kick off the game loop
        requestAnimationFrame((time) => this.loop(time));
    }

    loop(currentTime) {
        if (!this.isRunning) return;

        // Calculate deltaTime in seconds (e.g., 0.016 for 60fps)
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        // Request next frame
        requestAnimationFrame((time) => this.loop(time));
    }

    update(deltaTime) {
        // Step 1: Process Input
        // Step 2: Update Player/Physics
        // Step 3: Update Enemy AI
        // Step 4: Resolve Combat/Collisions
    }

    render() {
        // Clear the screen with our dark background
        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render calls will go here (Map -> Enemies -> Player -> Particles)

        // Temporary test render
        ctx.fillStyle = '#66fcf1'; // Neon cyan highlight color
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Dungeon Engine Initialized', canvas.width / 2, canvas.height / 2);
    }
}

// --- Initialization ---
const game = new GameManager();
game.start();
