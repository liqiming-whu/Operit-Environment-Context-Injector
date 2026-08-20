import type { ComposeDslContext, ComposeNode } from "../../types/compose-dsl";
import {
  buildEnvironmentPreview,
  DEFAULT_SETTINGS,
  loadSettings,
  listCharacterCards,
  saveSettings,
  type CharacterCardOption,
  type EnvironmentInjectionSettings,
  type LocationMode,
  type ReverseGeocodingProvider,
  type WeatherProvider,
} from "../shared";

function state<T>(ctx: ComposeDslContext, key: string, initial: T) {
  const pair = ctx.useState<T>(key, initial);
  return { value: pair[0], set: pair[1] };
}

const surfaceStyle = {
  fillMaxWidth: true,
  shape: { cornerRadius: 10 },
  containerColor: "surfaceVariant",
  alpha: 0.42,
} as const;

function title(ctx: ComposeDslContext, icon: string, text: string): ComposeNode {
  return ctx.UI.Row({ verticalAlignment: "center" }, [
    ctx.UI.Icon({ name: icon, tint: "primary", size: 20 }),
    ctx.UI.Spacer({ width: 8 }),
    ctx.UI.Text({ text, style: "titleMedium", fontWeight: "bold", color: "primary" }),
  ]);
}

function divider(ctx: ComposeDslContext): ComposeNode {
  return ctx.UI.HorizontalDivider({ padding: { horizontal: 14 }, color: "outlineVariant" });
}

function toggle(
  ctx: ComposeDslContext,
  label: string,
  description: string,
  checked: boolean,
  onCheckedChange: (checked: boolean) => void,
  enabled = true
): ComposeNode {
  return ctx.UI.Row(
    {
      fillMaxWidth: true,
      padding: { horizontal: 14, vertical: 11 },
      verticalAlignment: "center",
      horizontalArrangement: "spaceBetween",
    },
    [
      ctx.UI.Column({ weight: 1, spacing: 3 }, [
        ctx.UI.Text({ text: label, style: "bodyMedium", fontWeight: "medium" }),
        ctx.UI.Text({ text: description, style: "bodySmall", color: "onSurfaceVariant" }),
      ]),
      ctx.UI.Spacer({ width: 12 }),
      ctx.UI.Switch({ checked, enabled, onCheckedChange }),
    ]
  );
}

function radio<T extends string>(
  ctx: ComposeDslContext,
  label: string,
  description: string,
  value: T,
  selected: T,
  onSelect: (value: T) => void
): ComposeNode {
  return ctx.UI.Row(
    { fillMaxWidth: true, padding: { horizontal: 14, vertical: 8 }, verticalAlignment: "center" },
    [
      ctx.UI.RadioButton({ selected: selected === value, onClick: () => onSelect(value) }),
      ctx.UI.Spacer({ width: 10 }),
      ctx.UI.Column({ weight: 1, spacing: 2 }, [
        ctx.UI.Text({ text: label, style: "bodyMedium" }),
        ctx.UI.Text({ text: description, style: "bodySmall", color: "onSurfaceVariant" }),
      ]),
    ]
  );
}

function card(ctx: ComposeDslContext, children: ComposeNode[]): ComposeNode {
  return ctx.UI.Surface(surfaceStyle, [ctx.UI.Column({ fillMaxWidth: true }, children)]);
}

