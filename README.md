
# 🐞 Quick Bug Reporter Server

Серверная часть плагина для быстрого баг-репортинга. Этот Node.js сервер принимает данные (включая скриншоты и метаинформацию) от клиента и создает баг-репорты в Яндекс.Трекере.

---

## 🚀 Возможности

- Приём и обработка скриншотов (actual/expected)
- Создание задач в Яндекс.Трекере через API
- JWT-аутентификация пользователей
- Поддержка refresh/access токенов
- Email-верификация аккаунта
- Хранение данных в MongoDB
- CORS-настройка с белым списком

---

## 🛠 Установка и запуск

### Клонирование

```bash
git clone https://github.com/yourname/bug-reporter-server.git
cd bug-reporter-server
```

### Установка зависимостей

```bash
npm install
```

### Переменные окружения

Создайте `.env` файл в корне проекта и заполните:

```env
PORT=3000
DB_URL=mongodb://localhost:27017/bugreporter
JWT_ACCESS_SECRET=ваш_секрет
JWT_REFRESH_SECRET=ваш_секрет
CLIENT_URL=http://localhost:3000,http://127.0.0.1:3000
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=example@yandex.ru
SMTP_PASSWORD=пароль
API_TOKEN_YANDEX_TRACKER=токен_трекера
ORG_ID_YANDEX_TRACKER=организация_ID
QUEUE_ID_YANDEX_TRACKER=ID_очереди
```

### Запуск сервера

```bash
npm run start
```

---

## 📁 Структура проекта

```
plugin-serv-main/
├── controllers/        # Логика обработки запросов
├── dtos/               # Объекты передачи данных
├── middlewares/        # Обработка ошибок и авторизация
├── models/             # Mongoose модели (User, Token)
├── router/             # Основные маршруты
├── services/           # Логика бизнес-процессов (email, user, tracker)
├── utils/              # Утилиты (email-отправка, UUID)
├── index.js            # Точка входа
├── .env                # Настройки окружения
└── package.json
```

---

## 🔌 API Эндпоинты

### `POST /api/bug`
Создание бага

**Формат запроса (multipart/form-data):**
- actualImg: файл
- expectedImg: файл
- url: строка
- xpath: строка
- browser: строка
- browserVersion: строка
- comment: строка

---

### `POST /api/registration`
Регистрация нового пользователя

### `POST /api/login`
Вход в систему

### `POST /api/logout`
Выход

### `GET /api/activate/:link`
Активация по email

### `GET /api/refresh`
Обновление access токена

---

## 🧠 Используемые технологии

- **Node.js** + **Express** — сервер
- **MongoDB** + **Mongoose** — база данных
- **JWT** — аутентификация
- **Nodemailer** — отправка email
- **Yandex Tracker API** — создание задач
- **dotenv** — конфигурация окружения
- **CORS** — поддержка клиентских доменов
- **uuid**, **express-validator**, **bcryptjs**, **multer**

---

## 💡 Советы по разработке

- Используйте Postman для отладки API
- Следите за логами при старте сервера (`console.log`)
- Все ошибки обрабатываются в `error-middleware.js`
- API Трекера требует токен и идентификаторы очереди и организации

