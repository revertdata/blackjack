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
			bet: 0,
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
			this.deal();

			return;
		},
		newRound: function() {
			this.round = true;
			this.winner = '';
			this.dealer = {
				initPoints: 0,
				points: 0,
				cards: [],
				show: false,
				blackjack: false
			};
			this.you = {
				bet: 0,
				points: 0,
				cards: [],
				blackjack: false,
				uinput: false
			};
			this.deal();
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
		},
		deal: function() {
			this.round = true;
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
				this.stand(1, true, true);
			} else if (you.points > 21) {
				this.winner = 'dealer';
				this.round = false;
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
					dealer.cards.push(card);
					if (!show && dealer.cards.length > 1) dealer.initPoints += cardValue(card.value, dealer.initPoints);
				}
				dealer.points = calculateCardPoints(dealer.cards);
				if (dealer.points === 21) {
					dealer.blackjack = true;
					_this.winner = 'dealer';
					_this.round = false;
				} else if (dealer.points > 21) {
					_this.winner = 'you';
					_this.round = false;
				}
				if (_this.round && you.uinput) {
					// random chance to draw again
					if (dealer.points < 15 || Math.random() >= 0.8) await draw(1);
					else {
						_this.round = false;
						console.log(dealer.points, you.points);
					}
				}

				return json.success;
			}
			await draw(num);

			return;
		}
	}
});

function calculateCardPoints(cards) {
	let points = 0;
	for (card of cards) {
		points += cardValue(card.value, points);
	}

	return points;
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
