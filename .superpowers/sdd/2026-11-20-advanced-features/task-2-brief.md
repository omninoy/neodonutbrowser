# Task 2 Brief: Automated Mobile Proxy IP Rotation

## Goal
Implement automatic and manual IP rotation for mobile/rotating proxies in NeoDonut Browser using their `change_ip_url`.

## Context & Workspace
- Project Root: `C:\Users\omni\Documents\Craft Anything\donutbrowser\neo-build`
- Branch: `neo-v036`

## Detailed Requirements

### 1. Backend (`src-tauri`):
- Create `src-tauri/src/proxy_rotation.rs`:
  - `pub async fn trigger_ip_rotation(proxy_id: &str) -> Result<RotationReport, String>`
    - Reads the proxy's `change_ip_url`. If empty or None, return error "У прокси не указана ссылка для смены IP (change_ip_url)".
    - Sends an HTTP GET (or POST if configured) request to `change_ip_url` using `reqwest::Client`.
    - Waits for the rotation to take effect (1-3s delay).
    - Checks the new external IP via `crate::ip_utils::fetch_public_ip` or proxy worker check.
    - Updates `last_rotated_at: Some(now_ms())` and saves to proxy store.
    - Returns `RotationReport { proxy_id, old_ip, new_ip, rotated_at, success }`.
  - Background Scheduler:
    - Checks if any proxy has `rotation_interval_mins: Some(mins)` where `mins > 0`.
    - If `now_ms() - last_rotated_at >= mins * 60 * 1000`, triggers rotation automatically.
- Modify `src-tauri/src/proxy_manager.rs`:
  - Add fields to `Proxy` struct (with `#[serde(default)]`):
    - `pub rotation_interval_mins: Option<u32>`
    - `pub rotate_on_launch: bool`
    - `pub last_rotated_at: Option<u64>`
- Modify `src-tauri/src/lib.rs`:
  - Register Tauri commands:
    - `rotate_proxy_ip(proxy_id: String) -> Result<Value, String>`
    - `set_proxy_rotation_config(proxy_id: String, interval_mins: Option<u32>, rotate_on_launch: bool) -> Result<(), String>`

### 2. Frontend (`src/`):
- Update `src/types.ts`:
  - Add `rotation_interval_mins?: number`, `rotate_on_launch?: boolean`, `last_rotated_at?: number` to `Proxy` interface.
- Update `src/components/proxy-management-dialog.tsx`:
  - In the proxy edit/create form (under rotation link section):
    - Input for "Интервал авто-ротации (минуты, 0 - выкл)"
    - Switch/Checkbox "Сменять IP перед запуском профиля"
  - In the proxies table (`columns`):
    - Add a quick action button "Сменить IP" with refresh icon next to the link/status if `change_ip_url` is present.
    - Show tooltip with `last_rotated_at` if available.

### 3. Verification:
- `cargo check -p donutbrowser` passes without errors.
- `npx tsc --noEmit` passes without errors.
