import { describe, expect, it } from 'vitest';
import type { CourseSummary } from '$lib/content/course';
import { deriveMapUnits } from './courseView';

const course: CourseSummary = {
	units: [
		{
			id: 'fx-u1',
			course: 'fx-demo',
			chapter: 1,
			title: '架空の章',
			nodes: [
				{ id: 'fx-n1', title: 'ひとつめ', kind: 'lesson', questionCount: 3 },
				{ id: 'fx-n2', title: 'ふたつめ', kind: 'lesson', questionCount: 3 },
				{ id: 'fx-n3', title: 'みっつめ', kind: 'lesson', questionCount: 3 }
			]
		}
	]
};

const statuses = (cleared: string[], options?: { sequential?: boolean }) =>
	deriveMapUnits(course, new Set(cleared), options)[0].nodes.map((n) => n.status);

describe('deriveMapUnits', () => {
	it('既定は順番に解放する（クリア済 → 現在地 → ロック）', () => {
		expect(statuses(['fx-n1'])).toEqual(['cleared', 'current', 'locked']);
	});

	it('sequential=false は全ノードが open で、クリア記録があっても変わらない', () => {
		expect(statuses([], { sequential: false })).toEqual(['open', 'open', 'open']);
		expect(statuses(['fx-n1'], { sequential: false })).toEqual(['open', 'open', 'open']);
	});
});

describe('deriveMapUnits: 直前がクリア済みなら選べる', () => {
	const status = (cleared: string[]) =>
		deriveMapUnits(course, new Set(cleared)).flatMap((u) => u.nodes.map((n) => n.status));

	it('最初の未クリアは current、直前がクリア済みの未クリアは open、直前が未クリアなら locked', () => {
		expect(status([])).toEqual(['current', 'locked', 'locked']);
		expect(status(['fx-n1'])).toEqual(['cleared', 'current', 'locked']);
		expect(status(['fx-n2'])).toEqual(['current', 'cleared', 'open']);
		expect(status(['fx-n1', 'fx-n3'])).toEqual(['cleared', 'current', 'cleared']);
	});
});
