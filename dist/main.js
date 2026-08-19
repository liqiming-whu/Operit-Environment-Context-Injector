"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerToolPkg = registerToolPkg;
exports.onPromptInput = onPromptInput;
exports.onPromptFinalize = onPromptFinalize;
exports.onInputMenuToggle = onInputMenuToggle;
const index_ui_js_1 = __importDefault(require("./ui/index.ui.js"));
const shared_1 = require("./shared");
const EnhancedAIService = Java.com.ai.assistance.operit.api.chat.EnhancedAIService;
const InputProcessingStateBase = "com.ai.assistance.operit.data.model.InputProcessingState$";
function pushProcessingState(chatId) {
    try {
        const context = (0, shared_1.getAppContext)();
        if (!context)
            return;
        const resolvedChatId = String(chatId ?? getChatId() ?? "").trim();
        const service = resolvedChatId
            ? EnhancedAIService.getChatInstance(context, resolvedChatId)
            : EnhancedAIService.getInstance(context);
        const state = Java.newInstance(InputProcessingStateBase + "Processing", "正在注入环境信息");
        service.setInputProcessingState(state);
    }
    catch (error) {
        console.log("environment_context pushProcessingState error", String(error));
    }
}
function activePromptOf(input) {
    return input.eventPayload.metadata?.activePrompt;
}
async function appendSafely(processedInput, chatId, activePrompt) {
    try {
        let resolvedPrompt = activePrompt;
        if (!resolvedPrompt) {
            try {
                const cardId = typeof getCallerCardId === "function" ? String(getCallerCardId() || "").trim() : "";
                if (cardId)
                    resolvedPrompt = { type: "character_card", id: cardId, name: "" };
            }
            catch { }
        }
        if (!(0, shared_1.matchesBoundCharacterCard)((0, shared_1.loadSettings)(), resolvedPrompt))
            return null;
        pushProcessingState(chatId);
        return await (0, shared_1.appendEnvironmentToMessage)(processedInput, resolvedPrompt);
    }
    catch (error) {
        console.log("environment_context append error", String(error));
        return null;
    }
}
function registerToolPkg() {
    ToolPkg.registerToolboxUiModule({
        id: "environment_context_injector_settings",
        runtime: "compose_dsl",
        screen: index_ui_js_1.default,
        params: {},
        title: {
            zh: "环境信息注入",
            en: "Environment Context Injection",
        },
    });
    ToolPkg.registerPromptInputHook({
        id: "environment_context_injector_prompt_input",
        function: onPromptInput,
    });
    ToolPkg.registerPromptFinalizeHook({
        id: "environment_context_injector_prompt_finalize",
        function: onPromptFinalize,
    });
    ToolPkg.registerInputMenuTogglePlugin({
        id: "environment_context_injector_menu_toggle",
        function: onInputMenuToggle,
    });
    return true;
}
async function onPromptInput(input) {
    const stage = String(input.eventPayload.stage ?? input.eventName ?? "");
    if (stage !== "before_process" || !(0, shared_1.loadSettings)().persistInjectedContent)
        return null;
    const processedInput = String(input.eventPayload.processedInput ?? input.eventPayload.rawInput ?? "");
    if (!processedInput.trim())
        return null;
    const chatId = String(input.eventPayload.chatId ?? getChatId() ?? "").trim();
    return appendSafely(processedInput, chatId || undefined, activePromptOf(input));
}
async function onPromptFinalize(input) {
    const stage = String(input.eventPayload.stage ?? input.eventName ?? "");
    if (stage !== "before_send_to_model" || (0, shared_1.loadSettings)().persistInjectedContent)
        return null;
    const processedInput = String(input.eventPayload.processedInput ?? input.eventPayload.rawInput ?? "");
    if (!processedInput.trim())
        return null;
    const chatId = String(input.eventPayload.chatId ?? getChatId() ?? "").trim();
    return appendSafely(processedInput, chatId || undefined, activePromptOf(input));
}
function onInputMenuToggle(input) {
    const action = String(input.eventPayload.action ?? "").toLowerCase();
    if (action === "toggle") {
        (0, shared_1.setInjectionEnabled)(!(0, shared_1.getInjectionEnabled)());
        return [];
    }
    if (action !== "create")
        return [];
    return [{
            id: "environment_context_injection",
            title: "环境信息注入",
            description: "注入时间、天气、地点、电量和设备信息",
            isChecked: (0, shared_1.getInjectionEnabled)(),
        }];
}
