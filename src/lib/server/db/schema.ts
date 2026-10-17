import {
	boolean,
	date,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp
} from 'drizzle-orm/pg-core';

/**
 * 進捗系スキーマ（仕様書 6章）。単一ユーザー・認証なし。
 * 問題コンテンツはリポジトリ内 JSON 側に持ち、DB には入れない。
 */

/** ストリークをその日どう維持したか */
export const streakStatus = pgEnum('streak_status', ['cleared', 'frozen']);

/** 単一ユーザーの現在状態。id = 1 の 1 行のみを使う */
export const userState = pgTable('user_state', {
	id: integer('id').primaryKey().default(1),
	streakCount: integer('streak_count').notNull().default(0),
	/** 通常枠のフリーズ保有数（前回補充から10日以上クリアした日から確率で +1・上限 2・自動消費） */
	freezeCount: integer('freeze_count').notNull().default(0),
	/** ボーナス枠のフリーズ残数（0-3）。100 日到達で 3 個付与、以後 100 日ごとに 3 までリフィル */
	freezeBonusCount: integer('freeze_bonus_count').notNull().default(0),
	/** 100 日到達済みフラグ。一度 true になったら維持（所持上限 2 → 5） */
	freezeBonusUnlocked: boolean('freeze_bonus_unlocked').notNull().default(false),
	/** 前回の通常枠補充から実際にクリアした日数（フリーズ日は数えない）。上限で補充できない間は増え続ける */
	clearsSinceRefill: integer('clears_since_refill').notNull().default(0),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

/** 日ごとのストリーク成立記録。日付判定はレッスンクリア時点 */
export const streakLogs = pgTable('streak_logs', {
	date: date('date').primaryKey(),
	status: streakStatus('status').notNull()
});

/** ノード（= 1 レッスン）のクリア状況 */
export const nodeProgress = pgTable('node_progress', {
	nodeId: text('node_id').primaryKey(),
	clearedAt: timestamp('cleared_at', { withTimezone: true }),
	/** 最高成績。初回回答ベースの正答率（0-100） */
	bestResult: integer('best_result')
});

/** 復習エンジンの弱点重み用。記録するのは初回回答のみ */
export const attempts = pgTable('attempts', {
	id: serial('id').primaryKey(),
	questionId: text('question_id').notNull(),
	correct: boolean('correct').notNull(),
	firstTry: boolean('first_try').notNull(),
	answeredAt: timestamp('answered_at', { withTimezone: true }).notNull().defaultNow()
});

export type UserState = typeof userState.$inferSelect;
export type StreakLog = typeof streakLogs.$inferSelect;
export type NodeProgress = typeof nodeProgress.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
