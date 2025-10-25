class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.faceUp = false;
    }

    get value() {
        const rankValues = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };
        return rankValues[this.rank];
    }

    get isRed() {
        return this.suit === 'hearts' || this.suit === 'diamonds';
    }

    get suitSymbol() {
        const symbols = { 'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠' };
        return symbols[this.suit];
    }
}

class Game {
    constructor() {
        this.stock = [];
        this.waste = [];
        this.foundations = [[], [], [], []];
        this.tableaus = [[], [], [], [], [], [], []];
        this.selectedCards = null;
        this.dragSource = null;
        this.init();
    }

    init() {
        this.createDeck();
        this.shuffle();
        this.dealCards();
        this.render();
        this.setupEventListeners();
    }

    createDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const deck = [];

        for (let suit of suits) {
            for (let rank of ranks) {
                deck.push(new Card(suit, rank));
            }
        }

        this.stock = deck;
    }

    shuffle() {
        for (let i = this.stock.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.stock[i], this.stock[j]] = [this.stock[j], this.stock[i]];
        }
    }

    dealCards() {
        for (let i = 0; i < 7; i++) {
            for (let j = i; j < 7; j++) {
                const card = this.stock.pop();
                if (i === j) card.faceUp = true;
                this.tableaus[j].push(card);
            }
        }
    }

    stockClick() {
        if (this.stock.length === 0) {
            while (this.waste.length > 0) {
                const card = this.waste.pop();
                card.faceUp = false;
                this.stock.push(card);
            }
        } else {
            const card = this.stock.pop();
            card.faceUp = true;
            this.waste.push(card);
        }
        this.render();
    }

    canPlaceOnTableau(card, tableau) {
        if (tableau.length === 0) return card.rank === 'K';
        const topCard = tableau[tableau.length - 1];
        return card.value === topCard.value - 1 && card.isRed !== topCard.isRed;
    }

    canPlaceOnFoundation(card, foundationIndex) {
        const foundation = this.foundations[foundationIndex];
        if (foundation.length === 0) return card.rank === 'A';
        const topCard = foundation[foundation.length - 1];
        return card.suit === topCard.suit && card.value === topCard.value + 1;
    }

    getCardElement(card) {
        return document.querySelector(`[data-card-id="${this.getCardId(card)}"]`);
    }

    getCardId(card) {
        return `${card.suit}-${card.rank}`;
    }

    render() {
        this.renderStock();
        this.renderWaste();
        this.renderFoundations();
        this.renderTableaus();
    }

    renderStock() {
        const stockEl = document.getElementById('stock');
        stockEl.innerHTML = this.stock.length > 0 ? '<div class="card-back"></div>' : '<div style="opacity: 0.3;">↻</div>';
    }

    renderWaste() {
        const wasteEl = document.getElementById('waste');
        wasteEl.innerHTML = '';
        if (this.waste.length > 0) {
            const card = this.waste[this.waste.length - 1];
            wasteEl.appendChild(this.createCardElement(card));
        }
    }

    renderFoundations() {
        this.foundations.forEach((foundation, idx) => {
            const foundationEl = document.getElementById(`foundation-${idx}`);
            foundationEl.innerHTML = '';
            if (foundation.length > 0) {
                foundationEl.appendChild(this.createCardElement(foundation[foundation.length - 1]));
            }
        });
    }

    renderTableaus() {
        this.tableaus.forEach((tableau, idx) => {
            const tableauEl = document.getElementById(`tableau-${idx}`);
            tableauEl.innerHTML = '';
            tableau.forEach((card, cardIdx) => {
                const el = this.createCardElement(card, cardIdx === tableau.length - 1);
                tableauEl.appendChild(el);
            });
        });
    }

    createCardElement(card, interactive = true) {
        const el = document.createElement('div');
        el.className = `card ${card.isRed ? 'red' : 'black'}`;
        el.setAttribute('data-card-id', this.getCardId(card));
        el.style.top = '0';
        el.style.left = '0';
        el.style.zIndex = '1';

        if (card.faceUp) {
            el.innerHTML = `<div class="card-rank">${card.rank}</div><div class="card-suit">${card.suitSymbol}</div>`;
            if (interactive) {
                el.draggable = true;
                el.addEventListener('dragstart', (e) => this.dragStart(e, card));
                el.addEventListener('dragend', (e) => this.dragEnd(e));
            }
        } else {
            el.innerHTML = '<div class="card-back"></div>';
        }

        return el;
    }

    dragStart(e, card) {
        this.dragSource = null;
        
        if (this.waste.length > 0 && this.waste[this.waste.length - 1] === card) {
            this.dragSource = { type: 'waste', cards: [card] };
        } else {
            for (let i = 0; i < 7; i++) {
                const idx = this.tableaus[i].indexOf(card);
                if (idx !== -1 && card.faceUp) {
                    this.dragSource = { type: 'tableau', index: i, cards: this.tableaus[i].slice(idx) };
                    break;
                }
            }
        }

        if (!this.dragSource) e.preventDefault();
        e.effectAllowed = 'move';
    }

    dragEnd(e) {
        this.dragSource = null;
    }

    setupEventListeners() {
        document.getElementById('stock').addEventListener('click', () => this.stockClick());
        document.querySelector('.new-game-btn').addEventListener('click', () => location.reload());

        this.tableaus.forEach((_, idx) => {
            document.getElementById(`tableau-${idx}`).addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            document.getElementById(`tableau-${idx}`).addEventListener('drop', (e) => this.dropOnTableau(e, idx));
        });

        this.foundations.forEach((_, idx) => {
            document.getElementById(`foundation-${idx}`).addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            document.getElementById(`foundation-${idx}`).addEventListener('drop', (e) => this.dropOnFoundation(e, idx));
        });
    }

    dropOnTableau(e, tableauIdx) {
        e.preventDefault();
        if (!this.dragSource) return;

        const card = this.dragSource.cards[0];
        if (this.canPlaceOnTableau(card, this.tableaus[tableauIdx])) {
            if (this.dragSource.type === 'waste') {
                this.waste.pop();
            } else if (this.dragSource.type === 'tableau') {
                this.tableaus[this.dragSource.index].splice(this.tableaus[this.dragSource.index].length - this.dragSource.cards.length);
                if (this.tableaus[this.dragSource.index].length > 0) {
                    this.tableaus[this.dragSource.index][this.tableaus[this.dragSource.index].length - 1].faceUp = true;
                }
            }
            this.tableaus[tableauIdx].push(...this.dragSource.cards);
            this.render();
        }
    }

    dropOnFoundation(e, foundationIdx) {
        e.preventDefault();
        if (!this.dragSource || this.dragSource.cards.length !== 1) return;

        const card = this.dragSource.cards[0];
        if (this.canPlaceOnFoundation(card, foundationIdx)) {
            if (this.dragSource.type === 'waste') {
                this.waste.pop();
            } else if (this.dragSource.type === 'tableau') {
                this.tableaus[this.dragSource.index].pop();
                if (this.tableaus[this.dragSource.index].length > 0) {
                    this.tableaus[this.dragSource.index][this.tableaus[this.dragSource.index].length - 1].faceUp = true;
                }
            }
            this.foundations[foundationIdx].push(card);
            this.render();
        }
    }
}

new Game();

