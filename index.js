import { Server } from 'socket.io';

const io = new Server(5000, {
	cors: {
		origin: ['http://localhost:3000'],
	},
});

const ROULETTE_INTERVAL = 16 * 1000;
var countdown = Date.now() + ROULETTE_INTERVAL;

io.on('connection', (socket) => {
	console.log(`socket ${socket.id} connected`);

	socket.on('rouletteCountdown', () => {
		socket.emit('rouletteCountdown', countdown);
	});

	socket.on('disconnect', (reason) => {
		console.log(`socket ${socket.id} disconnected due to ${reason}`);
	});
});

setInterval(() => {
	const rouletteResult = Math.floor(Math.random() * 15);
	countdown = Date.now() + ROULETTE_INTERVAL;

	io.emit('rouletteResult', Number(rouletteResult), ROULETTE_INTERVAL);
}, ROULETTE_INTERVAL);
