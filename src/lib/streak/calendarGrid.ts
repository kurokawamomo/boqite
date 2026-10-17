import { DAY_MS, fromEpochDays, toEpochDays } from './date';
import type { DayStatus, StreakLogEntry } from './types';

export type CalendarCell = {
	/** 'YYYY-MM-DD'。月をまたぐ前後の空白セルは null */
	date: string | null;
	status: DayStatus | null;
	isToday: boolean;
};

/**
 * year/month（1-12）の月カレンダーを日曜始まりの週グリッドとして生成する。
 * 月頭・月末の欠けは前後の空白セル（date: null）で埋める。
 */
export function buildCalendarGrid(
	year: number,
	month: number,
	logs: StreakLogEntry[],
	today: string
): CalendarCell[] {
	const statusByDate = new Map(logs.map((l) => [l.date, l.status]));

	const firstOfMonthDays = Date.UTC(year, month - 1, 1) / DAY_MS;
	const firstWeekday = new Date(firstOfMonthDays * DAY_MS).getUTCDay(); // 0=Sun
	const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

	const cells: CalendarCell[] = [];

	for (let i = 0; i < firstWeekday; i++) {
		cells.push({ date: null, status: null, isToday: false });
	}

	for (let day = 1; day <= daysInMonth; day++) {
		const dateStr = fromEpochDays(firstOfMonthDays + day - 1);
		cells.push({
			date: dateStr,
			status: statusByDate.get(dateStr) ?? null,
			isToday: dateStr === today
		});
	}

	while (cells.length % 7 !== 0) {
		cells.push({ date: null, status: null, isToday: false });
	}

	return cells;
}

/** year/month を n ヶ月分（負数で過去、正数で未来）ずらした [year, month] を返す */
export function shiftMonth(year: number, month: number, delta: number): [number, number] {
	const totalMonths = year * 12 + (month - 1) + delta;
	return [Math.floor(totalMonths / 12), (((totalMonths % 12) + 12) % 12) + 1];
}

/** 'YYYY-MM-DD' から [year, month] を取り出す */
export function yearMonthOf(date: string): [number, number] {
	const days = toEpochDays(date);
	const d = new Date(days * DAY_MS);
	return [d.getUTCFullYear(), d.getUTCMonth() + 1];
}
