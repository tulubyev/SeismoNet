# Быстрое руководство по бэкапу

## Создание резервной копии

```bash
node backup/backup-system.js
```

## Просмотр доступных резервных копий

```bash
node backup/restore-system.js
```

## Восстановление из резервной копии

```bash
node backup/restore-system.js имя_файла.sql
```

## Автоматический бэкап

```bash
# Создать резервную копию сейчас
node backup/auto-backup.js backup

# Показать все резервные копии
node backup/auto-backup.js list

# Запустить автоматический бэкап (ежедневно в 2:00)
node backup/auto-backup.js start
```

## Требования

- PostgreSQL клиент установлен
- Переменная DATABASE_URL настроена
- Node.js для запуска скриптов

✅ Система бэкапа готова к использованию!