import { db, schema } from '$lib/server/db';

/** マップの状態復元用に全ノードの進捗を返す */
export async function getAllNodeProgress() {
	return db.select().from(schema.nodeProgress);
}
