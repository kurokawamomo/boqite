import { sql } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

export type AttemptInput = {
	questionId: string;
	correct: boolean;
	firstTry: boolean;
};

export type CompleteLessonInput = {
	nodeId: string;
	/** 正答率 0-100 */
	result: number;
	attempts: AttemptInput[];
};

/**
 * ノードクリア報告を反映する。
 * best_result は既存値との最大値を維持、cleared_at は初回クリア時刻を保持する。
 */
export async function completeLesson({ nodeId, result, attempts: attemptInputs }: CompleteLessonInput) {
	await db
		.insert(schema.nodeProgress)
		.values({ nodeId, bestResult: result, clearedAt: new Date() })
		.onConflictDoUpdate({
			target: schema.nodeProgress.nodeId,
			set: {
				bestResult: sql`greatest(coalesce(${schema.nodeProgress.bestResult}, 0), excluded.best_result)`,
				clearedAt: sql`coalesce(${schema.nodeProgress.clearedAt}, excluded.cleared_at)`
			}
		});

	if (attemptInputs.length > 0) {
		await db.insert(schema.attempts).values(
			attemptInputs.map((a) => ({
				questionId: a.questionId,
				correct: a.correct,
				firstTry: a.firstTry
			}))
		);
	}
}
