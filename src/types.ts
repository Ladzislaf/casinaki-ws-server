export type ActiveBet = {
	playerEmail: string;
	bet: number;
	choice: 0 | 1 | 2;
};

export type RouletteResult = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export type WinChoice = 0 | 1 | 2 | -1;
