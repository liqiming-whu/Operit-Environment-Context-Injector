const assert = require('assert');
let stored = '';
class MockDate { constructor(v) { this.v = v; } }
class MockSdf { constructor(fmt) { this.fmt = fmt; } format() { return this.fmt === 'EEEE' ? '星期三' : '2026-08-19 12:00:00'; } }
const prefs = { getString: () => stored, edit: () => ({ putString: (_k, v) => ({ apply: () => { stored = v; } }) }) };
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
  System: { getLocation: async () => ({ latitude: 30.6, longitude: 114.1, accuracy: 30, provider: 'network', timestamp: Date.now() }) },
  Net: { http: async ({ url }) => {
    if (url.includes('geocoding-api')) return { statusCode: 200, content: JSON.stringify({ results: [{ latitude: 30.6, longitude: 114.1, name: '武汉', admin1: '湖北', country: '中国' }] }) };
    if (url.includes('forecast')) return { statusCode: 200, content: JSON.stringify({ current: { temperature_2m: 33, relative_humidity_2m: 61, apparent_temperature: 40, weather_code: 3, wind_speed_10m: 8, wind_direction_10m: 45 } }) };
    if (url.includes('nominatim')) return { statusCode: 200, content: JSON.stringify({ address: { city: '武汉', state: '湖北', country: '中国' } }) };
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
  const preview = await shared.buildEnvironmentPreview(settings);
  assert(preview.includes('设备名称: 启明的手机'));
  assert(!preview.includes('设备名称: V2505A'));
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
  for (const label of ['自定义设备名称', '绑定角色卡', '清除角色卡限制']) assert(text.includes(label), label);
  await tree.props.onLoad();
  const loadedTree = registrations.ui[0].screen(ctx);
  text = JSON.stringify(loadedTree);
  for (const cardName of ['甲', '乙']) assert(text.includes(cardName), cardName);
  assert.equal((text.match(/保存设置/g) || []).length, 3);
  const saveButtons = [];
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Button' && node.props?.text === '保存设置') saveButtons.push(node);
    if (Array.isArray(node.children)) node.children.forEach(visit);
  };
  visit(loadedTree);
  assert.equal(saveButtons.length, 3);
  for (const button of saveButtons) await button.props.onClick();
  const savedAfterButtons = shared.loadSettings();
  assert.equal(savedAfterButtons.customDeviceName, '启明的手机');
  assert.equal(savedAfterButtons.manualAddress, '武汉');
  assert.equal(savedAfterButtons.injectionTimeoutSeconds, 10);
  assert(!text.includes('保存文本设置'));
  assert(!text.includes('保存超时和地址'));
  assert(!text.includes('修改后点击'));
  assert.equal(states.get('characterCardsLoading'), false);
  console.log('ENV_INJECTOR_V110_TEST_PASS', { states: states.size, contentLength: preview.length, cardsLoaded: 2 });
})().catch(error => { console.error(error); process.exitCode = 1; });