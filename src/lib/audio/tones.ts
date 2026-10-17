/**
 * Boqite の音の部品。判子（打音）、帳簿をめくる音、羽音、木琴、鈴を自前合成する。
 * すべて BaseAudioContext 上で組むので、実時間再生とオフライン計測の両方で同じ音になる。
 */
const FLOOR = 0.0001;
const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
	const cached = noiseBuffers.get(ctx);
	if (cached) return cached;
	const length = Math.ceil(ctx.sampleRate);
	const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	// 再現性のため線形合同法で埋める（Math.random を使うと計測がぶれる）
	let seed = 12345;
	for (let i = 0; i < length; i++) {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		data[i] = (seed / 0x80000000) - 1;
	}
	noiseBuffers.set(ctx, buffer);
	return buffer;
}

/** 立ち上がり→指数減衰のエンベロープ。クリックノイズを避けるため必ず立ち上がりを付ける */
function envelope(ctx: BaseAudioContext, out: AudioNode, t: number, peak: number, attack: number, decay: number): GainNode {
	const g = ctx.createGain();
	g.gain.setValueAtTime(FLOOR, t);
	g.gain.linearRampToValueAtTime(Math.max(peak, FLOOR), t + attack);
	g.gain.exponentialRampToValueAtTime(FLOOR, t + attack + decay);
	g.connect(out);
	return g;
}

function sine(ctx: BaseAudioContext, dest: AudioNode, t: number, freq: number, length: number): OscillatorNode {
	const osc = ctx.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(freq, t);
	osc.connect(dest);
	osc.start(t);
	osc.stop(t + length);
	return osc;
}

function noiseSource(ctx: BaseAudioContext, dest: AudioNode, t: number, length: number): void {
	const src = ctx.createBufferSource();
	src.buffer = noiseBuffer(ctx);
	src.loop = true;
	src.connect(dest);
	src.start(t);
	src.stop(t + length);
}

/** 判子を押す打音。低い胴鳴り + 紙に当たる短い擦れ */
export function stamp(
	ctx: BaseAudioContext,
	out: AudioNode,
	t: number,
	opts: { from?: number; to?: number; gain?: number; decay?: number } = {}
): void {
	const { from = 170, to = 62, gain = 0.5, decay = 0.14 } = opts;
	const body = envelope(ctx, out, t, gain, 0.003, decay);
	const osc = sine(ctx, body, t, from, decay + 0.05);
	osc.frequency.exponentialRampToValueAtTime(to, t + 0.09);

	const thud = envelope(ctx, out, t, gain * 0.55, 0.002, 0.05);
	const lp = ctx.createBiquadFilter();
	lp.type = 'lowpass';
	lp.frequency.value = 700;
	lp.connect(thud);
	noiseSource(ctx, lp, t, 0.08);

	const scuff = envelope(ctx, out, t, gain * 0.22, 0.001, 0.02);
	const hp = ctx.createBiquadFilter();
	hp.type = 'highpass';
	hp.frequency.value = 2800;
	hp.connect(scuff);
	noiseSource(ctx, hp, t, 0.04);
}

/** 帳簿のページをめくる音。帯域を掃引する紙擦れ */
export function pageFlip(
	ctx: BaseAudioContext,
	out: AudioNode,
	t: number,
	opts: { length?: number; gain?: number; from?: number; to?: number } = {}
): void {
	const { length = 0.2, gain = 0.3, from = 1400, to = 4200 } = opts;
	const g = ctx.createGain();
	g.gain.setValueAtTime(FLOOR, t);
	g.gain.linearRampToValueAtTime(gain, t + length * 0.35);
	g.gain.exponentialRampToValueAtTime(FLOOR, t + length);
	g.connect(out);
	const bp = ctx.createBiquadFilter();
	bp.type = 'bandpass';
	bp.Q.value = 0.9;
	bp.frequency.setValueAtTime(from, t);
	bp.frequency.exponentialRampToValueAtTime(to, t + length);
	bp.connect(g);
	noiseSource(ctx, bp, t, length + 0.02);
}

