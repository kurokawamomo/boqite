<script lang="ts">
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import type { MapUnitView, NodeStatus } from '$lib/course';
	import type { NodeKind } from '$lib/content/course';
	import Boquito from '$lib/components/mascot/Boquito.svelte';
	import MapNode from './MapNode.svelte';
	import Backdrop from './Backdrop.svelte';
	import UnitBanner from './UnitBanner.svelte';

	let { units }: { units: MapUnitView[] } = $props();

	const CONTAINER_WIDTH = 375;
	const CENTER_X = CONTAINER_WIDTH / 2;
	const NODE_GAP = 104;
	const BANNER_HEIGHT = 72;
	const NODE_CENTER_OFFSET = 33;
	const OFFSETS = [0, 65, 100, 65, 0, -65, -100, -65];
	const MASCOT_SIZE = 92;

	type NodeEntry = {
		kind: 'node';
		id: string;
		label: string;
		status: NodeStatus;
		nodeKind: NodeKind;
		color: string;
		x: number;
		y: number;
	};

	type LayoutEntry = { kind: 'banner'; title: string; color: string; y: number } | NodeEntry;

	type Band = { id: string; color: string; top: number; height: number };

	function buildLayout(courseUnits: MapUnitView[]) {
		const entries: LayoutEntry[] = [];
		const bands: Band[] = [];
		let y = 40;
		let nodeIndex = 0;

		courseUnits.forEach((unit, unitIndex) => {
			const unitTop = y;
			entries.push({ kind: 'banner', title: unit.title, color: unit.color, y });
			y += BANNER_HEIGHT;

			for (const node of unit.nodes) {
				const x = CENTER_X + OFFSETS[nodeIndex % OFFSETS.length];
				entries.push({
					kind: 'node',
					id: node.id,
					label: node.label,
					status: node.status,
					nodeKind: node.kind,
					color: unit.color,
					x,
					y
				});
				y += NODE_GAP;
				nodeIndex += 1;
			}
			bands.push({ id: unit.id, color: unit.color, top: unitTop - 14, height: y - unitTop });
		});

		return { entries, bands, totalHeight: y + 40 };
	}

	/** 直前のノードを起点に、次のノードへ伸びる S 字の1区間 */
	function segmentD(p0: { x: number; y: number }, p1: { x: number; y: number }) {
		const midY = (p0.y + p1.y) / 2;
		return `M ${p0.x} ${p0.y} C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
	}

	const layout = $derived(buildLayout(units));
	const entries = $derived(layout.entries);
	const bands = $derived(layout.bands);
	const totalHeight = $derived(layout.totalHeight);

	const flatNodeEntries = $derived(entries.filter((e): e is NodeEntry => e.kind === 'node'));

	const nodeCenters = $derived(flatNodeEntries.map((n) => ({ x: n.x, y: n.y + NODE_CENTER_OFFSET })));

	/** クリア済みから続く区間は色つきの実線、先の区間は点線の道にする */
	const segments = $derived(
		flatNodeEntries.slice(0, -1).map((n, i) => ({
			key: `${n.id}>${flatNodeEntries[i + 1].id}`,
			d: segmentD(nodeCenters[i], nodeCenters[i + 1]),
			color: n.color,
			walked: n.status === 'cleared'
		}))
	);

	// URLの ?cleared=<nodeId> は pane4 の goto が付与する「直前にクリアしたノード」の一回限りの合図。
	// フリップ演出後は replaceState でパラメータを消し、リロードでは再生されないようにする。
	let clearedNodeId = $state<string | null>(null);

	$effect(() => {
		const param = page.url.searchParams.get('cleared');
		if (!param) return;
		clearedNodeId = param;
		// マウント直後はルータ初期化前で replaceState が例外を投げるため一tick遅らせる
		setTimeout(() => {
			const url = new URL(page.url);
			url.searchParams.delete('cleared');
			replaceState(url, page.state);
		}, 0);
	});

	const justUnlockedId = $derived.by(() => {
		if (!clearedNodeId) return null;
		const idx = flatNodeEntries.findIndex((n) => n.id === clearedNodeId);
		if (idx === -1) return null;
		const next = flatNodeEntries[idx + 1];
		return next && (next.status === 'current' || next.status === 'open') ? next.id : null;
	});

	// クリア直後の Boquito は、少しのあいだ喜ぶ
	let cheering = $state(false);

	$effect(() => {
		if (!clearedNodeId) return;
		cheering = true;
		const t = setTimeout(() => (cheering = false), 3200);
		return () => clearTimeout(t);
	});

	const currentEntry = $derived(flatNodeEntries.find((n) => n.status === 'current') ?? null);

	/** 現在地ノードの、余白の広い側に置く */
	const mascot = $derived.by(() => {
		if (!currentEntry) return null;
		const onRight = currentEntry.x <= CENTER_X;
		const left = onRight ? currentEntry.x + 42 : currentEntry.x - 42 - MASCOT_SIZE;
		return { left, top: currentEntry.y + NODE_CENTER_OFFSET - MASCOT_SIZE / 2 - 8 };
	});

	// 現在地ノードへの初期スクロール(縦長マップ対策)。一度だけ実行する。
	let didInitialScroll = false;

	$effect(() => {
		if (didInitialScroll) return;
		const target = currentEntry;
		if (!target) return;
		const el = document.getElementById(`map-node-${target.id}`);
		if (!el) return;
		didInitialScroll = true;
		el.scrollIntoView({ block: 'center' });
	});
</script>

<div class="scene" style:height="{totalHeight}px">
	<Backdrop {bands} height={totalHeight} {nodeCenters} centerX={CENTER_X} />

	<div class="map" style:height="{totalHeight}px">
		<svg class="path" width={CONTAINER_WIDTH} height={totalHeight} viewBox="0 0 {CONTAINER_WIDTH} {totalHeight}">
			{#each segments as seg (seg.key)}
				<path d={seg.d} fill="none" stroke="#fffdf6" stroke-opacity="0.85" stroke-width="22" stroke-linecap="round" />
			{/each}
			{#each segments as seg (seg.key)}
				{#if seg.walked}
					<path d={seg.d} fill="none" stroke={seg.color} stroke-width="8" stroke-linecap="round" />
				{:else}
					<path d={seg.d} fill="none" stroke="#b9b6aa" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 11" />
				{/if}
			{/each}
		</svg>

		{#each entries as entry (entry.kind === 'banner' ? entry.title : entry.id)}
			{#if entry.kind === 'banner'}
				<UnitBanner title={entry.title} color={entry.color} y={entry.y} />
			{:else}
				<MapNode
					nodeId={entry.id}
					label={entry.label}
					status={entry.status}
					kind={entry.nodeKind}
					color={entry.color}
					x={entry.x}
					y={entry.y}
					justCleared={entry.id === clearedNodeId}
					justUnlocked={entry.id === justUnlockedId}
				/>
			{/if}
		{/each}

		{#if mascot}
			<div class="mascot" style:left="{mascot.left}px" style:top="{mascot.top}px">
				<Boquito mood={cheering ? 'cheer' : 'idle'} size={MASCOT_SIZE} />
			</div>
		{/if}
	</div>
</div>

<style>
	/* 帯は画面幅いっぱいに広げ、ノードの列(.map)だけ 375px に収める */
	.scene {
		position: relative;
		width: 100%;
		overflow-x: hidden;
	}

	.map {
		position: relative;
		width: 100%;
		max-width: 375px;
		margin: 0 auto;
		/* current ノードの pulse-ring / cleared フリップ演出の box-shadow が
		   コンテナ幅をわずかに超えて横スクロールを生む(GitHub #5)ため抑止する */
		overflow-x: hidden;
	}

	.path {
		position: absolute;
		top: 0;
		left: 0;
	}

	.mascot {
		position: absolute;
		pointer-events: none;
	}
</style>
