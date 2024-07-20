import { ActiveBet, RouletteResult, WinChoice } from './types';

export function generateRouletteResult(): RouletteResult {
	return Math.floor(Math.random() * 15) as RouletteResult;
}

export function calcWinChoice(rouletteResult: RouletteResult): WinChoice {
	const possibleGameResults = [
		[0], // zero
		[1, 2, 3, 4, 5, 6, 7], // red
		[8, 9, 10, 11, 12, 13, 14], // black
	];

	for (const choice of possibleGameResults) {
		if (choice.includes(rouletteResult)) {
			return possibleGameResults.indexOf(choice) as WinChoice;
		}
	}

	return -1;
}

export async function fetchGameAPI(playerEmail: string, bet: number, isWon: boolean, isZeroBet: boolean) {
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

export async function calcResults(bets: ActiveBet[], winChoice: WinChoice) {
	for (const bet of bets) {
		const isZeroBet = bet.choice === 0;

		if (bet.choice === winChoice) {
			await fetchGameAPI(bet.playerEmail, bet.bet, true, isZeroBet);
		} else {
			await fetchGameAPI(bet.playerEmail, bet.bet, false, isZeroBet);
		}
	}
}
