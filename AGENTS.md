# Operit Environment Context Injector 开发规则

1. 本项目是 Operit ToolPkg，以当前 `/root/operit/examples/message_insert`、官方 `examples/types` 和实际宿主行为为权威。
2. 只注入时间、天气、地点、电量和设备信息；不得增加通知、记忆、屏幕、应用使用等无关项目。
3. 保留“注入内容随消息保存”：开启时用 Prompt Input `before_process`，关闭时用 Prompt Finalize `before_send_to_model`。
4. 注入总超时默认 10 秒且可配置；失败项生成可审计错误行，不得无限等待或阻塞消息发送。
5. 自动定位只调用 `Tools.System.getLocation`；手动地点用地理编码。地址解析支持 Nominatim、BigDataCloud、Photon 和 auto 顺序容错。
6. 天气支持 Open-Meteo、MET Norway、wttr.in；HTTP 通过 `Tools.Net.http`，超时有界。
7. 自定义设备名称非空时优先于系统设备名；角色卡绑定为空表示不限制，非空时仅匹配当前活动角色卡 ID，角色卡列表以 `Tools.Chat.listCharacterCards()` 为权威。
8. Compose render 纯函数；采集、角色卡读取、测试和状态更新只在 action/onLoad 阶段执行。预览测试不得写聊天记录。
9. 修改后执行 TypeScript 编译、自动测试、包结构检查、ToolPkg 烧录和真实 Hook/UI 验证；UI 变更后重启 Operit 再验。
