import React, { useState } from 'react';
import { useTelegram } from '../../contexts/TelegramContext';
import TelegramHybridAuthScreen from './TelegramHybridAuthScreen';
import { XIcon, SendIcon, ArrowRightIcon } from 'lucide-react';

interface TelegramOptionsScreenProps {
  onSuccess: () => void;
  onClose?: () => void;
}

const TelegramOptionsScreen: React.FC<TelegramOptionsScreenProps> = ({ onSuccess, onClose }) => {
  const { user: telegramUser, isReady } = useTelegram();
  const [authError, setAuthError] = useState<string | null>(null);

  const handleAuthSuccess = () => {
    onSuccess();
  };

  const handleAuthError = (error: string) => {
    setAuthError(error);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#1e183a] to-[#15122b] rounded-xl w-full max-w-md overflow-hidden shadow-xl border border-purple-500/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 p-4 border-b border-purple-500/30 flex justify-between items-center">
          <div className="flex items-center">
            <SendIcon className="text-yellow-400 mr-2" size={20} />
            <h2 className="text-xl font-bold text-white">ВХОД ЧЕРЕЗ TELEGRAM</h2>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="rounded-full p-1 hover:bg-purple-500/30 transition-colors text-gray-300 hover:text-white"
              aria-label="Закрыть"
            >
              <XIcon size={20} />
            </button>
          )}
        </div>
        
        {/* Error Display */}
        {authError && (
          <div className="bg-red-900/30 border border-red-500/30 text-red-200 p-3 mx-4 mt-4 rounded-lg flex items-start">
            <AlertTriangleIcon className="mr-2 mt-0.5 flex-shrink-0 text-red-400" size={16} />
            <span>{authError}</span>
          </div>
        )}
        
        {/* Main Content */}
        <div className="p-6">
          {isReady && telegramUser ? (
            <TelegramHybridAuthScreen 
              onSuccess={handleAuthSuccess} 
              onClose={onClose} 
            />
          ) : (
            <div className="space-y-6">
              <p className="text-center text-gray-300">
                Для входа в игру используйте Telegram:
              </p>
              
              {/* Auth Options */}
              <div className="space-y-4">
                <button 
                  onClick={() => window.location.href = "https://t.me/YASUKA_PERS_BOT?start=auth"}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 rounded-lg font-bold flex items-center justify-center transition-all shadow-md"
                >
                  <SendIcon size={20} className="mr-2" />
                  Войти через Telegram
                  <ArrowRightIcon size={18} className="ml-2" />
                </button>
              </div>
              
              {/* Info */}
              <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/20">
                <p className="text-xs text-gray-300 text-center">
                  Войдите через Telegram, чтобы сохранять прогресс и участвовать в рейтинге
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TelegramOptionsScreen;