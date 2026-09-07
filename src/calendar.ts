declare function require(path: string): any;

const chineseDays = require("../vendor/chinese-days.min.js");
const DAY_MS = 86_400_000;
const WEEKDAYS_ZH = ["日", "一", "二", "三", "四", "五", "六"];
const NAGER_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const nagerCache = new Map<string, { fetchedAt: number; value: any[] }>();

export type CalendarContext = {
  date: string;
  countryCode: string;
  weekDayName: string;
  dayType: string;
  isHoliday: boolean;
  isWorkday: boolean;
  isAdjustedWorkday: boolean;
  holidayName: string;
  lunarDate: string;
  nextHoliday: { date: string; name: string; daysUntil: number } | null;
  source: string;
};

function safeText(value: unknown, maxLength = 120): string {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f<>]+/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function parseDate(dateString: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString || ""));
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.getUTCFullYear() !== Number(match[1]) || date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[3])) return null;
  return date;
}

function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addDays(dateString: string, amount: number): string {
  const date = parseDate(dateString);
  return date ? formatDate(new Date(date.getTime() + amount * DAY_MS)) : "";
}

function dayDifference(from: string, to: string): number {
  const left = parseDate(from);
  const right = parseDate(to);
  return left && right ? Math.round((right.getTime() - left.getTime()) / DAY_MS) : 0;
}

function holidayNames(detail: any): { name: string; localName: string } {
  const raw = safeText(detail?.name || "", 160);
  if (!raw || /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i.test(raw)) return { name: "", localName: "" };
  const parts = raw.split(",").map(item => safeText(item, 80)).filter(Boolean);
  return { name: parts[0] || raw, localName: parts[1] || parts[0] || raw };
}

function lunarText(dateString: string): string {
  try {
    const lunar = chineseDays?.getLunarDate?.(dateString);
    if (!lunar) return "";
    return `${lunar.isLeap ? "闰" : ""}${safeText(lunar.lunarMonCN || lunar.monthStr, 20)}${safeText(lunar.lunarDayCN || lunar.dayStr, 20)}`;
  } catch {
    return "";
  }
}

function chinaCalendar(dateString: string): CalendarContext {
  if (!chineseDays?.getDayDetail || !chineseDays?.getLunarDate) throw new Error("chinese-days 未加载");
  const date = parseDate(dateString);
  if (!date) throw new Error("日历日期无效");
  const detail = chineseDays.getDayDetail(dateString) || {};
  const names = holidayNames(detail);
  const isWorkday = Boolean(chineseDays.isWorkday?.(dateString));
  const isHoliday = Boolean(chineseDays.isHoliday?.(dateString));
  const adjustedWorkday = isWorkday && Boolean(names.localName);
  const namedHoliday = isHoliday && Boolean(names.localName);
  let nextHoliday: CalendarContext["nextHoliday"] = null;
  for (let offset = 1; offset <= 90; offset += 1) {
    const candidate = addDays(dateString, offset);
    const candidateNames = holidayNames(chineseDays.getDayDetail(candidate) || {});
    if (chineseDays.isHoliday?.(candidate) && candidateNames.localName) {
      nextHoliday = { date: candidate, name: candidateNames.localName, daysUntil: offset };
      break;
    }
  }
  return {
    date: dateString,
    countryCode: "CN",
    weekDayName: WEEKDAYS_ZH[date.getUTCDay()],
    dayType: adjustedWorkday ? "调休工作日" : namedHoliday ? "节假日" : isWorkday ? "工作日" : "周末",
    isHoliday,
    isWorkday,
    isAdjustedWorkday: adjustedWorkday,
    holidayName: namedHoliday ? names.localName : "",
    lunarDate: lunarText(dateString),
    nextHoliday,
    source: "chinese-days",
  };
}

async function fetchNagerYear(
  year: number,
  countryCode: string,
  httpJson: (url: string) => Promise<any>
): Promise<any[]> {
  const key = `${year}:${countryCode}`;
  const cached = nagerCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < NAGER_CACHE_TTL_MS) return cached.value;
  const value = await httpJson(`https://date.nager.at/api/v3/PublicHolidays/${year}/${encodeURIComponent(countryCode)}`);
  if (!Array.isArray(value)) throw new Error("Nager.Date 返回结构无效");
  nagerCache.set(key, { fetchedAt: Date.now(), value });
  return value;
}

async function internationalCalendar(
  dateString: string,
  countryCode: string,
  httpJson: (url: string) => Promise<any>
): Promise<CalendarContext> {
  const date = parseDate(dateString);
  if (!date) throw new Error("日历日期无效");
  const year = date.getUTCFullYear();
  const current = await fetchNagerYear(year, countryCode, httpJson);
  const following = await fetchNagerYear(year + 1, countryCode, httpJson).catch(() => []);
  const holidays = [...current, ...following]
    .map(item => ({ date: safeText(item?.date, 10), name: safeText(item?.localName || item?.name, 120) }))
    .filter(item => item.date && item.name)
    .sort((left, right) => left.date.localeCompare(right.date));
  const today = holidays.find(item => item.date === dateString);
  const next = holidays.find(item => item.date > dateString);
  const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
  return {
    date: dateString,
    countryCode,
    weekDayName: WEEKDAYS_ZH[date.getUTCDay()],
    dayType: today ? "节假日" : weekend ? "周末" : "工作日",
    isHoliday: Boolean(today),
    isWorkday: !today && !weekend,
    isAdjustedWorkday: false,
    holidayName: today?.name || "",
    lunarDate: "",
    nextHoliday: next ? { ...next, daysUntil: dayDifference(dateString, next.date) } : null,
    source: "Nager.Date",
  };
}

export async function getCalendarContext(
  dateString: string,
  countryCode: string,
  httpJson: (url: string) => Promise<any>
): Promise<CalendarContext> {
  const normalizedDate = formatDate(parseDate(dateString) || new Date());
  const normalizedCountry = /^[A-Z]{2}$/.test(String(countryCode || "").toUpperCase()) ? String(countryCode).toUpperCase() : "CN";
  return normalizedCountry === "CN"
    ? chinaCalendar(normalizedDate)
    : internationalCalendar(normalizedDate, normalizedCountry, httpJson);
}