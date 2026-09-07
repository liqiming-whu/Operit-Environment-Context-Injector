const DAY_MS = 86_400_000;

export type AnniversaryType = "birthday" | "anniversary";
export type AnniversarySetting = { id: string; name: string; date: string; type: AnniversaryType };
export type CycleOwner = "user" | "character";

function parseDate(value: unknown): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.getUTCFullYear() !== Number(match[1]) || date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[3])) return null;
  return date;
}

function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addDays(date: Date, count: number): Date {
  return new Date(date.getTime() + count * DAY_MS);
}

function diffDays(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

function positiveInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, Math.round(number))) : fallback;
}

export type CycleStatus = {
  phase: "menstruation" | "follicular" | "ovulation" | "luteal" | "pms";
  recentStartDate: string;
  recentEndDate: string;
  nextStartDate: string;
  nextEndDate: string;
  dayInCycle: number;
  daysToNext: number;
  cycleLength: number;
  periodDuration: number;
  description: string;
};

export function calculateCycleStatus(startDate: string, cycleLength: number, periodDuration: number, todayString: string): CycleStatus | null {
  const start = parseDate(startDate);
  const today = parseDate(todayString);
  if (!start || !today) return null;
  const length = positiveInteger(cycleLength, 28, 15, 60);
  const duration = positiveInteger(periodDuration, 5, 1, Math.min(14, length));
  const elapsed = diffDays(start, today);
  if (elapsed < 0) return null;
  const cyclesElapsed = Math.floor(elapsed / length);
  const recentStart = addDays(start, cyclesElapsed * length);
  const dayInCycle = diffDays(recentStart, today);
  const nextStart = addDays(recentStart, length);
  const daysToNext = length - dayInCycle;
  let phase: CycleStatus["phase"] = "luteal";
  let description = "整体状态平稳，但需要比平时更多放松和照顾";
  if (dayInCycle < duration) {
    phase = "menstruation";
    description = `今天身体偏虚一些（第${dayInCycle + 1}天），耐受和体力会下降`;
  } else if (dayInCycle < duration + 7) {
    phase = "follicular";
    description = "最近恢复得不错，精力和心情都在慢慢回升";
  } else if (dayInCycle < duration + 10) {
    phase = "ovulation";
    description = "今天整体状态偏好，体力与兴致都更积极";
  } else if (daysToNext <= 5) {
    phase = "pms";
    description = "这几天会更敏感些，情绪和身体感受容易起伏";
  }
  return {
    phase,
    recentStartDate: formatDate(recentStart),
    recentEndDate: formatDate(addDays(recentStart, duration - 1)),
    nextStartDate: formatDate(nextStart),
    nextEndDate: formatDate(addDays(nextStart, duration - 1)),
    dayInCycle,
    daysToNext,
    cycleLength: length,
    periodDuration: duration,
    description,
  };
}

export type NamedCycleStatus = { owner: CycleOwner; label: string; status: CycleStatus };

export function collectCycleStatuses(settings: any, todayString: string, userLabel: string, characterLabel: string): NamedCycleStatus[] {
  const entries: Array<[CycleOwner, string, string, number, number]> = [
    ["user", userLabel, settings.userCycleStartDate, settings.userCycleLength, settings.userPeriodDuration],
    ["character", characterLabel, settings.characterCycleStartDate, settings.characterCycleLength, settings.characterPeriodDuration],
  ];
  return entries.map(([owner, label, start, length, duration]) => ({
    owner,
    label,
    status: calculateCycleStatus(start, length, duration, todayString),
  })).filter((entry): entry is NamedCycleStatus => Boolean(entry.status));
}

export type PregnancyStatus = { week: number; trimester: 1 | 2 | 3; dueDate: string; statusText: string };

export function calculatePregnancyStatus(startDate: string, todayString: string): PregnancyStatus | null {
  const start = parseDate(startDate);
  const today = parseDate(todayString);
  if (!start || !today) return null;
  const days = diffDays(start, today);
  if (days < 0) return null;
  const week = Math.floor(days / 7);
  const trimester: PregnancyStatus["trimester"] = week < 13 ? 1 : week < 28 ? 2 : 3;
  const statusText = week < 13 ? "孕早期，容易疲倦或轻微不适"
    : week < 28 ? "孕中期，状态相对稳定"
      : week < 40 ? "孕晚期，行动负担明显增加" : "临近分娩期，需要重点照护";
  return { week, trimester, dueDate: formatDate(addDays(start, 280)), statusText };
}

function nextOccurrence(dateInput: string, today: Date): Date | null {
  const monthDay = String(dateInput || "").slice(-5);
  if (!/^\d{2}-\d{2}$/.test(monthDay)) return null;
  const [month, day] = monthDay.split("-").map(Number);
  let year = today.getUTCFullYear();
  const make = (candidateYear: number): Date => {
    const lastDay = new Date(Date.UTC(candidateYear, month, 0)).getUTCDate();
    return new Date(Date.UTC(candidateYear, month - 1, Math.min(day, lastDay)));
  };
  let next = make(year);
  if (next < today) next = make(++year);
  return next;
}

export type AnniversaryStatus = AnniversarySetting & {
  nextDate: string;
  daysUntil: number;
  isToday: boolean;
  years: number | null;
};

export function collectAnniversaries(
  settings: any,
  todayString: string,
  userLabel: string,
  characterLabel: string
): AnniversaryStatus[] {
  const today = parseDate(todayString);
  if (!today) return [];
  const builtIns: AnniversarySetting[] = [
    { id: "user-birthday", name: `${userLabel}的生日`, date: settings.userBirthday, type: "birthday" },
    { id: "character-birthday", name: `${characterLabel}的生日`, date: settings.characterBirthday, type: "birthday" },
  ];
  const custom: AnniversarySetting[] = Array.isArray(settings.anniversaries) ? settings.anniversaries : [];
  const result: AnniversaryStatus[] = [];
  for (const event of [...builtIns, ...custom]) {
    const date = String(event?.date || "").trim();
    const next = nextOccurrence(date, today);
    if (!next) continue;
    const startYear = /^\d{4}-/.test(date) ? Number(date.slice(0, 4)) : 0;
    const daysUntil = diffDays(today, next);
    const occurrenceYear = next.getUTCFullYear();
    const years = startYear > 0 && occurrenceYear >= startYear ? occurrenceYear - startYear : null;
    result.push({
      id: String(event?.id || "event"),
      name: String(event?.name || "纪念日").trim().slice(0, 80) || "纪念日",
      type: event?.type === "birthday" ? "birthday" : "anniversary",
      date,
      nextDate: formatDate(next),
      daysUntil,
      isToday: daysUntil === 0,
      years,
    });
  }
  return result;
}
