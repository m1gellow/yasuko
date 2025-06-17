import React, { useState } from 'react';
import { useTelegram } from '../../contexts/TelegramContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTelegramHybridAuth } from '../../hooks/useTelegramHybridAuth';
import { LucideBot, Loader2, LucideUser } from 'lucide-react';

interface TelegramLoginProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const TelegramLogin: React.FC<TelegramLoginProps> = ({ onSuccess, onError }) => {
  const { telegram, user: telegramUser, isReady } = useTelegram();
  const { signInWithTelegram } = useAuth();
  
  const { 
    signUpOrSignInWithTelegram,
    isLoading: hybridAuthLoading,
    error: hybridAuthError,
    authResult,
    initDataStatus
  } = useTelegramHybridAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  const handleTelegramAuth = async () => {
    if (!isReady || !telegram || !telegramUser) {
      onError?.('Telegram WebApp недоступен');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Используем гибридную авторизацию
      const result = await signUpOrSignInWithTelegram();
      
      if (result.success) {
        onSuccess?.();
        setIsLoading(false);
        return;
      }
      
      // Если гибридный метод не работает, пробуем через Edge Function
      // Подготавливаем данные для функции авторизации
      const authData = {
        telegramData: {
          user: telegramUser,
          initData: telegram.initData,
          initDataUnsafe: telegram.initDataUnsafe
        }
      };
      
      const edgeFunctionResult = await signInWithTelegram(authData);
      
      if (edgeFunctionResult.success) {
        onSuccess?.();
      } else {
        onError?.(edgeFunctionResult.error || 'Ошибка при авторизации через Telegram');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {isReady ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center mb-3 justify-center">
            {telegramUser?.photo_url && !imageLoadError ? (
              <img 
                src={telegramUser.photo_url} 
                alt={telegramUser.first_name} 
                className="w-10 h-10 rounded-full mr-3"
                onError={(e) => {
                  setImageLoadError(true);
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#323248] flex items-center justify-center mr-3">
                <LucideUser size={20} className="text-gray-400" />
              </div>
            )}
            
            <div>
              <p className="font-medium text-sm">
                {telegramUser?.first_name} {telegramUser?.last_name || ''}
              </p>
              {telegramUser?.username && (
                <p className="text-gray-400 text-xs">@{telegramUser.username}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleTelegramAuth}
            disabled={isLoading || hybridAuthLoading}
            className="w-full bg-[#2AABEE] text-white py-3 px-6 rounded-lg font-bold disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading || hybridAuthLoading ? (
              <>
                <Loader2 size={20} className="mr-2 animate-spin" />
                Авторизация...
              </>
            ) : (
              <>
                <LucideBot size={20} className="mr-2" />
                Войти через Telegram
              </>
            )}
          </button>
          
          {/* Вывод ошибки */}
          {(hybridAuthError && (
            <div className="mt-2 p-2 bg-red-500/20 border border-red-500 rounded text-red-300 text-xs">
              {hybridAuthError}
            </div>
          ))}
          
          {/* Результат авторизации */}
          {authResult?.success && (
            <div className="mt-2 p-2 bg-green-500/20 border border-green-500 rounded text-green-300 text-xs">
              {authResult.isNewUser ? 'Успешная регистрация!' : 'Успешный вход!'}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-400 mb-4">
            Для авторизации через Telegram, пожалуйста, запустите приложение в Telegram.
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
    </div>
  );
};

export default TelegramLogin;