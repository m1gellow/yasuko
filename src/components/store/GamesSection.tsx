import React from 'react';
import { GamepadIcon } from 'lucide-react';

interface GamesSectionProps {
  hasNutCatcherGame: boolean;
  userCoins: number;
  onBuyGame: () => void;
  onPlayGame: () => void;
  isVisible: boolean;
}

const GamesSection: React.FC<GamesSectionProps> = ({
  hasNutCatcherGame,
  userCoins,
  onBuyGame,
  onPlayGame,
  isVisible
}) => {
  if (!isVisible) return null;
  
  // Получаем количество оставшихся игр на сегодня
  const getGamesLeft = () => {
    try {
      const storedGames = localStorage.getItem('nutCatcherGamesPlayed');
      if (!storedGames) return 3;
      
      const gamesData = JSON.parse(storedGames);
      const today = new Date().toISOString().split('T')[0];
      
      if (gamesData.date !== today) {
        return 3; // Новый день - все игры доступны
      }
      
      return Math.max(0, 3 - gamesData.count);
    } catch {
      return 3;
    }
  };
  
  const gamesLeft = getGamesLeft();
  
  return (
    <div className="mb-4">
      <div className="flex items-center mb-3">
        <GamepadIcon className="text-yellow-500 mr-2" size={20} />
        <h3 className="font-bold">ИГРЫ И РАЗВЛЕЧЕНИЯ</h3>
      </div>
      
      <div className="space-y-4">
        <div className="bg-[#252538] rounded-lg overflow-hidden">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold">ЛОВИТЕЛЬ ОРЕХОВ</h4>
              {hasNutCatcherGame && (
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                  КУПЛЕНО
                </span>
              )}
              {!hasNutCatcherGame && (
                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
                  НОВИНКА
                </span>
              )}
            </div>
            
            <div className="flex">
              <div className="w-14 h-14 bg-[#323248] rounded flex items-center justify-center mr-3 overflow-hidden">
                <img 
                  src="/assets/orehgame.png" 
                  alt="Ловитель орехов" 
                  className="w-10 h-10 object-contain"
                />
              </div>
              
              <div className="flex-grow">
                <p className="text-sm text-gray-300 mb-2">
                  Увлекательная игра, где вы ловите падающие желуди с дерева! 
                  За каждый пойманный орех +1 к энергии.
                </p>
                
                {hasNutCatcherGame && (
                  <div className="bg-blue-900/30 p-2 rounded-md mb-2">
                    <p className="text-xs text-blue-300">
                      Осталось игр сегодня: <span className="font-bold">{gamesLeft}/3</span>
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-2">
                  {hasNutCatcherGame ? (
                    <>
                      <span className="text-green-400 font-medium">Игра куплена</span>
                      <button 
                        onClick={onPlayGame}
                        disabled={gamesLeft <= 0}
                        className={`px-4 py-1 rounded font-medium ${gamesLeft > 0 ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'}`}
                      >
                        {gamesLeft > 0 ? 'ИГРАТЬ' : 'ЛИМИТ ИСЧЕРПАН'}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-yellow-500 font-bold">50 МОН</span>
                      <button 
                        className={`px-4 py-1 rounded font-medium ${
                          userCoins >= 50 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-600 cursor-not-allowed'
                        }`}
                        onClick={onBuyGame}
                        disabled={userCoins < 50}
                      >
                        КУПИТЬ
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamesSection;