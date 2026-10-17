let ctx: AudioContext | null = null;
let unlocked = false;
const buses = new WeakMap<BaseAudioContext, AudioNode>();

/** 遅延生成した単一の AudioContext を返す（ブラウザ環境以外では null） */
export function getAudioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!ctx) {
		const Ctor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!Ctor) return null;
		ctx = new Ctor();
	}
	return ctx;
}

/**
 * 全効果音が通る出力段。コンプレッサで重なった音のピークを抑え、音量を揃える。
 * リアルタイムとオフライン計測（OfflineAudioContext）で同じ構成を使う。
 */
export function getMasterBus(audio: BaseAudioContext): AudioNode {
	const cached = buses.get(audio);
	if (cached) return cached;

	const input = audio.createGain();
	const compressor = audio.createDynamicsCompressor();
	compressor.threshold.value = -16;
	compressor.knee.value = 12;
	compressor.ratio.value = 5;
	compressor.attack.value = 0.003;
	compressor.release.value = 0.12;
	const master = audio.createGain();
	master.gain.value = 0.9;

	input.connect(compressor);
	compressor.connect(master);
	master.connect(audio.destination);
	buses.set(audio, input);
	return input;
}

/**
 * iOS Safari 対策: resume() はユーザー操作イベントの中で同期的に呼ぶ必要がある。
 * await より前に呼び出し、無音バッファの再生でも解禁する。iOS は 'interrupted' になることがある。
 */
export function resumeAudio(): Promise<void> {
	const audio = getAudioContext();
	if (!audio) return Promise.resolve();
	let pending: Promise<void> = Promise.resolve();
	if (audio.state !== 'running') pending = audio.resume().catch(() => {});
	try {
		const buffer = audio.createBuffer(1, 1, audio.sampleRate);
		const source = audio.createBufferSource();
		source.buffer = buffer;
		source.connect(audio.destination);
		source.start(0);
	} catch {
		// 無音バッファの再生に失敗しても resume の結果だけで判断する
	}
	return pending;
}

export async function unlockAudio(): Promise<void> {
	await resumeAudio();
	const audio = getAudioContext();
	unlocked = audio !== null && audio.state === 'running';
}

/** unlockAudio() 済み、かつ AudioContext が実際に鳴らせる状態か */
export function isAudioUnlocked(): boolean {
	const audio = getAudioContext();
	return unlocked && audio !== null && audio.state === 'running';
}

const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'click', 'keydown'] as const;

/**
 * 最初のタップで音を解禁する。画面のどこを触っても最初の操作で resume する。
 * 解禁後も、iOS が止めた場合（別アプリ切替・着信）に備えて次の操作で再開する。
 */
export function installAudioUnlock(): () => void {
	if (typeof window === 'undefined') return () => {};
	const handler = () => {
		void unlockAudio();
	};
	for (const name of UNLOCK_EVENTS) window.addEventListener(name, handler, { capture: true, passive: true });
	return () => {
		for (const name of UNLOCK_EVENTS) window.removeEventListener(name, handler, { capture: true });
	};
}
