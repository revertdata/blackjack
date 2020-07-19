let apiURL = 'https://deckofcardsapi.com/api/deck';

let app = new Vue({
	el: '#app',
	data: {
		session: false,
		round: false,
		deckID: '',
		earnings: 0,
		winner: '',
		dealer: {
			initPoints: 0,
			points: 0,
			cards: [],
			show: false,
			blackjack: false
		},
		you: {
			money: 1000,
			bet: 250,
			points: 0,
			cards: [],
			blackjack: false,
			uinput: false
		}
	},
	methods: {
		newDeck: async function() {
			const response = await fetch(`${apiURL}/new/shuffle/?deck_count=6`, {
				method: 'get',
				headers: { 'Content-type': 'application/json' }
			});
			const json = await response.json();

			this.deckID =  json.deck_id;
			this.session = json.success;
			this.newRound();

			return;
		},
		newRound: function() {
			this.round = true;
			this.winner = '';
			this.dealer = {
				...this.dealer,
				initPoints: 0,
				points: 0,
				cards: [],
				show: false,
				blackjack: false
			};
			this.you = {
				...this.you,
				points: 0,
				cards: [],
				blackjack: false,
				uinput: false
			};
			this.deal();

			return;
		},
		endRound: async function() {
			this.round = false;
			await sleep(1);
			switch (this.winner) {
				case 'you':
					this.earnings += this.you.bet;
					break;
				case 'dealer':
					this.earnings -= this.you.bet;
				default:
					break;
			}

			return;
		},
		shuffle: async function() {
			const response = await fetch(`${apiURL}/${this.deckID}/shuffle/`, {
				method: 'get',
				headers: { 'Content-type': 'application/json' }
			});
			const json = await response.json();

			if (json.success) {
				this.newRound();
			}

			return;
		},
		deal: function() {
			this.hit(2, false);
			this.stand(2, false, false);

			return;
		},
		hit: async function(count, uinput) {
			const you = this.you;
			you.uinput = uinput;

			const response = await fetch(`${apiURL}/${this.deckID}/draw/?count=${count}`, {
				method: 'get',
				headers: { 'Content-type': 'application/json' }
			});
			const json = await response.json();
			for (card of json.cards) {
				you.cards.push(card);
			}
			you.points = calculateCardPoints(you.cards);

			if (you.points === 21) {
				you.blackjack = true;
				await sleep(1);
				this.stand(1, true, true);
			} else if (you.points > 21) {
				this.winner = 'dealer';
				await this.endRound();
			}

			return;
		},
		stand: async function(num, show, uinput) {
			const dealer = this.dealer;
			const you = this.you;
			const deckID = this.deckID;
			const _this = this;
			dealer.show = show;
			you.uinput = uinput;

			async function draw(count=num) {
				const response = await fetch(`${apiURL}/${deckID}/draw/?count=${count}`, {
					method: 'get',
					headers: { 'Content-type': 'application/json' }
				});
				const json = await response.json();

				for (card of json.cards) {
					if (show) await sleep(0.7);
					dealer.cards.push(card);
					if (!show && dealer.cards.length > 1) dealer.initPoints += cardValue(card.value, dealer.initPoints);
				}
				dealer.points = calculateCardPoints(dealer.cards);
				if (show && dealer.points === 21) {
					dealer.blackjack = true;
					await sleep(1);
					if (you.blackjack) _this.winner = 'tie';
					else _this.winner = 'dealer';
					await _this.endRound();
				} else if (show && dealer.points > 21) {
					_this.winner = 'you';
					await _this.endRound();
				}
				if (_this.round && you.uinput) {
					// random chance to draw again
					if (dealer.points < you.points && (dealer.points < 15 || Math.random() >= 0.8)) await draw(1);
					else {
						if (dealer.points > 21) _this.winner = 'you';
						else if (dealer.points > you.points) _this.winner = 'dealer';
						else if (you.points > dealer.points) _this.winner = 'you';
						else _this.winner = 'tie';
						await _this.endRound();
					}
				}

				return json.success;
			}
			if (!you.uinput || dealer.points < you.points) await draw(num);
			else if (dealer.points > you.points) {
				_this.winner = 'dealer';
				await _this.endRound();
			} else {
				_this.winner = 'tie';
				await _this.endRound();
			}

			return;
		}
	}
});

function calculateCardPoints(cards) {
	return cards.map(card => card.value).sort(function(a, b) {
		if (a === 'ACE') return 1;
		else if (b === 'ACE') return -1;
		return a[1] - b[1];
	}).reduce(function(a, b) {
		return cardValue(a, this) + cardValue(b, this);
	}, 0);
}

function cardValue(value, points) {
	const faces = ['KING', 'QUEEN', 'JACK'];
	if (faces.includes(value)) return 10;
	if (value == 'ACE') {
		if (points + 11 <= 21) return 11;
		else return 1;
	}

	return parseInt(value);
}

function sleep(duration) {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve()
		}, duration * 1000)
	})
}
