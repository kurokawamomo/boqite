export type DayStatus = 'cleared' | 'frozen';

export type StreakLogEntry = {
	date: string; // YYYY-MM-DD
	status: DayStatus;
};

export type StreakState = {
	/** 本日時点で有効なストリーク日数 */
	streakCount: number;
	/** 導出中に消費されたフリーズ数（要消費フリーズ） */
	freezesConsumed: number;
	/** 消費後の残フリーズ数 */
	freezesRemaining: number;
	/** フリーズ枯渇によりストリークが 0 にリセットされたか */
	broken: boolean;
};
