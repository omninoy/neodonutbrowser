# Advanced Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 advanced capabilities in NeoDonut Browser: AI Agent browser CDP execution, automated mobile proxy IP rotation, bulk profile creation with staggered launch, enhanced Cookie Bot with niche/geo presets and humanized scroll, and local full backup/restore with profile cache cleaning.

**Architecture:** Extend Tauri Rust backend services (`ai_service`, `cdp_executor`, `proxy_manager`, `cookie_bot_runner`, `backup_manager`) and connect them cleanly to React/TypeScript frontend components using existing design patterns, ensuring zero cloud lock-in and complete local autonomy.

**Tech Stack:** Rust (Tauri 2, tokio, tungstenite, reqwest, zip, aes-gcm), TypeScript (React, Tailwind CSS, Lucide icons, i18next).

**Spec:** User requirements for 5 core features: browser tool use for agent, mobile proxy rotation, bulk creation, Cookie Bot enhancement, and local backup/portability.

## Global Constraints
- Target branch is `neo-v036`.
- No proprietary cloud lock-in or token gating.
- Full offline / local support for all operations.
- Clean compilation without TypeScript errors (`npx tsc --noEmit`) and Cargo errors (`cargo check --all-targets`).
- Russian UI locale strings in `src/i18n/locales/ru.json` with English fallback in `en.json`.

## Review Focus
- Browser crash or closed tab handling during CDP execution without hanging the agent.
- Proxy rotation URL network timeout without freezing the proxy table.
- Bulk CSV parsing with malformed rows or missing columns without crashing profile creation.
- Cookie Bot smooth scroll interruption when canceled by user.
- Corrupted backup ZIP or invalid password handling without destroying existing data.

---

### Task 1: AI Agent Browser CDP Tool Execution

**Files:**
- Create: `src-tauri/src/agent_tasks/cdp_executor.rs`
- Modify: `src-tauri/src/agent_tasks/ai_service.rs`
- Modify: `src-tauri/src/agent_tasks/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Produces: `cdp_executor::execute_browser_action(profile_id: &str, action: &str) -> Result<String, String>`
- Consumes: `crate::browser_runner::BrowserRunner`, `crate::wayfern_manager::WayfernManager`

- [ ] **Step 1: Create CDP executor module with action parser and dispatcher**
  Support actions:
  - `navigate: <url>`
  - `click: <css_selector>`
  - `type: <css_selector> | <text>`
  - `scroll: <up|down> <pixels>`
  - `extract_text: <css_selector>`
  - `screenshot`

- [ ] **Step 2: Connect CDP executor to `ai_service::run_ai_turn`**
  When `<act>` tags are parsed, invoke `cdp_executor::execute_browser_action` on the turn's profile.
  Append the execution result as an `<observe>` step and feed it back to the assistant turn history.

- [ ] **Step 3: Verify compilation and basic action parsing**
  Run `cargo check -p donutbrowser` in `src-tauri`.

---

### Task 2: Automated Mobile Proxy IP Rotation

**Files:**
- Create: `src-tauri/src/proxy_rotation.rs`
- Modify: `src-tauri/src/proxy_manager.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/components/proxy-management-dialog.tsx`
- Modify: `src/types.ts`

**Interfaces:**
- Produces: `trigger_proxy_rotation(proxy_id: String) -> Result<RotationResult, String>`
- Produces: `set_proxy_auto_rotation(proxy_id: String, interval_mins: Option<u32>, rotate_on_launch: bool)`

- [ ] **Step 1: Implement background rotation worker in `proxy_rotation.rs`**
  Periodically checks registered mobile proxies with `change_ip_url`, sends GET/POST request, waits for IP change with exponential backoff, logs previous and new IP.

- [ ] **Step 2: Register Tauri commands in `lib.rs` and update `proxy_manager.rs`**
  Expose `rotate_proxy_ip`, `get_proxy_rotation_history`.

- [ ] **Step 3: Update frontend proxy dialog and table**
  Add inputs for "Интервал авто-ротации (минуты)" and чекбокс "Ротировать IP перед запуском профиля" in `proxy-management-dialog.tsx`. Add "Сменить IP" quick button in proxy table row.

- [ ] **Step 4: Verify proxy rotation UI and build**
  Run `npx tsc --noEmit` and verify no type errors.

---

### Task 3: Bulk Profile Creation & Staggered Launch

**Files:**
- Create: `src-tauri/src/profile/bulk_ops.rs`
- Modify: `src-tauri/src/profile/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Create: `src/components/bulk-create-dialog.tsx`
- Modify: `src/components/managed-data-table.tsx`
- Modify: `src/components/entity-page.tsx`

