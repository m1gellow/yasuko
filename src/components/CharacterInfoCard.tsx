import React, { memo } from 'react';
import { TapTarget } from '../types';
import { useGame } from '../contexts/GameContext';


interface CharacterInfoCardProps {
  target: TapTarget;
  energyStatus: string;
}

const CharacterInfoCard: React.FC<CharacterInfoCardProps> = memo(({ target, energyStatus }) => {
  // Вычисляем процент прогресса для визуализации
  const progressPercent = (target.currentTaps / target.requiredTaps) * 100;
  const {state} = useGame()
  
  // Получаем название для персонажа на основе уровня
  const getCharacterName = () => {
    switch (target.level) {
      case 1: return "ОРЕХ";
      case 2:return "БЕЛКА";
      default: return "ЯСУКО";
    }
  };
  
  return (
    <div className="bg-[#232334]/50 rounded-lg border border-[#323248]/50 w-full max-w-xs mx-auto relative overflow-hidden text-center">
      {/* Уровень в правом углу */}
      <div className="inline-block bg-[#FFD700] text-[#1E1E2D] px-2 py-1 rounded mt-2 font-bold">
            УРОВЕНЬ {state.level.current}
          </div>
      
      <div className="p-3">
        {/* Название и инструкция */}
        <div className="text-center mt-1 mb-3">
          <h3 className="text-yellow-400 font-bold text-lg">{getCharacterName()}</h3>
          <p className="text-[white] font-medium text-sm uppercase">Тапай персоонажа, поднимай уровень, получай монеты выигрывый сеты, деньги или покупай роллы за монеты</p>
        </div>
        
      
      </div>
    </div>
  );
});

export default CharacterInfoCard;