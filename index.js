import { Redis } from 'ioredis';
import { Server } from 'socket.io';
import 'dotenv/config';

const io = new Server(5000, {
	cors: {
		origin: [process.env.CLIENT_URL, process.env.CLIENT_URL_DEV],
	},
});
const redis = new Redis(process.env.REDIS_URL);

const ROULETTE_INTERVAL = 34 * 1000;
const availableChoices = [0, 1, 2];

var countdown = Date.now();

const lastSpins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const activeBets = [];
// todo activebets to redis
// const activeBets = JSON.parse(await redis.get('activeBets')) || [];
// activeBets.push({ playerEmail, bet });
// await redis.set(`activeBets`, JSON.stringify(activeBets));

io.on('connection', (socket) => {
	console.log(`socket ${socket.id} connected`);
	socket.emit('rouletteCountdown', countdown);
	socket.emit('lastSpins', lastSpins);
	socket.emit('activeBets', activeBets);

	socket.on('makeBet', (newBet) => {
		if (newBet.playerEmail && newBet.bet && availableChoices.includes(newBet.choice)) {
			let isActiveBet = false;

			for (let i = 0; i < activeBets.length; i++) {
				if (activeBets[i].playerEmail === newBet.playerEmail && activeBets[i].choice === newBet.choice) {
					activeBets[i].bet += newBet.bet;
					isActiveBet = true;
					break;
				}
			}

			if (!isActiveBet) {
				activeBets.push(newBet);
			}

			io.emit('newBet', newBet);
		}
	});

	socket.on('clearBet', (betToClear) => {
		if (betToClear.playerEmail && availableChoices.includes(betToClear.choice)) {
			for (let i = 0; i < activeBets.length; i++) {
				if (activeBets[i].playerEmail === betToClear.playerEmail && activeBets[i].choice === betToClear.choice) {
					io.emit('clearBet', activeBets.splice(i, 1)[0]);
					break;
				}
			}
		}
	});

	socket.on('getLastSpins', () => {
		socket.emit('lastSpins', lastSpins);
	});

	socket.on('rouletteCountdown', (countdownCb) => {
		countdownCb((ROULETTE_INTERVAL - (Date.now() - countdown) - 300) / 1000);
	});

	socket.on('disconnect', (reason) => {
		console.log(`socket ${socket.id} disconnected due to ${reason}`);
	});
});

// todo rouletteResult emitting after bets are closed -> gameState on server
setInterval(async () => {
	const rouletteResult = Math.floor(Math.random() * 15);

	lastSpins.unshift(rouletteResult);
	lastSpins.length > 10 && lastSpins.pop();

	io.emit('rouletteResult', rouletteResult);
	countdown = Date.now();

	const winChoice = calcWinChoice(rouletteResult);
	await calcResults(activeBets, winChoice);

	activeBets.length = 0;
}, ROULETTE_INTERVAL);

async function calcResults(bets, winChoice) {
	for (const bet of bets) {
		const isZeroBet = bet.choice === 0;

		if (bet.choice === winChoice) {
			await fetchGameAPI(bet.playerEmail, bet.bet, true, isZeroBet);
		} else {
			await fetchGameAPI(bet.playerEmail, bet.bet, false, isZeroBet);
		}
	}
}

function calcWinChoice(rouletteResult) {
	const possibleGameResults = [
		[0], // zero
		[1, 2, 3, 4, 5, 6, 7], // red
		[8, 9, 10, 11, 12, 13, 14], // black
	];

	for (const choice of possibleGameResults) {
		if (choice.includes(rouletteResult)) {
			return possibleGameResults.indexOf(choice);
		}
	}

	return -1;
}

async function fetchGameAPI(playerEmail, bet, isWon, isZeroBet) {
	return fetch(process.env.SERVER_API_URL + '/api/game/roulette', {
		method: 'POST',
		headers: {
			'Content-Type': 'Application/json',
		},
		body: JSON.stringify({ playerEmail, bet, isWon, isZeroBet }),
	})
		.then((res) => {
			return res.json();
		})
		.then((data) => {
			console.log('Success:', data);
		})
		.catch((error) => {
			console.error('Error:', error);
		});
}
