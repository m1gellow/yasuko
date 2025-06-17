import React, { createContext, useContext, useEffect, useState } from 'react';
import { TelegramWebAppUser, TelegramWebAppInitData } from '../types';

// Типы для Telegram WebApp API
interface TelegramHapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramWebAppInitData;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive: boolean) => void;
    hideProgress: () => void;
  };
  HapticFeedback: TelegramHapticFeedback;
  close: () => void;
  expand: () => void;
  openLink: (url: string) => void;
  showPopup: (params: { title?: string, message: string, buttons?: Array<{ type: string, text: string }> }, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  ready: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  onEvent: (eventType: string, eventHandler: () => void) => void;
  offEvent: (eventType: string, eventHandler: () => void) => void;
  WebApp?: {
    openTelegramLink: (url: string) => void;
    openLink: (url: string) => void;
    openInvoice: (url: string, callback?: (status: string) => void) => void;
    showScanQrPopup: (params: { text?: string }, callback?: (text: string) => void) => void;
    closeScanQrPopup: () => void;
  };
  sendData?: (data: any) => void;
  switchInlineQuery?: (query: string, choose_chat_types?: Array<string>) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

// Тип контекста
interface TelegramContextValue {
  telegram: TelegramWebApp | null;
  user: TelegramWebAppUser | null;
  isReady: boolean;
  error: string | null;
  isDebugMode: boolean;
}

// Создание контекста
const TelegramContext = createContext<TelegramContextValue | undefined>(undefined);

// Провайдер контекста - отключаем режим отладки по умолчанию
export const TelegramProvider: React.FC<{ 
  children: React.ReactNode;
  debugMode?: boolean;
}> = ({ children, debugMode = false }) => {
  const [telegram, setTelegram] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramWebAppUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDebugMode] = useState(debugMode);

  useEffect(() => {
    let telegramScript: HTMLScriptElement | null = null;
    let retryCount = 0;
    const maxRetries = 3;

    // Инициализация Telegram WebApp API
    const initTelegram = () => {
      try {
        if (window.Telegram && window.Telegram.WebApp) {
          const tg = window.Telegram.WebApp;
          
          // Если initData пустая, но мы в режиме отладки - создаем заглушку
          if ((!tg.initData || tg.initData.length === 0) && debugMode && tg.initDataUnsafe?.user) {
            // @ts-ignore - добавляем инициализацию для режима разработки
            tg.initData = `user=${JSON.stringify(tg.initDataUnsafe.user)}&auth_date=${Math.floor(Date.now() / 1000)}&query_id=development_mode`;
          }
          
          setTelegram(tg);
          setUser(tg.initDataUnsafe.user || null);
          
          // Сообщаем Telegram WebApp, что мы готовы
          tg.ready();
          setIsReady(true);
        } else {
          throw new Error('Telegram WebApp is not available');
        }
      } catch (e: any) {
        const errorMessage = e.message || 'Failed to initialize Telegram WebApp';
        setError(errorMessage);
        
        if (retryCount < maxRetries) {
          // Попытка повторной инициализации через небольшую задержку
          setTimeout(() => {
            retryCount++;
            initTelegram();
          }, 500);
        }
      }
    };

    // Если WebApp уже доступен, инициализируем
    if (window.Telegram && window.Telegram.WebApp) {
      initTelegram();
    } else {
      // Загружаем скрипт Telegram WebApp
      telegramScript = document.createElement('script');
      telegramScript.src = 'https://telegram.org/js/telegram-web-app.js';
      telegramScript.async = true;
      telegramScript.onload = () => {
        initTelegram();
      };
      telegramScript.onerror = (e) => {
        const errorMsg = 'Failed to load Telegram WebApp script';
        setError(errorMsg);
      };
      document.head.appendChild(telegramScript);
    }

    // Очистка
    return () => {
      if (telegramScript && telegramScript.parentNode) {
        telegramScript.parentNode.removeChild(telegramScript);
      }
    };
  }, [debugMode]);

  return (
    <TelegramContext.Provider value={{ telegram, user, isReady, error, isDebugMode }}>
      {children}
    </TelegramContext.Provider>
  );
};

// Хук для использования контекста
export const useTelegram = (): TelegramContextValue => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
};

// Явный экспорт хука и контекста
export { TelegramContext };

// Для обратной совместимости
export default { TelegramProvider, useTelegram };