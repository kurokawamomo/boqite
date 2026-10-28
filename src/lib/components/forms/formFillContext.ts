import { getContext, setContext } from 'svelte';
import type { CellRef, FormBlank } from '$lib/content/types';

/**
 * FormFillBody から各セル（FormCell / StockLayerCell）へ渡す3点セット。
 * 10レンダラすべてに手渡しでバケツリレーしていたのを Svelte context に一本化する（レビュー🟢-1）。
 * blanksByRef/answers はゲッターで公開し、FormFillBody 側の $state/$derived が
 * 更新されたときにセル側の $derived も追従できるようにする。
 */
export type FormFillContext = {
	readonly blanksByRef: Map<CellRef, FormBlank>;
	readonly answers: Record<CellRef, string | number>;
	onActivate: (blank: FormBlank) => void;
};

const KEY = Symbol('form-fill');

export function setFormFillContext(ctx: FormFillContext): void {
	setContext(KEY, ctx);
}

export function getFormFillContext(): FormFillContext {
	const ctx = getContext<FormFillContext | undefined>(KEY);
	if (!ctx) throw new Error('getFormFillContext() は FormFillBody の子孫コンポーネント内でのみ使用できます');
	return ctx;
}
