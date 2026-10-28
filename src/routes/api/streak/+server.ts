import { json } from '@sveltejs/kit';
import { todayInJst } from '$lib/streak/date';
import { getStreakSummary } from '$lib/server/streak/service';
import type { RequestHandler } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const GET: RequestHandler = async ({ url }) => {
	// クライアントが自身のローカル日付を ?date= で送る想定。省略時のみ JST 基準の
	// 既定値にフォールバックする（UTC 固定だと朝 0-9 時のアクセスが前日扱いになるため）。
	const today = url.searchParams.get('date') ?? todayInJst();

	if (!DATE_RE.test(today)) {
		return json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
	}

	const summary = await getStreakSummary(today);
	return json(summary);
};
