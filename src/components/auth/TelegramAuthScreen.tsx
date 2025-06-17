import React, { useState, useEffect, useRef } from 'react';
import { useTelegram } from '../../contexts/TelegramContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTelegramAuth } from '../../hooks/useTelegramAuth';
import { LucideBot, AlertCircle, LucideUser } from 'lucide-react';

interface TelegramAuthScreenProps {
  onSuccess: () => void;
  onClose?: () => void;
}

const TelegramAuthScreen: React.FC<TelegramAuthScreenProps> = ({ onSuccess, onClose }) => {
  const { telegram, isReady, user: telegramUser, error: telegramError } = useTelegram();
  const { signInWithTelegram, error: authError, resetError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [autoAuthAttempted, setAutoAuthAttempted] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  
  const {
    authenticateWithTelegram,
    authInProgress,
    lastAuthError,
    lastAuthResult,
    initDataStatus
  } = useTelegramAuth();
  
  // Ref для отслеживания монтирования компонента
  const isMounted = useRef(true);
  
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Сброс ошибок при повторной попытке
  useEffect(() => {
    if (retryCount > 0) {
      resetError();
      setLocalError(null);
    }
  }, [retryCount, resetError]);

  // Автоматическая авторизация при загрузке в Telegram WebApp
  useEffect(() => {
    if (isReady && telegram?.initDataUnsafe && !autoAuthAttempted && telegramUser) {
      setAutoAuthAttempted(true);
      
      // Запускаем авторизацию с небольшой задержкой
      setTimeout(() => {
        if (isMounted.current) {
          handleTelegramAuth();
        }
      }, 300);
    }
  }, [isReady, telegram, telegramUser, autoAuthAttempted]);

  // Оптимизированный обработчик авторизации через Telegram
  const handleTelegramAuth = async () => {
    if (!isReady || !telegram) {
      setLocalError('Telegram WebApp недоступен');
      return;
    }

    if (!telegramUser) {
      setLocalError('Данные пользователя Telegram не найдены');
      return;
    }

    setIsLoading(true);
    setLocalError(null);
    setRetryCount(prev => prev + 1);

    try {
      // Подготавливаем данные для авторизации
      const authData = {
        telegramData: {
          user: telegramUser,
          initData: telegram.initData,
          initDataUnsafe: telegram.initDataUnsafe
        }
      };
      
      // Используем функцию из AuthContext
      const { success, error } = await signInWithTelegram(authData);
      
      if (success) {
        if (isMounted.current) {
          onSuccess();
        }
      } else {
        if (isMounted.current) {
          setLocalError(error || 'Не удалось войти через Telegram');
          
          // Если это первая попытка, попробуем альтернативный метод через useTelegramAuth
          if (retryCount === 1) {
            const alternativeResult = await authenticateWithTelegram();
            
            if (alternativeResult.success) {
              if (isMounted.current) {
                onSuccess();
              }
            }
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      if (isMounted.current) {
        setLocalError(`Ошибка авторизации: ${errorMessage}`);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={handleClickOutside}>
      <div className="bg-[#252538] rounded-lg w-full max-w-md overflow-hidden shadow-xl">
        {/* Заголовок */}
        <div className="bg-[#2a2a40] p-4 border-b border-[#3a3a55]">
          <h2 className="text-xl font-bold text-yellow-400">Авторизация через Telegram</h2>
        </div>
        
        {/* Отображение ошибок */}
        {(localError || authError || telegramError || lastAuthError) && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 m-4 rounded-md">
            <div className="flex items-start">
              <AlertCircle size={18} className="mr-2 mt-0.5 text-red-400" />
              <div>
                <p className="font-medium">Ошибка авторизации:</p>
                <p className="text-sm">{localError || authError || telegramError || lastAuthError}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Содержимое */}
        {isLoading || authInProgress ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-300">Выполняется авторизация...</p>
          </div>
        ) : (
          <>
            {isReady && telegramUser ? (
              <div className="py-6 space-y-6 p-4">
                <div className="flex items-center justify-center space-x-4">
                  {telegramUser.photo_url && !imageLoadError ? (
                    <img 
                      src={telegramUser.photo_url} 
                      alt={telegramUser.first_name} 
                      className="w-16 h-16 rounded-full"
                      onError={(e) => {
                        setImageLoadError(true);
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#323248] flex items-center justify-center">
                      <LucideUser size={28} className="text-gray-400" />
                    </div>
                  )}
                  
                  <div className="text-center">
                    <p className="text-lg font-medium">
                      {telegramUser.first_name} {telegramUser.last_name || ''}
                    </p>
                    {telegramUser.username && (
                      <p className="text-gray-400">@{telegramUser.username}</p>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={handleTelegramAuth}
                  className="w-full bg-[#2AABEE] text-white py-3 rounded-lg font-bold flex items-center justify-center"
                >
                  <LucideBot size={20} className="mr-2" />
                  {retryCount > 0 ? "Попробовать снова" : "Войти через Telegram"}
                </button>
                
                {retryCount > 0 && (
                  <button
                    onClick={onClose}
                    className="w-full bg-[#323248] text-white py-2 rounded-lg font-medium mt-2"
                  >
                    Продолжить без авторизации
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-6 p-4">
                <p className="text-gray-400 mb-4">
                  Для авторизации через Telegram, пожалуйста, запустите приложение в Telegram WebApp или перейдите по ссылке.
                </p>
                
                <a 
                  href="https://t.me/YASUKA_PERS_BOT?start=auth" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block bg-[#2AABEE] text-white py-3 px-6 rounded-lg font-bold"
                >
                  Открыть в Telegram
                </a>
              </div>
            )}
            
            {/* Кнопка закрытия для пропуска авторизации */}
            {onClose && (
              <div className="border-t border-[#323248] p-4">
                <button
                  onClick={() => {
                    onClose();
                  }}
                  className="w-full py-2 bg-[#323248] text-gray-300 hover:bg-[#3a3a55] rounded-lg transition-colors"
                >
                  Продолжить без авторизации
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TelegramAuthScreen;