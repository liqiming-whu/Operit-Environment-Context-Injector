const SETTINGS_PREFS_NAME = "toolpkg_environment_context_injector";
const SETTINGS_KEY = "environment_context_injector_settings";
const LOCATION_CACHE_KEY = "environment_context_location_cache";
const WEATHER_CACHE_KEY = "environment_context_weather_cache";
const ATTACHMENT_ID_PREFIX = "environment_context_bundle_";
const ATTACHMENT_FILE_PREFIX = "Environment:";

export type LocationMode = "manual" | "auto";
export type ReverseGeocodingProvider = "auto" | "nominatim" | "bigdatacloud" | "photon";
export type WeatherProvider = "auto" | "open-meteo" | "met-norway" | "wttr.in";

export type EnvironmentInjectionSettings = {
  masterEnabled: boolean;
  persistInjectedContent: boolean;
  injectionTimeoutSeconds: number;
  weatherRefreshIntervalMinutes: number;
  locationRefreshIntervalMinutes: number;
  injectTime: boolean;
  injectWeather: boolean;
  injectLocation: boolean;
  injectBattery: boolean;
  injectDevice: boolean;
  customDeviceName: string;
  boundCharacterCardIds: string[];
  locationMode: LocationMode;
  manualAddress: string;
  usePreciseLocation: boolean;
  reverseGeocodingProvider: ReverseGeocodingProvider;
  weatherProvider: WeatherProvider;
};

export const DEFAULT_SETTINGS: EnvironmentInjectionSettings = {
  masterEnabled: false,
  persistInjectedContent: true,
  injectionTimeoutSeconds: 10,
  weatherRefreshIntervalMinutes: 30,
  locationRefreshIntervalMinutes: 10,
  injectTime: true,
  injectWeather: true,
  injectLocation: true,
  injectBattery: true,
  injectDevice: true,
  customDeviceName: "",
  boundCharacterCardIds: [],
  locationMode: "auto",
  manualAddress: "武汉",
  usePreciseLocation: false,
  reverseGeocodingProvider: "auto",
  weatherProvider: "open-meteo",
};

export type LocationSnapshot = {
  latitude: number;
  longitude: number;
  label: string;
  city: string;
  region: string;
  country: string;
  accuracy: number | null;
  provider: string;
  timestamp: number | null;
  addressProvider: string;
  addressWarnings: string[];
};

export function getAppContext(): any {
  return typeof Java.getApplicationContext === "function"
    ? Java.getApplicationContext()
    : null;
}

