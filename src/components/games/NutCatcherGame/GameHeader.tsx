import React from 'react';
import { XIcon, PauseIcon, PlayIcon } from 'lucide-react';
import { useTelegram } from '../../../contexts/TelegramContext';

interface GameHeaderProps {
  title: string;
  isPaused: boolean;
  isGameActive: boolean;
  onTogglePause: () => void;
  onClose: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({ 
  title, 
  isPaused, 
  isGameActive, 
  onTogglePause, 
  onClose 
}) => {
  const { telegram } = useTelegram();
  
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Хаптик-фидбек при закрытии
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
    
    onClose();
  };
  
  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Хаптик-фидбек при паузе
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    onTogglePause();
  };

  return (
    <div className="bg-[#252538] p-3 flex justify-between items-center border-b border-[#323248] sticky top-0 z-20">
      <div className="flex items-center">
        <h3 className="text-yellow-500 font-bold mr-3">{title}</h3>
        {isGameActive && (
          <button 
            onClick={handlePause}
            className="bg-[#323248] p-1 rounded-full flex items-center justify-center"
            aria-label={isPaused ? "Продолжить" : "Пауза"}
          >
            {isPaused ? 
              <PlayIcon size={16} className="text-green-400" /> : 
              <PauseIcon size={16} className="text-yellow-400" />
            }
          </button>
        )}
      </div>
      <button 
        className="text-gray-400 hover:text-white p-1 bg-[#323248] hover:bg-[#3f3f5b] rounded-full transition-colors" 
        onClick={handleClose}
        aria-label="Закрыть"
      >
        <XIcon size={20} />
      </button>
    </div>
  );
};

export default GameHeader;