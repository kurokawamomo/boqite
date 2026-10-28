export { getAudioContext, unlockAudio, isAudioUnlocked, installAudioUnlock } from './context';
export {
	SOUNDS,
	measureSound,
	playSound,
	playTap,
	playChipClick,
	playCorrectChime,
	playIncorrectBuzz,
	playComboChime,
	playLessonClearFanfare,
	playStreakFlame,
	playFreezeRefill,
	playNewAccountCard
} from './sounds';
export type { SoundMeasure, SoundName } from './sounds';
