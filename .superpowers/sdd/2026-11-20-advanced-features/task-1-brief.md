# Task 1 Brief: AI Agent Browser CDP Tool Execution

## Goal
Implement a dedicated browser CDP tool execution module for the AI Agent in NeoDonut Browser so that `<act>` commands produced by the LLM are actually executed in the browser profile via DevTools / CDP, and the execution result/observation is fed back into the chat turn.

## Scope & Requirements
1. **CDP Execution Engine**:
   - Location: `src-tauri/src/agent_tasks/cdp_executor.rs`
   - Actions to support:
     - `navigate: <url>` — navigate the active page or open tab to the specified URL via `Page.navigate`.
     - `click: <selector>` — find DOM node by selector and trigger click (or evaluate `document.querySelector(selector).click()`).
     - `type: <selector> | <text>` — focus selector and insert text or evaluate `element.value = text; element.dispatchEvent(new Event('input'))`.
     - `scroll: <up|down> <pixels>` — evaluate `window.scrollBy(0, delta)`.
     - `extract_text: <selector>` — evaluate `document.querySelector(selector)?.innerText`.
     - `screenshot` — capture page screenshot via `Page.captureScreenshot`.
     - `eval: <javascript>` — evaluate arbitrary JavaScript in page context via `Runtime.evaluate`.
2. **Connecting to Live Profile**:
   - Resolve the active browser for `profile_id` via `crate::browser_runner::BrowserRunner` or `crate::cdp_target::resolve`.
   - If profile is not running, return error indicating browser profile must be launched to execute actions.
3. **Integration with `ai_service.rs`**:
   - In `run_ai_turn`: when `parsed.actions` contains actions, call `cdp_executor::execute_browser_action(&profile_id, &action_text).await`.
   - Append execution result as a `Step` with `kind: "action"`, and the output observation as `kind: "observe"`.
4. **Error Handling**:
   - Browser closed, tab crashed, or selector not found must produce clean human-readable error in observation without crashing Tauri backend.
5. **Verification**:
   - `cargo check -p donutbrowser` in `src-tauri` must succeed with 0 errors.
