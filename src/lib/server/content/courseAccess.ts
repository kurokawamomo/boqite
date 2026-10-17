import { isCourseUnlocked } from '$lib/course/unlock';
import { getCourseSummary, listCourses } from './loader';

/** コースごとに、いま開いているか。進捗（クリア済みノード）から決める */
export function getCourseLocks(clearedNodeIds: ReadonlySet<string>): Record<string, boolean> {
	const courses = listCourses();
	const summaries = courses.map((c) => getCourseSummary(c.id));
	return Object.fromEntries(courses.map((c) => [c.id, !isCourseUnlocked(c.id, summaries, clearedNodeIds)]));
}
