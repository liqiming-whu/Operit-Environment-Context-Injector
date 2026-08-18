# Changelog

## 1.0.0 - 2026-08-18

- 首次发布 Operit 环境信息注入 ToolPkg。
- 支持时间、天气、地点、电量和设备信息五类注入。
- 支持注入内容随消息保存或仅在发送给模型前临时注入。
- 支持 3–60 秒注入总超时，默认 10 秒。
- 支持设备自动定位和手动地址。
- 支持 Auto、Nominatim、BigDataCloud、Photon 反向地址解析。
- 支持 Open-Meteo、MET Norway、wttr.in 天气供应商及有界失败回退。
- 提供 Compose DSL 设置页、条件显隐、内容预览和手动测试。
- 完成编译、模拟宿主、包结构、烧录及真机消息注入验证。