function getPrefs(): any {
  const context = getAppContext();
  if (!context) throw new Error("application context unavailable");
  return context.getSharedPreferences(SETTINGS_PREFS_NAME, 0);
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function clean(value: unknown, max = 160): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f<>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function sanitizeSettings(input?: Partial<EnvironmentInjectionSettings> | null): EnvironmentInjectionSettings {
  const locationMode: LocationMode = input?.locationMode === "manual" ? "manual" : "auto";
  const reverse = String(input?.reverseGeocodingProvider || "");
  const weather = String(input?.weatherProvider || "");
  return {
    masterEnabled: Boolean(input?.masterEnabled ?? DEFAULT_SETTINGS.masterEnabled),
    persistInjectedContent: Boolean(input?.persistInjectedContent ?? DEFAULT_SETTINGS.persistInjectedContent),
    injectionTimeoutSeconds: clampInteger(input?.injectionTimeoutSeconds, 3, 60, 10),
    weatherRefreshIntervalMinutes: clampInteger(input?.weatherRefreshIntervalMinutes, 5, 180, 30),
    locationRefreshIntervalMinutes: clampInteger(input?.locationRefreshIntervalMinutes, 5, 60, 10),
    injectTime: Boolean(input?.injectTime ?? DEFAULT_SETTINGS.injectTime),
    injectWeather: Boolean(input?.injectWeather ?? DEFAULT_SETTINGS.injectWeather),
    injectLocation: Boolean(input?.injectLocation ?? DEFAULT_SETTINGS.injectLocation),
    injectBattery: Boolean(input?.injectBattery ?? DEFAULT_SETTINGS.injectBattery),
    injectDevice: Boolean(input?.injectDevice ?? DEFAULT_SETTINGS.injectDevice),
    customDeviceName: clean(input?.customDeviceName ?? DEFAULT_SETTINGS.customDeviceName, 80),
    boundCharacterCardIds: Array.from(new Set((Array.isArray(input?.boundCharacterCardIds) ? input.boundCharacterCardIds : [])
      .map(id => clean(id, 120)).filter(Boolean))).slice(0, 100),
    locationMode,
    manualAddress: clean(input?.manualAddress ?? DEFAULT_SETTINGS.manualAddress, 120),
    usePreciseLocation: Boolean(input?.usePreciseLocation ?? DEFAULT_SETTINGS.usePreciseLocation),
    reverseGeocodingProvider: (["auto", "nominatim", "bigdatacloud", "photon"].includes(reverse)
      ? reverse
      : DEFAULT_SETTINGS.reverseGeocodingProvider) as ReverseGeocodingProvider,
    weatherProvider: (["auto", "open-meteo", "met-norway", "wttr.in"].includes(weather)
      ? weather
      : DEFAULT_SETTINGS.weatherProvider) as WeatherProvider,
  };
}

export function loadSettings(): EnvironmentInjectionSettings {
  try {
    const raw = String(getPrefs().getString(SETTINGS_KEY, "") || "").trim();
    return raw ? sanitizeSettings(JSON.parse(raw)) : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(patch: Partial<EnvironmentInjectionSettings>): EnvironmentInjectionSettings {
  const next = sanitizeSettings({ ...loadSettings(), ...patch });
  getPrefs().edit().putString(SETTINGS_KEY, JSON.stringify(next)).apply();
  return next;
}

export function getInjectionEnabled(): boolean {
  return loadSettings().masterEnabled;
}

export function setInjectionEnabled(enabled: boolean): EnvironmentInjectionSettings {
  return saveSettings({ masterEnabled: enabled });
}

type CacheRecord<T> = { cachedAt: number; value: T };
type CacheStore<T> = { version: 1; entries: Record<string, CacheRecord<T>> };

function readCache<T>(preferenceKey: string, expectedKey: string, maxAgeMinutes: number): T | null {
  try {
    const raw = String(getPrefs().getString(preferenceKey, "") || "").trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheStore<T>;
    const record = parsed?.entries?.[expectedKey];
    if (!record) return null;
    const cachedAt = Number(record.cachedAt);
    const ageMs = Date.now() - cachedAt;
    if (!Number.isFinite(cachedAt) || ageMs < 0 || ageMs >= maxAgeMinutes * 60_000) return null;
    return record.value ?? null;
  } catch {
    return null;
  }
}

function writeCache<T>(preferenceKey: string, key: string, value: T): void {
  try {
    let entries: Record<string, CacheRecord<T>> = {};
    const raw = String(getPrefs().getString(preferenceKey, "") || "").trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CacheStore<T>;
        if (parsed?.entries && typeof parsed.entries === "object") entries = parsed.entries;
      } catch {}
    }
    entries[key] = { cachedAt: Date.now(), value };
    const newestEntries = Object.fromEntries(
      Object.entries(entries)
        .sort((left, right) => Number(right[1]?.cachedAt || 0) - Number(left[1]?.cachedAt || 0))
        .slice(0, 12)
    );
    const store: CacheStore<T> = { version: 1, entries: newestEntries };
    getPrefs().edit().putString(preferenceKey, JSON.stringify(store)).apply();
  } catch {}
}

function locationCacheKey(settings: EnvironmentInjectionSettings): string {
  return settings.locationMode === "manual"
    ? `manual|${settings.manualAddress.trim().toLowerCase()}`
    : `auto|${settings.usePreciseLocation ? "precise" : "balanced"}|${settings.reverseGeocodingProvider}`;
}

function weatherCacheKey(provider: WeatherProvider, location: LocationSnapshot): string {
  return `${provider}|${location.latitude.toFixed(4)}|${location.longitude.toFixed(4)}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&" + "quot;")
    .replace(/'/g, "&" + "apos;");
}

export function containsEnvironmentAttachment(input: string): boolean {
  return input.includes(`id="${ATTACHMENT_ID_PREFIX}`) || input.includes(`filename="${ATTACHMENT_FILE_PREFIX}`);
}

function formatTimestamp(timestampMs: number): string {
  const SimpleDateFormat = Java.type("java.text.SimpleDateFormat");
  const DateClass = Java.type("java.util.Date");
  const LocaleClass = Java.type("java.util.Locale");
  return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", LocaleClass.getDefault())
    .format(new DateClass(timestampMs));
}

function buildTimeBlock(): string {
  const SimpleDateFormat = Java.type("java.text.SimpleDateFormat");
  const DateClass = Java.type("java.util.Date");
  const LocaleClass = Java.type("java.util.Locale");
  const TimeZoneClass = Java.type("java.util.TimeZone");
  const locale = LocaleClass.getDefault();
  const now = new DateClass();
  return [
    "【当前时间】",
    new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", locale).format(now),
    `时区: ${TimeZoneClass.getDefault().getID()}`,
    `星期: ${new SimpleDateFormat("EEEE", locale).format(now)}`,
  ].join("\n");
}

function readBatteryBlock(): string {
  const IntentClass = Java.type("android.content.Intent");
  const IntentFilterClass = Java.type("android.content.IntentFilter");
  const BatteryManagerClass = Java.type("android.os.BatteryManager");
  const context = getAppContext();
  if (!context) throw new Error("application context unavailable");
  const intent = context.registerReceiver(null, new IntentFilterClass(IntentClass.ACTION_BATTERY_CHANGED));
  if (!intent) throw new Error("battery intent unavailable");
  const level = Number(intent.getIntExtra(BatteryManagerClass.EXTRA_LEVEL, -1));
  const scale = Number(intent.getIntExtra(BatteryManagerClass.EXTRA_SCALE, -1));
  const status = Number(intent.getIntExtra(BatteryManagerClass.EXTRA_STATUS, -1));
  if (level < 0 || scale <= 0) throw new Error("battery percentage unavailable");
  const percentage = Math.round(level * 100 / scale);
  const state = status === Number(BatteryManagerClass.BATTERY_STATUS_FULL)
    ? "已充满"
    : status === Number(BatteryManagerClass.BATTERY_STATUS_CHARGING) ? "充电中" : "未充电";
  return ["【当前电量】", `电量: ${percentage}%`, `状态: ${state}`].join("\n");
}

function readDeviceBlock(customDeviceName = ""): string {
  const Build = Java.type("android.os.Build");
  const SettingsGlobal = Java.type("android.provider.Settings$Global");
  const context = getAppContext();
  const manufacturer = clean(Build.MANUFACTURER, 40);
  const model = clean(Build.MODEL, 80);
  let deviceName = clean(customDeviceName, 80);
  try {
    if (!deviceName) deviceName = clean(SettingsGlobal.getString(context.getContentResolver(), "device_name"), 80);
  } catch {}
  if (!deviceName) deviceName = clean([manufacturer, model].filter(Boolean).join(" "), 80) || "Android 设备";
  return [
    "【设备信息】",
    `设备名称: ${deviceName}`,
    `设备型号: ${model || "-"}`,
    `平台: Android ${clean(Build.VERSION.RELEASE, 30)}`,
  ].join("\n");
}

function errorBlock(title: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "unknown");
  return [title, `错误: ${clean(message, 240)}`].join("\n");
}

function secondsRemaining(deadlineMs: number): number {
  return Math.max(1, Math.ceil((deadlineMs - Date.now()) / 1000));
}

function ensureDeadline(deadlineMs: number): void {
  if (Date.now() >= deadlineMs) throw new Error("注入总超时");
}

async function httpJson(url: string, deadlineMs: number, timeoutCapSeconds = 5, headers: Record<string, string> = {}): Promise<any> {
  ensureDeadline(deadlineMs);
  const timeout = Math.max(1, Math.min(timeoutCapSeconds, secondsRemaining(deadlineMs)));
  const response = await Tools.Net.http({
    url,
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "Operit-Environment-Context-Injection/1.0",
      ...headers,
    },
    connect_timeout: timeout,
    read_timeout: timeout,
    validateStatus: false,
  });
  const status = Number(response.statusCode);
  if (status < 200 || status >= 300) throw new Error(`HTTP ${status}`);
  const body = String(response.content || "").trim();
  if (!body) throw new Error("响应为空");
  try { return JSON.parse(body); } catch (error) {
    throw new Error(`JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function addressResult(provider: string, city: unknown, region: unknown, country: unknown, fallback = "") {
  const normalizedCity = clean(city, 80);
  const normalizedRegion = clean(region, 80);
  const normalizedCountry = clean(country, 80);
  const parts = Array.from(new Set([normalizedCity, normalizedRegion, normalizedCountry].filter(Boolean)));
  const label = parts.join(" / ") || clean(fallback, 160);
  if (!label) throw new Error(`${provider} 没有返回有效地址`);
  return { label, city: normalizedCity, region: normalizedRegion, country: normalizedCountry, provider };
}

async function geocodeManual(address: string, deadlineMs: number): Promise<LocationSnapshot> {
  if (!address.trim()) throw new Error("手动地址不能为空");
  const data = await httpJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(address)}&count=1&language=zh&format=json`,
    deadlineMs
  );
  const result = data?.results?.[0];
  const latitude = Number(result?.latitude);
  const longitude = Number(result?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error(`找不到地址“${address}”`);
  const resolved = addressResult("Open-Meteo Geocoding", result.name || address, result.admin1, result.country, address);
  return {
    latitude, longitude, label: resolved.label, city: resolved.city, region: resolved.region,
    country: resolved.country, accuracy: null, provider: "manual", timestamp: Date.now(),
    addressProvider: "open-meteo-geocoding", addressWarnings: [],
  };
}

async function reverseNominatim(latitude: number, longitude: number, deadlineMs: number) {
  const data = await httpJson(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude.toFixed(6)}&lon=${longitude.toFixed(6)}&zoom=10&accept-language=zh-CN,zh`,
    deadlineMs
  );
  const a = data?.address || {};
  return addressResult("Nominatim", a.city || a.town || a.village || a.municipality || a.county, a.state || a.province, a.country, data?.display_name);
}

