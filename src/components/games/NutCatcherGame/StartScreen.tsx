import React from 'react';
import { InfoIcon, AlertCircle, XIcon } from 'lucide-react';
import { useTelegram } from '../../../contexts/TelegramContext';

interface StartScreenProps {
  onStart: () => void;
  highScore: number;
  gamesPlayed: number;
  gamesLimit: number;
  canPlay: boolean;
  onShowTips: () => void;
  showTips: boolean;
  timeToReset: string;
  onClose?: () => void; // Добавлен пропс для закрытия
}

const StartScreen: React.FC<StartScreenProps> = ({ 
  onStart, 
  highScore, 
  gamesPlayed, 
  gamesLimit,
  canPlay,
  onShowTips,
  showTips,
  timeToReset,
  onClose
}) => {
  const { telegram } = useTelegram();
  
  const handleStart = () => {
    // Хаптик-фидбек при начале игры
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    onStart();
  };
  
  const handleShowTips = () => {
    // Хаптик-фидбек при открытии подсказок
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    onShowTips();
  };
  
  const handleClose = () => {
    // Хаптик-фидбек при закрытии
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
    
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4 z-20 ">
      {/* Кнопка закрытия */}
      {onClose && (
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#323248] hover:bg-[#3a3a55] text-white transition-colors"
          aria-label="Закрыть"
        >
          <XIcon size={20} />
        </button>
      )}
      
      <h2 className="text-2xl font-bold text-yellow-500 mb-4">ЛОВИТЕЛЬ ОРЕХОВ</h2>
      <div className="h-full max-h-[20%] w-full relative mb-4">
        {/* Иллюстрация игры */}
        <div className="mx-auto ">
          <img 
            src="/assets/dub.png" 
            alt="Дуб" 
            className="absolute top-0 left-1/2 transform -translate-x-1/2 h-[120px] object-contain z-10"
          />
          
          {/* Белка */}
          <img 
            src="/assets/belka.png" 
            alt="Белка" 
            className="absolute top-10 right-20 w-20 h-20 transform -scale-x-100 object-contain z-20"
          />
          
          {/* Орехи */}
          <img 
            src="/assets/golud.png" 
            alt="Желудь" 
            className="absolute top-[80px] left-[30%] w-8 h-8 animate-bounce object-contain z-20"
          />
          <img 
            src="/assets/oreh.png" 
            alt="Орех" 
            className="absolute top-[100px] right-[20%] w-6 h-6 animate-bounce object-contain z-20" 
            style={{animationDelay: '0.3s'}}
          />
          
          {/* Корзина */}
          <img 
            src="/assets/korzina.png" 
            alt="Корзина" 
            className="absolute -bottom-[20%] left-1/2 transform -translate-x-1/2 w-12 h-12 object-contain z-20"
          />
        </div>
      </div>

      {!showTips ? (
        <>
          <div className="bg-[#252538] p-4 rounded-lg mt-4 w-full max-w-[20rem] shadow-md">
            <p className="text-lg mb-3">
              Ловите желуди, которые сбрасывает белка с дерева!
            </p>
            
            <p className="text-base mb-4">
              Каждый пойманный орех дает энергию:<br/>
              <span className="text-yellow-400">Желудь = +1</span> • 
              <span className="text-orange-400"> Грецкий = +2</span> • 
              <span className="text-red-400"> Фундук = +3</span>
            </p>
            
            <div className="bg-yellow-500/20 p-2 rounded-lg mb-4">
              <p className="text-sm text-white">
                Осталось игр сегодня: <span className="font-bold">{Math.max(0, gamesLimit - gamesPlayed)}/{gamesLimit}</span>
                {!canPlay && (
                  <span className="block mt-1 text-xs">
                    Сброс через: <span className="font-bold">{timeToReset}</span>
                  </span>
                )}
              </p>
            </div>
            
            <p className="text-sm text-gray-400 mb-4">
              <button 
                onClick={handleShowTips}
                className="text-blue-400 flex items-center justify-center mx-auto hover:text-blue-300 transition-colors"
              >
                <InfoIcon size={14} className="mr-1"/> Как играть?
              </button>
            </p>
            
            <button 
              onClick={handleStart}
              disabled={!canPlay}
              className={`w-full py-3 ${canPlay ? 'bg-yellow-500 hover:bg-yellow-600 animate-pulse' : 'bg-gray-600'} text-black rounded-lg font-bold text-lg transition-colors`}
            >
              {canPlay ? 'НАЧАТЬ ИГРУ' : 'ЛИМИТ ИГР ИСЧЕРПАН'}
            </button>
            
            {!canPlay && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-sm text-center flex items-start">
                <AlertCircle size={16} className="mr-2 mt-1 flex-shrink-0 text-red-400" />
                <p className="text-red-300">
                  Вы достигли дневного лимита игр (3 игры в день). Возвращайтесь завтра!
                </p>
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-400 mt-4">Рекорд: {highScore}</p>
        </>
      ) : (
        <div className="bg-[#252538] p-4 rounded-lg max-w-md overflow-auto max-h-[60vh]">
          <h3 className="font-bold text-lg text-yellow-400 mb-3">Как играть</h3>
          
          <ul className="text-left space-y-3 mb-4">
            <li className="flex items-start">
              <span className="mr-2 bg-yellow-500 text-black rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <span>Перемещайте корзину влево и вправо, чтобы ловить падающие орехи</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 bg-yellow-500 text-black rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <span>Желуди (маленькие) дают больше очков, но сложнее поймать</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 bg-yellow-500 text-black rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <span>Создавайте комбо, ловя орехи подряд без пропусков</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 bg-yellow-500 text-black rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
              <span>Игра длится 60 секунд, скорость падения орехов постепенно увеличивается</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 bg-yellow-500 text-black rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">5</span>
              <span>Вся заработанная энергия будет добавлена к вашему персонажу в конце игры</span>
            </li>
          </ul>
          
          <button
            onClick={handleShowTips}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black py-2 rounded-lg font-medium transition-colors"
          >
            Понятно
          </button>
        </div>
      )}
    </div>
  );
};

export default StartScreen;