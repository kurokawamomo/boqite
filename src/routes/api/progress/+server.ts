import { json } from '@sveltejs/kit';
import { getAllNodeProgress } from '$lib/server/progress/getProgress';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const progress = await getAllNodeProgress();
	return json(progress);
};