async function reverseBigDataCloud(latitude: number, longitude: number, deadlineMs: number) {
  const data = await httpJson(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude.toFixed(6)}&longitude=${longitude.toFixed(6)}&localityLanguage=zh`,
    deadlineMs
  );
  return addressResult("BigDataCloud", data?.locality || data?.city, data?.principalSubdivision, data?.countryName);
}

async function reversePhoton(latitude: number, longitude: number, deadlineMs: number) {
  const data = await httpJson(
    `https://photon.komoot.io/reverse?lat=${latitude.toFixed(6)}&lon=${longitude.toFixed(6)}`,
    deadlineMs,
    5,
    { "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.5" }
  );
  const p = data?.features?.[0]?.properties || {};
  return addressResult("Photon", p.district || p.city || p.county, p.state, p.country, p.name);
}

async function reverseAddress(provider: ReverseGeocodingProvider, latitude: number, longitude: number, deadlineMs: number) {
  const loaders: Record<string, () => Promise<any>> = {
    nominatim: () => reverseNominatim(latitude, longitude, deadlineMs),
    bigdatacloud: () => reverseBigDataCloud(latitude, longitude, deadlineMs),
    photon: () => reversePhoton(latitude, longitude, deadlineMs),
  };
  if (provider !== "auto") return { ...(await loaders[provider]()), warnings: [] as string[] };
  const warnings: string[] = [];
  for (const name of ["nominatim", "bigdatacloud", "photon"]) {
    try { return { ...(await loaders[name]()), warnings }; }
    catch (error) { warnings.push(`${name}: ${clean(error instanceof Error ? error.message : error, 100)}`); }
  }
  throw new Error(`所有反向地址解析服务失败: ${warnings.join("; ")}`);
}

