import 'dotenv/config';
import { Redis } from 'ioredis';
import { Server } from 'socket.io';
import { ActiveBet } from './types';
import { calcResults, calcWinChoice, generateRouletteResult } from './utils';

const io = new Server(5000, {
	cors: {
		origin: [process.env.CLIENT_URL as string, process.env.CLIENT_URL_DEV as string],
	},
});
const redis = new Redis(process.env.REDIS_URL as string);

const ROULETTE_INTERVAL = 34 * 1000;
const availableChoices = [0, 1, 2];

var countdown = Date.now();

const lastSpins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const activeBets: ActiveBet[] = [];

io.on('connection', (socket) => {
	console.log(`socket ${socket.id} connected`);
	socket.emit('rouletteCountdown', countdown);
	socket.emit('lastSpins', lastSpins);
	socket.emit('activeBets', activeBets);

	socket.on('makeBet', (newBet: ActiveBet) => {
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
	const rouletteResult = generateRouletteResult();

	lastSpins.unshift(rouletteResult);
	lastSpins.length > 10 && lastSpins.pop();

	io.emit('rouletteResult', rouletteResult);
	countdown = Date.now();

	const winChoice = calcWinChoice(rouletteResult);
	await calcResults(activeBets, winChoice);

	activeBets.length = 0;
}, ROULETTE_INTERVAL);

console.log('Server started.');
