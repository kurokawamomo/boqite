import { describe, expect, it } from 'vitest';
import { formatDuration } from './session';

describe('formatDuration', () => {
	it('formats seconds under a minute', () => {
		expect(formatDuration(7)).toBe('0:07');
	});

	it('formats minutes and seconds', () => {
		expect(formatDuration(125)).toBe('2:05');
	});

	it('rounds fractional seconds', () => {
		expect(formatDuration(59.6)).toBe('1:00');
	});

	it('clamps negative values to zero', () => {
		expect(formatDuration(-5)).toBe('0:00');
	});
});
