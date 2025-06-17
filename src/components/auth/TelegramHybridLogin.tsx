import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../contexts/TelegramContext';
import { useTelegramHybridAuth } from '../../hooks/useTelegramHybridAuth';
import { LucideBot, CheckCircle, AlertCircle, Loader2, Copy, Eye, EyeOff, RefreshCw, LucideUser } from 'lucide-react';

interface TelegramHybridLoginProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const TelegramHybridLogin: React.FC<TelegramHybridLoginProps> = ({ onSuccess, onError }) => {
  const { telegram, user: telegramUser, isReady } = useTelegram();
  const { 
    signUpOrSignInWithTelegram,
    isLoading,
    error,
    authResult,
    resetError
  } = useTelegramHybridAuth();
  
  const [showCredentials, setShowCredentials] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false);

  // Генерация случайного пароля
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Показываем учетные данные для новых пользователей
  useEffect(() => {
    if (authResult?.success && authResult.isNewUser) {
      setShowCredentials(true);
      
      // Увеличиваем время отображения учетных данных до 60 секунд
      const timer = setTimeout(() => {
        setShowCredentials(false);
      }, 60000);
      
      return () => clearTimeout(timer);
    }
  }, [authResult]);

  // Обработка ошибок
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // Обработка успешной авторизации
  useEffect(() => {
    if (authResult?.success) {
      // Сохраняем email и пароль для будущего использования
      if (authResult.email && authResult.password) {
        try {
          localStorage.setItem('telegram_auth_email', authResult.email);
          localStorage.setItem('telegram_auth_password', authResult.password);
        } catch (storageError) {
          console.warn('Не удалось сохранить учетные данные в localStorage', storageError);
        }
      }

      // Если новый пользователь и показываем учетные данные,
      // не перенаправляем автоматически - пусть пользователь сам закроет окно
      if (!(authResult.isNewUser && showCredentials)) {
        // Небольшая задержка, чтобы пользователь мог увидеть сообщение об успехе
        const timer = setTimeout(() => {
          onSuccess?.();
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [authResult, onSuccess, showCredentials]);

  // Копирование email
  const copyEmail = () => {
    if (authResult?.email) {
      navigator.clipboard.writeText(authResult.email)
        .then(() => {
          setEmailCopied(true);
          setTimeout(() => setEmailCopied(false), 2000);
        })
        .catch(err => {
          console.error('Не удалось скопировать email:', err);
        });
    }
  };

  // Копирование пароля
  const copyPassword = () => {
    const passwordToCopy = generatedPassword || authResult?.password;
    if (passwordToCopy) {
      navigator.clipboard.writeText(passwordToCopy)
        .then(() => {
          setPasswordCopied(true);
          setTimeout(() => setPasswordCopied(false), 2000);
        })
        .catch(err => {
          console.error('Не удалось скопировать пароль:', err);
        });
    }
  };

  // Генерация нового пароля
  const handleGenerateNewPassword = () => {
    const newPassword = generateRandomPassword();
    setGeneratedPassword(newPassword);
    
    // Сохраняем новый пароль в localStorage
    if (authResult?.email) {
      try {
        localStorage.setItem('telegram_auth_password', newPassword);
      } catch (storageError) {
        console.warn('Не удалось сохранить новый пароль в localStorage', storageError);
      }
    }
  };

  // Обработчик нажатия на кнопку
  const handleTelegramAuth = async () => {
    if (!isReady || !telegram || !telegramUser) {
      onError?.('Telegram WebApp недоступен');
      return;
    }
    
    resetError();
    
    try {
      const result = await signUpOrSignInWithTelegram();
      
      if (!result.success) {
        onError?.(result.error || 'Неизвестная ошибка');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      onError?.(errorMessage);
    }
  };

  // Обработчик ручного закрытия окна после авторизации
  const handleManualClose = () => {
    onSuccess?.();
  };

  return (
    <div className="w-full">
      {isReady ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center mb-3 justify-center">
            {telegramUser?.photo_url && !imageLoadError ? (
              <img 
                src={telegramUser.photo_url} 
                alt={telegramUser.first_name} 
                className="w-16 h-16 rounded-full mr-3"
                onError={(e) => {
                  setImageLoadError(true);
                }}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#323248] flex items-center justify-center mr-3">
                <LucideUser size={28} className="text-gray-400" />
              </div>
            )}
            
            <div>
              <p className="font-medium">
                {telegramUser?.first_name} {telegramUser?.last_name || ''}
              </p>
              {telegramUser?.username && (
                <p className="text-gray-400">@{telegramUser.username}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleTelegramAuth}
            disabled={isLoading}
            className="w-full bg-[#2AABEE] text-white py-3 px-6 rounded-lg font-bold disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="mr-2 animate-spin" />
                Авторизация...
              </>
            ) : (
              <>
                <LucideBot size={20} className="mr-2" />
                Продолжить с Telegram
              </>
            )}
          </button>
          
          {/* Отображение результата авторизации */}
          {authResult?.success && (
            <div className={`mt-2 p-3 rounded-lg ${authResult.isNewUser ? 'bg-blue-500/20 border border-blue-500' : 'bg-green-500/20 border border-green-500'}`}>
              <div className="flex items-start">
                <CheckCircle size={18} className="mr-2 mt-0.5 flex-shrink-0 text-green-400" />
                <p className="text-green-300">
                  {authResult.isNewUser ? 'Регистрация' : 'Вход'} выполнен успешно!
                </p>
              </div>
            </div>
          )}
          
          {/* Отображение учетных данных для новых пользователей */}
          {showCredentials && authResult?.isNewUser && (
            <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500 rounded-lg">
              <p className="text-blue-300 font-medium mb-3">Ваши данные для входа:</p>
              
              <div className="space-y-4">
                {/* Email */}
                <div>
                  <p className="text-sm text-gray-400 mb-1">Email:</p>
                  <div className="flex">
                    <div className="bg-[#323248] p-2 rounded flex-grow text-white">
                      {authResult.email}
                    </div>
                    <button 
                      onClick={copyEmail}
                      className={`ml-2 px-3 py-2 rounded-md ${emailCopied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}
                      title="Скопировать email"
                    >
                      {emailCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <p className="text-sm text-gray-400 mb-1">Пароль:</p>
                  <div className="flex">
                    <div className="bg-[#323248] p-2 rounded flex-grow text-white flex-1 relative pr-10">
                      {showPassword ? (generatedPassword || authResult.password) : '•'.repeat(12)}
                      <button 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        title={showPassword ? "Скрыть пароль" : "Показать пароль"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <button 
                      onClick={copyPassword}
                      className={`ml-2 px-3 py-2 rounded-md ${passwordCopied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}
                      title="Скопировать пароль"
                    >
                      {passwordCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                
                {/* Генерация нового пароля */}
                <button 
                  onClick={handleGenerateNewPassword}
                  className="w-full py-2 rounded-md bg-purple-600 text-white flex items-center justify-center"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Сгенерировать новый пароль
                </button>
              </div>
              
              <div className="mt-4">
                <p className="text-yellow-400 text-sm mb-3">
                  ⚠️ Обязательно сохраните эти данные! Они понадобятся для входа без Telegram.
                </p>
                <button 
                  className="w-full mt-2 py-2 rounded-md bg-green-600 text-white"
                  onClick={handleManualClose}
                >
                  Я сохранил данные, продолжить
                </button>
              </div>
            </div>
          )}
          
          {/* Отображение ошибок */}
          {error && (
            <div className="mt-2 p-3 bg-red-500/20 border border-red-500 rounded-lg">
              <div className="flex items-start">
                <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0 text-red-400" />
                <p className="text-red-300">{error}</p>
              </div>
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

export default TelegramHybridLogin;