async function resolveLocation(settings: EnvironmentInjectionSettings, deadlineMs: number, forceRefresh = false): Promise<LocationSnapshot> {
  const cacheKey = locationCacheKey(settings);
  if (!forceRefresh) {
    const cached = readCache<LocationSnapshot>(LOCATION_CACHE_KEY, cacheKey, settings.locationRefreshIntervalMinutes);
    if (cached && Number.isFinite(Number(cached.latitude)) && Number.isFinite(Number(cached.longitude))) return cached;
  }
  if (settings.locationMode === "manual") {
    const location = await geocodeManual(settings.manualAddress, deadlineMs);
    writeCache(LOCATION_CACHE_KEY, cacheKey, location);
    return location;
  }
  ensureDeadline(deadlineMs);
  const timeout = Math.max(1, Math.min(secondsRemaining(deadlineMs), settings.injectionTimeoutSeconds));
  const raw = await Tools.System.getLocation(settings.usePreciseLocation, timeout, false);
  const latitude = Number(raw?.latitude);
  const longitude = Number(raw?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error("定位坐标不可用");
  const address = await reverseAddress(settings.reverseGeocodingProvider, latitude, longitude, deadlineMs);
  const location: LocationSnapshot = {
    latitude, longitude, label: address.label, city: address.city, region: address.region,
    country: address.country,
    accuracy: Number.isFinite(Number(raw?.accuracy)) ? Number(raw.accuracy) : null,
    provider: clean(raw?.provider, 40) || "device",
    timestamp: Number.isFinite(Number(raw?.timestamp)) ? Number(raw.timestamp) : Date.now(),
    addressProvider: address.provider,
    addressWarnings: address.warnings,
  };
  writeCache(LOCATION_CACHE_KEY, cacheKey, location);
  return location;
}

function locationBlock(location: LocationSnapshot): string {
  return [
    "【当前位置】",
    `地址: ${location.label || "-"}`,
    `精度: ${location.accuracy && location.accuracy > 0 ? `${Math.round(location.accuracy)} m` : "-"}`,
    `定位源: ${location.provider || "-"}`,
    `地址源: ${location.addressProvider || "-"}`,
    ...(location.addressWarnings.length ? [`地址容错: ${location.addressWarnings.join("; ")}`] : []),
  ].join("\n");
}

const WMO_ZH: Record<number, string> = {0:"晴",1:"大部晴朗",2:"局部多云",3:"阴",45:"雾",48:"雾凇",51:"小毛毛雨",53:"中等毛毛雨",55:"浓毛毛雨",61:"小雨",63:"中雨",65:"大雨",71:"小雪",73:"中雪",75:"大雪",80:"小阵雨",81:"中阵雨",82:"强阵雨",85:"小阵雪",86:"强阵雪",95:"雷暴",96:"雷暴伴小冰雹",99:"雷暴伴强冰雹"};
const WTTR_ZH: Record<number, string> = {113:"晴",116:"局部多云",119:"多云",122:"阴",143:"薄雾",149:"烟霾",176:"局部可能有雨",179:"局部可能有雪",200:"局部可能有雷暴",227:"风吹雪",230:"暴雪",248:"有雾",260:"冻雾",263:"局部毛毛雨",266:"小毛毛雨",293:"局部小雨",296:"小雨",299:"间歇性中雨",302:"中雨",305:"间歇性大雨",308:"大雨",323:"局部小雪",326:"小雪",329:"局部中雪",332:"中雪",335:"局部大雪",338:"大雪",353:"小阵雨",356:"中到大阵雨",359:"暴雨",368:"小阵雪",371:"中到大阵雪",386:"局部小雨伴雷电",389:"中到大雨伴雷电",392:"局部小雪伴雷电",395:"中到大雪伴雷电"};
const MET_ZH: Record<string, string> = {clearsky:"晴",cloudy:"多云",fair:"晴间多云",fog:"雾",partlycloudy:"局部多云",lightrain:"小雨",rain:"雨",heavyrain:"大雨",lightrainshowers:"小阵雨",rainshowers:"阵雨",heavyrainshowers:"强阵雨",lightsnow:"小雪",snow:"雪",heavysnow:"大雪",lightsnowshowers:"小阵雪",snowshowers:"阵雪",heavysnowshowers:"强阵雪",sleet:"雨夹雪",rainandthunder:"雨伴雷暴",heavyrainandthunder:"大雨伴雷暴"};

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function direction(degrees: unknown): string {
  const value = numberOrNull(degrees);
  if (value === null) return "";
  const names = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  return names[Math.round((((value % 360) + 360) % 360) / 45) % 8];
}

async function fetchOpenMeteo(location: LocationSnapshot, deadlineMs: number) {
  const data = await httpJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude.toFixed(6)}&longitude=${location.longitude.toFixed(6)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`,
    deadlineMs
  );
  const c = data?.current;
  if (!c) throw new Error("Open-Meteo 没有返回当前天气");
  return { condition: WMO_ZH[Number(c.weather_code)] || `天气代码 ${c.weather_code}`, temperature:numberOrNull(c.temperature_2m), feelsLike:numberOrNull(c.apparent_temperature), humidity:numberOrNull(c.relative_humidity_2m), windSpeed:numberOrNull(c.wind_speed_10m), windDirection:direction(c.wind_direction_10m), source:"Open-Meteo" };
}

async function fetchMetNorway(location: LocationSnapshot, deadlineMs: number) {
  const data = await httpJson(`https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${location.latitude.toFixed(4)}&lon=${location.longitude.toFixed(4)}`, deadlineMs);
  const current = data?.properties?.timeseries?.[0];
  if (!current) throw new Error("MET Norway 没有返回当前天气");
  const d = current.data?.instant?.details || {};
  const summary = current.data?.next_1_hours?.summary || current.data?.next_6_hours?.summary || {};
  const code = clean(summary.symbol_code, 80).replace(/_(day|night|polartwilight)$/, "");
  const wind = numberOrNull(d.wind_speed);
  return { condition:MET_ZH[code] || code || "未知", temperature:numberOrNull(d.air_temperature), feelsLike:null, humidity:numberOrNull(d.relative_humidity), windSpeed:wind === null ? null : wind * 3.6, windDirection:direction(d.wind_from_direction), source:"MET Norway" };
}

async function fetchWttr(location: LocationSnapshot, deadlineMs: number) {
  const data = await httpJson(`https://wttr.in/${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}?format=j1&lang=zh-cn`, deadlineMs, 6);
  const c = data?.current_condition?.[0];
  if (!c) throw new Error("wttr.in 没有返回当前天气");
  const localized = clean(c?.["lang_zh-cn"]?.[0]?.value || c?.lang_zh?.[0]?.value || c?.lang_xx?.[0]?.value, 80);
  const english = clean(c?.weatherDesc?.[0]?.value, 80);
  const condition = /[\u3400-\u9fff]/.test(localized) ? localized : WTTR_ZH[Number(c.weatherCode)] || english || localized || "未知";
  return { condition, temperature:numberOrNull(c.temp_C), feelsLike:numberOrNull(c.FeelsLikeC), humidity:numberOrNull(c.humidity), windSpeed:numberOrNull(c.windspeedKmph), windDirection:clean(c.winddir16Point, 20), source:"wttr.in" };
}

async function fetchWeather(
  provider: WeatherProvider,
  location: LocationSnapshot,
  deadlineMs: number,
  refreshIntervalMinutes: number,
  forceRefresh = false
): Promise<any> {
  const cacheKey = weatherCacheKey(provider, location);
  if (!forceRefresh) {
    const cached = readCache<any>(WEATHER_CACHE_KEY, cacheKey, refreshIntervalMinutes);
    if (cached && typeof cached === "object") return cached;
  }
  const loaders = {
    "open-meteo": () => fetchOpenMeteo(location, deadlineMs),
    "met-norway": () => fetchMetNorway(location, deadlineMs),
    "wttr.in": () => fetchWttr(location, deadlineMs),
  } as const;
  let weather: any;
  if (provider === "auto") {
    const warnings: string[] = [];
    for (const name of ["open-meteo", "met-norway", "wttr.in"] as const) {
      try {
        const result = await loaders[name]();
        weather = warnings.length
          ? { ...result, fallback: `${warnings.join("; ")}; 已使用 ${result.source}` }
          : result;
        break;
      } catch (error) {
        warnings.push(`${name}: ${clean(error instanceof Error ? error.message : error, 160)}`);
        ensureDeadline(deadlineMs);
      }
    }
    if (!weather) throw new Error(`所有天气服务失败: ${warnings.join("; ")}`);
  } else if (provider === "open-meteo") {
    weather = await loaders[provider]();
  } else {
    try {
      weather = await loaders[provider]();
    } catch (error) {
      ensureDeadline(deadlineMs);
      const fallback = await loaders["open-meteo"]();
      weather = {
        ...fallback,
        fallback: `${provider}: ${clean(error instanceof Error ? error.message : error, 160)}; 已使用 Open-Meteo`,
      };
    }
  }
  writeCache(WEATHER_CACHE_KEY, cacheKey, weather);
  return weather;
}

function weatherBlock(weather: any, location: LocationSnapshot): string {
  const temp = weather.temperature === null ? "-" : `${Number(weather.temperature).toFixed(Number.isInteger(weather.temperature) ? 0 : 1)}°C`;
  const feels = weather.feelsLike === null ? "" : ` (体感: ${Number(weather.feelsLike).toFixed(Number.isInteger(weather.feelsLike) ? 0 : 1)}°C)`;
  const humidity = weather.humidity === null ? "-" : `${Math.round(weather.humidity)}%`;
  const wind = weather.windSpeed === null ? "-" : `${Number(weather.windSpeed).toFixed(1).replace(/\.0$/, "")} km/h${weather.windDirection ? ` ${weather.windDirection}` : ""}`;
  return [
    "【当前天气】",
    `地点: ${location.label || formatCoordinates(location.latitude, location.longitude)}`,
    `天气: ${weather.condition || "-"}`,
    `温度: ${temp}${feels}`,
    `湿度: ${humidity}`,
    `风速: ${wind}`,
    `来源: ${weather.source}`,
    ...(weather.fallback ? [`天气容错: ${weather.fallback}`] : []),
  ].join("\n");
}

export async function buildEnvironmentContent(
  settingsInput?: EnvironmentInjectionSettings,
  forceRefresh = false
): Promise<string> {
  const settings = sanitizeSettings(settingsInput || loadSettings());
  const deadlineMs = Date.now() + settings.injectionTimeoutSeconds * 1000;
  const timeContent = settings.injectTime ? buildTimeBlock() : "";
  let weatherContent = "";
  let locationContent = "";
  let batteryContent = "";
  let deviceContent = "";

  if (settings.injectBattery) {
    try { batteryContent = readBatteryBlock(); }
    catch (error) { batteryContent = errorBlock("【当前电量】", error); }
  }
  if (settings.injectDevice) {
    try { deviceContent = readDeviceBlock(settings.customDeviceName); }
    catch (error) { deviceContent = errorBlock("【设备信息】", error); }
  }

  let location: LocationSnapshot | null = null;
  if (settings.injectLocation || settings.injectWeather) {
    try { location = await resolveLocation(settings, deadlineMs, forceRefresh); }
    catch (error) {
      if (settings.injectWeather) weatherContent = errorBlock("【当前天气】", error);
      if (settings.injectLocation) locationContent = errorBlock("【当前位置】", error);
    }
  }
  if (location) {
    if (settings.injectWeather) {
      try { weatherContent = weatherBlock(await fetchWeather(
        settings.weatherProvider,
        location,
        deadlineMs,
        settings.weatherRefreshIntervalMinutes,
        forceRefresh
      ), location); }
      catch (error) { weatherContent = errorBlock("【当前天气】", error); }
    }
    if (settings.injectLocation) locationContent = locationBlock(location);
  }

  return [timeContent, weatherContent, locationContent, batteryContent, deviceContent]
    .filter(content => content.trim())
    .join("\n\n");
}

export async function buildEnvironmentPreview(
  settingsInput?: EnvironmentInjectionSettings,
  forceRefresh = false
): Promise<string> {
  return buildEnvironmentContent(settingsInput || loadSettings(), forceRefresh);
}

function buildAttachment(content: string): string {
  const now = Date.now();
  const id = `${ATTACHMENT_ID_PREFIX}${now}`;
  const fileName = `${ATTACHMENT_FILE_PREFIX}${formatTimestamp(now).replace(/[: ]/g, "-")}`;
  return `<attachment id="${escapeXml(id)}" filename="${escapeXml(fileName)}" type="text/plain" size="${content.length}">${escapeXml(content)}</attachment>`;
}

export type CharacterCardOption = { id: string; name: string };

export async function listCharacterCards(): Promise<CharacterCardOption[]> {
  try {
    const result = await Tools.Chat.listCharacterCards();
    const cards = Array.isArray(result?.cards) ? result.cards : [];
    return cards.map((card: any) => ({
      id: clean(card?.id, 120),
      name: clean(card?.name, 120),
    })).filter((card: CharacterCardOption) => card.id).sort((a: CharacterCardOption, b: CharacterCardOption) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export function matchesBoundCharacterCard(
  settings: EnvironmentInjectionSettings,
  activePrompt?: ToolPkg.ActivePromptSnapshot | null
): boolean {
  if (settings.boundCharacterCardIds.length === 0) return true;
  return Boolean(activePrompt && activePrompt.type === "character_card" && settings.boundCharacterCardIds.includes(String(activePrompt.id || "").trim()));
}

export async function appendEnvironmentToMessage(
  messageText: string,
  activePrompt?: ToolPkg.ActivePromptSnapshot | null
): Promise<string | null> {
  const input = String(messageText || "");
  const settings = loadSettings();
  if (!settings.masterEnabled || !matchesBoundCharacterCard(settings, activePrompt) || !input.trim() || containsEnvironmentAttachment(input)) return null;
  const content = await buildEnvironmentContent(settings);
  if (!content.trim()) return null;
  return `${input.replace(/\s+$/, "")} ${buildAttachment(content)}`.trim();
}
