import { describe, expect, it } from 'vitest';
import { importDrafts, type UnitJson } from './importDrafts';

const accounts = new Set(['現金', '売上', '売掛金', '仕入']);

const unit = (id: string, chapter: number, nodeIds: string[], questions: Record<string, unknown[]> = {}): UnitJson => ({
	unit: { id, course: 'boki3', chapter, title: id },
	nodes: nodeIds.map((n) => ({ id: n, title: n, questions: questions[n] ?? [] }))
});

const journal = (id: string, amountCredit = 100, extra: Record<string, unknown> = {}) => ({
	id,
	source: 'generated',
	sanitized: true,
	stimulus: { text: '商品を売って現金を受け取った。仕訳しよう。' },
	task: {
		kind: 'journal',
		debit: [{ account: '現金', amount: 100 }],
		credit: [{ account: '売上', amount: amountCredit }],
		accountOptions: ['現金', '売上', '仕入'],
		amountInput: 'numpad'
	},
	explanation: '現金が増えて借方、売上が増えて貸方。',
	...extra
});

const base = () => [unit('x1', 1, ['x1-n1', 'x1-n2']), unit('x2', 2, ['x2-n1'])];
const questionsOf = (u: UnitJson, node = 0) => u.nodes[node].questions as Array<Record<string, unknown>>;
const draft = (data: unknown) => [{ file: 'd.json', data }];

describe('importDrafts', () => {
	it('検査に通る問題を、ノードに取り込む', () => {
		const r = importDrafts(base(), draft({ 'x1-n1': [journal('x1-n1-q1')] }), accounts);
		expect(r.rejected).toEqual([]);
		expect(r.accepted).toEqual(['x1-n1-q1']);
		expect(r.units[0].nodes[0].questions).toHaveLength(1);
	});

	it('元の content は書き換えない', () => {
		const units = base();
		importDrafts(units, draft({ 'x1-n1': [journal('x1-n1-q1')] }), accounts);
		expect(units[0].nodes[0].questions).toEqual([]);
	});

	it('同じ ID の既存問題は置き換わり、何度流しても結果は同じ', () => {
		const once = importDrafts(base(), draft({ 'x1-n1': [journal('x1-n1-q1')] }), accounts);
		const twice = importDrafts(once.units, draft({ 'x1-n1': [journal('x1-n1-q1')] }), accounts);
		expect(twice.units).toEqual(once.units);
	});

	it('生成器の問題は残し、手書きの問題の後ろに置く', () => {
		const generated = journal('x1-n1-g-s1', 100, { generated: { generator: 'g', seed: 1 } });
		const units = [unit('x1', 1, ['x1-n1'], { 'x1-n1': [generated] })];
		const r = importDrafts(units, draft({ 'x1-n1': [journal('x1-n1-q1')] }), accounts);
		expect(questionsOf(r.units[0]).map((q) => q.id)).toEqual(['x1-n1-q1', 'x1-n1-g-s1']);
	});

	it('check-content の検査に通らない問題は弾いて、理由を返す', () => {
		const r = importDrafts(
			base(),
			draft({ 'x1-n1': [journal('x1-n1-q1', 90), journal('x1-n1-q2')] }),
			accounts
		);
		expect(r.accepted).toEqual(['x1-n1-q2']);
		expect(r.rejected).toHaveLength(1);
		expect(r.rejected[0].questionId).toBe('x1-n1-q1');
		expect(r.rejected[0].reasons.join('\n')).toContain('journal-balance');
	});

	it('単独で読めない問題文を弾く', () => {
		const q = journal('x1-n1-q1');
		q.stimulus.text = '上記の取引を仕訳しよう。';
		const r = importDrafts(base(), draft({ 'x1-n1': [q] }), accounts);
		expect(r.rejected[0].reasons.join('\n')).toContain('stimulus-not-standalone');
	});

	it('マスタにない科目と、形式の不備を弾く', () => {
		const unknown = journal('x1-n1-q1');
		unknown.task.accountOptions = ['現金', '売上', '謎勘定'];
		const broken = { id: 'x1-n1-q2', stimulus: { text: 'a' } };
		const r = importDrafts(base(), draft({ 'x1-n1': [unknown, broken] }), accounts);
		expect(r.accepted).toEqual([]);
		expect(r.rejected.map((x) => x.reasons.join('\n')).join('\n')).toContain('journal-unknown-account');
		expect(r.rejected.find((x) => x.questionId === 'x1-n1-q2')?.reasons[0]).toContain('形式');
	});

	it('ID の接頭辞が違う・ノードがない・他ノードと衝突する問題を弾く', () => {
		const other = journal('x1-n1-q9');
		const units = [unit('x1', 1, ['x1-n1', 'x1-n2'], { 'x1-n2': [other] })];
		const r = importDrafts(
			units,
			draft({ 'x1-n1': [journal('zzz-q1'), journal('x1-n1-q9')], 'nope': [journal('nope-q1')] }),
			accounts
		);
		const why = r.rejected.map((x) => x.reasons.join('|')).join('\n');
		expect(why).toContain('で始まっていません');
		expect(why).toContain('このノード ID は content にありません');
		expect(why).toContain('衝突');
		expect(r.accepted).toEqual([]);
	});

	it('下書きの newAccounts は無視し、コースの並び順で最初に使った問題に付ける', () => {
		const r = importDrafts(
			base(),
			draft({
				'x2-n1': [journal('x2-n1-q1', 100, { newAccounts: ['仕入'] })],
				'x1-n1': [journal('x1-n1-q1', 100, { newAccounts: ['仕入'] }), journal('x1-n1-q2')]
			}),
			accounts
		);
		const q1 = questionsOf(r.units[0]).find((q) => q.id === 'x1-n1-q1');
		const q2 = questionsOf(r.units[0]).find((q) => q.id === 'x1-n1-q2');
		const later = questionsOf(r.units[1])[0];
		expect(q1?.newAccounts).toEqual(['現金', '売上']);
		expect(q2?.newAccounts).toBeUndefined();
		expect(later.newAccounts).toBeUndefined();
	});

	it('トップレベルがオブジェクトでない下書きファイルを報告する', () => {
		const r = importDrafts(base(), draft([]), accounts);
		expect(r.rejected[0].nodeId).toBe('(file)');
	});
});

