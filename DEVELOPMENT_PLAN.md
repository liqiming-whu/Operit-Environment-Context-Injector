# 开发计划

## 目标

基于 Operit 官方 message_insert 开发独立环境上下文 ToolPkg，注入现实环境、日历、生日与纪念日、经期和孕期信息，不引入 Operit 不支持的宏占位符。

## 成功标准

- 保留总开关、随消息保存、注入总超时（默认 10 秒）和原五个环境项目开关。
- 新增日历、生日与纪念日、双对象经期和孕期开关及设置。
- 使用普通用户名称和角色名称；实际注入优先取活动角色卡名称，缺失时回退手动角色名称，不注册宏。
- 设备名称支持用户自定义，非空时覆盖系统设备名称。
- 注入可绑定一张或多张角色卡；未选择时不限制角色卡。
- 地点支持手动地址与自动定位，高精度开关仅自动定位生效。
- 反向地址解析支持 auto/Nominatim/BigDataCloud/Photon。
- 天气支持 auto/Open-Meteo/MET Norway/wttr.in；auto 按 Open-Meteo → MET Norway → wttr.in 顺序容错。
- 天气和位置/地址分别缓存，支持可配置刷新间隔；自动定位先读取当前坐标并按坐标区分缓存，手动测试强制刷新。
- 设置 UI 提供动态规则摘要、注入内容预览和手动测试。
- 同一次注入中天气与地点复用一个位置快照。
- 生成一个显性文本附件；关闭保存时仅发给模型、不落聊天历史。
- TypeScript 编译、静态检查、ToolPkg 安装、UI、工具箱菜单和真实消息 Hook 通过。

## 当前状态

- [x] 核对官方 message_insert 的 Prompt Hook、附件格式、SharedPreferences 和 Compose UI。
- [x] 核对 SillyTavern Environment Context v1.3.0 的三天气源与三反向解析设计。
- [x] 实现共享设置、采集、天气、地址和附件构建。
- [x] 实现设置 UI、条件显隐、预览和手动测试。
- [x] TypeScript 编译、产物语法检查、模拟宿主测试、包结构检查和 ToolPkg 调试安装。
- [x] v1.0.0 重启 Operit 后完成设置页真机交互、真实定位/天气、菜单联动和两种消息 Hook 回归；用户确认测试功能正常，真实附件包含五类信息。
- [x] v1.1.0 实现自定义设备名称与角色卡多选绑定，编译及自动测试通过。
- [x] v1.1.0 ToolPkg编译、归档检查、烧录和安装文件一致性通过。
- [x] v1.1.1 为超时、自定义设备名称和手动地址提供统一命名的“保存设置”按钮，并移除过时说明。
- [x] v1.1.2 固定注入顺序为时间、天气、位置、电量、设备，并从位置块移除坐标和时间。
- [x] v1.2.0 实现天气与位置/地址缓存、配置隔离、刷新间隔设置和手动测试强制刷新。
- [x] v1.2.0 自动测试覆盖缓存命中、强制刷新、真实网络调用计数、刷新间隔 UI 顺序与保存按钮。
- [x] v1.3.0 新增天气 Auto 模式及 Open-Meteo → MET Norway → wttr.in 顺序容错，并覆盖 UI、调用顺序、逐级回退和缓存测试。
- [x] v1.3.1 移除天气块坐标回退，并修复自动定位缓存未按实际坐标隔离的问题；增加移动和同位置缓存回归测试。
- [x] v1.3.2 补充 Nominatim、BigDataCloud、Photon 反向地址服务的语言支持和代理限制说明，并增加 UI 测试。
- [x] v2.0.0 实现三类注入分块、日历、生日与自定义纪念日、用户/角色双对象经期、孕期、普通名称字段和活动角色名称优先级。
- [x] v2.0.0 避免迁移 SillyTavern 宏注册及用户/角色宏占位符；中国日历 vendored chinese-days，国际日历使用有界 Nager.Date。
- [x] TypeScript 编译、产物语法、模拟宿主、三分块、名称优先级、无宏残留和新增 UI 字段测试通过。
- [x] v2.0.0 编译、8 文件运行包归档、ToolPkg 烧录、启用、加载错误检查和安装归档一致性通过。
- [ ] 重启 Operit，验证真实设置页、角色卡绑定、预览和两种 Prompt Hook 注入。

## v2.0.1 保存与清空修订
- [x] 回归生日、经期、孕期空值保存及重新加载后不注入，保留共享开关。
- [x] 已保存纪念日支持日期编辑与清空移除，用户名称/经期文案更新。
- [x] 保存按钮前局部反馈，删除旧统一反馈卡片；写入失败不误报成功。
- [x] TypeScript 与模拟宿主/UI 动作回归通过。
- [x] v2.0.1 最终 8 文件包结构检查与 ToolPkg 烧录通过，related_load_errors={}；安装包 SHA-256 `808bb667890222b0413dc964fbe90dc09696b62844ed3083f13f462293671684` 与构建包一致。
- [ ] 重启 Operit 验证局部提示、日期清空及两种真实 Hook。用户已授权发布 v2.0.1；发布不等同于实机回归确认。

