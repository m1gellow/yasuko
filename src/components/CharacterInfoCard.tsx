import React, { memo } from 'react';
import { TapTarget } from '../types';
import { useGame } from '../contexts/GameContext';
import { ZapIcon, ChevronRightIcon, StarIcon } from 'lucide-react';

interface CharacterInfoCardProps {
  target: TapTarget;
  energyStatus: string;
}

const CharacterInfoCard: React.FC<CharacterInfoCardProps> = memo(({ target, energyStatus }) => {
  const progressPercent = (target.currentTaps / target.requiredTaps) * 100;
  const { state } = useGame();

  const getCharacterName = () => {
    switch (target.level) {
      case 1:
        return 'ОРЕХ';
      case 2:
        return 'БЕЛКА';
      default:
        return 'ЯСУКО';
    }
  };

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="pt-2 pb-1">
        {/* Character Name */}
        <div className="text-center mb-3">
          <h3 className="text-2xl font-extrabold bg-gradient-to-r from-yellow-400 to-orange-400 text-transparent bg-clip-text">
            {getCharacterName()}
          </h3>
        </div>

        {/* Instructions */}
        <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/20">
          <div className="flex items-start">
            <ZapIcon className="text-yellow-400 mt-1 mr-2 flex-shrink-0" size={16} />
            <p className="text-sm text-gray-300 text-left">
              Тапай персонажа, поднимай уровень, получай монеты, выигрывай сеты, деньги или покупай роллы за монеты
            </p>
          </div>

          <div className="mt-2 flex justify-end">
            <button className="text-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-3 py-1 rounded-full flex items-center transition-all">
              Подробнее <ChevronRightIcon size={14} className="ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default CharacterInfoCard;
