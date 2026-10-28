<script lang="ts">
	import { onMount } from 'svelte';
	import { createSeededRng } from '$lib/review/prng';

	export type BackdropBand = { id: string; color: string; top: number; height: number };
	export type PathPoint = { x: number; y: number };

	let {
		bands,
		height,
		nodeCenters,
		centerX
	}: { bands: BackdropBand[]; height: number; nodeCenters: PathPoint[]; centerX: number } = $props();

	type Kind = 'mountain' | 'pine' | 'tree' | 'flower';

	/** 画面幅。道から遠い奥の景色は、広い画面でだけ描く */
	let viewWidth = $state(400);

	/**
	 * 描く範囲（scene 内の y）。画面の前後だけを描き、スクロールで CHUNK ごとに更新する。
	 * 約1500個ある景色を全部 DOM に載せると初回表示が重いため。サーバー側では null で何も描かない。
	 */
	const CHUNK = 600;
	const MARGIN_BEFORE = 1200;
	const MARGIN_AFTER = 1800;
	let root: HTMLElement | undefined = $state();
	let drawRange = $state<{ lo: number; hi: number } | null>(null);

	const PAPER = '#fbfaf5';
	/** 各種類の viewBox（symbol と同じ）。幅に対する高さの比に使う */
	const ASPECT: Record<Kind, number> = { mountain: 150 / 220, pine: 170 / 100, tree: 160 / 130, flower: 170 / 100 };
	const WIDTH_RANGE: Record<Kind, [number, number]> = {
		mountain: [120, 210],
		pine: [44, 84],
		tree: [58, 100],
		flower: [32, 62]
	};

	/** 場所ごとの景色。同じ章でも数百pxごとに切り替わり、森・花畑・山並みが続く */
	const REGIONS: Kind[][] = [
		['pine', 'pine', 'tree', 'pine', 'flower'],
		['flower', 'flower', 'tree', 'flower', 'tree'],
		['mountain', 'mountain', 'pine', 'mountain', 'tree'],
		['tree', 'tree', 'flower', 'pine', 'tree']
	];
	const REGION_HEIGHT = 520;
	const ROW_STEP = 34;

	function seedOf(text: string) {
		let h = 2166136261;
		for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
		return h >>> 0;
	}

	/** ノード中心を結ぶ S 字（SnakeMap の道と同じ曲線）を細かく刻んだ点列 */
	const pathPoints = $derived.by(() => {
		const points: PathPoint[] = [];
		for (let i = 0; i < nodeCenters.length - 1; i++) {
			const p0 = nodeCenters[i];
			const p1 = nodeCenters[i + 1];
			const midY = (p0.y + p1.y) / 2;
			for (let s = 0; s < 14; s++) {
				const t = s / 14;
				const u = 1 - t;
				points.push({
					x: u * u * u * p0.x + 3 * u * u * t * p0.x + 3 * u * t * t * p1.x + t * t * t * p1.x,
					y: u * u * u * p0.y + 3 * u * u * t * midY + 3 * u * t * t * midY + t * t * t * p1.y
				});
			}
		}
		return points;
	});

	/** y の近くにある道の点だけを調べて、点 (x,y) から道までの距離を返す */
	function distanceToPath(points: PathPoint[], x: number, y: number, startIndex: number) {
		let best = Infinity;
		for (let i = Math.max(0, startIndex - 40); i < Math.min(points.length, startIndex + 40); i++) {
			const dx = points[i].x - x;
			const dy = points[i].y - y;
			const d = Math.hypot(dx, dy);
			if (d < best) best = d;
		}
		return best;
	}

	/** y に最も近い道の点の添字（点列は y について単調） */
	function indexAtY(points: PathPoint[], y: number) {
		let lo = 0;
		let hi = points.length - 1;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (points[mid].y < y) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	}

	type Placed = { key: string; kind: Kind; x: number; y: number; w: number; h: number; body: string; dark: string; wood: string };

	/** 1つの章の景色を作る。位置は章の id から決まり、描く範囲や画面幅には依存しない */
	function generateBand(band: BackdropBand, points: PathPoint[]): Placed[] {
		const placed: Placed[] = [];
		const rng = createSeededRng(seedOf(band.id));
		const regionOffset = Math.floor(rng() * REGIONS.length);

		for (let y = band.top; y < band.top + band.height; y += ROW_STEP) {
			const region = REGIONS[(regionOffset + Math.floor((y - band.top) / REGION_HEIGHT)) % REGIONS.length];
			const idx = indexAtY(points, y);
			const pathX = points[idx].x - centerX;

			for (const side of [-1, 1]) {
				const count = rng() < 0.8 ? 1 : 0;
				const extra = rng() < 0.3 ? 1 : 0;
				for (let n = 0; n < count + extra; n++) {
					const kind = region[Math.floor(rng() * region.length)];
					const [wMin, wMax] = WIDTH_RANGE[kind];
					const small = n > 0;
					const w = Math.round((wMin + rng() * (wMax - wMin)) * (small ? 0.7 : 1));
					const clearance = 40 + w * 0.36;
					let dx = pathX + side * (clearance + rng() * 150);
					const py = y + (rng() - 0.5) * ROW_STEP;
					// 道に近すぎれば外へ押し出す。三度試して無理なら置かない
					let ok = false;
					for (let t = 0; t < 3; t++) {
						const d = distanceToPath(points, dx + centerX, py, indexAtY(points, py));
						if (d >= clearance) {
							ok = true;
							break;
						}
						dx += side * 26;
					}
					if (!ok) continue;
					const amount = Math.min(1, 0.55 + w / 260);
					const pct = (v: number) => Math.round(v * amount + (rng() - 0.5) * 8);
					placed.push({
						key: `${band.id}-${y}-${side}-${n}`,
						kind,
						x: dx - w / 2,
						y: py - w * ASPECT[kind],
						w,
						h: w * ASPECT[kind],
						body: `color-mix(in srgb, ${band.color} ${pct(52)}%, ${PAPER})`,
						dark: `color-mix(in srgb, ${band.color} ${pct(74)}%, ${PAPER})`,
						wood: `color-mix(in srgb, #6a5240 ${pct(64)}%, ${PAPER})`
					});
				}

				// 道から遠い奥の景色。大きめの山と松が多く、紙の色に溶けるほど淡い
				if (Math.round((y - band.top) / ROW_STEP) % 2 === 0 && rng() < 0.7) {
					const kind = (['mountain', 'pine', 'mountain', 'tree'] as const)[Math.floor(rng() * 4)];
					const [wMin, wMax] = WIDTH_RANGE[kind];
					const w = Math.round((wMin + rng() * (wMax - wMin)) * 1.15);
					const dx = pathX + side * (60 + w * 0.36 + 170 + rng() * 420);
					const py = y + (rng() - 0.5) * ROW_STEP;
					const pct = (v: number) => Math.round(v * 0.62 + (rng() - 0.5) * 6);
					placed.push({
						key: `${band.id}-${y}-${side}-far`,
						kind,
						x: dx - w / 2,
						y: py - w * ASPECT[kind],
						w,
						h: w * ASPECT[kind],
						body: `color-mix(in srgb, ${band.color} ${pct(50)}%, ${PAPER})`,
						dark: `color-mix(in srgb, ${band.color} ${pct(70)}%, ${PAPER})`,
						wood: `color-mix(in srgb, #6a5240 ${pct(60)}%, ${PAPER})`
					});
				}
			}
		}
		return placed;
	}

	/** 章ごとの景色は、初めて範囲に入ったときに作って覚える。全章を最初に作ると初回表示が遅い */
	const bandObjects = $derived.by(() => {
		const points = pathPoints;
		const cache = new Map<string, Placed[]>();
		return (band: BackdropBand) => {
			let list = cache.get(band.id);
			if (!list) {
				list = points.length === 0 ? [] : generateBand(band, points);
				cache.set(band.id, list);
			}
			return list;
		};
	});

	/** 描く範囲に入る景色。足元の y が小さい（奥の）ものから描き、手前のものが上に重なるようにする */
	const visibleObjects = $derived.by(() => {
		const range = drawRange;
		if (!range) return [] as Placed[];
		const half = viewWidth / 2 + 110;
		return bands
			.filter((b) => b.top - 400 <= range.hi && b.top + b.height + 400 >= range.lo)
			.flatMap((b) => bandObjects(b))
			.filter((o) => o.y + o.h >= range.lo && o.y <= range.hi && Math.abs(o.x + o.w / 2) <= half)
			.sort((x, y) => x.y + x.h - (y.y + y.h));
	});

	function updateRange() {
		if (!root) return;
		const sceneY = -root.getBoundingClientRect().top;
		const lo = Math.floor((sceneY - MARGIN_BEFORE) / CHUNK) * CHUNK;
		const hi = Math.ceil((sceneY + window.innerHeight + MARGIN_AFTER) / CHUNK) * CHUNK;
		if (!drawRange || drawRange.lo !== lo || drawRange.hi !== hi) drawRange = { lo, hi };
	}

	onMount(() => {
		let frame = 0;
		const onScroll = () => {
			if (frame) return;
			frame = requestAnimationFrame(() => {
				frame = 0;
				updateRange();
			});
		};
		// マップが現在地へスクロールした後の位置で、最初の範囲を決める
		const first = setTimeout(updateRange, 0);
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		return () => {
			clearTimeout(first);
			cancelAnimationFrame(frame);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	});

	/** 帯の中心ごとに色を置き、間は CSS の補間でなめらかにつなぐ */
	const gradient = $derived.by(() => {
		if (bands.length === 0) return PAPER;
		const tint = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, ${PAPER})`;
		const stops = [`${tint(bands[0].color, 9)} 0px`];
		for (const b of bands) stops.push(`${tint(b.color, 24)} ${Math.round(b.top + b.height / 2)}px`);
		stops.push(`${tint(bands[bands.length - 1].color, 12)} ${height}px`);
		return `linear-gradient(to bottom, ${stops.join(', ')})`;
	});
</script>

<div class="backdrop" bind:this={root} bind:clientWidth={viewWidth} style:height="{height}px" style:background={gradient} aria-hidden="true">
	<svg class="scene-art" width="100%" {height}>
		<defs>
			<symbol id="bd-mountain" viewBox="0 0 220 150" overflow="visible">
				<g stroke-linejoin="round" stroke-width="10">
					<polygon points="14,142 92,30 170,142" class="body" />
					<polygon points="86,142 156,56 214,142" class="dark" />
					<polygon points="92,30 72,62 84,58 92,70 102,58 112,62" class="snow" />
				</g>
			</symbol>
			<symbol id="bd-pine" viewBox="0 0 100 170" overflow="visible">
				<rect x="44" y="136" width="12" height="30" rx="3" class="wood-fill" />
				<g stroke-linejoin="round" stroke-width="8">
					<polygon points="50,70 14,136 86,136" class="dark" />
					<polygon points="50,42 18,100 82,100" class="body" />
					<polygon points="50,14 24,64 76,64" class="dark" />
				</g>
			</symbol>
			<symbol id="bd-tree" viewBox="0 0 130 160" overflow="visible">
				<rect x="57" y="92" width="16" height="64" rx="4" class="wood-fill" />
				<g class="body-fill">
					<circle cx="65" cy="52" r="38" />
					<circle cx="38" cy="78" r="28" />
					<circle cx="92" cy="78" r="28" />
				</g>
				<circle cx="76" cy="44" r="20" class="dark-fill" fill-opacity="0.55" />
			</symbol>
			<symbol id="bd-flower" viewBox="0 0 100 170" overflow="visible">
				<path d="M50 166 C46 134 56 110 50 76" fill="none" class="wood-stroke" stroke-width="5" stroke-linecap="round" />
				<ellipse cx="34" cy="128" rx="17" ry="8" transform="rotate(-28 34 128)" class="dark-fill" />
				<ellipse cx="68" cy="112" rx="16" ry="7" transform="rotate(26 68 112)" class="dark-fill" />
				<g class="body-fill">
					{#each [0, 60, 120, 180, 240, 300] as a (a)}
						<circle cx={50 + 24 * Math.cos((a * Math.PI) / 180)} cy={50 + 24 * Math.sin((a * Math.PI) / 180)} r="16" />
					{/each}
				</g>
				<circle cx="50" cy="50" r="13" fill="#f2b705" />
			</symbol>
		</defs>

		<svg x="50%" y="0" width="1" {height} overflow="visible">
			{#each visibleObjects as o (o.key)}
				<use
					href="#bd-{o.kind}"
					x={o.x}
					y={o.y}
					width={o.w}
					height={o.h}
					style="--b:{o.body};--d:{o.dark};--w:{o.wood}"
				/>
			{/each}
		</svg>
	</svg>
</div>

<style>
	.backdrop {
		position: absolute;
		inset: 0 0 auto 0;
		overflow: hidden;
	}

	.scene-art {
		display: block;
	}

	.body,
	.body-fill,
	.body-fill circle {
		fill: var(--b);
		stroke: var(--b);
	}

	.body-fill {
		stroke: none;
	}

	.dark {
		fill: var(--d);
		stroke: var(--d);
	}

	.dark-fill {
		fill: var(--d);
	}

	.snow {
		fill: #ffffff;
		fill-opacity: 0.92;
		stroke: #ffffff;
		stroke-width: 4;
		stroke-opacity: 0.92;
	}

	.wood-fill {
		fill: var(--w);
	}

	.wood-stroke {
		stroke: var(--w);
	}
</style>
