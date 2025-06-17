import React from 'react';
import { MessageCircleIcon } from 'lucide-react';
import { LeaderboardUser } from '../../services/leaderboardService';
import { useTelegram } from '../../contexts/TelegramContext';
import { gameService } from '../../services/gameService';
import { useAuth } from '../../contexts/AuthContext';

interface LeaderboardItemProps {
  user: LeaderboardUser;
  index: number;
  isCurrentUser: boolean;
  isOnline: boolean;
  onSelect: () => void;
  onMessage: () => void;
}

const LeaderboardItem: React.FC<LeaderboardItemProps> = ({ 
  user, 
  index, 
  isCurrentUser,
  onSelect,
  onMessage
}) => {
  const { telegram } = useTelegram();
  const { user: currentUser } = useAuth();

  const handleClick = () => {
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    // Отслеживаем выбор пользователя в лидерборде
    if (currentUser) {
      gameService.trackUserAction(currentUser.id, 'leaderboard_user_select', {
        selected_user_id: user.id,
        selected_user_rank: index + 1,
        timestamp: new Date().toISOString()
      }).catch(console.error);
    }
    
    onSelect();
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
    
    // Отслеживаем нажатие на кнопку сообщения
    if (currentUser) {
      gameService.trackUserAction(currentUser.id, 'leaderboard_message_click', {
        recipient_id: user.id,
        recipient_name: user.name,
        recipient_rank: index + 1,
        timestamp: new Date().toISOString()
      }).catch(console.error);
    }
    
    onMessage();
  };

  // Определяем характеристики для показа в зависимости от уровня
  const getCharacterInfo = () => {
    if (user.characterType === 'yasuko') {
      switch (user.level) {
        case 1: return "ОРЕХ";
        case 2: return "ЯЙЦО";
        case 3: return "ПАВЛИН";
        case 4: return "СУПЕР ЯСУКО";
        default: return user.characterType.toUpperCase();
      }
    } else {
      switch (user.level) {
        case 1: return "ИКРИНКА";
        case 2: return "МАЛЫШ ФИШКО";
        default: return "ФИШКО";
      }
    }
  };

  return (
    <div 
      className={`bg-[#252538] rounded-lg p-3 cursor-pointer hover:bg-[#2d2d44] ${isCurrentUser ? 'border border-yellow-500' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-center">
        {index < 3 ? (
          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold mr-3">
            {index + 1}
          </div>
        ) : (
          <div className="w-8 text-center mr-3 text-gray-400">{index + 1}</div>
        )}
        
        <div className="rounded-full bg-[#323248] w-10 h-10 mr-3 flex items-center justify-center overflow-hidden">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">👤</span>
          )}
        </div>
        
        <div className="flex-grow">
          <div className="flex justify-between">
            <span className="font-medium">{user.name}</span>
            <div className="flex items-center">
              <span className="text-yellow-500 font-bold">
                {user.score.toLocaleString()} МОН
              </span>
            </div>
          </div>
          
          <div className="flex justify-between text-sm mt-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{getCharacterInfo()} {user.level}</span>
           
            </div>
            <button 
              className="flex items-center text-blue-400 hover:text-blue-300"
              onClick={handleMessageClick}
            >
              <MessageCircleIcon size={16} className="mr-1" />
              <span className="text-xs">Написать</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardItem;