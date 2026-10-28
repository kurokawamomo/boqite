import { error, json } from '@sveltejs/kit';
import { ContentValidationError, getNodeQuestions } from '$lib/server/content/loader';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const node = await getNodeQuestions(params.nodeId);
		if (!node) throw error(404, `node not found: ${params.nodeId}`);
		return json(node);
	} catch (e) {
		if (e instanceof ContentValidationError) {
			throw error(500, e.message);
		}
		throw e;
	}
};
