import toolboxUI from "./ui/index.ui.js";
import {
  appendEnvironmentToMessage,
  getAppContext,
  getInjectionEnabled,
  loadSettings,
  setInjectionEnabled,
} from "./shared";

const EnhancedAIService = Java.com.ai.assistance.operit.api.chat.EnhancedAIService;
const InputProcessingStateBase = "com.ai.assistance.operit.data.model.InputProcessingState$";

function pushProcessingState(chatId?: string): void {
  try {
    const context = getAppContext();
    if (!context) return;
    const resolvedChatId = String(chatId ?? getChatId() ?? "").trim();
    const service = resolvedChatId
      ? EnhancedAIService.getChatInstance(context, resolvedChatId)
      : EnhancedAIService.getInstance(context);
    const state = Java.newInstance(
      InputProcessingStateBase + "Processing",
      "正在注入环境信息"
    );
    service.setInputProcessingState(state);
  } catch (error) {
    console.log("environment_context pushProcessingState error", String(error));
  }
}

function activePromptOf(
  input: ToolPkg.PromptInputHookEvent | ToolPkg.PromptFinalizeHookEvent
): ToolPkg.ActivePromptSnapshot | undefined {
  return input.eventPayload.metadata?.activePrompt;
}

async function appendSafely(
  processedInput: string,
  chatId?: string,
  _activePrompt?: ToolPkg.ActivePromptSnapshot
): Promise<string | null> {
  pushProcessingState(chatId);
  try {
    return await appendEnvironmentToMessage(processedInput);
  } catch (error) {
    console.log("environment_context append error", String(error));
    return null;
  }
}

export function registerToolPkg(): boolean {
  ToolPkg.registerToolboxUiModule({
    id: "environment_context_injector_settings",
    runtime: "compose_dsl",
    screen: toolboxUI,
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

export async function onPromptInput(
  input: ToolPkg.PromptInputHookEvent
): Promise<string | null> {
  const stage = String(input.eventPayload.stage ?? input.eventName ?? "");
  if (stage !== "before_process" || !loadSettings().persistInjectedContent) return null;

  const processedInput = String(
    input.eventPayload.processedInput ?? input.eventPayload.rawInput ?? ""
  );
  if (!processedInput.trim()) return null;

  const chatId = String(input.eventPayload.chatId ?? getChatId() ?? "").trim();
  return appendSafely(processedInput, chatId || undefined, activePromptOf(input));
}

export async function onPromptFinalize(
  input: ToolPkg.PromptFinalizeHookEvent
): Promise<string | null> {
  const stage = String(input.eventPayload.stage ?? input.eventName ?? "");
  if (stage !== "before_send_to_model" || loadSettings().persistInjectedContent) return null;

  const processedInput = String(
    input.eventPayload.processedInput ?? input.eventPayload.rawInput ?? ""
  );
  if (!processedInput.trim()) return null;

  const chatId = String(input.eventPayload.chatId ?? getChatId() ?? "").trim();
  return appendSafely(processedInput, chatId || undefined, activePromptOf(input));
}

export function onInputMenuToggle(
  input: ToolPkg.InputMenuToggleHookEvent
): ToolPkg.InputMenuToggleDefinitionResult[] {
  const action = String(input.eventPayload.action ?? "").toLowerCase();
  if (action === "toggle") {
    setInjectionEnabled(!getInjectionEnabled());
    return [];
  }
  if (action !== "create") return [];

  return [{
    id: "environment_context_injection",
    title: "环境信息注入",
    description: "注入时间、天气、地点、电量和设备信息",
    isChecked: getInjectionEnabled(),
  }];
}
