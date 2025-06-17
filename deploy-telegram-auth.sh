#!/bin/bash
# Скрипт для деплоя Edge Function telegram-auth с нужными переменными окружения

# Вывод информации о начале работы скрипта
echo "Начинаем деплой функции telegram-auth..."

# Проверяем наличие переменной окружения TELEGRAM_BOT_TOKEN
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "Ошибка: Переменная TELEGRAM_BOT_TOKEN не установлена."
  echo "Установите её перед запуском этого скрипта:"
  echo "export TELEGRAM_BOT_TOKEN=ваш_токен_бота"
  exit 1
fi

# Устанавливаем переменные окружения для функции
echo "Устанавливаем секрет TELEGRAM_BOT_TOKEN для функции..."
supabase functions secrets set --env-file=.env TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN"

echo "Устанавливаем секрет ENVIRONMENT=production для функции..."
supabase functions secrets set ENVIRONMENT="production"

# Деплой функции
echo "Разворачиваем функцию telegram-auth..."
supabase functions deploy telegram-auth --no-verify-jwt

echo "Функция telegram-auth успешно развернута!"
echo "Теперь пользователи могут авторизоваться через Telegram."