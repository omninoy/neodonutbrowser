# Task 4: Улучшенный Cookie Bot (Нишевые и Гео-пресеты, Человечный скролл, Импорт/Экспорт куки)

## Контекст и цель
Cookie Bot прогревает профили для снижения риска детекта антифрод-системами. Требуется:
1. Расширить нишевые и географические пресеты сайтов (RU, US, EU, Tech, Crypto, E-commerce, Social).
2. Реализовать реалистичный многошаговый скроллинг с имитацией чтения (случайные паузы, переменная скорость и дистанция).
3. Добавить импорт и экспорт собранных cookies профиля в форматах JSON и Netscape/HTTP Header.

## Рабочая директория
`C:\Users\omni\Documents\Craft Anything\donutbrowser\neo-build`

---

## Что нужно сделать

### 1. Backend: `src-tauri/src/cookie_bot_runner.rs`
- Расширить пресеты сайтов в `default_sites_for_template(template_id: &str)`:
  - `"geo-ru"`: `ya.ru`, `vk.com`, `dzen.ru`, `ozon.ru`, `wildberries.ru`, `avito.ru`, `habr.com`, `rbc.ru`, `kinopoisk.ru`.
  - `"geo-us"`: `google.com`, `yahoo.com`, `cnn.com`, `foxnews.com`, `nytimes.com`, `craigslist.org`, `amazon.com`, `reddit.com`.
  - `"geo-eu"`: `spiegel.de`, `zeit.de`, `lemonde.fr`, `bbc.co.uk`, `elmundo.es`, `amazon.de`, `booking.com`.
  - `"tech-dev"`: `github.com`, `stackoverflow.com`, `news.ycombinator.com`, `dev.to`, `arxiv.org`, `medium.com`.
  - `"crypto-web3"`: `coinmarketcap.com`, `coingecko.com`, `binance.com`, `etherscan.io`, `coindesk.com`, `decrypt.co`.
- Улучшить алгоритм скролла в `execute_cookie_warming`:
  - Вместо одного скролла выполнять цикл из 3-6 итераций с естественными микро-паузами (500-1500мс), случайной глубиной скролла (150-600px), случайным направлением (иногда 10-20% вероятности обратный скролл вверх на 100px — имитация перечитывания).
  - Проверка флага отмены `cancel_flag` на каждой итерации скролла для мгновенного прерывания по запросу пользователя.

### 2. Backend: `src-tauri/src/cookie_manager.rs` и `src-tauri/src/lib.rs`
- Реализовать экспорт и импорт куки профиля:
  - `export_profile_cookies(profile_id: String, format: String) -> Result<String, String>`:
    - Читает куки профиля через CDP (`Network.getCookies`) или напрямую из SQLite/Network базы профиля.
    - Форматирует в `json` (стандартный массив объектов `name`, `value`, `domain`, `path`, `expires`, `httpOnly`, `secure`, `sameSite`) или `netscape` (табуляционный формат cookies.txt).
  - `import_profile_cookies(profile_id: String, raw_cookies: String, format: String) -> Result<usize, String>`:
    - Парсит JSON или Netscape cookies.
    - Вставляет в профиль через CDP (`Network.setCookies`) или сохраняет в базу куки профиля.
- Зарегистрировать команды в `lib.rs`:
  - `export_profile_cookies`
  - `import_profile_cookies`

### 3. Frontend: `src/components/cookie-bot/` или профили
- Обновить селектор пресетов сайтов с добавлением новых шаблонов (RU, US, EU, Tech, Crypto).
- В меню действий профиля добавить пункты:
  - "Экспорт cookies" -> копирование в буфер или скачивание файла.
  - "Импорт cookies" -> модальное окно со вставкой текста или выбором файла.

### 4. Верификация:
- `cargo check -p donutbrowser` в `src-tauri` проходит без ошибок.
- `npx tsc --noEmit` в корне проходит без ошибок.