## v2.1.0 时间与日期拆分（2026-10-13）
- [x] 时间/时区与日期/星期独立开关，旧配置继承原时间开关，日历不变。
- [x] TypeScript 编译、产物语法、四组合、迁移、模拟 UI 动作及原有回归通过；git diff --check 通过。
- [x] 8 文件 ToolPkg 归档完整性通过：/sdcard/Download/Operit/ToolPkgDev/environment-context-injector-v2.1.0.toolpkg。
- [x] 用户授权后完成 v2.1.0 烧录，插件 enabled=true，related_load_errors={}；安装归档与构建包 SHA-256 一致：1dbf37364d3fec098312f2a896676e3eaac13b04f7e1fff808d40d8b8949a421。
- [x] 真实消息附件验证日期块和星期存在、当前时间块与时区字段不存在（仅记录技术结果，不保存附件原文）。
- [ ] 其他开关组合的真实 UI 与两种 Hook 完整回归仍待验证；GitHub Release 单独发布。
- v2.1.0 当时的测试说明：纪念日用 Date.now() 生成 ID，模拟连续新增间隔 5ms，未覆盖碰撞。该遗留风险已由下面的后续修复处理；历史验证范围不变。

## v2.1.1 纪念日 ID 冲突修复（2026-10-16，本地时间）
- [x] 基线 `220b2bc`；此前分别用隔离编译产物和当前 v2.1.0 安装归档复现：同毫秒两条记录同 ID；重载后删除第二条会删除两条；保存第一条日期会修改两条；清空第一条日期会移除两条。真实用户设置未参与测试。
- [x] `src/shared.ts` 增加 `createAnniversaryId()`，依据当前列表选择未被占用的时间戳/递增后缀编号；`src/ui/index.ui.ts` 新增事件复用它。只同步对应的两个 dist 文件，不改历史 ID、设置结构、日期编辑或删除语义。
- [x] 在现有 `tests/test_core.js` 的 UI/SharedPreferences 替身上增加六组固定时钟回归，移除旧 5ms 等待。模拟新页面执行 onLoad 后再操作，避免把未加载默认状态当成历史设置。
- [x] 同一最终测试在原版生产文件的隔离副本上因重复编号断言失败（exit 1）；补丁后完整测试通过（exit 0）。六组覆盖：新增唯一编号/Compose 行 key/删除与重载；日期编辑/清空隔离；50 次新增并逐次重载；历史基础编号/后缀/重复 ID/缺省编号兼容；时钟回退；无效输入与保存失败后重试。
- [x] `tsc -p tsconfig.json`、五个 dist JS 和测试文件的 `node --check`、完整 `node tests/test_core.js`、8 文件 ToolPkg 归档结构/内容一致性/解包后完整回归，以及 `git diff --check` 全通过；未新增依赖。
- [x] 本地诊断保存在 `.git/diagnostics/anniversary-fix/`（不入库）；已同步共享存储部署副本，并构建 `/sdcard/Download/Operit/ToolPkgDev/environment-context-injector-v2.1.1.toolpkg`，根目录 8 文件归档结构通过。
- [x] 用户授权后将版本升为 2.1.1 并通过 `operit_editor:debug_install_toolpkg` 烧录；`enabled=true`、`related_load_errors={}`，没有重置子包状态或迁移真实设置。安装归档与构建包逐字节一致，SHA-256 `54d782a9ffee175319dc943f2811f112afe4d82d18cdc344b42e22fba1916e05`；安装归档解包后的完整模拟回归也通过。未创建标签或 GitHub Release。
- [x] 烧录前的 v2.1.0 安装包已备份到 `/sdcard/Download/Operit/ToolPkgDev/environment-context-injector-backups/installed-v2.1.0-before-v2.1.1-20261015T165225Z.toolpkg`，原 SHA-256 为 `1dbf37364d3fec098312f2a896676e3eaac13b04f7e1fff808d40d8b8949a421`，保留回滚能力。
- [ ] 用户重启 Operit 后，验证真实 Compose UI 与两种 Hook；烧录/加载检查及安装包模拟测试已通过，但不等同于真实 QuickJS UI 回归，旧页面实例可能仍有缓存。
- 旧数据边界：已保存重复 ID 原样保留；新编号避开它们但不会自动拆分，旧记录的删除、改日期、清空及编辑草稿键仍按旧 ID 匹配，可能影响全部同编号记录。历史数据修复必须另行备份和确认；没有证据表明真实用户已经发生误删。
