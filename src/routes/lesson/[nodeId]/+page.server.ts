import { error, redirect } from '@sveltejs/kit';
import {
	ContentValidationError,
	MAIN_COURSE,
	getCourseOfNode,
	getCourseSummary,
	getNodeQuestions,
	loadContent
} from '$lib/server/content/loader';
import { getAllNodeProgress } from '$lib/server/progress/getProgress';
import { deriveMapUnits } from '$lib/course';
import { getCourseLocks } from '$lib/server/content/courseAccess';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const courseInfo = getCourseOfNode(params.nodeId) ?? MAIN_COURSE;
		const [course, progressRows] = await Promise.all([
			getCourseSummary(courseInfo.id),
			getAllNodeProgress()
		]);
		const clearedNodeIds = new Set(
			progressRows.filter((p) => p.clearedAt !== null).map((p) => p.nodeId)
		);
		// まだ開いていないコースのレッスンは、URL を直接開いても入れない
		if (getCourseLocks(clearedNodeIds)[courseInfo.id]) throw redirect(303, '/');
		const units = deriveMapUnits(course, clearedNodeIds, { sequential: courseInfo.persistProgress });
		const status = units.flatMap((u) => u.nodes).find((n) => n.id === params.nodeId)?.status;

		// ロック中ノードへの直接URL遷移は無効化する（マップの解放順を保証する）
		if (status === 'locked') throw redirect(303, '/');

		const node = await getNodeQuestions(params.nodeId);
		if (!node) throw error(404, `node not found: ${params.nodeId}`);
		// 新出勘定科目カード（NewAccountCard）表示用。正解データは含まないので漏洩リスクはない
		const { accounts } = loadContent();
		return { node, accounts, course: courseInfo };
	} catch (e) {
		if (e instanceof ContentValidationError) throw error(500, e.message);
		throw e;
	}
};
