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
        this.cardsDatabase = [];
        this.deck = [];
        this.discardPile = [];
        this.localPlayer = { hp: 5, maxHp: 5, hand: [] };
    }

    async init() {
        try {
            // 1. Fetch heroes database
            const heroesResponse = await fetch('cards/heroes.json');
            const heroesData = await heroesResponse.json();
            this.heroesDatabase = heroesData.heroes;
            
            // 2. Fetch cards database
            const cardsResponse = await fetch('cards/cards.json');
            const cardsData = await cardsResponse.json();
            this.cardsDatabase = cardsData.cards;
            
            console.log(`Engine loaded: ${this.heroesDatabase.length} Heroes, ${this.cardsDatabase.length} Cards.`);

            // 3. Build and shuffle our combat deck
            this.buildAndShuffleDeck();

            // 4. Set up local player using Liang (hero_001)
            const currentHero = this.heroesDatabase.find(h => h.id === "hero_001") || this.heroesDatabase[0];
            this.localPlayer.hp = currentHero.baseHealth;
            this.localPlayer.maxHp = currentHero.baseHealth;

            // 5. Deal a standard starting hand of 4 cards to the player
            this.drawCardsToHand(4);

            // 6. Refresh the visual board state
            this.renderHeroHUD(currentHero);
            this.renderOpponents();
            this.renderPlayerHand();

        } catch (error) {
            console.error("Error loading game databases:", error);
        }
    }

    buildAndShuffleDeck() {
        // Copy the master card list into our active play deck
        this.deck = [...this.cardsDatabase];
        
        // Fisher-Yates Shuffle Algorithm
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
        console.log("Deck successfully shuffled!");
    }

    drawCardsToHand(amount) {
        for (let i = 0; i < amount; i++) {
            if (this.deck.length === 0) {
                // If draw deck runs out, recycle the discard pile
                if (this.discardPile.length === 0) break; 
                this.deck = [...this.discardPile];
                this.discardPile = [];
                this.buildAndShuffleDeck();
            }
            const drawnCard = this.deck.pop();
            this.localPlayer.hand.push(drawnCard);
        }
    }

    renderHeroHUD(hero) {
        const nameElement = document.querySelector('.hero-name');
        if (nameElement) nameElement.textContent = `${hero.name} (${hero.faction})`;

        const hpContainer = document.getElementById('local-health');
        if (hpContainer) {
            hpContainer.innerHTML = '';
            for(let i = 0; i < this.localPlayer.maxHp; i++) {
                hpContainer.innerHTML += `<span class="health-pip ${i < this.localPlayer.hp ? 'active' : 'empty'}"></span>`;
            }
        }
    }

    renderOpponents() {
        for (let i = 1; i <= 3; i++) {
            const opponentData = this.heroesDatabase[i];
            const station = document.getElementById(`opponent-${i}`);
            
            if (station && opponentData) {
                const statsPanel = station.querySelector('.stats-panel');
                if (statsPanel) {
                    statsPanel.innerHTML = `<strong>${opponentData.name}</strong><br>🩸 ${opponentData.baseHealth}/${opponentData.baseHealth}`;
                }
            }
        }
    }

    renderPlayerHand() {
        // Targets your main bottom area container
        const handContainer = document.getElementById('player-hand') || document.querySelector('.card-container') || document.querySelector('.hand');
        if (!handContainer) {
            console.warn("Could not locate hand container element in index.html");
            return;
        }

        handContainer.innerHTML = ''; // Clear out old placeholder markup

        this.localPlayer.hand.forEach(card => {
            // Check card suit to apply proper coloration dynamically
            const isRed = card.suit === 'Hearts' || card.suit === 'Diamonds';
            const suitSymbol = { 'Spades': '♠', 'Hearts': '♥', 'Clubs': '♣', 'Diamonds': '♦' }[card.suit] || '';

            const cardElement = document.createElement('div');
            cardElement.className = `game-card type-${card.type.toLowerCase()}`;
            if (isRed) cardElement.classList.add('red-suit'); // Use CSS styling hooks

            cardElement.innerHTML = `
                <div class="card-header">
                    <span class="card-title">${card.title}</span>
                    <span class="card-poker" style="color: ${isRed ? '#ff4d4d' : '#ffffff'}">${card.rank}${suitSymbol}</span>
                </div>
                <div class="card-body">
                    <span class="card-type-tag">${card.subType}</span>
                    <p class="card-flavor">"${card.flavorText}"</p>
                </div>
            `;
            handContainer.appendChild(cardElement);
        });
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