/** 羽音。のこぎり波を低域だけ通し、20〜40Hz のトレモロで震わせる */
export function wingBuzz(
	ctx: BaseAudioContext,
	out: AudioNode,
	t: number,
	opts: { freq?: number; to?: number; length?: number; gain?: number; rate?: number; swell?: number } = {}
): void {
	const { freq = 220, to = freq, length = 0.5, gain = 0.2, rate = 30, swell = 0.5 } = opts;
	const g = ctx.createGain();
	g.gain.setValueAtTime(FLOOR, t);
	g.gain.linearRampToValueAtTime(gain, t + length * swell);
	g.gain.exponentialRampToValueAtTime(FLOOR, t + length);
	g.connect(out);

	// トレモロ: 0.5 ± 0.5 で揺らす
	const tremolo = ctx.createGain();
	tremolo.gain.value = 0.5;
	tremolo.connect(g);
	const lfo = ctx.createOscillator();
	lfo.frequency.value = rate;
	const depth = ctx.createGain();
	depth.gain.value = 0.5;
	lfo.connect(depth);
	depth.connect(tremolo.gain);
	lfo.start(t);
	lfo.stop(t + length + 0.02);

	const lp = ctx.createBiquadFilter();
	lp.type = 'lowpass';
	lp.frequency.value = 1100;
	lp.connect(tremolo);
	const osc = ctx.createOscillator();
	osc.type = 'sawtooth';
	osc.frequency.setValueAtTime(freq, t);
	if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t + length);
	osc.connect(lp);
	osc.start(t);
	osc.stop(t + length + 0.02);
}

/** 木琴（マリンバ風）。基音 + 倍音 3.9 倍・9.2 倍、倍音ほど早く消える */
export function marimba(
	ctx: BaseAudioContext,
	out: AudioNode,
	t: number,
	freq: number,
	opts: { gain?: number; decay?: number } = {}
): void {
	const { gain = 0.3, decay = 0.35 } = opts;
	const partials: Array<[number, number, number]> = [
		[1, 1, 1],
		[3.9, 0.3, 0.35],
		[9.2, 0.07, 0.15]
	];
	for (const [ratio, level, life] of partials) {
		const env = envelope(ctx, out, t, gain * level, 0.003, decay * life);
		sine(ctx, env, t, freq * ratio, decay * life + 0.05);
	}
	// 撥が当たる瞬間の短いノイズ
	const strike = envelope(ctx, out, t, gain * 0.18, 0.001, 0.012);
	const bp = ctx.createBiquadFilter();
	bp.type = 'bandpass';
	bp.frequency.value = Math.min(freq * 3, 6000);
	bp.Q.value = 1.2;
	bp.connect(strike);
	noiseSource(ctx, bp, t, 0.03);
}

/** 氷・ガラスのような鈴。非整数倍音を長めに残す */
export function glassBell(
	ctx: BaseAudioContext,
	out: AudioNode,
	t: number,
	freq: number,
	opts: { gain?: number; decay?: number } = {}
): void {
	const { gain = 0.2, decay = 0.7 } = opts;
	const partials: Array<[number, number, number]> = [
		[1, 1, 1],
		[2.76, 0.4, 0.6],
		[5.4, 0.15, 0.3]
	];
	for (const [ratio, level, life] of partials) {
		const env = envelope(ctx, out, t, gain * level, 0.004, decay * life);
		sine(ctx, env, t, freq * ratio, decay * life + 0.05);
	}
}

/** 炎のふくらみ。低域から開くノイズの息 */
export function flameWhoosh(
	ctx: BaseAudioContext,
	out: AudioNode,
	t: number,
	opts: { length?: number; gain?: number; from?: number; to?: number } = {}
): void {
	const { length = 0.8, gain = 0.25, from = 250, to = 1700 } = opts;
	const g = ctx.createGain();
	g.gain.setValueAtTime(FLOOR, t);
	g.gain.linearRampToValueAtTime(gain, t + length * 0.45);
	g.gain.exponentialRampToValueAtTime(FLOOR, t + length);
	g.connect(out);
	const lp = ctx.createBiquadFilter();
	lp.type = 'lowpass';
	lp.Q.value = 0.8;
	lp.frequency.setValueAtTime(from, t);
	lp.frequency.exponentialRampToValueAtTime(to, t + length * 0.7);
	lp.connect(g);
	noiseSource(ctx, lp, t, length + 0.02);
}
