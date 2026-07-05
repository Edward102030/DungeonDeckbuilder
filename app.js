class GameEngine {
    constructor() {
        this.heroesDatabase = [];
        this.cardsDatabase = [];
        this.deck = [];
        this.discardPile = [];
        this.players = {
            player: { id: "player", hp: 4, maxHp: 4, hand: [], isAI: false, name: "Liang" },
            ai1: { id: "ai1", hp: 4, maxHp: 4, hand: [], isAI: true, stationId: "opponent-1", nextMoveCache: null },
            ai2: { id: "ai2", hp: 4, maxHp: 4, hand: [], isAI: true, stationId: "opponent-2", nextMoveCache: null },
            ai3: { id: "ai3", hp: 4, maxHp: 4, hand: [], isAI: true, stationId: "opponent-3", nextMoveCache: null }
        };
        this.turnOrder = ["player", "ai1", "ai2", "ai3"];
        this.currentTurnIdx = 0;
    }

    async init() {
        try {
            const heroesResponse = await fetch('cards/heroes.json');
            const heroesData = await heroesResponse.json();
            this.heroesDatabase = heroesData.heroes;
            
            const cardsResponse = await fetch('cards/cards.json');
            const cardsData = await cardsResponse.json();
            this.cardsDatabase = cardsData.cards;

            this.buildDeck();
            this.setupInitialState();
            
            // Background pre-calculation setup loop
            this.precalculateAllAIMoves();

            this.renderBoard();
        } catch (error) {
            console.error("Initialization breakdown error:", error);
        }
    }

    buildDeck() {
        this.deck = [...this.cardsDatabase];
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    setupInitialState() {
        // Initialize Player Hand Array
        this.drawToTarget(this.players.player, 4);

        // Assign and Deal Out starting card positions to pre-allocated target AI structures
        this.turnOrder.forEach((pKey, index) => {
            const p = this.players[pKey];
            const databaseHero = this.heroesDatabase[index] || this.heroesDatabase[0];
            p.name = databaseHero.name;
            p.hp = databaseHero.baseHealth;
            p.maxHp = databaseHero.baseHealth;
            if (p.isAI) this.drawToTarget(p, 4);
        });
    }

    drawToTarget(playerObj, count) {
        for(let i=0; i<count; i++) {
            if(this.deck.length === 0) {
                if (this.discardPile.length === 0) break;
                this.deck = [...this.discardPile];
                this.discardPile = [];
                this.buildDeck();
            }
            playerObj.hand.push(this.deck.pop());
        }
    }

    /**
     * Predictive AI Optimization Loop
     * Runs calculations prior to turn initiation phases for rapid resolution execution.
     */
    precalculateAllAIMoves() {
        Object.keys(this.players).forEach(pKey => {
            const actor = this.players[pKey];
            if (!actor.isAI || actor.hp <= 0) return;

            // Search hand composition trees for utility triggers
            let optimalCardIdx = actor.hand.findIndex(c => c.type === "Basic" || c.type === "Tactical");
            
            if (optimalCardIdx === -1 && actor.hand.length > 0) optimalCardIdx = 0;

            if (optimalCardIdx !== -1) {
                actor.nextMoveCache = {
                    cardIndex: optimalCardIdx,
                    target: "player", // Fast threat focus mapping logic
                    estimatedValue: 10
                };
            } else {
                actor.nextMoveCache = { action: "pass", estimatedValue: 0 };
            }
        });
        console.log("AI Decision Trees updated background cache states.");
    }

    executeAICachedTurn(aiKey) {
        const actor = this.players[aiKey];
        if (!actor || actor.hp <= 0) { this.nextTurn(); return; }

        document.getElementById("current-turn-display").textContent = actor.name;
        
        // Execute immediately based on the cached prediction
        setTimeout(() => {
            const intent = actor.nextMoveCache;
            if (intent && intent.cardIndex !== undefined && actor.hand[intent.cardIndex]) {
                const cardPlayed = actor.hand.splice(intent.cardIndex, 1)[0];
                this.discardPile.push(cardPlayed);

                // Update Central Circle Area Display
                this.updateCenterField(cardPlayed);
                
                // Damage calculation evaluation target check 
                if (this.players[intent.target]) {
                    this.players[intent.target].hp = Math.max(0, this.players[intent.target].hp - 1);
                }
                console.log(`${actor.name} quickly resolved precalculated play: ${cardPlayed.title}`);
            }

            // Instantly clear out cache hooks and prep next states in advance
            this.precalculateAllAIMoves();
            this.renderBoard();
            this.nextTurn();
        }, 800); // Quick resolution speed
    }

    nextTurn() {
        this.currentTurnIdx = (this.currentTurnIdx + 1) % this.turnOrder.length;
        const nextActorKey = this.turnOrder[this.currentTurnIdx];
        
        if (this.players[nextActorKey].isAI) {
            this.executeAICachedTurn(nextActorKey);
        } else {
            document.getElementById("current-turn-display").textContent = "Player";
        }
    }

    updateCenterField(card) {
        const field = document.getElementById("center-played-card-slot");
        if (!field) return;
        const isRed = card.suit === 'Hearts' || card.suit === 'Diamonds';
        const suitSym = { 'Spades': '♠', 'Hearts': '♥', 'Clubs': '♣', 'Diamonds': '♦' }[card.suit] || '';
        
        field.innerHTML = `
            <div class="game-card" style="margin: 10px auto; transform: scale(0.95);">
                <div class="card-top-row ${isRed ? 'red-suit' : ''}">
                    <span class="card-title-text">${card.title}</span>
                    <span class="card-poker-value">${card.rank}${suitSym}</span>
                </div>
                <div class="card-art-box"><span class="art-icon">🔮</span></div>
            </div>
        `;
    }

    renderBoard() {
        // Player Name text updates
        document.querySelector('.hero-name').textContent = `${this.players.player.name} (Azure Dominion)`;
        
        // Setup Player Health Tracker elements
        const hpContainer = document.getElementById('local-health');
        hpContainer.innerHTML = '';
        for(let i=0; i<this.players.player.maxHp; i++) {
            hpContainer.innerHTML += `<span class="health-pip ${i < this.players.player.hp ? 'active' : ''}"></span>`;
        }

        // Opponent Array Render Configuration
        let aiCounter = 1;
        Object.keys(this.players).forEach(pKey => {
            const p = this.players[pKey];
            if (!p.isAI) return;

            const el = document.getElementById(`opponent-${aiCounter}`);
            if (el) {
                el.innerHTML = `
                    <div class="inner-hero-avatar"></div>
                    <strong style="font-size:0.75rem; display:block; min-height:24px;">${p.name}</strong>
                    <div class="health-bar"></div>
                `;
                const bar = el.querySelector('.health-bar');
                for(let i=0; i<p.maxHp; i++) {
                    bar.innerHTML += `<span class="health-pip ${i < p.hp ? 'active' : ''}"></span>`;
                }
            }
            aiCounter++;
        });

        // Player Card Hand Builder Rendering
        const handContainer = document.getElementById('player-hand');
        handContainer.innerHTML = '';
        
        this.players.player.hand.forEach(card => {
            const isRed = card.suit === 'Hearts' || card.suit === 'Diamonds';
            const suitSymbol = { 'Spades': '♠', 'Hearts': '♥', 'Clubs': '♣', 'Diamonds': '♦' }[card.suit] || '';
            const artIcon = { 'Attack': '⚔️', 'Defense': '🛡️', 'Equipment': '🗡️', 'Tactical': '📜' }[card.subType] || '🃏';

            const cardElement = document.createElement('div');
            cardElement.className = 'game-card';
            
            cardElement.innerHTML = `
                <div class="card-top-row ${isRed ? 'red-suit' : ''}">
                    <span class="card-title-text">${card.title}</span>
                    <span class="card-poker-value">${card.rank}${suitSymbol}</span>
                </div>
                <div class="card-art-box">
                    <span class="art-icon">${artIcon}</span>
                </div>
            `;
            handContainer.appendChild(cardElement);
        });

        // Set live remaining text values
        document.querySelector('.deck-count').textContent = this.deck.length;
        document.querySelector('.discard-count').textContent = this.discardPile.length;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new GameEngine();
    game.init();

    document.getElementById('btn-end-phase').onclick = () => {
        if (game.turnOrder[game.currentTurnIdx] === "player") game.nextTurn();
    };
});