describe('importDrafts（コースをまたぐ）', () => {
	const course = (id: string, chapter: number, nodeId: string, questions: unknown[] = []): UnitJson => ({
		unit: { id: `${id}-u${chapter}`, course: id, chapter, title: id },
		nodes: [{ id: nodeId, title: nodeId, questions }]
	});
	const order = ['boki3', 'boki2'];

	it('取り込み先のコース以外のノードへの下書きは弾く', () => {
		const units = [course('boki3', 1, 'b3-n1'), course('boki2', 1, 'b2-n1')];
		const r = importDrafts(
			units,
			draft({ 'b3-n1': [journal('b3-n1-q1')], 'b2-n1': [journal('b2-n1-q1')] }),
			accounts,
			{ nodeIdPrefix: 'b2-', courseOrder: order }
		);
		expect(r.accepted).toEqual(['b2-n1-q1']);
		expect(r.rejected).toHaveLength(1);
		expect(r.rejected[0].nodeId).toBe('b3-n1');
		expect(r.rejected[0].reasons[0]).toContain('取り込み先のコース');
	});

	it('先のコースで使った科目は、あとのコースで初出にしない', () => {
		const first = journal('b3-n1-q1');
		const units = [course('boki3', 1, 'b3-n1', [first]), course('boki2', 1, 'b2-n1')];
		const r = importDrafts(units, draft({ 'b2-n1': [journal('b2-n1-q1')] }), accounts, {
			nodeIdPrefix: 'b2-',
			courseOrder: order
		});
		expect(questionsOf(r.units[0], 0)[0].newAccounts).toEqual(['現金', '売上']);
		expect(questionsOf(r.units[1], 0)[0].newAccounts).toBeUndefined();
	});

	it('章番号が同じでも、コースの順に数える', () => {
		const units = [course('boki2', 1, 'b2-n1'), course('boki3', 1, 'b3-n1')];
		const r = importDrafts(units, draft({ 'b2-n1': [journal('b2-n1-q1')], 'b3-n1': [journal('b3-n1-q1')] }), accounts, {
			courseOrder: order
		});
		const b3 = r.units.find((u) => u.unit.course === 'boki3')!;
		const b2 = r.units.find((u) => u.unit.course === 'boki2')!;
		expect(questionsOf(b3, 0)[0].newAccounts).toEqual(['現金', '売上']);
		expect(questionsOf(b2, 0)[0].newAccounts).toBeUndefined();
	});
});
