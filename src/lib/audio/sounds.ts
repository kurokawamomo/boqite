import { getAudioContext, getMasterBus } from './context';
import { flameWhoosh, glassBell, marimba, pageFlip, stamp, wingBuzz } from './tones';

export type SoundName = 'tap' | 'chip' | 'correct' | 'incorrect' | 'combo' | 'clear' | 'flame' | 'freeze' | 'card';

type SoundDef = {
	label: string;
	/** 音の尾を含めた長さ(秒)。オフライン計測の描画長に使う */
	duration: number;
	/** 音量を揃えるための係数。dev/sound の計測表で確認して調整する */
	trim: number;
	play: (ctx: BaseAudioContext, out: AudioNode, t: number, level: number) => void;
};

// C メジャー・ペンタトニック。連続正解で段を上がる
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880;
const C6 = 1046.5;
const D6 = 1174.66;
const E6 = 1318.51;
const G6 = 1567.98;
const A6 = 1760;
const COMBO_SCALE = [C5, D5, E5, G5, A5, C6, D6, E6];

export const SOUNDS: Record<SoundName, SoundDef> = {
	// ボタンのタップ: 木をはじく軽い一音
	tap: {
		label: 'ボタンのタップ',
		duration: 0.12,
		trim: 1.26,
		play: (ctx, out, t) => {
			marimba(ctx, out, t, 1318.5, { gain: 0.35, decay: 0.06 });
		}
	},
	// 勘定科目チップの配置: 小さな判子の当たり
	chip: {
		label: '科目チップの配置',
		duration: 0.14,
		trim: 1.34,
		play: (ctx, out, t) => {
			stamp(ctx, out, t, { from: 280, to: 140, gain: 0.4, decay: 0.07 });
		}
	},
	// 正解: 判子を押して、明るい木琴が二音上がる
	correct: {
		label: '正解',
		duration: 0.75,
		trim: 0.64,
		play: (ctx, out, t) => {
			stamp(ctx, out, t, { gain: 0.45 });
			marimba(ctx, out, t + 0.06, G5, { gain: 0.32, decay: 0.3 });
			marimba(ctx, out, t + 0.15, C6, { gain: 0.34, decay: 0.45 });
			marimba(ctx, out, t + 0.15, E6, { gain: 0.18, decay: 0.4 });
		}
	},
	// 不正解: 鈍い木の打音を二つ。短二度のにごりを小さく添える
	incorrect: {
		label: '不正解',
		duration: 0.7,
		trim: 0.88,
		play: (ctx, out, t) => {
			stamp(ctx, out, t, { from: 135, to: 52, gain: 0.5, decay: 0.16 });
			marimba(ctx, out, t + 0.02, 196, { gain: 0.3, decay: 0.3 });
			marimba(ctx, out, t + 0.02, 207.65, { gain: 0.16, decay: 0.28 });
			stamp(ctx, out, t + 0.17, { from: 110, to: 46, gain: 0.34, decay: 0.16 });
		}
	},
	// 連続正解: ページをめくって木琴が駆け上がる。段が上がるほど音数が増える
	combo: {
		label: '連続正解',
		duration: 1.3,
		trim: 0.69,
		play: (ctx, out, t, level) => {
			const count = Math.min(COMBO_SCALE.length, 4 + Math.floor(level / 5));
			pageFlip(ctx, out, t, { length: 0.14, gain: 0.16 });
			stamp(ctx, out, t + 0.08, { from: 200, to: 90, gain: 0.3, decay: 0.1 });
			for (let i = 0; i < count; i++) {
				marimba(ctx, out, t + 0.12 + i * 0.07, COMBO_SCALE[i], { gain: 0.26, decay: 0.28 });
			}
			const end = t + 0.12 + count * 0.07;
			marimba(ctx, out, end, C6, { gain: 0.3, decay: 0.55 });
			marimba(ctx, out, end, E6, { gain: 0.2, decay: 0.5 });
			marimba(ctx, out, end, G6, { gain: 0.14, decay: 0.45 });
			wingBuzz(ctx, out, t + 0.1, { freq: 330, length: end - t + 0.2, gain: 0.05, rate: 32 });
		}
	},
	// レッスンクリア: ページをめくり、大きな判子（済）、木琴のアルペジオと羽音のきらめき
	clear: {
		label: 'レッスンクリア',
		duration: 2.2,
		trim: 0.49,
		play: (ctx, out, t) => {
			pageFlip(ctx, out, t, { length: 0.22, gain: 0.2 });
			stamp(ctx, out, t + 0.2, { from: 150, to: 48, gain: 0.6, decay: 0.26 });
			[C5, E5, G5, C6, E6].forEach((f, i) => marimba(ctx, out, t + 0.5 + i * 0.09, f, { gain: 0.3, decay: 0.4 }));
			const end = t + 0.5 + 5 * 0.09;
			marimba(ctx, out, end, C6, { gain: 0.32, decay: 0.9 });
			marimba(ctx, out, end, E6, { gain: 0.24, decay: 0.85 });
			marimba(ctx, out, end, G6, { gain: 0.2, decay: 0.8 });
			marimba(ctx, out, end, C5, { gain: 0.26, decay: 0.9 });
			wingBuzz(ctx, out, t + 0.5, { freq: 392, to: 440, length: 1.3, gain: 0.06, rate: 30, swell: 0.4 });
		}
	},
	// ストリーク更新（炎）: 羽音が高まり、炎の息のあと温かい和音が灯る
	flame: {
		label: 'ストリーク更新（炎）',
		duration: 2,
		trim: 0.385,
		play: (ctx, out, t) => {
			wingBuzz(ctx, out, t, { freq: 180, to: 360, length: 1, gain: 0.22, rate: 28, swell: 0.8 });
			flameWhoosh(ctx, out, t + 0.05, { length: 0.8, gain: 0.22 });
			stamp(ctx, out, t + 0.55, { from: 160, to: 60, gain: 0.4, decay: 0.16 });
			[440, 659.25, 880, 1108.73].forEach((f, i) => marimba(ctx, out, t + 0.58 + i * 0.035, f, { gain: 0.26, decay: 0.8 }));
			marimba(ctx, out, t + 0.85, A6, { gain: 0.2, decay: 0.6 });
		}
	},
	// フリーズ補充: 氷の鈴が澄んで重なる。判子で「補充」を押す
	freeze: {
		label: 'フリーズ補充',
		duration: 1.5,
		trim: 0.83,
		play: (ctx, out, t) => {
			stamp(ctx, out, t, { from: 190, to: 80, gain: 0.34, decay: 0.12 });
			glassBell(ctx, out, t + 0.08, E6, { gain: 0.2, decay: 0.8 });
			glassBell(ctx, out, t + 0.2, 1975.5, { gain: 0.18, decay: 0.8 });
			glassBell(ctx, out, t + 0.34, 2637, { gain: 0.14, decay: 0.7 });
			wingBuzz(ctx, out, t + 0.1, { freq: 700, length: 0.7, gain: 0.04, rate: 36, swell: 0.3 });
		}
	},
	// 新しい勘定科目カード: ページがめくれ、小さな判子、木琴が二音
	card: {
		label: '新しい勘定科目カード',
		duration: 0.9,
		trim: 0.81,
		play: (ctx, out, t) => {
			pageFlip(ctx, out, t, { length: 0.18, gain: 0.26 });
			stamp(ctx, out, t + 0.14, { from: 210, to: 100, gain: 0.34, decay: 0.09 });
			marimba(ctx, out, t + 0.22, D6, { gain: 0.28, decay: 0.4 });
			marimba(ctx, out, t + 0.3, A6, { gain: 0.24, decay: 0.45 });
		}
	}
};

