const assert = require('assert');
const stored = new Map();
let failGeocoding = false;
let failOpenMeteo = false;
let failMetNorway = false;
let geocodingRequests = 0;
let reverseGeocodingRequests = 0;
let locationRequests = 0;
let weatherRequests = 0;
let currentLocation = { latitude: 30.6, longitude: 114.1, accuracy: 30, provider: 'network' };
const weatherProviderRequests = [];
class MockDate { constructor(v) { this.v = v; } }
class MockSdf { constructor(fmt) { this.fmt = fmt; } format() { return this.fmt === 'EEEE' ? '星期三' : '2026-08-19 12:00:00'; } }
const prefs = {
  getString: (key, fallback) => stored.has(key) ? stored.get(key) : fallback,
  edit: () => ({ putString: (key, value) => ({ apply: () => { stored.set(key, value); } }) }),
};
const context = { getSharedPreferences: () => prefs, registerReceiver: () => ({ getIntExtra: k => k === 1 ? 80 : k === 2 ? 100 : 3 }), getContentResolver: () => ({}) };
global.Java = {
  com: { ai: { assistance: { operit: { api: { chat: { EnhancedAIService: { getInstance: () => ({ setInputProcessingState: () => {} }), getChatInstance: () => ({ setInputProcessingState: () => {} }) } } } } } } },
  getApplicationContext: () => context,
  newInstance: () => ({}),
  type: name => ({
    'java.text.SimpleDateFormat': MockSdf,
    'java.util.Date': MockDate,
    'java.util.Locale': { getDefault: () => ({}) },
    'java.util.TimeZone': { getDefault: () => ({ getID: () => 'Asia/Shanghai' }) },
    'android.content.Intent': { ACTION_BATTERY_CHANGED: 'battery' },
    'android.content.IntentFilter': class {},
    'android.os.BatteryManager': { EXTRA_LEVEL: 1, EXTRA_SCALE: 2, EXTRA_STATUS: 3, BATTERY_STATUS_FULL: 5, BATTERY_STATUS_CHARGING: 2 },
    'android.os.Build': { MANUFACTURER: 'vivo', MODEL: 'V2505A', VERSION: { RELEASE: '16' } },
    'android.provider.Settings$Global': { getString: () => 'V2505A' },
  })[name],
};
global.getChatId = () => '';
global.getCallerCardId = () => '';
global.Tools = {
  Chat: { listCharacterCards: async () => ({ cards: [{ id: 'card-b', name: '乙' }, { id: 'card-a', name: '甲' }] }) },
  System: { getLocation: async () => { locationRequests += 1; return { ...currentLocation, timestamp: Date.now() }; } },
  Net: { http: async ({ url }) => {
    if (url.includes('geocoding-api')) {
      geocodingRequests += 1;
      if (failGeocoding) throw new Error('mock geocoding failure');
      return { statusCode: 200, content: JSON.stringify({ results: [{ latitude: 30.6, longitude: 114.1, name: '武汉', admin1: '湖北', country: '中国' }] }) };
    }
    if (url.includes('api.open-meteo.com/v1/forecast')) {
      weatherRequests += 1;
      weatherProviderRequests.push('open-meteo');
      if (failOpenMeteo) return { statusCode: 503, content: '{}' };
      return { statusCode: 200, content: JSON.stringify({ current: { temperature_2m: 33, relative_humidity_2m: 61, apparent_temperature: 40, weather_code: 3, wind_speed_10m: 8, wind_direction_10m: 45 } }) };
    }
    if (url.includes('api.met.no/weatherapi')) {
      weatherRequests += 1;
      weatherProviderRequests.push('met-norway');
      if (failMetNorway) return { statusCode: 502, content: '{}' };
      return { statusCode: 200, content: JSON.stringify({ properties: { timeseries: [{ data: { instant: { details: { air_temperature: 31, relative_humidity: 58, wind_speed: 2, wind_from_direction: 90 } }, next_1_hours: { summary: { symbol_code: 'partlycloudy_day' } } } }] } }) };
    }
    if (url.includes('wttr.in')) {
      weatherRequests += 1;
      weatherProviderRequests.push('wttr.in');
      return { statusCode: 200, content: JSON.stringify({ current_condition: [{ temp_C: '29', FeelsLikeC: '31', humidity: '65', windspeedKmph: '9', winddir16Point: 'E', weatherCode: '116', weatherDesc: [{ value: 'Partly cloudy' }] }] }) };
    }
    if (url.includes('nominatim')) {
      reverseGeocodingRequests += 1;
      const moved = url.includes('lat=31.200000');
      return { statusCode: 200, content: JSON.stringify({ address: { city: moved ? '移动后地点' : '武汉', state: '湖北', country: '中国' } }) };
    }
    throw new Error(`unexpected URL ${url}`);
  } },
};
const registrations = { ui: [], input: [], finalize: [], menu: [] };
global.ToolPkg = {
  registerToolboxUiModule: x => registrations.ui.push(x),
  registerPromptInputHook: x => registrations.input.push(x),
  registerPromptFinalizeHook: x => registrations.finalize.push(x),
  registerInputMenuTogglePlugin: x => registrations.menu.push(x),
};
(async () => {
  const shared = require('../dist/shared.js');
  const main = require('../dist/main.js');
  const settings = shared.saveSettings({
    masterEnabled: true,
    locationMode: 'manual',
    manualAddress: '武汉',
    customDeviceName: '启明的手机',
    boundCharacterCardIds: ['card-a', 'card-b', 'card-a'],
  });
  assert.deepEqual(settings.boundCharacterCardIds, ['card-a', 'card-b']);
  assert.equal(settings.weatherRefreshIntervalMinutes, 30);
  assert.equal(settings.locationRefreshIntervalMinutes, 10);
  const preview = await shared.buildEnvironmentPreview(settings);
  assert(preview.includes('设备名称: 启明的手机'));
  assert(!preview.includes('设备名称: V2505A'));
  const headings = ['【当前时间】', '【当前天气】', '【当前位置】', '【当前电量】', '【设备信息】'];
  const positions = headings.map(heading => preview.indexOf(heading));
  assert(positions.every(position => position >= 0));
  assert(positions.every((position, index) => index === 0 || position > positions[index - 1]));
  const locationSection = preview.slice(positions[2], positions[3]);
  assert(!locationSection.includes('坐标:'));
  assert(!locationSection.includes('时间:'));
  assert.equal(geocodingRequests, 1);
  assert.equal(weatherRequests, 1);
  failGeocoding = true;
  const cachedPreview = await shared.buildEnvironmentPreview(settings);
  assert(cachedPreview.includes('天气: 阴'));
  assert.equal(geocodingRequests, 1);
  assert.equal(weatherRequests, 1);
  const failedPreview = await shared.buildEnvironmentPreview(settings, true);
  failGeocoding = false;
  assert.equal(geocodingRequests, 2);
  assert.equal(weatherRequests, 1);
  const failedPositions = headings.map(heading => failedPreview.indexOf(heading));
  assert(failedPositions.every(position => position >= 0));
  assert(failedPositions.every((position, index) => index === 0 || position > failedPositions[index - 1]));
  assert(failedPreview.slice(failedPositions[1], failedPositions[2]).includes('错误:'));
  assert(failedPreview.slice(failedPositions[2], failedPositions[3]).includes('错误:'));
  const refreshedPreview = await shared.buildEnvironmentPreview(settings, true);
  assert(refreshedPreview.includes('天气: 阴'));
  assert.equal(geocodingRequests, 3);
  assert.equal(weatherRequests, 2);
  failOpenMeteo = true;
  const autoPreview = await shared.buildEnvironmentPreview({ ...settings, weatherProvider: 'auto' }, true);
  failOpenMeteo = false;
  assert(autoPreview.includes('来源: MET Norway'));
  assert(autoPreview.includes('天气容错: open-meteo: HTTP 503; 已使用 MET Norway'));
  assert.deepEqual(weatherProviderRequests.slice(-2), ['open-meteo', 'met-norway']);
  assert.equal(geocodingRequests, 4);
  assert.equal(weatherRequests, 4);
  const cachedAutoPreview = await shared.buildEnvironmentPreview({ ...settings, weatherProvider: 'auto' });
  assert(cachedAutoPreview.includes('来源: MET Norway'));
  assert.equal(geocodingRequests, 4);
  assert.equal(weatherRequests, 4);
  failOpenMeteo = true;
  failMetNorway = true;
  const finalFallbackPreview = await shared.buildEnvironmentPreview({ ...settings, weatherProvider: 'auto' }, true);
  failOpenMeteo = false;
  failMetNorway = false;
  assert(finalFallbackPreview.includes('来源: wttr.in'));
  assert(finalFallbackPreview.includes('open-meteo: HTTP 503'));
  assert(finalFallbackPreview.includes('met-norway: HTTP 502'));
  assert(finalFallbackPreview.includes('已使用 wttr.in'));
  assert.deepEqual(weatherProviderRequests.slice(-3), ['open-meteo', 'met-norway', 'wttr.in']);
  assert.equal(geocodingRequests, 5);
  assert.equal(weatherRequests, 7);

  const automaticSettings = {
    ...settings,
    locationMode: 'auto',
    reverseGeocodingProvider: 'nominatim',
    weatherProvider: 'wttr.in',
    injectWeather: true,
  };
  const firstAutomaticPreview = await shared.buildEnvironmentPreview(automaticSettings);
  assert(firstAutomaticPreview.includes('地址: 武汉 / 湖北 / 中国'));
  assert(firstAutomaticPreview.includes('来源: wttr.in'));
  assert.equal(locationRequests, 1);
  assert.equal(reverseGeocodingRequests, 1);
  assert.equal(weatherRequests, 8);
  const cachedAutomaticPreview = await shared.buildEnvironmentPreview(automaticSettings);
  assert(cachedAutomaticPreview.includes('地址: 武汉 / 湖北 / 中国'));
  assert.equal(locationRequests, 2);
  assert.equal(reverseGeocodingRequests, 1);
  assert.equal(weatherRequests, 8);
  currentLocation = { latitude: 31.2, longitude: 121.5, accuracy: 20, provider: 'gps' };
  const movedAutomaticPreview = await shared.buildEnvironmentPreview(automaticSettings);
  assert(movedAutomaticPreview.includes('地址: 移动后地点 / 湖北 / 中国'));
  assert(!movedAutomaticPreview.includes('武汉 / 湖北 / 中国'));
  assert(movedAutomaticPreview.includes('来源: wttr.in'));
  assert.equal(locationRequests, 3);
  assert.equal(reverseGeocodingRequests, 2);
  assert.equal(weatherRequests, 9);

  const compiledSharedSource = require('fs').readFileSync(require.resolve('../dist/shared.js'), 'utf8');
  assert(!compiledSharedSource.includes('formatCoordinates'));
  assert(!compiledSharedSource.includes('location.label || formatCoordinates'));
  assert.equal(shared.matchesBoundCharacterCard(settings, { type: 'character_card', id: 'card-a', name: '甲' }), true);
  assert.equal(shared.matchesBoundCharacterCard(settings, { type: 'character_card', id: 'other', name: '其他' }), false);
  assert.equal(await shared.appendEnvironmentToMessage('测试', { type: 'character_card', id: 'other', name: '其他' }), null);
  const matched = await shared.appendEnvironmentToMessage('测试', { type: 'character_card', id: 'card-a', name: '甲' });
  assert(matched.includes('Environment:'));
  const cards = await shared.listCharacterCards();
  assert.deepEqual(cards.map(x => x.id).sort(), ['card-a', 'card-b']);
  assert.equal(main.registerToolPkg(), true);
  const inputResult = await main.onPromptInput({ eventName: 'before_process', eventPayload: { stage: 'before_process', processedInput: '测试', metadata: { activePrompt: { type: 'character_card', id: 'card-a', name: '甲' } } } });
  assert(inputResult.includes('Environment:'));
  const blocked = await main.onPromptInput({ eventName: 'before_process', eventPayload: { stage: 'before_process', processedInput: '测试', metadata: { activePrompt: { type: 'character_card', id: 'other', name: '其他' } } } });
  assert.equal(blocked, null);
  const states = new Map();
  const UI = new Proxy({}, { get: (_t, type) => (props, children) => ({ type, props: props || {}, children: children || [] }) });
  const ctx = { UI, useState: (key, initial) => { if (!states.has(key)) states.set(key, initial); return [states.get(key), value => states.set(key, value)]; } };
  const tree = registrations.ui[0].screen(ctx);
  let text = JSON.stringify(tree);
  for (const label of ['自定义设备名称', '绑定角色卡', '清除角色卡限制', '按 Open-Meteo → MET Norway → wttr.in 顺序容错', 'OpenStreetMap 反向地址服务(支持简体中文，无代理可能失败)', '免密钥反向地址服务（支持繁体中文）', '基于 OpenStreetMap的反向地址服务(不支持中文)']) assert(text.includes(label), label);
  await tree.props.onLoad();
  const loadedTree = registrations.ui[0].screen(ctx);
  text = JSON.stringify(loadedTree);
  for (const cardName of ['甲', '乙']) assert(text.includes(cardName), cardName);
  assert(text.includes('天气刷新间隔（分钟，5–180）'));
  assert(text.includes('定位刷新间隔（分钟，5–60）'));
  assert(text.indexOf('刷新间隔') < text.indexOf('预览与测试'));
  assert.equal((text.match(/保存设置/g) || []).length, 4);
  const saveButtons = [];
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Button' && node.props?.text === '保存设置') saveButtons.push(node);
    if (Array.isArray(node.children)) node.children.forEach(visit);
  };
  visit(loadedTree);
  assert.equal(saveButtons.length, 4);
  for (const button of saveButtons) await button.props.onClick();
  const savedAfterButtons = shared.loadSettings();
  assert.equal(savedAfterButtons.customDeviceName, '启明的手机');
  assert.equal(savedAfterButtons.manualAddress, '武汉');
  assert.equal(savedAfterButtons.injectionTimeoutSeconds, 10);
  assert.equal(savedAfterButtons.weatherRefreshIntervalMinutes, 30);
  assert.equal(savedAfterButtons.locationRefreshIntervalMinutes, 10);
  assert(!text.includes('保存文本设置'));
  assert(!text.includes('保存超时和地址'));
  assert(!text.includes('修改后点击'));
  assert.equal(states.get('characterCardsLoading'), false);
  console.log('ENV_INJECTOR_V131_TEST_PASS', { states: states.size, contentLength: preview.length, cardsLoaded: 2, geocodingRequests, reverseGeocodingRequests, locationRequests, weatherRequests });
})().catch(error => { console.error(error); process.exitCode = 1; });