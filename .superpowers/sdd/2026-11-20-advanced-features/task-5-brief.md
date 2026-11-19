# Task 5: Локальный бэкап, восстановление и быстрая очистка профилей (Local Backup & Restore, Profile Quick Clean)

## Контекст и цель
Пользователям anti-detect браузера критически необходима полная независимость от облака:
1. Возможность сделать полный оффлайн-бэкап всех или выбранных профилей и настроек прокси в один переносимый архив (`.neobackup` / ZIP), с опциональным паролем шифрования.
2. Возможность восстановить профили из бэкапа на любом другом компьютере.
3. Быстрая очистка профиля от «мусора» (кэш шейдеров, GPUCache, code cache, service workers), раздувающего диск до гигабайт, с сохранением авторизационных сессий и куки.

## Рабочая директория
`C:\Users\omni\Documents\Craft Anything\donutbrowser\neo-build`

---

## Что нужно сделать

### 1. Backend: `src-tauri/src/backup_manager.rs`
- Создать модуль `src-tauri/src/backup_manager.rs` и зарегистрировать в `src-tauri/src/lib.rs`.
- Экспорт бэкапа:
  - `create_backup(profile_ids: Option<Vec<String>>, include_proxies: bool, target_path: String, password: Option<String>) -> Result<BackupResult, String>`:
    - Собирает конфигурацию профилей из `ProfileManager::instance()`.
    - Упаковывает данные профилей (папки профилей из `get_profiles_dir()`) в ZIP-архив.
    - Опционально сохраняет файл прокси `proxies.json`.
    - Если передан `password`, шифрует архив или упаковывает с шифрованием AES-GCM (манифест `backup_manifest.json` с версией и датой).
- Восстановление бэкапа:
  - `restore_backup(archive_path: String, password: Option<String>, overwrite: bool) -> Result<RestoreResult, String>`:
    - Проверяет целостность архива и пароль (если зашифрован).
    - Извлекает профили в `get_profiles_dir()`, регистрирует их в `ProfileManager`.
    - При необходимости обновляет базу прокси.
- Быстрая очистка профиля:
  - `clean_profile_cache(profile_id: String, purge_cookies: bool) -> Result<u64, String>`:
    - Находит директорию профиля `profiles/{profile_id}`.
    - Удаляет тяжелые кэши Chromium: `Default/Cache`, `Default/Code Cache`, `Default/GPUCache`, `Default/Service Worker/CacheStorage`, `Default/DawnCache`, `ShaderCache`.
    - Если `purge_cookies: true`, удаляет также файлы `Cookies` и `Cookies-journal`.
    - Возвращает освобожденное место в байтах.

### 2. Backend: `src-tauri/src/lib.rs`
- Зарегистрировать команды:
  - `create_backup`
  - `restore_backup`
  - `clean_profile_cache`

### 3. Frontend: интерфейс в Настройках и Меню профиля
- В `src/components/settings/` (или в настройках приложения):
  - Вкладка/раздел "Резервное копирование":
    - Кнопка "Создать резервную копию" -> диалог с выбором всех или отдельных профилей, чекбокс "Включить список прокси", поле опционального пароля шифрования, выбор файла сохранения.
    - Кнопка "Восстановить из копии" -> выбор файла `.neobackup`/`.zip`, поле пароля, кнопка подтверждения.
- В контекстном меню строки профиля в таблице:
  - Пункт "Очистить кэш (освободить место)" -> вызывает `clean_profile_cache(profile_id, purge_cookies: false)` и показывает уведомление: "Кэш очищен, освобождено XX МБ".

### 4. Верификация:
- `cargo check -p donutbrowser` в `src-tauri` проходит без ошибок.
- `npx tsc --noEmit` в корне проходит без ошибок.
