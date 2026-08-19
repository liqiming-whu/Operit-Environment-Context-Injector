# Operit Environment Context Injector

Operit ToolPkg 环境信息注入插件。基于官方 `examples/message_insert` 的 Prompt Hook、显性附件、输入菜单开关与 Compose DSL 设置页实现。

## 功能

- 只注入时间、天气、地点、电量和设备信息。
- 可选择注入内容是否随消息保存。
- 总超时默认 10 秒，可配置为 3–60 秒。
- 地点支持设备自动定位或手动地址。
- 自动定位支持 Nominatim、BigDataCloud、Photon，以及按该顺序容错的 Auto 模式。
- 天气支持 Open-Meteo、MET Norway、wttr.in；后两者失败时回退到 Open-Meteo。
- 设置页提供实时规则摘要、注入内容预览和手动测试。
- 支持自定义设备名称；非空时覆盖系统读取的设备名称。
- 支持绑定一张或多张角色卡；未选择时不限制，选择后只在对应角色卡对话中注入。
- 单项失败输出可审计错误行，不阻塞消息发送。

## 构建

```bash
tsc
```

编译输出位于 `dist/`，入口由 `manifest.json` 指向 `dist/main.js`。

## ToolPkg 结构

发布包根目录只包含：

```text
manifest.json
dist/main.js
dist/shared.js
dist/ui/index.ui.js
```

## 调试安装

开发目录会同步到：

```text
/sdcard/Download/Operit/ToolPkgDev/environment-context-injector
```

可使用 Operit 的 `debug_install_toolpkg` 安装该目录。UI 代码更新后建议重启 Operit，再验证工具箱设置页。

## 安装

下载 GitHub Releases 中的 `.toolpkg` 文件，然后在 Operit 的软件包管理页面导入并启用。安装或更新 UI 后建议重启 Operit，再进入工具箱中的“环境信息注入”完成配置。

为避免同一条消息出现两份环境附件，请不要同时开启本插件与官方“额外信息注入”插件中相同的注入项目。

## 验证状态

v1.0.0 已完成以下验证：

- TypeScript 编译和三个编译产物的语法检查通过。
- 模拟宿主测试通过：五类内容、手动/自动地点、天气、附件和重复注入保护。
- 注册与 Compose 首次渲染测试通过：UI、Prompt Input、Prompt Finalize、输入菜单各注册一次。
- `.toolpkg` 归档完整性、Operit 调试安装、启用和重启加载通过。
- 设置页、条件显隐、预览、手动测试、输入菜单联动和消息注入均已真机验证。
- 真机自动定位成功复用同一坐标快照生成地点与天气；Nominatim 返回有效中文地址，Open-Meteo 返回天气、温度、体感温度、湿度和风速。
- 真机成功读取电量、充电状态、设备名称、设备型号及 Android 平台版本，并生成单一 `Environment:` 显性附件。

v1.1.0自动测试进一步覆盖：自定义设备名称优先级、角色卡ID去重、多选匹配、非匹配拦截、Prompt Hook活动角色卡识别，以及设置页onLoad读取角色卡列表。

测试设备为 Android 16；实际定位精度、地址语言和第三方天气服务可用性由设备权限、网络和供应商响应决定。更新UI后需重启Operit再做最终交互回归。