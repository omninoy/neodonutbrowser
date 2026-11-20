# Спецификация: VPN-подписки (Happ / Incy / NekoBox) и цепочки прокси (Proxy Chains)

## 1. Обзор задачи
Добавить во вкладку VPN поддержку подписок на VPN/прокси (как в Happ, Incy, NekoBox):
- 1 подписка = 1 вкладка/карточка (аккордеон, раскрывающийся вниз со списком серверов).
- Индивидуальное обновление каждой подписки (свежие узлы загружаются, устаревшие удаляются).
- Индивидуальный пинг серверов выбранной подписки.
- Поддержка форматов: Base64/Plain-text URI (VLESS, VMess, Trojan, Shadowsocks, Hysteria2, WireGuard) и Clash YAML (`proxies:`).
- Сохранение поддержки пользовательских WireGuard конфигов.
- Поддержка цепочек прокси (Proxy Chains: Входной узел -> Выходной узел) в диалоге профиля.

---

## 2. Архитектура бэкенда (Rust)

### 2.1 Модели данных (`src-tauri/src/vpn/subscription.rs`)
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnSubscription {
    pub id: String,
    pub name: String,
    pub url: String,
    pub auto_update: bool,
    pub update_interval_mins: u32,
    pub last_updated_at: Option<u64>,
    pub node_count: usize,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnSubscriptionNode {
    pub id: String,
    pub subscription_id: String,
    pub name: String,
    pub protocol: String, // "vless", "vmess", "trojan", "hysteria2", "wireguard", "shadowsocks"
    pub raw_config: String,
    pub server: String,
    pub port: u16,
    pub country_code: Option<String>,
    pub latency_ms: Option<u64>,
    pub is_valid: Option<bool>,
    pub last_checked_at: Option<u64>,
}
```

### 2.2 Парсер форматов
- **HTTP загрузка**: Запрос с `User-Agent: Clash/v1.18.0 (NekoBox; Windows)` и тайм-аутом 30с.
- **Детектор формата**:
  1. **Clash YAML**: Поиск ключа `proxies:` -> парсинг секций `vless`, `vmess`, `trojan`, `ss`, `hysteria2`, `wireguard`.
  2. **Base64 URI List**: Автоматическое декодирование Base64 (с поддержкой URL-safe и стандартного паддинга) -> разбиение на строки.
  3. **Plain-text URI List**: Строки `vless://`, `vmess://`, `trojan://`, `ss://`, `hysteria2://`, `hy2://`, `wireguard://`.
- **Извлечение метаданных**:
  - Название из фрагмента `#Имя` или поля `name` / `ps`.
  - Извлечение кода страны из эмодзи флагов или геолокации.

### 2.3 Синхронизация и пинг
- `update_vpn_subscription(id)`: Загружает свежий контент, удаляет старые ноды подписки, добавляет новые, сохраняя замеренный пинг для совпадающих узлов.
- `ping_vpn_subscription(id)`: Параллельно (пул из 10 воркеров) замеряет TCP/TLS пинг до каждого сервера этой подписки.

### 2.4 Цепочки прокси (Proxy Chains)
- В Xray outbound конфиг добавляется связка:
  `Outbound(Exit) -> proxySettings: { tag: "relay" } -> Outbound(Relay)`
- Браузер обращается в локальный SOCKS5 порт Xray, трафик идет: `Браузер -> Relay -> Exit -> Интернет`.

---

## 3. Архитектура фронтенда (React / TypeScript)

### 3.1 Вкладка VPN ([proxy-management-dialog.tsx](file:///C:/Users/omni/Documents/Craft%20Anything/donutbrowser/neo-build/src/components/proxy-management-dialog.tsx))
- **Панель действий**: Кнопки «Добавить подписку», «Новый WireGuard», «Обновить все».
- **Секция подписок (Аккордеон)**:
  - Каждая подписка представлена отдельной карточкой-вкладкой:
    - Заголовок: Название, URL/домен, количество узлов, время обновления, статус.
    - Кнопки быстрого действия:
      - «Обновить» (синхронизирует только эту подписку).
      - «Пинговать» (проверяет задержку только для узлов этой подписки).
      - «Удалить / Изменить».
      - Иконка раскрытия (стрелка вниз).
    - Раскрывающийся блок:
      - Таблица серверов подписки (Флаг страны, название, протокол, IP:Port, пинг в ms с цветным индикатором, кнопка одиночного пинга).
- **Секция «Пользовательский WireGuard»**: Сохраняет существующий список индивидуальных WG-профилей.

### 3.2 Диалог профиля ([create-profile-dialog.tsx](file:///C:/Users/omni/Documents/Craft%20Anything/donutbrowser/neo-build/src/components/create-profile-dialog.tsx))
- В блоке выбора подключения опция: «Использовать цепочку прокси».
- При активации:
  - Селектор 1: Входной узел (Relay).
  - Селектор 2: Выходной узел (Exit).
- Поддерживает выбор как обычных прокси, так и узлов из любых добавленных подписок.

---

## 4. План реализации и верификации
1. Бэкенд: реализация `src-tauri/src/vpn/subscription.rs` (модели, парсеры Base64/Clash, хранилище, пинг, команды Tauri).
2. Поддержка proxy chaining в `xray_worker_runner.rs` / `ProxySettings`.
3. Фронтенд: диалог добавления подписки `vpn-subscription-dialog.tsx`, аккордеон подписок в `proxy-management-dialog.tsx`.
4. Интеграция цепочек в `create-profile-dialog.tsx`.
5. Тестирование: юнит-тесты парсинга подписок (Base64 + Clash YAML), сборка `cargo check`, проверка `tsc --noEmit`.
