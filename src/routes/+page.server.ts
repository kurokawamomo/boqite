import { getCourseSummary, listCourses, resolveCourse } from '$lib/server/content/loader';
import { getAllNodeProgress } from '$lib/server/progress/getProgress';
import { getStreakSummary } from '$lib/server/streak/service';
import { deriveMapUnits } from '$lib/course';
import { todayInJst } from '$lib/streak/date';
import { getCourseLocks } from '$lib/server/content/courseAccess';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const course = resolveCourse(url.searchParams.get('course'));
	const [summary, progressRows, streak] = await Promise.all([
		getCourseSummary(course.id),
		getAllNodeProgress(),
		getStreakSummary(todayInJst())
	]);

	const clearedNodeIds = new Set(
		progressRows.filter((p) => p.clearedAt !== null).map((p) => p.nodeId)
	);

	// まだ開いていないコースの URL を直接開かれたら、本体のコースに戻す
	const locks = getCourseLocks(clearedNodeIds);
	if (locks[course.id]) throw redirect(303, '/');

	return {
		units: deriveMapUnits(summary, clearedNodeIds, { sequential: course.persistProgress }),
		courses: listCourses().map((c) => ({ ...c, locked: locks[c.id] ?? false })),
		courseId: course.id,
		streak
	};
};