**Interfaces:**
- Produces: `bulk_create_profiles(records: Vec<BulkProfileRecord>, auto_assign_proxies: bool) -> Result<Vec<BrowserProfile>, String>`
- Produces: `staggered_launch_profiles(profile_ids: Vec<String>, delay_ms: u64)`

- [ ] **Step 1: Implement CSV/JSON profile batch creation in `bulk_ops.rs`**
  Parses tabular data with columns: Name, Proxy, OS, Tags, Notes. When `auto_assign_proxies` is true, assigns available proxies from proxy store sequentially.

- [ ] **Step 2: Implement staggered launch loop with cancellation support**
  Launches profiles sequentially with `tokio::time::sleep(delay)` to prevent CPU/RAM throttling.

- [ ] **Step 3: Build `BulkCreateDialog` component**
  Tabbed modal in profiles view: "Вставка CSV / Текст", "Загрузка файла", превью распознанных профилей, кнопка "Создать N профилей".
  In multi-selection bar of profiles table, add "Запуск с задержкой (сек)".

- [ ] **Step 4: Verify frontend and backend builds**
  Run `npx tsc --noEmit` and `cargo check`.

---

### Task 4: Enhanced Cookie Bot (Niche & Geo Presets, Humanized Scroll, Import/Export)

**Files:**
- Modify: `src-tauri/src/cookie_bot_runner.rs`
- Modify: `src-tauri/src/cookie_manager.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/components/cookie-bot-page.tsx`
- Create: `src/components/cookie-bot/cookie-import-export-dialog.tsx`

**Interfaces:**
- Produces: `get_cookie_bot_presets() -> Vec<PresetCategory>`
- Produces: `export_profile_cookies(profile_id: String, format: String) -> Result<String, String>`
- Produces: `import_profile_cookies(profile_id: String, data: String, format: String) -> Result<usize, String>`

- [ ] **Step 1: Add Geo and Niche presets in `cookie_bot_runner.rs`**
  Presets:
  - Geo: RU, US, EU, Global
  - Niche: E-commerce, Crypto, Search & Portals, Social
  Combine URLs dynamically based on profile proxy country.

- [ ] **Step 2: Implement humanized multi-step smooth scrolling**
  Replace instant scroll with randomized steps: 3–8 scroll bursts with cubic easing and random 500ms–2500ms pauses between scrolls.

- [ ] **Step 3: Implement Netscape & JSON cookie export/import Tauri commands**
  Allow instant import and export of gathered cookies directly in Cookie Bot and profile cards.

- [ ] **Step 4: Update Cookie Bot UI with preset selectors and Export/Import buttons**
  Add dropdowns for Geo and Niche, and a modal dialog for Cookie Export/Import.

---

### Task 5: Local Backup, Restore & Profile Quick Clean

**Files:**
- Create: `src-tauri/src/backup_manager.rs`
- Modify: `src-tauri/src/lib.rs`
- Create: `src/components/backup-dialog.tsx`
- Modify: `src/components/settings/settings-page.tsx`
- Modify: `src/components/managed-data-table.tsx`

**Interfaces:**
- Produces: `create_backup_archive(dest_path: String, password: Option<String>) -> Result<BackupInfo, String>`
- Produces: `restore_backup_archive(src_path: String, password: Option<String>) -> Result<RestoreSummary, String>`
- Produces: `clear_profile_data(profile_id: String, clear_cookies: bool, clear_cache: bool) -> Result<(), String>`

- [ ] **Step 1: Implement zip-based backup pack/unpack in `backup_manager.rs`**
  Collects `profiles/`, `proxies/`, `groups/`, `ai_settings.json` into a `.neobackup` archive with optional password encryption.

- [ ] **Step 2: Implement profile cache & cookie purge without touching fingerprint metadata**
  Deletes `Default/Cache/`, `Default/Cookies`, `Default/Network/` in profile dir while preserving `donut_profile.json`.

- [ ] **Step 3: Add Backup & Restore UI to Settings and quick clean action in Profile table**
  Settings tab: "Резервное копирование и восстановление" with "Создать бэкап" and "Восстановить".
  Profile row dropdown: "Очистить кэш и куки".

- [ ] **Step 4: End-to-end compile and build verification**
  Run `npx tsc --noEmit` and `cargo check --all-targets`.
