import { afterEach, describe, expect, it, vi } from 'vitest';
import { postJsonWithRetry } from './postJsonWithRetry';

describe('postJsonWithRetry', () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it('returns the parsed body on first success', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
		globalThis.fetch = fetchMock;

		const result = await postJsonWithRetry('/x', { a: 1 }, { retries: 2, retryDelayMs: 0 });

		expect(result).toEqual({ ok: true });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('retries a failed response and returns the body on eventual success', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(null, { status: 500 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
		globalThis.fetch = fetchMock;

		const result = await postJsonWithRetry('/x', {}, { retries: 2, retryDelayMs: 0 });

		expect(result).toEqual({ ok: true });
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('retries a network error and returns the body on eventual success', async () => {
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(new TypeError('network error'))
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
		globalThis.fetch = fetchMock;

		const result = await postJsonWithRetry('/x', {}, { retries: 2, retryDelayMs: 0 });

		expect(result).toEqual({ ok: true });
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('returns null when every attempt fails', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
		globalThis.fetch = fetchMock;

		const result = await postJsonWithRetry('/x', {}, { retries: 2, retryDelayMs: 0 });

		expect(result).toBeNull();
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it('sends the body as JSON with content-type header', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
		globalThis.fetch = fetchMock;

		await postJsonWithRetry('/x', { nodeId: 'n1' }, { retries: 0 });

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('/x');
		expect(init.headers).toEqual({ 'content-type': 'application/json' });
		expect(JSON.parse(init.body)).toEqual({ nodeId: 'n1' });
	});
});
