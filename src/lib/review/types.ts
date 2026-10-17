/** attempts テーブル相当の正誤履歴 1 件（初回回答のみ記録される想定） */
export type ReviewAttemptRecord = {
	questionId: string;
	correct: boolean;
	firstTry: boolean;
	answeredAt: string;
};

export type SelectReviewQuestionsOptions = {
	/** 出力する問題数 */
	count: number;
	/** 弱点優先 : 既習ランダム の比率（弱点側の割合、0-1）。既定 0.7（目安 7:3） */
	weakRatio?: number;
	/** 再現性のためのPRNGシード。省略時は呼び出し時刻から生成する */
	seed?: number;
};
