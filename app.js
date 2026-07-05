// Bagua System
class BaguaSystem {
    constructor() { this.active = new Set(); }
    toggle(trigram) {
        this.active.has(trigram) ? this.active.delete(trigram) : this.active.add(trigram);
        this.updateUI();
    }
    updateUI() {
        ['heaven', 'fire', 'water'].forEach(t => {
            const el = document.querySelector(`.trigram-${t}`);
            if(el) el.dataset.active = this.active.has(t);
        });
    }
}

// Game Engine
class GameEngine {
    constructor() {
        this.bagua = new BaguaSystem();
        this.heroesDatabase = [];
        this.localPlayer = { hp: 5, maxHp: 5, hand: [] };
    }

    async init() {
        // 1. Fetch the heroes from your JSON file!
        try {
            const response = await fetch('cards/heroes.json');
            const data = await response.json();
            this.heroesDatabase = data.heroes;
            console.log("Database Loaded Successfully:", this.heroesDatabase);
            
            // 2. Set up our local player using Liang (hero_001) from the JSON data
            const currentHero = this.heroesDatabase.find(h => h.id === "hero_001") || this.heroesDatabase[0];
            this.localPlayer.hp = currentHero.baseHealth;
            this.localPlayer.maxHp = currentHero.baseHealth;

            // 3. Update the UI layout
            this.renderHeroHUD(currentHero);
            this.renderOpponents();
        } catch (error) {
            console.error("Error loading the hero database:", error);
        }
    }

    renderHeroHUD(hero) {
        // Dynamically insert hero name
        const nameElement = document.querySelector('.hero-name');
        if (nameElement) nameElement.textContent = `${hero.name} (${hero.faction})`;

        // Build the physical health pips
        const hpContainer = document.getElementById('local-health');
        if (hpContainer) {
            hpContainer.innerHTML = '';
            for(let i = 0; i < this.localPlayer.maxHp; i++) {
                hpContainer.innerHTML += `<span class="health-pip ${i < this.localPlayer.hp ? 'active' : 'empty'}"></span>`;
            }
        }
    }

    renderOpponents() {
        // Grabbing heroes 2, 3, and 4 from our loaded database to populate the board
        for (let i = 1; i <= 3; i++) {
            const opponentData = this.heroesDatabase[i];
            const station = document.getElementById(`opponent-${i}`);
            
            if (station && opponentData) {
                // Keep portrait structural logic but injection text/details dynamically
                const statsPanel = station.querySelector('.stats-panel');
                if (statsPanel) {
                    statsPanel.innerHTML = `<strong>${opponentData.name}</strong><br>🩸 ${opponentData.baseHealth}/${opponentData.baseHealth}`;
                }
            }
        }
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    const game = new GameEngine();
    game.init();

    // Modal UI Bindings
    const settingsBtn = document.getElementById('btn-settings');
    const modalContainer = document.getElementById('modal-container');
    const modalSettings = document.getElementById('modal-settings');
    const closeModalBtn = document.querySelector('.close-modal');

    if (settingsBtn && modalContainer && modalSettings) {
        settingsBtn.onclick = () => {
            modalContainer.classList.remove('hidden');
            modalSettings.classList.remove('hidden');
        };
    }
    if (closeModalBtn && modalContainer && modalSettings) {
        closeModalBtn.onclick = () => {
            modalContainer.classList.add('hidden');
            modalSettings.classList.add('hidden');
        };
    }
});
