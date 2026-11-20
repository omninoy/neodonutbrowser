# ZCode Task: Comprehensive CUA UI/UX Testing of Addons System & Themes

## Context & What Was Added
The repository `neo-build` on branch `neo-v036` has successfully integrated:
1. **5 New Authentic Themes** with WCAG AA compliance:
   - `Cyberpunk 2077` (`cyberpunk`)
   - `Night Owl` (`night-owl`)
   - `Everforest Dark` (`everforest-dark`)
   - `Everforest Light` (`everforest-light`)
   - `Kanagawa Wave` (`kanagawa-wave`)
2. **28+ Semantic Design Tokens** (`src/styles/globals.css`, `src/lib/themes.ts`)
3. **BetterDiscord-Style Addons & Customization System** (`src/components/addons/*`, `src/lib/addons/*`):
   - **Themes Tab**: Manage installed themes, real-time sliders for card radius (`--theme-card-radius`), glass blur (`--theme-glass-blur`), theme catalog.
   - **Custom CSS Tab**: Live editor, snippet manager with independent toggles, token autocomplete (`var(--...)`), XSS sanitization, JSON import/export.
   - **Plugins Tab**: Isolated iframe sandbox, plugin lifecycle (`onLoad`, `onEnable`, `onDisable`, `onUnload`), permission confirmation modal (`ui:toast`, `ui:button`, `ui:panel`, `storage:local`, `clipboard:write`, `network:http`).
   - **DevTools Tab**: Interactive sandbox runner, template generator, API documentation.
   - **Security Tab**: Streaming Audit Log (lifecycle, permission, security, error) and emergency **Safe Mode** switch.
4. **Settings Dialog Integration**:
   - New tab **«Внешний вид и расширения»** with puzzle icon (`LuPuzzle`).

## Your Objective
Run full CUA interface tests on NeoDonut Browser to verify all newly added features in both full-screen and windowed modes.

### Test Scenarios:
1. **Launch & Navigation**:
   - Bring NeoDonut Browser to front (or start it with `pnpm dev` / `cargo run` if needed).
   - Open Settings (`Настройки`).
2. **Themes Testing**:
   - Go to **«Внешний вид и темы»**.
   - Switch through all 5 new themes (*Cyberpunk 2077*, *Night Owl*, *Everforest Dark*, *Everforest Light*, *Kanagawa Wave*).
   - Verify colors, contrast, button styles, dialog backgrounds, and readability.
3. **Addons System Testing**:
   - Switch to **«Внешний вид и расширения»** (`LuPuzzle`):
     - **Темы**: Install a theme from the community catalog (e.g. *AMOLED Pitch Black* or *Soft Lavender*). Adjust sliders for card radius and blur, confirm instant visual updates.
     - **Пользовательский CSS**: Click «Новый стиль», add a custom rule (e.g. `.bg-card { border-color: var(--primary) !important; }`), toggle Live Preview, verify style application.
     - **Плагины**: Install *Notification Sound Booster* from the catalog. Verify the permission dialog shows requested permissions. Test enabling/disabling the plugin.
     - **DevTools**: Select a template, click «Тестовый запуск в песочнице», check execution output.
     - **Безопасность**: Check the Audit Log shows recorded events. Toggle «Safe Mode» on and off, verifying all custom styles/plugins are suppressed when enabled.
4. **Viewport & Responsiveness**:
   - Test in full-screen (2560x1600) and windowed mode. Ensure no layout overflows, broken scrollbars, or overlapping elements.
5. **Fixes (if any)**:
   - If any visual glitch, misaligned component, or broken state is found, fix it in the code and verify with `npx tsc --noEmit` and tests.

Report back with screenshots of the verified tabs!
