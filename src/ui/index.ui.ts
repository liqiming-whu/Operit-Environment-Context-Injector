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
import type { AnniversarySetting, CycleOwner } from "../wellbeing";

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
  const injectCalendar = state(ctx, "injectCalendar", initial.injectCalendar);
  const anniversariesEnabled = state(ctx, "anniversariesEnabled", initial.anniversariesEnabled);
  const cycleEnabled = state(ctx, "cycleEnabled", initial.cycleEnabled);
  const pregnancyEnabled = state(ctx, "pregnancyEnabled", initial.pregnancyEnabled);
  const customDeviceName = state(ctx, "customDeviceName", initial.customDeviceName);
  const userName = state(ctx, "userName", initial.userName);
  const characterName = state(ctx, "characterName", initial.characterName);
  const countryCode = state(ctx, "countryCode", initial.countryCode);
  const userBirthday = state(ctx, "userBirthday", initial.userBirthday);
  const characterBirthday = state(ctx, "characterBirthday", initial.characterBirthday);
  const anniversaries = state<AnniversarySetting[]>(ctx, "anniversaries", initial.anniversaries);
  const anniversaryName = state(ctx, "anniversaryName", "");
  const anniversaryDate = state(ctx, "anniversaryDate", "");
  const userCycleStartDate = state(ctx, "userCycleStartDate", initial.userCycleStartDate);
  const userCycleLength = state(ctx, "userCycleLength", String(initial.userCycleLength));
  const userPeriodDuration = state(ctx, "userPeriodDuration", String(initial.userPeriodDuration));
  const characterCycleStartDate = state(ctx, "characterCycleStartDate", initial.characterCycleStartDate);
  const characterCycleLength = state(ctx, "characterCycleLength", String(initial.characterCycleLength));
  const characterPeriodDuration = state(ctx, "characterPeriodDuration", String(initial.characterPeriodDuration));
  const pregnancyOwner = state<CycleOwner>(ctx, "pregnancyOwner", initial.pregnancyOwner);
  const pregnancyStartDate = state(ctx, "pregnancyStartDate", initial.pregnancyStartDate);
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
  const statusTarget = state(ctx, "statusTarget", "");
  const anniversaryDates = state<Record<string, string>>(ctx, "anniversaryDates", {});
  const notify = (target: string, text: string): void => {
    statusTarget.set(target);
    status.set(text);
  };
  // Pure render helper: only the action's own feedback entry is visible.
  const feedback = (target: string): ComposeNode[] => status.value && statusTarget.value === target
    ? [ctx.UI.Text({ text: status.value, style: "bodySmall", color: "onSurfaceVariant" })]
    : [];
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
    injectCalendar.set(next.injectCalendar);
    anniversariesEnabled.set(next.anniversariesEnabled);
    cycleEnabled.set(next.cycleEnabled);
    pregnancyEnabled.set(next.pregnancyEnabled);
    customDeviceName.set(next.customDeviceName);
    userName.set(next.userName);
    characterName.set(next.characterName);
    countryCode.set(next.countryCode);
    userBirthday.set(next.userBirthday);
    characterBirthday.set(next.characterBirthday);
    anniversaries.set(next.anniversaries);
    userCycleStartDate.set(next.userCycleStartDate);
    userCycleLength.set(String(next.userCycleLength));
    userPeriodDuration.set(String(next.userPeriodDuration));
    characterCycleStartDate.set(next.characterCycleStartDate);
    characterCycleLength.set(String(next.characterCycleLength));
    characterPeriodDuration.set(String(next.characterPeriodDuration));
    pregnancyOwner.set(next.pregnancyOwner);
    pregnancyStartDate.set(next.pregnancyStartDate);
    boundCharacterCardIds.set(next.boundCharacterCardIds);
    locationMode.set(next.locationMode);
    manualAddress.set(next.manualAddress);
    precise.set(next.usePreciseLocation);
    reverse.set(next.reverseGeocodingProvider);
    weather.set(next.weatherProvider);
  };

  const patch = (value: Partial<EnvironmentInjectionSettings>, target = "general", success = ""): boolean => {
    try {
      sync(saveSettings(value));
      notify(target, success);
      return true;
    } catch (error) {
      notify(target, `保存失败: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  };

  const saveTimeout = (): boolean => {
    const seconds = Number(timeout.value.trim());
    if (!Number.isFinite(seconds) || seconds < 3 || seconds > 60) {
      notify("timeout", "注入超时必须是 3 至 60 秒之间的整数。");
      return false;
    }
    return patch({ injectionTimeoutSeconds: Math.round(seconds) }, "timeout", "设置已保存。");
  };

  const saveRefreshIntervals = (): boolean => {
    const weatherMinutes = Number(weatherRefreshInterval.value.trim());
    const locationMinutes = Number(locationRefreshInterval.value.trim());
    if (!Number.isFinite(weatherMinutes) || weatherMinutes < 5 || weatherMinutes > 180) {
      notify("refresh", "天气刷新间隔必须是 5 至 180 分钟之间的整数。");
      return false;
    }
    if (!Number.isFinite(locationMinutes) || locationMinutes < 5 || locationMinutes > 60) {
      notify("refresh", "定位刷新间隔必须是 5 至 60 分钟之间的整数。");
      return false;
    }
    return patch({
      weatherRefreshIntervalMinutes: Math.round(weatherMinutes),
      locationRefreshIntervalMinutes: Math.round(locationMinutes),
    }, "refresh", "设置已保存。");
  };

  const saveDeviceName = (): void => {
    patch({ customDeviceName: customDeviceName.value }, "device", "设置已保存。");
  };

  const saveManualAddress = (): boolean => {
    if (!manualAddress.value.trim()) {
      notify("address", "手动地址不能为空。");
      return false;
    }
    return patch({ manualAddress: manualAddress.value }, "address", "设置已保存。");
  };

  const toggleBoundCharacterCard = (cardId: string): void => {
    const next = boundCharacterCardIds.value.includes(cardId)
      ? boundCharacterCardIds.value.filter(id => id !== cardId)
      : [...boundCharacterCardIds.value, cardId];
    const selectedCard = next.length === 1 ? availableCharacterCards.value.find(card => card.id === next[0]) : null;
    patch({
      boundCharacterCardIds: next,
      ...(selectedCard?.name ? { characterName: selectedCard.name } : {}),
    });
  };

  const validOptionalDate = (value: string): boolean => !value.trim() || /^(?:\d{4}-)?\d{2}-\d{2}$/.test(value.trim());
  const validOptionalFullDate = (value: string): boolean => !value.trim() || /^\d{4}-\d{2}-\d{2}$/.test(value.trim());

  const saveIdentityAndDates = (): boolean => {
    if (!validOptionalDate(userBirthday.value) || !validOptionalDate(characterBirthday.value)) {
      notify("identity", "生日必须使用 MM-DD 或 YYYY-MM-DD 格式，或留空。");
      return false;
    }
    if (!/^[A-Za-z]{2}$/.test(countryCode.value.trim())) {
      notify("identity", "国家/地区代码必须是两个英文字母，例如 CN、US、JP。");
      return false;
    }
    return patch({
      userName: userName.value,
      characterName: characterName.value,
      countryCode: countryCode.value.toUpperCase(),
      userBirthday: userBirthday.value,
      characterBirthday: characterBirthday.value,
    }, "identity", "名称、地区和生日设置已保存。");
  };

  const saveWellbeing = (): boolean => {
    if (![userCycleStartDate.value, characterCycleStartDate.value, pregnancyStartDate.value].every(validOptionalFullDate)) {
      notify("wellbeing", "经期起始日期和怀孕时间必须使用 YYYY-MM-DD 格式，或留空。");
      return false;
    }
    for (const [label, value, min, max] of [
      ["用户周期", userCycleLength.value, 15, 60], ["用户经期持续", userPeriodDuration.value, 1, 14],
      ["角色周期", characterCycleLength.value, 15, 60], ["角色经期持续", characterPeriodDuration.value, 1, 14],
    ] as Array<[string, string, number, number]>) {
      const number = Number(value);
      if (!Number.isFinite(number) || number < min || number > max) {
        notify("wellbeing", `${label}必须是 ${min} 至 ${max} 之间的整数。`);
        return false;
      }
    }
    return patch({
      userCycleStartDate: userCycleStartDate.value,
      userCycleLength: Number(userCycleLength.value),
      userPeriodDuration: Number(userPeriodDuration.value),
      characterCycleStartDate: characterCycleStartDate.value,
      characterCycleLength: Number(characterCycleLength.value),
      characterPeriodDuration: Number(characterPeriodDuration.value),
      pregnancyOwner: pregnancyOwner.value,
      pregnancyStartDate: pregnancyStartDate.value,
    }, "wellbeing", "生理状态设置已保存。");
  };

  const addAnniversary = (): void => {
    const name = anniversaryName.value.trim();
    const date = anniversaryDate.value.trim();
    if (!name || !/^(?:\d{4}-)?\d{2}-\d{2}$/.test(date)) {
      notify("anniversary", "请填写纪念日名称，以及 MM-DD 或 YYYY-MM-DD 格式的日期。");
      return;
    }
    const next = [...anniversaries.value, { id: `event-${Date.now()}`, name, date, type: "anniversary" as const }];
    if (!patch({ anniversaries: next }, "anniversary", "纪念日已添加。")) return;
    anniversaryName.set("");
    anniversaryDate.set("");
  };

  const saveAnniversaryDate = (event: AnniversarySetting): void => {
    const date = (anniversaryDates.value[event.id] ?? event.date).trim();
    const target = `anniversary-${event.id}`;
    if (!validOptionalDate(date)) {
      notify(target, "纪念日日期必须使用 MM-DD 或 YYYY-MM-DD 格式，或留空。");
      return;
    }
    patch({ anniversaries: anniversaries.value.map(item => item.id === event.id ? { ...item, date } : item) },
      date ? target : "anniversary", date ? "纪念日已保存。" : "纪念日日期已清空，不再注入。");
  };

  const applyPendingTextSettings = (): boolean => {
    const seconds = Number(timeout.value.trim());
    if (!Number.isFinite(seconds) || seconds < 3 || seconds > 60) {
      notify("timeout", "注入超时必须是 3 至 60 秒之间的整数。");
      return false;
    }
    if (locationMode.value === "manual" && !manualAddress.value.trim()) {
      notify("address", "手动地址不能为空。");
      return false;
    }
    if (!validOptionalDate(userBirthday.value) || !validOptionalDate(characterBirthday.value)) {
      notify("identity", "生日必须使用 MM-DD 或 YYYY-MM-DD 格式，或留空。");
      return false;
    }
    if (!/^[A-Za-z]{2}$/.test(countryCode.value.trim())) {
      notify("identity", "国家/地区代码必须是两个英文字母，例如 CN、US、JP。");
      return false;
    }
    if (![userCycleStartDate.value, characterCycleStartDate.value, pregnancyStartDate.value].every(validOptionalFullDate)) {
      notify("wellbeing", "经期起始日期和怀孕时间必须使用 YYYY-MM-DD 格式，或留空。");
      return false;
    }
    for (const [label, value, min, max] of [
      ["用户周期", userCycleLength.value, 15, 60], ["用户经期持续", userPeriodDuration.value, 1, 14],
      ["角色周期", characterCycleLength.value, 15, 60], ["角色经期持续", characterPeriodDuration.value, 1, 14],
    ] as Array<[string, string, number, number]>) {
      const number = Number(value);
      if (!Number.isFinite(number) || number < min || number > max) {
        notify("wellbeing", `${label}必须是 ${min} 至 ${max} 之间的整数。`);
        return false;
      }
    }
    try {
      sync(saveSettings({
        injectionTimeoutSeconds: Math.round(seconds),
        customDeviceName: customDeviceName.value,
        manualAddress: manualAddress.value,
        userName: userName.value,
        characterName: characterName.value,
        countryCode: countryCode.value.toUpperCase(),
        userBirthday: userBirthday.value,
        characterBirthday: characterBirthday.value,
        userCycleStartDate: userCycleStartDate.value,
        userCycleLength: Number(userCycleLength.value),
        userPeriodDuration: Number(userPeriodDuration.value),
        characterCycleStartDate: characterCycleStartDate.value,
        characterCycleLength: Number(characterCycleLength.value),
        characterPeriodDuration: Number(characterPeriodDuration.value),
        pregnancyOwner: pregnancyOwner.value,
        pregnancyStartDate: pregnancyStartDate.value,
      }));
      return true;
    } catch (error) {
      notify("preview", `保存失败: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  };

  const runPreview = async (manualTest: boolean): Promise<void> => {
    if (running.value || !applyPendingTextSettings()) return;
    running.set(true);
    notify("preview", manualTest ? "正在手动测试环境采集…" : "正在生成预览…");
    const started = Date.now();
    try {
      const content = await buildEnvironmentPreview(loadSettings(), manualTest);
      preview.set(content || "没有启用任何注入项目。");
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);
      const partial = content.includes("错误:");
      notify("preview", manualTest
        ? `${partial ? "测试完成，但部分信息不可用" : "测试通过"}，耗时 ${elapsed} 秒。`
        : `预览已更新，耗时 ${elapsed} 秒。`);
    } catch (error) {
      notify("preview", `测试失败: ${error instanceof Error ? error.message : String(error)}`);
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
      text: "注入现实环境、日历、生日与纪念日、经期和孕期信息。使用普通名称字段，不依赖宏占位符；网络或权限失败不会阻塞消息发送。",
      style: "bodyMedium",
      color: "onSurfaceVariant",
    }),

    title(ctx, "settings", "注入规则"),
    ...feedback("general"),
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
        ...feedback("timeout"),
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
      divider(ctx),
      toggle(ctx, "日历", "星期、工作日/节假日、农历和下个节假日", injectCalendar.value, value => patch({ injectCalendar: value })),
      divider(ctx),
      toggle(ctx, "生日和纪念日", "用户、角色生日与自定义纪念日", anniversariesEnabled.value, value => patch({ anniversariesEnabled: value })),
      divider(ctx),
      toggle(ctx, "经期", "分别推算用户和角色的最近及下次经期", cycleEnabled.value, value => patch({ cycleEnabled: value })),
      divider(ctx),
      toggle(ctx, "孕期", "按怀孕时间计算孕周、阶段和预产期", pregnancyEnabled.value, value => patch({ pregnancyEnabled: value })),
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
        ...feedback("device"),
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
          onClick: () => { patch({ boundCharacterCardIds: [] }); },
        }),
      ]),
    ]),

    title(ctx, "badge", "名称、地区与生日"),
    card(ctx, [
      ctx.UI.Column({ padding: { horizontal: 14, vertical: 12 }, spacing: 8 }, [
        ctx.UI.TextField({ label: "用户名称", placeholder: "例如：小明", value: userName.value, onValueChange: userName.set, singleLine: true }),
        ctx.UI.TextField({ label: "角色名称", placeholder: "单卡绑定时会自动带入，也可手动填写", value: characterName.value, onValueChange: characterName.set, singleLine: true }),
        ctx.UI.Text({ text: "实际聊天注入优先使用当前活动角色卡名称；无法获取时使用这里的角色名称。Operit 不使用用户或角色宏占位符。", style: "bodySmall", color: "onSurfaceVariant" }),
        ctx.UI.TextField({ label: "国家/地区代码", placeholder: "CN", value: countryCode.value, onValueChange: countryCode.set, singleLine: true }),
        ctx.UI.Text({ text: "CN 使用内置 chinese-days；其他两字母代码使用 Nager.Date 公共 API。", style: "bodySmall", color: "onSurfaceVariant" }),
        ctx.UI.TextField({ label: "用户生日", placeholder: "MM-DD 或 YYYY-MM-DD；留空不注入", value: userBirthday.value, onValueChange: userBirthday.set, singleLine: true }),
        ctx.UI.TextField({ label: "角色生日", placeholder: "MM-DD 或 YYYY-MM-DD；留空不注入", value: characterBirthday.value, onValueChange: characterBirthday.set, singleLine: true }),
        ...feedback("identity"),
        ctx.UI.Button({ text: "保存名称、地区和生日", fillMaxWidth: true, onClick: () => { saveIdentityAndDates(); } }),
      ]),
    ]),

    title(ctx, "event", "自定义纪念日"),
    card(ctx, [
      ctx.UI.Column({ padding: { horizontal: 14, vertical: 12 }, spacing: 8 }, [
        ctx.UI.TextField({ label: "纪念日名称", placeholder: "例如：相识日", value: anniversaryName.value, onValueChange: anniversaryName.set, singleLine: true }),
        ctx.UI.TextField({ label: "纪念日日期", placeholder: "MM-DD 或 YYYY-MM-DD", value: anniversaryDate.value, onValueChange: anniversaryDate.set, singleLine: true }),
        ...feedback("anniversary"),
        ctx.UI.Button({ text: "添加纪念日", fillMaxWidth: true, onClick: addAnniversary }),
        ...(anniversaries.value.length
          ? anniversaries.value.map(event => ctx.UI.Column({ key: `event-${event.id}`, fillMaxWidth: true, spacing: 8 }, [
              ctx.UI.Text({ text: event.name, style: "bodyMedium" }),
              ctx.UI.TextField({
                label: "已保存的纪念日日期（留空不注入）",
                placeholder: "MM-DD 或 YYYY-MM-DD",
                value: anniversaryDates.value[event.id] ?? event.date,
                onValueChange: value => anniversaryDates.set({ ...anniversaryDates.value, [event.id]: value }),
                singleLine: true,
              }),
              ...feedback(`anniversary-${event.id}`),
              ctx.UI.Button({ text: "保存纪念日日期", fillMaxWidth: true, onClick: () => saveAnniversaryDate(event) }),
              ctx.UI.Button({
                text: "删除",
                onClick: () => { patch({ anniversaries: anniversaries.value.filter(item => item.id !== event.id) }, "anniversary", "纪念日已删除，不再注入。"); },
              }),
            ]))
          : [ctx.UI.Text({ text: "尚未添加自定义纪念日。", style: "bodySmall", color: "onSurfaceVariant" })]),
      ]),
    ]),

    title(ctx, "favorite", "经期与孕期"),
    card(ctx, [
      ctx.UI.Column({ padding: { horizontal: 14, vertical: 12 }, spacing: 8 }, [
        ctx.UI.Text({ text: "用户经期", style: "titleSmall", fontWeight: "bold" }),
        ctx.UI.TextField({ label: "任意一次已知经期起始日期（留空不注入）", placeholder: "YYYY-MM-DD", value: userCycleStartDate.value, onValueChange: userCycleStartDate.set, singleLine: true }),
        ctx.UI.TextField({ label: "周期时间（天，15–60）", value: userCycleLength.value, onValueChange: userCycleLength.set, singleLine: true }),
        ctx.UI.TextField({ label: "持续时间（天，1–14）", value: userPeriodDuration.value, onValueChange: userPeriodDuration.set, singleLine: true }),
        divider(ctx),
        ctx.UI.Text({ text: "角色经期", style: "titleSmall", fontWeight: "bold" }),
        ctx.UI.TextField({ label: "任意一次已知经期起始日期（留空不注入）", placeholder: "YYYY-MM-DD", value: characterCycleStartDate.value, onValueChange: characterCycleStartDate.set, singleLine: true }),
        ctx.UI.TextField({ label: "周期时间（天，15–60）", value: characterCycleLength.value, onValueChange: characterCycleLength.set, singleLine: true }),
        ctx.UI.TextField({ label: "持续时间（天，1–14）", value: characterPeriodDuration.value, onValueChange: characterPeriodDuration.set, singleLine: true }),
        ctx.UI.Text({ text: "经期启用后会注入最近一次经期，以及下次预计月经来潮和结束日期。", style: "bodySmall", color: "onSurfaceVariant" }),
        divider(ctx),
        ctx.UI.Text({ text: "孕期对象", style: "titleSmall", fontWeight: "bold" }),
        radio(ctx, "用户", "按用户名称注入", "user", pregnancyOwner.value, value => pregnancyOwner.set(value)),
        radio(ctx, "角色", "按当前或手动角色名称注入", "character", pregnancyOwner.value, value => pregnancyOwner.set(value)),
        ctx.UI.TextField({ label: "怀孕时间", placeholder: "YYYY-MM-DD；留空不注入", value: pregnancyStartDate.value, onValueChange: pregnancyStartDate.set, singleLine: true }),
        ctx.UI.Text({ text: "孕期有效时，对应对象不会重复注入经期状态。", style: "bodySmall", color: "onSurfaceVariant" }),
        ...feedback("wellbeing"),
        ctx.UI.Button({ text: "保存经期和孕期", fillMaxWidth: true, onClick: () => { saveWellbeing(); } }),
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
        ...feedback("address"),
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
      ...feedback("refresh"),
      ctx.UI.Button({ text: "保存设置", fillMaxWidth: true, onClick: () => { saveRefreshIntervals(); } }),
    ]),
  ]));

  children.push(title(ctx, "visibility", "预览与测试"));
  children.push(...feedback("preview"));
  children.push(ctx.UI.Row({ fillMaxWidth: true, horizontalArrangement: "spaceBetween" }, [
    ctx.UI.Button({ text: running.value ? "处理中…" : "更新注入预览", enabled: !running.value, weight: 1, onClick: () => runPreview(false) }),
    ctx.UI.Spacer({ width: 10 }),
    ctx.UI.Button({ text: running.value ? "处理中…" : "手动测试", enabled: !running.value, weight: 1, onClick: () => runPreview(true) }),
  ]));

  children.push(ctx.UI.Card({ fillMaxWidth: true, containerColor: "surface", shape: { cornerRadius: 10 } }, [
    ctx.UI.Column({ padding: 14, spacing: 8 }, [
      ctx.UI.Text({ text: "注入内容预览", style: "titleSmall", fontWeight: "bold" }),
      ctx.UI.Text({ text: preview.value, style: "bodySmall", color: "onSurfaceVariant" }),
    ]),
  ]));

  children.push(ctx.UI.Card({ fillMaxWidth: true, containerColor: "secondaryContainer" }, [
    ctx.UI.Text({
      padding: 12,
      text: `${master.value ? "已启用" : "已关闭"}；${persist.value ? "随消息保存" : "仅临时发给模型"}；角色卡：${boundCharacterCardIds.value.length ? `限定 ${boundCharacterCardIds.value.length} 张` : "不限制"}；名称：${userName.value || "用户"}/${characterName.value || "角色"}；日历：${injectCalendar.value ? countryCode.value || "CN" : "关闭"}；纪念日：${anniversariesEnabled.value ? `${anniversaries.value.length} 个自定义` : "关闭"}；经期：${cycleEnabled.value ? "开启" : "关闭"}；孕期：${pregnancyEnabled.value ? "开启" : "关闭"}；设备名：${customDeviceName.value.trim() || "系统名称"}；地点：${locationMode.value === "auto" ? "自动定位" : manualAddress.value || "未填写"}；天气：${weather.value}。`,
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
