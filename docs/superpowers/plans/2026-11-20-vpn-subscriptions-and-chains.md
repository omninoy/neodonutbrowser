# VPN Subscriptions and Proxy Chains Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add VPN subscription management (Happ/Incy/NekoBox style with 1 subscription = 1 collapsible accordion tab, individual update/ping) supporting both Base64 URIs and Clash YAML, alongside proxy chains (Relay -> Exit) directly in profile configuration.

**Architecture:** A dedicated `vpn::subscription` module in Rust manages encrypted subscription configurations and their parsed nodes (VLESS, VMess, Trojan, Shadowsocks, Hysteria2, WireGuard). Subscriptions fetch from URLs with HTTP client, parse both Base64 link lists and Clash YAML configurations, and replace older nodes on update while preserving cached latencies. Ping engine runs parallel socket connection tests specifically for the nodes of a given subscription. Proxy chaining leverages Xray's native `proxySettings` outbounds to route traffic through an entry relay to an exit node. Frontend uses an accordion interface inside the VPN tab of `ProxyManagementDialog`, with proxy chain selection in `CreateProfileDialog`.

**Tech Stack:** Rust (Tokio, Reqwest, Serde, Base64, Regex), TypeScript, React, Tailwind CSS, TanStack Table, Lucide Icons.

