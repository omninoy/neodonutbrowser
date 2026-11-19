# Task 3: Массовое создание профилей и запуск с задержкой (Bulk Profile Creation & Staggered Launch)

## Контекст и цель
Пользователям anti-detect браузера требуется возможность массово создавать профили из списков/файлов (CSV, TXT, JSON) с автоматическим или ручным назначением прокси, а также запускать пачку выбранных профилей с настраиваемой задержкой (Staggered Launch), чтобы избежать перегрузки процессора/памяти и не вызывать всплесков одновременных сетевых соединений.

## Рабочая директория
`C:\Users\omni\Documents\Craft Anything\donutbrowser\neo-build`

---

## Что нужно сделать

### 1. Backend: `src-tauri/src/profile/bulk_ops.rs`
- Создать модуль `bulk_ops.rs` и подключить в `src-tauri/src/profile/mod.rs` (`pub mod bulk_ops;`).
- Реализовать парсер табличных данных (CSV/TSV/TXT с разделителями `,` или `;` или табуляция, а также JSON):
  - Поля: `name` (обязательно), `proxy` (название или host:port или пусто), `os` (windows, macos, linux), `tags` (через запятую или пайп), `notes`.
  - Опция `auto_assign_proxies: bool`: если включена, скрипт циклически (round-robin) берет доступные прокси из `ProxyManager::instance()` и назначает создаваемым профилям.
  - Генерация валидных `BrowserProfile` (сгенерировать `id` через `uuid::Uuid::new_v4()`, таймстемпы, дефолтные фингерпринты под выбранную ОС).
  - Сохранение через `ProfileManager::instance().save_profile(&profile)`.
- Реализовать функцию и команду для запуска с задержкой:
  - `staggered_launch_profiles(profile_ids: Vec<String>, delay_ms: u64)`:
    Запускает профили по очереди, вызывая логику запуска (`crate::browser_runner::start_profile` или существующую команду `launch_profile`) с паузой `tokio::time::sleep(Duration::from_millis(delay_ms))` между ними.
  - Поддержка отмены очереди запуска: `cancel_staggered_launch()`.

### 2. Backend: `src-tauri/src/lib.rs`
- Зарегистрировать команды в `tauri::generate_handler!`:
  - `bulk_create_profiles_from_table(records: Vec<BulkProfileRecord>, auto_assign_proxies: bool) -> Result<usize, String>`
  - `staggered_launch_profiles(profile_ids: Vec<String>, delay_ms: u64) -> Result<(), String>`
  - `cancel_staggered_launch() -> Result<(), String>`

### 3. Frontend: `src/components/bulk-create-dialog.tsx`
- Создать компонент диалога `BulkCreateDialog`:
  - Вкладка 1: "Вставка текста / CSV": поле `Textarea`, плейсхолдер с примером формата.
  - Вкладка 2: "Загрузка файла": drag-and-drop или кнопка выбора `.csv`, `.txt`, `.json`.
  - Чекбокс: "Автоматически распределить активные прокси".
  - Превью-таблица распознанных записей с возможностью быстрой проверки перед созданием.
  - Кнопка "Создать (N) профилей" с отображением прогресс-бара.
- Добавить вызов `BulkCreateDialog` в профилях (например, кнопка рядом с "+ Новый профиль" или пункт выпадающего меню "Массовое создание").

### 4. Frontend: Staggered Launch в панели массовых действий
- В `src/components/profile-table.tsx` или панели множественного выбора профилей (`managed-data-table.tsx`):
  - При выборе 2+ профилей добавить кнопку "Запуск с задержкой" (с popover/полем ввода секунд, по умолчанию 3-5 сек).
  - При клике вызывать `staggered_launch_profiles`.

### 5. Локализация и типы:
- Добавить интерфейсы в `src/types.ts`: `BulkProfileRecord`, `BulkCreateOptions`.
- Добавить русские и английские строки в `src/i18n/locales/ru.json` и `en.json`.

### 6. Верификация:
- `cargo check -p donutbrowser` в `src-tauri` проходит без ошибок.
- `npx tsc --noEmit` в корне проходит без ошибок.
