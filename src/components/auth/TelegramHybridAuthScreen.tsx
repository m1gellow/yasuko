import React, { useState, useEffect, useRef } from 'react';
import { useTelegram } from '../../contexts/TelegramContext';
import { useTelegramHybridAuth } from '../../hooks/useTelegramHybridAuth';
import { LucideBot, AlertCircle, CheckCircle, Loader2, LucideUser } from 'lucide-react';

interface TelegramHybridAuthScreenProps {
  onSuccess: () => void;
  onClose?: () => void;
}

const TelegramHybridAuthScreen: React.FC<TelegramHybridAuthScreenProps> = ({ onSuccess, onClose }) => {
  const { telegram, user: telegramUser, isReady } = useTelegram();
  const { 
    signUpOrSignInWithTelegram,
    isLoading,
    error,
    authResult,
    resetError,
    initDataStatus
  } = useTelegramHybridAuth();
  
  const [retryCount, setRetryCount] = useState(0);
  const [autoAuthAttempted, setAutoAuthAttempted] = useState(false);
  const [credentialsCopied, setCredentialsCopied] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false); // Для отслеживания ошибок загрузки изображения

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
    }
  }, [retryCount, resetError]);

  // Автоматическая авторизация при загрузке в Telegram WebApp
  useEffect(() => {
    if (isReady && telegramUser && !autoAuthAttempted) {
      setAutoAuthAttempted(true);
      
      // Запускаем авторизацию с небольшой задержкой
      setTimeout(() => {
        if (isMounted.current) {
          handleTelegramAuth();
        }
      }, 300);
    }
  }, [isReady, telegramUser, autoAuthAttempted]);

  // Обработка успешной авторизации
  useEffect(() => {
    if (authResult?.success) {
      // Если это новый пользователь, ждем копирования учетных данных
      if (authResult.isNewUser && !credentialsCopied) {
        // Не перенаправляем, ждем копирования учетных данных
      }
      // Если это не новый пользователь или учетные данные уже скопированы, 
      // перенаправляем после паузы в 2 секунды для удобства пользователя
      else {
        // Увеличиваем задержку перед вызовом onSuccess
        const timer = setTimeout(() => {
          if (isMounted.current) {
            onSuccess();
          }
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [authResult, onSuccess, credentialsCopied]);

  // Копирование учетных данных
  const copyCredentials = () => {
    if (authResult?.email && authResult?.password) {
      const text = `Email: ${authResult.email}\nПароль: ${authResult.password}`;
      navigator.clipboard.writeText(text)
        .then(() => {
          setCredentialsCopied(true);
          
          // После копирования автоматически перенаправляем через 15 секунд
          // Увеличиваем время до 15 секунд, чтобы пользователь успел сохранить данные
          setTimeout(() => {
            if (isMounted.current) {
              onSuccess();
            }
          }, 15000);
        })
        .catch(err => {
          alert('Пожалуйста, запишите эти данные для входа:\n' + text);
          setCredentialsCopied(true); // все равно считаем скопированным
          
          // Даже при ошибке копирования, ждем 15 секунд
          setTimeout(() => {
            if (isMounted.current) {
              onSuccess();
            }
          }, 15000);
        });
    }
  };

  // Оптимизированный обработчик авторизации через Telegram
  const handleTelegramAuth = async () => {
    if (!isReady || !telegram) {
      return;
    }

    if (!telegramUser) {
      return;
    }

    setRetryCount(prev => prev + 1);
    resetError();

    try {
      const result = await signUpOrSignInWithTelegram();
      
      if (!result.success) {
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    }
  };

  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && onClose) {
      // Если есть неподтвержденные учетные данные, запрашиваем подтверждение
      if (authResult?.success && authResult.isNewUser && !credentialsCopied) {
        if (confirm('Вы не скопировали учетные данные. Они могут понадобиться для входа в будущем. Уверены, что хотите продолжить?')) {
          onClose();
        }
      } else {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={handleClickOutside}>
      <div className="bg-[#252538] rounded-lg w-full max-w-md overflow-hidden shadow-xl">
        {/* Заголовок */}
        <div className="bg-[#2a2a40] p-4 border-b border-[#3a3a55]">
          <h2 className="text-xl font-bold text-yellow-400">Авторизация через Telegram</h2>
        </div>
        
        {/* Содержимое */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
            <p className="text-gray-300">Выполняется авторизация...</p>
          </div>
        ) : (
          <>
            {isReady && telegramUser ? (
              <div className="py-6 space-y-4 p-4">
                {/* Данные пользователя */}
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
                
                {/* Отображение ошибок */}
                {error && (
                  <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-md flex items-start">
                    <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0 text-red-400" />
                    <div>
                      <p className="font-medium">Ошибка авторизации:</p>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                )}
                
                {/* Отображение успешного результата */}
                {authResult?.success && (
                  <div className="bg-green-500/20 border border-green-500 p-3 rounded-md">
                    <div className="flex items-start mb-2">
                      <CheckCircle size={18} className="mr-2 mt-0.5 flex-shrink-0 text-green-400" />
                      <p className="text-green-300 font-medium">
                        {authResult.isNewUser ? 'Регистрация' : 'Вход'} выполнен успешно!
                      </p>
                    </div>
                    
                    {authResult.isNewUser && authResult.email && authResult.password && (
                      <>
                        <p className="text-sm text-blue-300 mb-1">Ваши данные для входа:</p>
                        <div className="bg-[#323248] p-2 rounded text-xs">
                          <p><span className="text-gray-400">Email:</span> {authResult.email}</p>
                          <p><span className="text-gray-400">Пароль:</span> {authResult.password}</p>
                        </div>
                        <div className="mt-3">
                          <button
                            className={`w-full py-2 rounded ${credentialsCopied 
                              ? 'bg-green-600 text-white' 
                              : 'bg-yellow-500 text-black'}`}
                            onClick={copyCredentials}
                          >
                            {credentialsCopied 
                              ? '✓ Данные скопированы' 
                              : 'Скопировать данные для входа'}
                          </button>
                          <p className="mt-2 text-xs text-yellow-400 text-center">
                            Скопируйте эти данные, они понадобятся для входа без Telegram!
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {/* Кнопка авторизации */}
                {(!authResult?.success || !authResult.isNewUser) && (
                  <button
                    onClick={handleTelegramAuth}
                    className="w-full bg-[#2AABEE] text-white py-3 rounded-lg font-bold flex items-center justify-center"
                  >
                    <LucideBot size={20} className="mr-2" />
                    {retryCount > 0 ? "Попробовать снова" : "Войти через Telegram"}
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
            
            {/* Кнопка закрытия */}
            {onClose && !credentialsCopied && (
              <div className="border-t border-[#323248] p-4">
                <button
                  onClick={onClose}
                  className="w-full py-2 bg-[#323248] text-gray-300 hover:bg-[#3a3a55] rounded-lg transition-colors"
                >
                  Закрыть
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TelegramHybridAuthScreen;