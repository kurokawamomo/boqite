/** レッスンセッションの進捗記録（DB永続化はルート側の責務）。 */
export type AttemptRecord = {
	questionId: string;
	correct: boolean;
	/** 初回回答のみ記録するため常に true */
	firstTry: boolean;
};

export type LessonSummary = {
	attempts: AttemptRecord[];
	/** 初回正答率 0-100 */
	result: number;
};

/** 所要時間を "m:ss" 形式に整形（クリア画面表示用） */
export function formatDuration(totalSeconds: number): string {
	const s = Math.max(0, Math.round(totalSeconds));
	const minutes = Math.floor(s / 60);
	const seconds = s % 60;
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