export default function Screen(ctx: ComposeDslContext): ComposeNode {
  const initial = DEFAULT_SETTINGS;
  const master = state(ctx, "master", initial.masterEnabled);
  const persist = state(ctx, "persist", initial.persistInjectedContent);
  const timeout = state(ctx, "timeout", String(initial.injectionTimeoutSeconds));
  const weatherRefreshInterval = state(ctx, "weatherRefreshInterval", String(initial.weatherRefreshIntervalMinutes));
  const locationRefreshInterval = state(ctx, "locationRefreshInterval", String(initial.locationRefreshIntervalMinutes));
  const injectTime = state(ctx, "injectTime", initial.injectTime);
  const injectWeather = state(ctx, "injectWeather", initial.injectWeather);
  const injectLocation = state(ctx, "injectLocation", initial.injectLocation);
  const injectBattery = state(ctx, "injectBattery", initial.injectBattery);
  const injectDevice = state(ctx, "injectDevice", initial.injectDevice);
  const customDeviceName = state(ctx, "customDeviceName", initial.customDeviceName);
  const boundCharacterCardIds = state<string[]>(ctx, "boundCharacterCardIds", initial.boundCharacterCardIds);
  const availableCharacterCards = state<CharacterCardOption[]>(ctx, "availableCharacterCards", []);
  const characterCardsLoading = state(ctx, "characterCardsLoading", false);
  const locationMode = state<LocationMode>(ctx, "locationMode", initial.locationMode);
  const manualAddress = state(ctx, "manualAddress", initial.manualAddress);
  const precise = state(ctx, "precise", initial.usePreciseLocation);
  const reverse = state<ReverseGeocodingProvider>(ctx, "reverse", initial.reverseGeocodingProvider);
  const weather = state<WeatherProvider>(ctx, "weather", initial.weatherProvider);
  const preview = state(ctx, "preview", "尚未获取预览。点击下方按钮后只读取环境，不会写入聊天记录。");
  const status = state(ctx, "status", "");
  const running = state(ctx, "running", false);
  const initialized = state(ctx, "initialized", false);

  const sync = (next: EnvironmentInjectionSettings): void => {
    master.set(next.masterEnabled);
    persist.set(next.persistInjectedContent);
    timeout.set(String(next.injectionTimeoutSeconds));
    weatherRefreshInterval.set(String(next.weatherRefreshIntervalMinutes));
    locationRefreshInterval.set(String(next.locationRefreshIntervalMinutes));
    injectTime.set(next.injectTime);
    injectWeather.set(next.injectWeather);
    injectLocation.set(next.injectLocation);
    injectBattery.set(next.injectBattery);
    injectDevice.set(next.injectDevice);
    customDeviceName.set(next.customDeviceName);
    boundCharacterCardIds.set(next.boundCharacterCardIds);
    locationMode.set(next.locationMode);
    manualAddress.set(next.manualAddress);
    precise.set(next.usePreciseLocation);
    reverse.set(next.reverseGeocodingProvider);
    weather.set(next.weatherProvider);
  };

  const patch = (value: Partial<EnvironmentInjectionSettings>): void => {
    try {
      sync(saveSettings(value));
      status.set("");
    } catch (error) {
      status.set(`保存失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const current = (): EnvironmentInjectionSettings => ({
    masterEnabled: master.value,
    persistInjectedContent: persist.value,
    injectionTimeoutSeconds: Number(timeout.value),
    weatherRefreshIntervalMinutes: Number(weatherRefreshInterval.value),
    locationRefreshIntervalMinutes: Number(locationRefreshInterval.value),
    injectTime: injectTime.value,
    injectWeather: injectWeather.value,
    injectLocation: injectLocation.value,
    injectBattery: injectBattery.value,
    injectDevice: injectDevice.value,
    customDeviceName: customDeviceName.value,
    boundCharacterCardIds: boundCharacterCardIds.value,
    locationMode: locationMode.value,
    manualAddress: manualAddress.value,
    usePreciseLocation: precise.value,
    reverseGeocodingProvider: reverse.value,
    weatherProvider: weather.value,
  });

  const saveTimeout = (): boolean => {
    const seconds = Number(timeout.value.trim());
    if (!Number.isFinite(seconds) || seconds < 3 || seconds > 60) {
      status.set("注入超时必须是 3 至 60 秒之间的整数。");
      return false;
    }
    patch({ injectionTimeoutSeconds: Math.round(seconds) });
    status.set("设置已保存。");
    return true;
  };

  const saveRefreshIntervals = (): boolean => {
    const weatherMinutes = Number(weatherRefreshInterval.value.trim());
    const locationMinutes = Number(locationRefreshInterval.value.trim());
    if (!Number.isFinite(weatherMinutes) || weatherMinutes < 5 || weatherMinutes > 180) {
      status.set("天气刷新间隔必须是 5 至 180 分钟之间的整数。");
      return false;
    }
    if (!Number.isFinite(locationMinutes) || locationMinutes < 5 || locationMinutes > 60) {
      status.set("定位刷新间隔必须是 5 至 60 分钟之间的整数。");
      return false;
    }
    patch({
      weatherRefreshIntervalMinutes: Math.round(weatherMinutes),
      locationRefreshIntervalMinutes: Math.round(locationMinutes),
    });
    status.set("设置已保存。");
    return true;
  };

  const saveDeviceName = (): void => {
    patch({ customDeviceName: customDeviceName.value });
    status.set("设置已保存。");
  };

  const saveManualAddress = (): boolean => {
    if (!manualAddress.value.trim()) {
      status.set("手动地址不能为空。");
      return false;
    }
    patch({ manualAddress: manualAddress.value });
    status.set("设置已保存。");
    return true;
  };

  const applyPendingTextSettings = (): boolean => {
    if (!saveTimeout()) return false;
    if (locationMode.value === "manual" && !saveManualAddress()) return false;
    saveDeviceName();
    return true;
  };

  const toggleBoundCharacterCard = (cardId: string): void => {
    const next = boundCharacterCardIds.value.includes(cardId)
      ? boundCharacterCardIds.value.filter(id => id !== cardId)
      : [...boundCharacterCardIds.value, cardId];
    patch({ boundCharacterCardIds: next });
  };

  const runPreview = async (manualTest: boolean): Promise<void> => {
    if (running.value || !applyPendingTextSettings()) return;
    running.set(true);
    status.set(manualTest ? "正在手动测试环境采集…" : "正在生成预览…");
    const started = Date.now();
    try {
      const content = await buildEnvironmentPreview(current(), manualTest);
      preview.set(content || "没有启用任何注入项目。");
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);
      const partial = content.includes("错误:");
      status.set(manualTest
        ? `${partial ? "测试完成，但部分信息不可用" : "测试通过"}，耗时 ${elapsed} 秒。`
        : `预览已更新，耗时 ${elapsed} 秒。`);
    } catch (error) {
      status.set(`测试失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      running.set(false);
    }
  };

  const children: ComposeNode[] = [
    ctx.UI.Row({ verticalAlignment: "center" }, [
      ctx.UI.Icon({ name: "public", tint: "primary", size: 25 }),
      ctx.UI.Spacer({ width: 8 }),
      ctx.UI.Text({ text: "环境信息注入", style: "headlineSmall", fontWeight: "bold" }),
    ]),
    ctx.UI.Text({
      text: "仅注入时间、天气、地点、电量和设备信息。网络或权限失败会显示错误行，不阻塞消息发送。",
      style: "bodyMedium",
      color: "onSurfaceVariant",
    }),

    title(ctx, "settings", "注入规则"),
    card(ctx, [
      toggle(ctx, "启用环境信息注入", "与输入框菜单中的总开关联动", master.value, value => patch({ masterEnabled: value })),
      divider(ctx),
      toggle(ctx, "注入内容随消息保存", "开启：写入消息；关闭：只在发给模型前临时注入", persist.value, value => patch({ persistInjectedContent: value })),
      divider(ctx),
      ctx.UI.Column({ padding: { horizontal: 14, vertical: 12 }, spacing: 8 }, [
        ctx.UI.TextField({
          label: "注入总超时（秒）",
          value: timeout.value,
          onValueChange: timeout.set,
          singleLine: true,
        }),
        ctx.UI.Text({ text: "允许 3–60 秒，默认 10 秒。", style: "bodySmall", color: "onSurfaceVariant" }),
        ctx.UI.Button({ text: "保存设置", fillMaxWidth: true, onClick: () => { saveTimeout(); } }),
      ]),
    ]),

    title(ctx, "bolt", "注入项目"),
    card(ctx, [
      toggle(ctx, "时间", "本地日期、时间、时区和星期", injectTime.value, value => patch({ injectTime: value })),
      divider(ctx),
      toggle(ctx, "天气", "当前天气、温度、湿度和风速", injectWeather.value, value => patch({ injectWeather: value })),
      divider(ctx),
      toggle(ctx, "地点", "地址、精度和数据来源", injectLocation.value, value => patch({ injectLocation: value })),
      divider(ctx),
      toggle(ctx, "电量", "电池百分比与充电状态", injectBattery.value, value => patch({ injectBattery: value })),
      divider(ctx),
      toggle(ctx, "设备信息", "设备名称、型号和 Android 版本", injectDevice.value, value => patch({ injectDevice: value })),
    ]),

    title(ctx, "devices", "设备名称"),
    card(ctx, [
      ctx.UI.Column({ padding: { horizontal: 14, vertical: 12 }, spacing: 8 }, [
        ctx.UI.TextField({
          label: "自定义设备名称（可选）",
          placeholder: "例如：我的手机",
          value: customDeviceName.value,
          onValueChange: customDeviceName.set,
          singleLine: true,
        }),
        ctx.UI.Text({ text: "非空时优先使用自定义名称；留空时读取系统设备名称。", style: "bodySmall", color: "onSurfaceVariant" }),
        ctx.UI.Button({ text: "保存设置", fillMaxWidth: true, onClick: saveDeviceName }),
      ]),
    ]),

    title(ctx, "person", "绑定角色卡"),
    card(ctx, [
      ctx.UI.Column({ padding: { horizontal: 14, vertical: 12 }, spacing: 8 }, [
        ctx.UI.Text({
          text: boundCharacterCardIds.value.length === 0
            ? "当前不限制角色卡，所有对话都可注入。"
            : `已选择 ${boundCharacterCardIds.value.length} 张角色卡，仅这些角色卡可注入。`,
          style: "bodySmall",
          color: boundCharacterCardIds.value.length === 0 ? "onSurfaceVariant" : "primary",
        }),
        ...(characterCardsLoading.value
          ? [ctx.UI.Text({ text: "正在读取角色卡…", style: "bodySmall", color: "onSurfaceVariant" })]
          : availableCharacterCards.value.length
            ? availableCharacterCards.value.map(cardOption =>
                ctx.UI.Row({ key: `card-${cardOption.id}`, fillMaxWidth: true, verticalAlignment: "center", horizontalArrangement: "spaceBetween" }, [
                  ctx.UI.Text({ text: cardOption.name || cardOption.id, style: "bodyMedium", weight: 1 }),
                  ctx.UI.Checkbox({
                    checked: boundCharacterCardIds.value.includes(cardOption.id),
                    onCheckedChange: () => toggleBoundCharacterCard(cardOption.id),
                  }),
                ])
              )
            : [ctx.UI.Text({ text: "未读取到角色卡。可稍后重新打开设置页重试。", style: "bodySmall", color: "onSurfaceVariant" })]),
        ctx.UI.Button({
          text: "清除角色卡限制",
          enabled: boundCharacterCardIds.value.length > 0,
          fillMaxWidth: true,
          onClick: () => patch({ boundCharacterCardIds: [] }),
        }),
      ]),
    ]),

    title(ctx, "locationOn", "地点来源"),
    card(ctx, [
      radio(ctx, "设备自动定位", "调用 Operit 定位接口", "auto", locationMode.value, value => patch({ locationMode: value })),
      divider(ctx),
      radio(ctx, "手动地址", "先把地址转换为坐标，天气与地点共用", "manual", locationMode.value, value => patch({ locationMode: value })),
    ]),
  ];

  if (locationMode.value === "manual") {
    children.push(card(ctx, [
      ctx.UI.Column({ padding: { horizontal: 14, vertical: 12 }, spacing: 8 }, [
        ctx.UI.TextField({
          label: "手动地址",
          placeholder: "例如：武汉市洪山区",
          value: manualAddress.value,
          onValueChange: manualAddress.set,
          singleLine: true,
        }),
        ctx.UI.Button({ text: "保存设置", fillMaxWidth: true, onClick: () => { saveManualAddress(); } }),
      ]),
    ]));
  } else {
    children.push(card(ctx, [
      toggle(ctx, "高精度定位", "可能更慢、耗电更多，并需要相应权限", precise.value, value => patch({ usePreciseLocation: value })),
    ]));
    children.push(title(ctx, "map", "反向地址解析"));
    children.push(card(ctx, [
      radio(ctx, "Auto", "按 Nominatim → BigDataCloud → Photon 顺序容错", "auto", reverse.value, value => patch({ reverseGeocodingProvider: value })),
      divider(ctx),
      radio(ctx, "Nominatim", "OpenStreetMap 反向地址服务(支持简体中文，无代理可能失败)", "nominatim", reverse.value, value => patch({ reverseGeocodingProvider: value })),
      divider(ctx),
      radio(ctx, "BigDataCloud", "免密钥反向地址服务（支持繁体中文）", "bigdatacloud", reverse.value, value => patch({ reverseGeocodingProvider: value })),
      divider(ctx),
      radio(ctx, "Photon", "基于 OpenStreetMap的反向地址服务(不支持中文)", "photon", reverse.value, value => patch({ reverseGeocodingProvider: value })),
    ]));
  }

  children.push(title(ctx, "cloud", "天气供应商"));
  children.push(card(ctx, [
    radio(ctx, "Auto", "按 Open-Meteo → MET Norway → wttr.in 顺序容错", "auto", weather.value, value => patch({ weatherProvider: value })),
    divider(ctx),
    radio(ctx, "Open-Meteo", "默认天气源", "open-meteo", weather.value, value => patch({ weatherProvider: value })),
    divider(ctx),
    radio(ctx, "MET Norway", "失败时自动回退 Open-Meteo", "met-norway", weather.value, value => patch({ weatherProvider: value })),
    divider(ctx),
    radio(ctx, "wttr.in", "失败或超时时自动回退 Open-Meteo", "wttr.in", weather.value, value => patch({ weatherProvider: value })),
  ]));


  children.push(title(ctx, "schedule", "刷新间隔"));
  children.push(card(ctx, [
    ctx.UI.Column({ padding: { horizontal: 14, vertical: 12 }, spacing: 8 }, [
      ctx.UI.TextField({
        label: "天气刷新间隔（分钟，5–180）",
        value: weatherRefreshInterval.value,
        onValueChange: weatherRefreshInterval.set,
        singleLine: true,
      }),
      ctx.UI.Text({ text: "默认 30 分钟；普通预览和聊天注入在有效期内复用天气缓存。", style: "bodySmall", color: "onSurfaceVariant" }),
      ctx.UI.TextField({
        label: "定位刷新间隔（分钟，5–60）",
        value: locationRefreshInterval.value,
        onValueChange: locationRefreshInterval.set,
        singleLine: true,
      }),
      ctx.UI.Text({ text: "默认 10 分钟；自动模式按当前坐标复用地址解析，移动后自动切换；手动测试会强制刷新。", style: "bodySmall", color: "onSurfaceVariant" }),
      ctx.UI.Button({ text: "保存设置", fillMaxWidth: true, onClick: () => { saveRefreshIntervals(); } }),
    ]),
  ]));

  children.push(title(ctx, "visibility", "预览与测试"));
  children.push(ctx.UI.Row({ fillMaxWidth: true, horizontalArrangement: "spaceBetween" }, [
    ctx.UI.Button({ text: running.value ? "处理中…" : "更新注入预览", enabled: !running.value, weight: 1, onClick: () => runPreview(false) }),
    ctx.UI.Spacer({ width: 10 }),
    ctx.UI.Button({ text: running.value ? "处理中…" : "手动测试", enabled: !running.value, weight: 1, onClick: () => runPreview(true) }),
  ]));

  if (status.value) {
    children.push(ctx.UI.Card({ fillMaxWidth: true, containerColor: status.value.includes("失败") ? "errorContainer" : "primaryContainer" }, [
      ctx.UI.Text({ text: status.value, padding: 12, style: "bodyMedium" }),
    ]));
  }

  children.push(ctx.UI.Card({ fillMaxWidth: true, containerColor: "surface", shape: { cornerRadius: 10 } }, [
    ctx.UI.Column({ padding: 14, spacing: 8 }, [
      ctx.UI.Text({ text: "注入内容预览", style: "titleSmall", fontWeight: "bold" }),
      ctx.UI.Text({ text: preview.value, style: "bodySmall", color: "onSurfaceVariant" }),
    ]),
  ]));

  children.push(ctx.UI.Card({ fillMaxWidth: true, containerColor: "secondaryContainer" }, [
    ctx.UI.Text({
      padding: 12,
      text: `${master.value ? "已启用" : "已关闭"}；${persist.value ? "随消息保存" : "仅临时发给模型"}；角色卡：${boundCharacterCardIds.value.length ? `限定 ${boundCharacterCardIds.value.length} 张` : "不限制"}；设备名：${customDeviceName.value.trim() || "系统名称"}；地点：${locationMode.value === "auto" ? "自动定位" : manualAddress.value || "未填写"}；天气：${weather.value}。`,
      style: "bodySmall",
      color: "onSecondaryContainer",
    }),
  ]));

  return ctx.UI.LazyColumn(
    {
      fillMaxSize: true,
      padding: 16,
      spacing: 14,
      onLoad: async () => {
        if (!initialized.value) {
          initialized.set(true);
          sync(loadSettings());
          characterCardsLoading.set(true);
          try {
            availableCharacterCards.set(await listCharacterCards());
          } finally {
            characterCardsLoading.set(false);
          }
        }
      },
    },
    children
  );
}