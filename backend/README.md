# Open CRM Backend

API сервер на Express с хранением данных в MySQL для фронтенда из каталога `dist`.

## Быстрый старт

1. Создайте файл `.env` на основе `.env.example` и укажите реквизиты доступа к MySQL:

```
PORT=3001
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=secret
MYSQL_DATABASE=open_crm
```

2. Подготовьте базу данных и таблицы:

```
mysql -u root -p < database/schema.sql
```

3. Установите зависимости и запустите сервер:

```
npm install
npm run dev
```

Сервер по умолчанию отдает API по `/api/*` и статический фронтенд из `../dist`.

## Основные маршруты

- `GET /api/health` — проверка доступности MySQL.
- `CRUD /api/companies` — компании.
- `CRUD /api/contacts` — контакты, связаны с компаниями.
- `CRUD /api/deals` — сделки, связаны с компаниями и контактами.
