import React, { useState } from 'react';
import { HeartIcon, SmileIcon, CoffeeIcon, AlertCircle } from 'lucide-react';
import { useTelegram } from '../../contexts/TelegramContext';

interface CharacterStatsProps {
  health: number;
  hunger: number;
  happiness: number;
  lastFed: string;
  onFeed: () => void;
  onPlay: () => void;
}

const CharacterStats: React.FC<CharacterStatsProps> = ({
  health,
  hunger,
  happiness,
  lastFed,
  onFeed,
  onPlay
}) => {
  const { telegram } = useTelegram();
  const [isFeeding, setIsFeeding] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedCooldown, setFeedCooldown] = useState(false);
  const [playCooldown, setPlayCooldown] = useState(false);

  // Определение статуса для текстового отображения
  const getHealthStatus = (value: number) => {
    if (value >= 80) return "ОТЛИЧНОЕ";
    if (value >= 60) return "ХОРОШЕЕ";
    if (value >= 40) return "НОРМАЛЬНОЕ";
    if (value >= 20) return "ПЛОХОЕ";
    return "КРИТИЧЕСКОЕ";
  };

  // Обработчик кормления с кулдауном
  const handleFeed = async () => {
    if (feedCooldown) return;
    
    // Тактильная отдача через Telegram API
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    setIsFeeding(true);
    setFeedCooldown(true);
    
    // Вызываем функцию кормления
    await onFeed();
    
    // Имитируем время завершения анимации
    setTimeout(() => {
      setIsFeeding(false);
    }, 1000);
    
    // Устанавливаем кулдаун на 3 секунды
    setTimeout(() => {
      setFeedCooldown(false);
    }, 3000);
  };

  // Обработчик игры с персонажем с кулдауном
  const handlePlay = async () => {
    if (playCooldown) return;
    
    // Тактильная отдача через Telegram API
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    setIsPlaying(true);
    setPlayCooldown(true);
    
    // Вызываем функцию игры
    await onPlay();
    
    // Имитируем время завершения анимации
    setTimeout(() => {
      setIsPlaying(false);
    }, 1000);
    
    // Устанавливаем кулдаун на 3 секунды
    setTimeout(() => {
      setPlayCooldown(false);
    }, 3000);
  };

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold mb-4">ПОКАЗАТЕЛИ ЯСУКО</h2>
      
      <div className="bg-[#252538] p-4 rounded-lg shadow-lg">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <HeartIcon className="text-red-500 mr-2" size={16} />
                <span>ЗДОРОВЬЕ</span>
              </div>
              <span className={`
                ${health >= 80 ? 'text-green-500' : 
                  health >= 60 ? 'text-green-400' : 
                  health >= 40 ? 'text-yellow-500' : 
                  health >= 20 ? 'text-orange-500' : 'text-red-500'}
              `}>
                {getHealthStatus(health)}
              </span>
            </div>
            <div className="w-full bg-[#323248] h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  health >= 80 ? 'bg-green-500' : 
                  health >= 60 ? 'bg-green-400' : 
                  health >= 40 ? 'bg-yellow-500' : 
                  health >= 20 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${health}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <CoffeeIcon className="text-green-500 mr-2" size={16} />
                <span>ГОЛОД</span>
              </div>
              <span className={`
                ${hunger >= 80 ? 'text-green-500' : 
                  hunger >= 60 ? 'text-green-400' : 
                  hunger >= 40 ? 'text-yellow-500' : 
                  hunger >= 20 ? 'text-orange-500' : 'text-red-500'}
              `}>
                {getHealthStatus(hunger)}
              </span>
            </div>
            <div className="w-full bg-[#323248] h-2 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full"
                style={{ width: `${hunger}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <SmileIcon className="text-yellow-500 mr-2" size={16} />
                <span>СЧАСТЬЕ</span>
              </div>
              <span className={`
                ${happiness >= 80 ? 'text-green-500' : 
                  happiness >= 60 ? 'text-green-400' : 
                  happiness >= 40 ? 'text-yellow-500' : 
                  happiness >= 20 ? 'text-orange-500' : 'text-red-500'}
              `}>
                {getHealthStatus(happiness)}
              </span>
            </div>
            <div className="w-full bg-[#323248] h-2 rounded-full overflow-hidden">
              <div 
                className="bg-yellow-500 h-full"
                style={{ width: `${happiness}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4 bg-[#2D2D44] p-3 rounded-lg">
          <p className="text-sm text-gray-300 flex items-center">
            <CoffeeIcon size={14} className="text-gray-400 mr-2" />
            Последнее кормление: {lastFed}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={handleFeed}
            disabled={isFeeding || feedCooldown}
            className={`bg-green-500 text-white py-2 rounded-lg font-medium flex items-center justify-center
              ${(isFeeding || feedCooldown) ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-600'} 
              transition-all transform ${isFeeding ? 'scale-95' : ''}`}
          >
            {isFeeding ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                Кормление...
              </>
            ) : (
              <>
                <CoffeeIcon size={16} className="mr-2" />
                Покормить
              </>
            )}
          </button>
          
          <button
            onClick={handlePlay}
            disabled={isPlaying || playCooldown}
            className={`bg-yellow-500 text-black py-2 rounded-lg font-medium flex items-center justify-center
              ${(isPlaying || playCooldown) ? 'opacity-70 cursor-not-allowed' : 'hover:bg-yellow-600'} 
              transition-all transform ${isPlaying ? 'scale-95' : ''}`}
          >
            {isPlaying ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin mr-2"></div>
                Играем...
              </>
            ) : (
              <>
                <SmileIcon size={16} className="mr-2" />
                Поиграть
              </>
            )}
          </button>
        </div>
        
        {/* Информативное сообщение о питомце */}
        {(hunger < 30 || happiness < 30) && (
          <div className="mt-4 bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md flex items-start">
            <AlertCircle size={18} className="mr-2 mt-1 flex-shrink-0" />
            <p className="text-sm">
              {hunger < 30 && happiness < 30 
                ? 'Ваш питомец голоден и несчастен! Покормите и поиграйте с ним.' 
                : hunger < 30 
                  ? 'Ваш питомец голоден! Покормите его.' 
                  : 'Ваш питомец грустит! Поиграйте с ним.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterStats;