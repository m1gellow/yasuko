#!/bin/bash
# Скрипт для настройки провайдеров авторизации в Supabase

# Вывод инструкций для ручной настройки
echo "=== Настройка авторизации через Telegram ==="
echo ""
echo "1. Откройте админ-панель Supabase и перейдите в Authentication > Providers"
echo "2. Включите провайдер 'Email' и отключите confirm email"
echo "3. Включите провайдер 'JWT' для авторизации через Telegram"
echo ""
echo "4. В настройках Telegram-бота через BotFather установите domain для WebApp:"
echo "   https://itqaflidiepnjzffijkh.supabase.co"
echo ""
echo "5. Выполните следующие команды для деплоя функции telegram-auth:"
echo "   cd supabase/functions/telegram-auth"
echo "   export TELEGRAM_BOT_TOKEN='ваш-токен-бота'"
echo "   supabase functions deploy telegram-auth --no-verify-jwt"
echo ""
echo "6. Настройте CORS для функции:"
echo "   supabase functions cors allow-all telegram-auth"
echo ""
echo "Готово! Теперь авторизация через Telegram должна работать."