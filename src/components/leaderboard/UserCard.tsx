import React from 'react';
import { MessageCircleIcon } from 'lucide-react';
import { LeaderboardUser } from '../../services/leaderboardService';

interface UserCardProps {
  user: LeaderboardUser;
  onMessage: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onMessage }) => {
  return (
    <div className="bg-[#252538] rounded-lg p-4 mb-4">
      <div className="flex items-center">
        <div className="rounded-full bg-[#323248] w-16 h-16 mr-4 overflow-hidden">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
              👤
            </div>
          )}
        </div>
        
        <div className="flex-grow">
          <h3 className="text-lg font-bold">{user.name}</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <span>Уровень {user.level}</span>
            <span>•</span>
            <span>{user.score.toLocaleString()} МОН</span>
          </div>
          <p className="text-sm text-gray-300 mt-1">{user.status || 'Статус не установлен'}</p>
        </div>
      </div>
      
      <div className="mt-4">
        <button 
          onClick={onMessage}
          className="w-full bg-blue-500 text-white py-2 rounded-lg flex items-center justify-center"
        >
          <MessageCircleIcon size={18} className="mr-2" />
          Отправить сообщение
        </button>
      </div>
    </div>
  );
};

export default UserCard;