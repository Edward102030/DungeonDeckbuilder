// Database Mock
const GameDatabase = {
    cards: [
        { id: "c1", title: "Piercing Strike", effect: "Damage", amount: 1, range: 1 },
        { id: "c2", title: "Guard Stance", effect: "Defend", amount: 1, range: 0 },
        { id: "c3", title: "Whirlwind Slash", effect: "Damage", amount: 1, range: 2 }
    ]
};

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
        this.localPlayer = { hp: 5, maxHp: 5, hand: ["c1", "c2", "c3"] };
    }

    init() {
        this.renderHealth();
        this.renderHand();
    }

    renderHealth() {
        const hpContainer = document.getElementById('local-health');
        hpContainer.innerHTML = '';
        for(let i=0; i<this.localPlayer.maxHp; i++) {
            hpContainer.innerHTML += `<span class="health-pip ${i < this.localPlayer.hp ? 'active' : 'empty'}"></span>`;
        }
    }

    renderHand() {
        const hand = document.getElementById('hand-zone');
        hand.innerHTML = '';
        this.localPlayer.hand.forEach(cardId => {
            const cardData = GameDatabase.cards.find(c => c.id === cardId);
            const el = document.createElement('div');
            el.className = 'game-card';
            el.dataset.id = cardId;
            el.innerHTML = `<div class="card-header">${cardData.title}</div><div class="card-body">Range: ${cardData.range}<br>Effect: ${cardData.effect}</div>`;
            el.onclick = () => this.playCard(el, cardData);
            hand.appendChild(el);
        });
    }

    playCard(element, data) {
        console.log(`Played: ${data.title}`);
        const stack = document.getElementById('active-play-stack');
        stack.appendChild(element);
        element.style.transform = `rotate(${Math.random() * 10 - 5}deg)`;
        
        // Example Bagua interaction
        if(data.title.includes("Strike")) this.bagua.toggle('fire');
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    const game = new GameEngine();
    game.init();

    // Simple UI Bindings
    document.getElementById('btn-settings').onclick = () => {
        document.getElementById('modal-container').classList.remove('hidden');
        document.getElementById('modal-settings').classList.remove('hidden');
    };
    document.querySelector('.close-modal').onclick = () => {
        document.getElementById('modal-container').classList.add('hidden');
        document.getElementById('modal-settings').classList.add('hidden');
    };
});
