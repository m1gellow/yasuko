import React, { useState, useEffect, useCallback } from 'react';
import { usePhrases } from '../hooks/usePhrases'; 
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/gameService';
import { useTelegram } from '../contexts/TelegramContext';

interface CharacterCardProps {
  level: number;
  health: number;
  happiness: number;
  hunger: number;
  mood: string;
  characterType: 'yasuko' | 'fishko';
}

const CharacterCard: React.FC<CharacterCardProps> = ({
  level,
  health,
  happiness,
  hunger,
  mood,
  characterType
}) => {
  const [showFeedPhrase, setShowFeedPhrase] = useState(false);
  const [showPlayPhrase, setShowPlayPhrase] = useState(false);
  const [currentFeedPhrase, setCurrentFeedPhrase] = useState('');
  const [currentPlayPhrase, setCurrentPlayPhrase] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useAuth();
  const { telegram } = useTelegram();
  
  const { getRandomPhrase: getRandomFeedPhrase } = usePhrases('feed');
  const { getRandomPhrase: getRandomPlayPhrase } = usePhrases('pet');

  // Определение типа персонажа для заголовка
  const getCharacterName = () => {
    if (characterType === 'yasuko') {
      // Названия для Ясуко
      switch (true) {
        case level === 1:
          return "ОРЕХ";
        case level >= 2:
          return "БЕЛКА";
        default:
          return "ЯСУКО";
      }
    } else {
      // Названия для Фишко
      switch (true) {
        case level === 1:
          return "ИКРИНКА ФИШКО";
        case level === 2:
          return "МАЛЫШ ФИШКО";
        case level >= 3:
          return "ФИШКО";
        default:
          return "ФИШКО";
      }
    }
  };
  
  // Обработчик кормления
  const handleFeed = useCallback(async () => {
    if (!user || isUpdating) return;
    
    // Хаптик-фидбек при кормлении
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    setIsUpdating(true);
    
    try {
      // Отображаем фразу
      const phrase = getRandomFeedPhrase();
      setCurrentFeedPhrase(phrase);
      setShowFeedPhrase(true);
      
      // Скрываем фразу через некоторое время
      setTimeout(() => {
        setShowFeedPhrase(false);
      }, 3000);
      
      // Записываем действие в базу данных
      await gameService.recordUserAction(user.id, 'feed');
      
      // Детальное отслеживание действия кормления
      await gameService.trackUserAction(user.id, 'character_feed', {
        character_type: characterType,
        character_level: level,
        timestamp: new Date().toISOString(),
        hunger_before: hunger,
        hunger_after: Math.min(100, hunger + 20),
        phrase: phrase
      });
      
      // Обновляем характеристики персонажа
      const result = await gameService.updateCharacter(user.id, {
        satiety: Math.min(100, hunger + 20),
        last_interaction: new Date().toISOString()
      });
      
      if (!result.success) {
        console.error('Failed to update character:', result.error);
      }
    } catch (error) {
      console.error('Error in handleFeed:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [getRandomFeedPhrase, user, hunger, isUpdating, characterType, level, telegram]);
  
  // Обработчик игры с персонажем
  const handlePlay = useCallback(async () => {
    if (!user || isUpdating) return;
    
    // Хаптик-фидбек при игре с персонажем
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    setIsUpdating(true);
    
    try {
      // Отображаем фразу
      const phrase = getRandomPlayPhrase();
      setCurrentPlayPhrase(phrase);
      setShowPlayPhrase(true);
      
      // Скрываем фразу через некоторое время
      setTimeout(() => {
        setShowPlayPhrase(false);
      }, 3000);
      
      // Записываем действие в базу данных
      await gameService.recordUserAction(user.id, 'pet');
      
      // Детальное отслеживание действия игры
      await gameService.trackUserAction(user.id, 'character_pet', {
        character_type: characterType,
        character_level: level,
        timestamp: new Date().toISOString(),
        happiness_before: happiness,
        happiness_after: Math.min(100, happiness + 20),
        phrase: phrase
      });
      
      // Обновляем характеристики персонажа
      const result = await gameService.updateCharacter(user.id, {
        mood: Math.min(100, happiness + 20),
        last_interaction: new Date().toISOString()
      });
      
      if (!result.success) {
        console.error('Failed to update character:', result.error);
      }
    } catch (error) {
      console.error('Error in handlePlay:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [getRandomPlayPhrase, user, happiness, isUpdating, characterType, level, telegram]);

  // Для Ореха (уровень 1) показываем только прогресс до эволюции
  if (level === 1 && characterType === 'yasuko') {
    return (
      <div className="bg-[#232334] rounded-lg p-4 shadow-lg w-full max-w-sm mx-auto relative">
        {/* Фраза от персонажа при кормлении */}
        {showFeedPhrase && (
          <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm animate-fade-in-down whitespace-normal max-w-full text-center z-20">
            {currentFeedPhrase}
          </div>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-lg md:text-xl text-yellow-400">ОРЕХ</h3>
            <p className="text-sm md:text-base text-gray-400">Уровень {level}</p>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Прогресс до вылупления</span>
            <span>{Math.round((hunger + happiness) / 2)}%</span>
          </div>
          <div className="w-full bg-[#323248] h-2 rounded-full overflow-hidden">
            <div 
              className="bg-yellow-500 h-full"
              style={{ width: `${(hunger + happiness) / 2}%` }}
            />
          </div>
        </div>
        
        <div className="flex justify-between mt-4">
          <button 
            className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm md:text-base font-medium flex-1 mr-2 disabled:opacity-50 hover:bg-purple-600 transition-colors"
            onClick={handleFeed}
            disabled={isUpdating || !user}
          >
            {isUpdating ? 'Кормление...' : 'Покормить'}
          </button>
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm md:text-base font-medium flex-1 ml-2 disabled:opacity-50 hover:bg-blue-600 transition-colors"
            onClick={handlePlay}
            disabled={isUpdating || !user}
          >
            {isUpdating ? 'Играем...' : 'Поиграть'}
          </button>
        </div>
        
        <p className="text-center text-gray-400 mt-4 text-sm">
          Кормите и играйте с Орехом, чтобы он превратился в Белку!
        </p>
      </div>
    );
  }

  // Для Белки (уровень 2+) и других персонажей показываем полный набор характеристик
  return (
    <div className="bg-[#232334] rounded-lg p-4 shadow-lg w-full max-w-sm mx-auto relative">
      {/* Фраза от персонажа при кормлении */}
      {showFeedPhrase && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm animate-fade-in-down whitespace-normal max-w-full text-center z-20">
          {currentFeedPhrase}
        </div>
      )}
      
      {/* Фраза от персонажа при игре */}
      {showPlayPhrase && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm animate-fade-in-down whitespace-normal max-w-full text-center z-20">
          {currentPlayPhrase}
        </div>
      )}
      
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-lg md:text-xl text-yellow-400">{getCharacterName()}</h3>
          <p className="text-sm md:text-base text-gray-400">Уровень {level}</p>
        </div>
        <div className="text-right">
          <p className="text-xs md:text-sm text-gray-400">Настроение</p>
          <p className="font-medium text-sm md:text-base">{mood}</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Голод</span>
            <span>{hunger}%</span>
          </div>
          <div className="w-full bg-[#323248] h-2 rounded-full overflow-hidden">
            <div 
              className="bg-red-500 h-full"
              style={{ width: `${hunger}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Счастье</span>
            <span>{happiness}%</span>
          </div>
          <div className="w-full bg-[#323248] h-2 rounded-full overflow-hidden">
            <div 
              className="bg-yellow-500 h-full"
              style={{ width: `${happiness}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Здоровье</span>
            <span>{health}%</span>
          </div>
          <div className="w-full bg-[#323248] h-2 rounded-full overflow-hidden">
            <div 
              className="bg-green-500 h-full"
              style={{ width: `${health}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-between mt-4">
        <button 
          className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm md:text-base font-medium flex-1 mr-2 disabled:opacity-50 hover:bg-purple-600 transition-colors"
          onClick={handleFeed}
          disabled={isUpdating || !user}
        >
          {isUpdating && showFeedPhrase ? 'Кормление...' : 'Покормить'}
        </button>
        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm md:text-base font-medium flex-1 ml-2 disabled:opacity-50 hover:bg-blue-600 transition-colors"
          onClick={handlePlay}
          disabled={isUpdating || !user}
        >
          {isUpdating && showPlayPhrase ? 'Играем...' : 'Поиграть'}
        </button>
      </div>
    </div>
  );
};

export default CharacterCard;