/** AudioContext が使えない/解禁前でも例外を投げず、無音で終わらせる */
function withAudioContext(run: (ctx: AudioContext) => void): void {
	const ctx = getAudioContext();
	if (!ctx) return;
	try {
		// 最初のタップがそのまま再生トリガーでも鳴るよう、操作の中で同期的に resume する
		if (ctx.state !== 'running') ctx.resume().catch(() => {});
		run(ctx);
	} catch {
		// 合成音の生成に失敗しても UI 側の判定処理は継続させる
	}
}

export function scheduleSound(ctx: BaseAudioContext, name: SoundName, t: number, level = 0): void {
	const def = SOUNDS[name];
	const gain = ctx.createGain();
	gain.gain.value = def.trim;
	gain.connect(getMasterBus(ctx));
	def.play(ctx, gain, t, level);
}

export function playSound(name: SoundName, level = 0): void {
	withAudioContext((ctx) => scheduleSound(ctx, name, ctx.currentTime + 0.01, level));
}

export const playTap = () => playSound('tap');
export const playChipClick = () => playSound('chip');
export const playCorrectChime = () => playSound('correct');
export const playIncorrectBuzz = () => playSound('incorrect');
/** level は連続正解数。多いほど音数が増える */
export const playComboChime = (level = 5) => playSound('combo', level);
export const playLessonClearFanfare = () => playSound('clear');
export const playStreakFlame = () => playSound('flame');
export const playFreezeRefill = () => playSound('freeze');
export const playNewAccountCard = () => playSound('card');

/* ------------------------------------------------------------------ *
 * 計測（dev/sound 用）。OfflineAudioContext で描画して、音量を数える
 * ------------------------------------------------------------------ */

export type SoundMeasure = {
	/** 100ms 窓の RMS の最大値(dBFS)。耳に近い「ふつうの大きさ」の目安 */
	loudnessDb: number;
	/** サンプルのピーク(dBFS) */
	peakDb: number;
};

export async function measureSound(name: SoundName, level = 5): Promise<SoundMeasure> {
	const rate = 44100;
	const def = SOUNDS[name];
	const offline = new OfflineAudioContext(1, Math.ceil(rate * (def.duration + 0.3)), rate);
	scheduleSound(offline, name, 0.01, level);
	const data = (await offline.startRendering()).getChannelData(0);

	const win = Math.floor(rate * 0.1);
	let maxRms = 0;
	let peak = 0;
	for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
	for (let start = 0; start + win <= data.length; start += Math.floor(win / 2)) {
		let sum = 0;
		for (let i = start; i < start + win; i++) sum += data[i] * data[i];
		maxRms = Math.max(maxRms, Math.sqrt(sum / win));
	}
	const db = (v: number) => (v > 0 ? 20 * Math.log10(v) : -120);
	return { loudnessDb: db(maxRms), peakDb: db(peak) };
}
