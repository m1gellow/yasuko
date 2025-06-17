# Интеграция Telegram WebApp авторизации в React проект

## Обзор

Данный документ описывает, как работает авторизация через Telegram WebApp в текущем проекте, и как ее можно перенести в другой проект. Интеграция позволяет пользователям авторизоваться через Telegram, получая их данные и создавая соответствующий профиль в базе данных.

## Архитектура

Интеграция Telegram WebApp состоит из следующих компонентов:

1. **Frontend (React)**
   - `TelegramContext` - контекст для работы с Telegram WebApp API
   - `TelegramLogin` - компонент для авторизации через Telegram
   - `TelegramAuthScreen` - экран авторизации через Telegram
   - `AuthContext` - контекст для управления авторизацией

2. **Backend (Supabase)**
   - Edge Function `telegram-auth` для проверки данных от Telegram и создания сессии
   - Таблицы в базе данных для хранения информации о пользователях
   - Миграции для настройки схемы базы данных

3. **Настройки проекта**
   - Content Security Policy (CSP) для разрешения загрузки скриптов с telegram.org
   - Переменные окружения для хранения API ключей

## Как это работает

### Процесс авторизации

1. **Инициализация Telegram WebApp**
   - `TelegramContext` загружает скрипт Telegram WebApp и инициализирует API
   - После успешной инициализации устанавливается состояние `telegram` и `user`

2. **Авторизация пользователя**
   - Пользователь нажимает кнопку "Войти через Telegram"
   - Вызывается функция `signInWithTelegram` из `AuthContext`
   - Данные от Telegram отправляются на Edge Function

3. **Обработка данных на сервере**
   - Edge Function проверяет подлинность данных с помощью TELEGRAM_BOT_TOKEN
   - Ищет пользователя в базе или создает нового
   - Создает сессию и возвращает JWT токен

4. **Установка сессии**
   - Frontend получает токен и устанавливает сессию через Supabase Auth
   - Пользователь авторизован и перенаправляется на главную страницу

### Файловая структура

```
src/
  ├── contexts/
  │   ├── TelegramContext.tsx   # Контекст для работы с Telegram WebApp API
  │   └── AuthContext.tsx       # Контекст для управления авторизацией
  ├── components/
  │   └── auth/
  │       ├── TelegramLogin.tsx     # Компонент кнопки авторизации через Telegram
  │       └── TelegramAuthScreen.tsx # Экран авторизации через Telegram
  ├── services/
  │   └── userService.ts        # Сервис для работы с пользователями
supabase/
  ├── functions/
  │   └── telegram-auth/
  │       └── index.ts          # Edge Function для авторизации
  └── migrations/               # SQL-миграции для настройки базы данных
```

## Настройка в другом проекте

### 1. Переменные окружения

```bash
# Создайте секрет для Edge Function (не в .env файле!)
supabase functions secrets set TELEGRAM_BOT_TOKEN=ваш_токен_бота
supabase functions secrets set ENVIRONMENT=production
```

### 2. Настройка Content Security Policy

Обновите мета-тег CSP в `index.html`, чтобы разрешить загрузку скриптов с telegram.org:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://[your-supabase-project].supabase.co data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org; connect-src 'self' https://[your-supabase-project].supabase.co wss://[your-supabase-project].supabase.co https://telegram.org">
```

### 3. Установка зависимостей

```bash
npm install @supabase/supabase-js react react-dom react-router-dom
```

### 4. Скопируйте необходимые файлы

Скопируйте следующие файлы в ваш новый проект:
- `src/contexts/TelegramContext.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/auth/TelegramLogin.tsx`
- `src/components/auth/TelegramAuthScreen.tsx`
- `supabase/functions/telegram-auth/index.ts`

### 5. Обновите схему базы данных

Добавьте необходимые поля в таблицу `users` в вашей базе данных Supabase:

```sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS telegram_auth_date TIMESTAMP WITH TIME ZONE;
```

### 6. Разверните Edge Function

Разверните Edge Function `telegram-auth` в вашем проекте Supabase:

```bash
cd supabase/functions/telegram-auth
supabase functions deploy telegram-auth --no-verify-jwt
```

### 7. Настройте CORS для Edge Function

```bash
supabase functions cors allow-all telegram-auth
```

### 8. Интегрируйте компоненты в ваше приложение

```jsx
import { TelegramProvider } from './contexts/TelegramContext';
import { AuthProvider } from './contexts/AuthContext';
import TelegramAuthScreen from './components/auth/TelegramAuthScreen';

function App() {
  return (
    <TelegramProvider>
      <AuthProvider>
        {/* Ваше приложение */}
        <TelegramAuthScreen />
      </AuthProvider>
    </TelegramProvider>
  );
}
```

## Отладка и решение проблем

### Проблемы с инициализацией Telegram WebApp

1. **Проверьте CSP** - убедитесь, что в Content Security Policy разрешены домены telegram.org
2. **Проверьте консоль браузера** - ищите ошибки загрузки скрипта
3. **Используйте режим отладки в TelegramAuthScreen** - компонент включает в себя отладочную информацию

### Проблемы с авторизацией

1. **Проверьте токен бота** - убедитесь, что `TELEGRAM_BOT_TOKEN` установлен правильно в секретах Edge Function
2. **Логи Edge Function** - проверьте логи с помощью `supabase functions logs telegram-auth`
3. **Проверьте режим окружения** - если вы тестируете локально, установите `ENVIRONMENT=development`

### Инициализация бота Telegram

1. Создайте нового бота через [@BotFather](https://t.me/BotFather)
2. Получите токен бота
3. Командой `/setdomain` настройте домен для WebApp на ваш Supabase URL

## Полезные ссылки

- [Документация Telegram WebApp](https://core.telegram.org/bots/webapps)
- [Документация Supabase Edge Functions](https://supabase.io/docs/reference/javascript/functions)
- [Telegram Bot API](https://core.telegram.org/bots/api)