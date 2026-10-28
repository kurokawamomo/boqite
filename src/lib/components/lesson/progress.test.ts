import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { submitLessonProgress } from './progress';
import type { LessonSummary } from './session';

const summary: LessonSummary = { attempts: [{ questionId: 'q1', correct: true, firstTry: true }], result: 100 };

describe('submitLessonProgress', () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it('returns true on first successful response', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
		globalThis.fetch = fetchMock;

		const ok = await submitLessonProgress('n1', summary, { retries: 2, retryDelayMs: 0 });

		expect(ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('retries after a failed response and succeeds', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(null, { status: 500 }))
			.mockResolvedValueOnce(new Response(null, { status: 200 }));
		globalThis.fetch = fetchMock;

		const ok = await submitLessonProgress('n1', summary, { retries: 2, retryDelayMs: 0 });

		expect(ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('retries after a network error (rejected fetch) and succeeds', async () => {
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(new TypeError('network error'))
			.mockResolvedValueOnce(new Response(null, { status: 200 }));
		globalThis.fetch = fetchMock;

		const ok = await submitLessonProgress('n1', summary, { retries: 2, retryDelayMs: 0 });

		expect(ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('returns false when every attempt fails (progress is not silently dropped)', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
		globalThis.fetch = fetchMock;

		const ok = await submitLessonProgress('n1', summary, { retries: 2, retryDelayMs: 0 });

		expect(ok).toBe(false);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it('sends nodeId/result/attempts as the request body', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
		globalThis.fetch = fetchMock;

		await submitLessonProgress('b3-u01-n1', summary, { retries: 0 });

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('/api/progress/lesson-complete');
		expect(JSON.parse(init.body)).toEqual({
			nodeId: 'b3-u01-n1',
			result: summary.result,
			attempts: summary.attempts
		});
	});
});
