import { Redis } from 'ioredis';
import { Server } from 'socket.io';
import 'dotenv/config';

const io = new Server(5000, {
	cors: {
		origin: [process.env.CLIENT_URL],
	},
});
const redis = new Redis(process.env.REDIS_URL);

const ROULETTE_INTERVAL = 26 * 1000;
var countdown = Date.now() + ROULETTE_INTERVAL;

const lastSpins = [];
const activeBets = [];
// todo activebets to redis
// const activeBets = JSON.parse(await redis.get('activeBets')) || [];
// activeBets.push({ playerEmail, bet });
// await redis.set(`activeBets`, JSON.stringify(activeBets));

io.on('connection', (socket) => {
	console.log(`socket ${socket.id} connected`);
	socket.emit('rouletteCountdown', countdown);
	socket.emit('getLastSpins', lastSpins.slice(-10));

	socket.on('join', (playerEmail, alreadyJoinedCb) => {
		console.log(`player ${playerEmail} (${socket.id}) joined`);

		for (let i = 0; i < activeBets.length; i++) {
			if (activeBets[i].playerEmail === playerEmail) {
				alreadyJoinedCb();
				activeBets[i].socket = socket;
				return;
			}
		}
	});

	socket.on('rouletteCountdown', () => {
		socket.emit('rouletteCountdown', countdown);
	});

	socket.on('makeBet', async ({ playerEmail, bet, choice }) => {
		if (playerEmail && bet) activeBets.push({ socket, playerEmail, bet, choice });
	});

	socket.on('disconnect', (reason) => {
		console.log(`socket ${socket.id} disconnected due to ${reason}`);
	});
});

setInterval(async () => {
	countdown = Date.now() + ROULETTE_INTERVAL;

	const rouletteResult = Math.floor(Math.random() * 15);
	lastSpins.push(rouletteResult);

	io.emit('rouletteResult', Number(rouletteResult), ROULETTE_INTERVAL);

	if (rouletteResult === 0) calculateResults(activeBets, 0);
	else if (rouletteResult > 0 && rouletteResult < 8) calculateResults(activeBets, 1);
	else if (rouletteResult > 7 && rouletteResult < 15) calculateResults(activeBets, 2);
	activeBets.length = 0;
}, ROULETTE_INTERVAL);

function calculateResults(bets, winChoice) {
	for (const bet of bets) {
		if (bet.choice === winChoice) {
			const coeff = bet.choice === 0 ? 15 : 2;
			bet.socket.emit('won', bet.bet * coeff);
			fetchGameAPI(bet.playerEmail, bet.bet, true, bet.choice === 0);
		} else {
			fetchGameAPI(bet.playerEmail, bet.bet, false, bet.choice === 0);
		}
	}
}

async function fetchGameAPI(playerEmail, bet, isWon, isZeroBet) {
	return fetch('http://localhost:3000/api/game/roulette', {
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
