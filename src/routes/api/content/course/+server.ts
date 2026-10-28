import { error, json } from '@sveltejs/kit';
import { ContentValidationError, getCourseSummary, resolveCourse } from '$lib/server/content/loader';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const summary = await getCourseSummary(resolveCourse(url.searchParams.get('course')).id);
		return json(summary);
	} catch (e) {
		if (e instanceof ContentValidationError) {
			throw error(500, e.message);
		}
		throw e;
	}
};