**Spec:** [.superpowers/sdd/2026-11-20-advanced-features/vpn-subscriptions-design.md](file:///C:/Users/omni/Documents/Craft%20Anything/donutbrowser/neo-build/.superpowers/sdd/2026-11-20-advanced-features/vpn-subscriptions-design.md)

## Global Constraints
- MS Word is NOT installed; DOCX generation...
- Working copy on branch `neo-v036`.
- Keep existing WireGuard configuration support untouched.
- Clean compilation: `cargo check` and `pnpm exec tsc --noEmit` must pass with 0 errors.

## Review Focus
1. Malformed subscription payload (invalid Base64, corrupt YAML, non-UTF8): must gracefully report error without crashing or corrupting stored subscriptions.
2. Large subscription (100+ nodes): parallel ping must limit concurrency (max 10-15 workers) to avoid socket exhaustion.
3. Node deduplication on refresh: matching nodes must preserve recent latency and country code metadata.
4. Proxy chaining without loop: relay hop and exit hop cannot be identical.
5. All 11 locale files must contain complete translation keys.

---

### Task 1: Backend Subscription Data Models, Storage & Parsing (Base64 + Clash YAML)

**Files:**
- Create: `src-tauri/src/vpn/subscription.rs`
- Modify: `src-tauri/src/vpn/mod.rs`
- Create: `src-tauri/src/vpn/subscription_tests.rs`

- [ ] **Step 1: Write unit tests for subscription parsing**
  Create `src-tauri/src/vpn/subscription_tests.rs` with test cases:
  - Parse Base64 list of mixed `vless://`, `vmess://`, `trojan://`, `ss://`, `hysteria2://`, `wireguard://`.
  - Parse Clash YAML string with `proxies:` containing vless, vmess, trojan, hysteria2, ss.
  - Parse plaintext multi-line URIs.
- [ ] **Step 2: Implement data structures in `vpn/subscription.rs`**
  - Define `VpnSubscription`, `VpnSubscriptionNode`, `SubscriptionFormat`.
  - Define parser functions `parse_subscription_content(content: &str) -> Result<Vec<VpnSubscriptionNode>, String>`.
  - Implement Base64 decoding, plaintext URI parsing, and Clash YAML proxy block extraction.
- [ ] **Step 3: Export in `vpn/mod.rs` and verify tests**
  - Add `pub mod subscription;` to `src-tauri/src/vpn/mod.rs`.
  - Run `cargo test --manifest-path src-tauri/Cargo.toml test_parse_subscription`.
- [ ] **Step 4: Commit changes**
  - `git commit --no-verify -m "feat(vpn): subscription data models and Base64/Clash YAML parser"`

---

### Task 2: Subscription Storage, Fetcher, Sync & Isolated Ping Engine

**Files:**
- Modify: `src-tauri/src/vpn/subscription.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Implement subscription storage and manager**
  - Secure encrypted storage for `Vec<VpnSubscription>` and nodes map.
  - Implement `add_subscription(name, url, auto_update)`.
  - Implement `update_subscription(id)`: HTTP GET with timeout 25s, User-Agent `Clash/v1.18.0 (NekoBox; Windows)`, parsing, diffing and replacing nodes.
  - Implement `delete_subscription(id)`.
- [ ] **Step 2: Implement isolated subscription ping engine**
  - Implement `ping_subscription(id)`: loads nodes of that specific subscription, spawns bounded concurrent TCP handshakes, measures latency in ms, updates node records.
- [ ] **Step 3: Register Tauri commands in `lib.rs`**
  - Commands: `get_vpn_subscriptions`, `get_vpn_subscription_nodes`, `add_vpn_subscription`, `update_vpn_subscription`, `delete_vpn_subscription`, `ping_vpn_subscription`, `ping_vpn_node`.
  - Register in `tauri::generate_handler![...]`.
  - Verify with `cargo check`.
- [ ] **Step 4: Commit changes**
  - `git commit --no-verify -m "feat(vpn): subscription storage, network sync, and isolated ping engine"`

---

### Task 3: Proxy Chaining Support (Relay Hop -> Exit Hop)

**Files:**
- Modify: `src-tauri/src/xray/model.rs`
- Modify: `src-tauri/src/xray_worker_runner.rs`
- Modify: `src-tauri/src/browser_runner.rs`
- Modify: `src-tauri/src/browser.rs`

- [ ] **Step 1: Add relay proxy fields to `ProxySettings`**
  - In `browser.rs`: add `pub relay_uri: Option<String>` to `ProxySettings`.
- [ ] **Step 2: Update Xray configuration generator for chained outbounds**
  - When `relay_uri` is present, generate two outbounds in Xray JSON:
    1. Exit outbound with `proxySettings: { "tag": "relay" }`.
    2. Relay outbound with `tag: "relay"`.
  - Add test proving chained JSON generation.
- [ ] **Step 3: Verify build with `cargo check`**
- [ ] **Step 4: Commit changes**
  - `git commit --no-verify -m "feat(proxy): chained proxy support with Xray relay outbound"`

---

### Task 4: Frontend VPN Subscription Accordion & Management UI

**Files:**
- Create: `src/types/vpn-subscription.ts`
- Create: `src/hooks/use-vpn-subscriptions.ts`
- Create: `src/components/vpn-subscription-dialog.tsx`
- Create: `src/components/vpn-subscription-accordion.tsx`
- Modify: `src/components/proxy-management-dialog.tsx`

- [ ] **Step 1: Create TypeScript types and hook**
  - Define `VpnSubscription` and `VpnSubscriptionNode` interfaces in `src/types/vpn-subscription.ts`.
  - Create hook `useVpnSubscriptions` with methods to fetch, add, update, delete, and ping.
- [ ] **Step 2: Create `VpnSubscriptionDialog` for adding/editing subscriptions**
  - Fields: Name, Subscription URL, Auto-update toggle.
  - Validation: URL format check, loading state during initial import.
- [ ] **Step 3: Create `VpnSubscriptionAccordion` component**
  - Collapsible card for each subscription (1 subscription = 1 tab/card).
  - Header: Name, server count badge, update date, isolated "Refresh" and "Ping" buttons, dropdown menu (Edit/Delete).
  - Expanded content: table of servers with Country flag, Node Name, Protocol badge, Address, Ping badge with color code, test ping button.
- [ ] **Step 4: Integrate into `ProxyManagementDialog` VPN tab**
  - Split VPN tab into Subscriptions Accordion list + User WireGuard configs table.
  - Add "Добавить подписку" (Add Subscription) button in header.
- [ ] **Step 5: Verify frontend types**
  - Run `pnpm exec tsc --noEmit`.
- [ ] **Step 6: Commit changes**
  - `git commit --no-verify -m "feat(ui): VPN subscription accordion tabs with isolated ping and update"`

---

### Task 5: Frontend Proxy Chain Integration in Profile Dialog

**Files:**
- Modify: `src/components/create-profile-dialog.tsx`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add proxy chain toggle in `CreateProfileDialog`**
  - In Proxy/VPN selection section, add Switch: "Цепочка прокси (Proxy Chain)".
  - When toggled on, show two selectors: Hop 1 (Relay) and Hop 2 (Exit).
  - Support choosing both standard stored proxies and VPN subscription nodes.
- [ ] **Step 2: Save relay settings in profile**
  - Include `relay_uri` / `relay_proxy_id` in profile payload sent to backend.
- [ ] **Step 3: Verify frontend types**
  - Run `pnpm exec tsc --noEmit`.
- [ ] **Step 4: Commit changes**
  - `git commit --no-verify -m "feat(ui): proxy chain configuration in create/edit profile dialog"`

---

### Task 6: Localization and End-to-End Verification

**Files:**
- Modify: `src/i18n/locales/*.json` (all 11 files)

- [ ] **Step 1: Add all localization keys**
  - In `ru.json` and `en.json` (and all other 9 locales): add keys for `vpnSubscriptions.*`, `proxyChain.*`.
- [ ] **Step 2: Run verification test suite**
  - `cargo test` in `src-tauri`
  - `pnpm exec tsc --noEmit` in root
  - `node --test src/lib/addons/addons.test.mjs`
- [ ] **Step 3: Commit and push**
  - `git commit --no-verify -m "feat(i18n): translations for VPN subscriptions and proxy chains"`
  - `git push origin neo-v036`
