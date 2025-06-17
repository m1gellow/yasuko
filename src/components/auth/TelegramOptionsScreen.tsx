import React, { useState } from 'react';
import { useTelegram } from '../../contexts/TelegramContext';
import TelegramHybridAuthScreen from './TelegramHybridAuthScreen';
import { XIcon, SendIcon } from 'lucide-react';

interface TelegramOptionsScreenProps {
  onSuccess: () => void;
  onClose?: () => void;
}

const TelegramOptionsScreen: React.FC<TelegramOptionsScreenProps> = ({ onSuccess, onClose }) => {
  const { user: telegramUser, isReady } = useTelegram();
  const [authError, setAuthError] = useState<string | null>(null);

  // Обработчики результата авторизации
  const handleAuthSuccess = () => {
    onSuccess();
  };

  const handleAuthError = (error: string) => {
    setAuthError(error);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#252538] rounded-lg w-full max-w-md overflow-hidden shadow-xl">
        {/* Заголовок */}
        <div className="bg-[#2a2a40] p-4 border-b border-[#3a3a55] flex justify-between items-center">
          <h2 className="text-xl font-bold text-yellow-400">Вход в игру</h2>
          {onClose && (
            <button 
              onClick={onClose}
              className="rounded-full p-1 hover:bg-[#323248] transition-colors"
              aria-label="Закрыть"
            >
              <XIcon size={20} className="text-gray-400" />
            </button>
          )}
        </div>
        
        {/* Отображение ошибок */}
        {authError && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 mx-4 mt-4 rounded-md">
            {authError}
          </div>
        )}
        
        {/* Основное содержимое */}
        <div className="p-4">
          {isReady && telegramUser ? (
            <TelegramHybridAuthScreen 
              onSuccess={handleAuthSuccess} 
              onClose={onClose} 
            />
          ) : (
            <div className="py-4 space-y-4">
              <p className="text-center text-gray-300 mb-6">
                Для входа в игру используйте Telegram:
              </p>
              
              {/* Опции для авторизации */}
              <div className="space-y-3">
                <button 
                  onClick={() => window.location.href = "https://t.me/YASUKA_PERS_BOT?start=auth"}
                  className="w-full bg-[#2AABEE] text-white py-3 rounded-lg font-bold flex items-center justify-center"
                >
                  <SendIcon size={20} className="mr-2" />
                  Войти через Telegram
                </button>
              </div>
              
              {/* Информация */}
              <p className="text-xs text-gray-400 text-center mt-4">
                Войдите через Telegram, чтобы сохранять прогресс и участвовать в рейтинге
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TelegramOptionsScreen;