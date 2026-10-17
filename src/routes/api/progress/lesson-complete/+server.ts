import { error, json } from '@sveltejs/kit';
import { getCourseOfNode } from '$lib/server/content/loader';
import { getCourseLocks } from '$lib/server/content/courseAccess';
import { getAllNodeProgress } from '$lib/server/progress/getProgress';
import { completeLesson, type AttemptInput } from '$lib/server/progress/completeLesson';
import type { RequestHandler } from './$types';

function isAttemptInput(value: unknown): value is AttemptInput {
	if (typeof value !== 'object' || value === null) return false;
	const a = value as Record<string, unknown>;
	return (
		typeof a.questionId === 'string' &&
		typeof a.correct === 'boolean' &&
		typeof a.firstTry === 'boolean'
	);
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);

	if (
		typeof body?.nodeId !== 'string' ||
		typeof body?.result !== 'number' ||
		body.result < 0 ||
		body.result > 100 ||
		!Array.isArray(body?.attempts) ||
		!body.attempts.every(isAttemptInput)
	) {
		throw error(400, 'invalid request body');
	}

	// 進捗を保存しないコースは node_progress / attempts に何も書かない
	if (getCourseOfNode(body.nodeId)?.persistProgress === false) {
		return json({ ok: true, persisted: false });
	}

	// まだ開いていないコースの進捗は記録しない
	const course = getCourseOfNode(body.nodeId);
	if (course) {
		const cleared = new Set((await getAllNodeProgress()).filter((p) => p.clearedAt !== null).map((p) => p.nodeId));
		if (getCourseLocks(cleared)[course.id]) throw error(403, 'course is locked');
	}

	await completeLesson({
		nodeId: body.nodeId,
		result: body.result,
		attempts: body.attempts
	});

	return json({ ok: true });
};
