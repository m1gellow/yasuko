import React from 'react';
import { User } from '../types';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import Notifications from './Notifications';
import ProgressBar from './ProgressBar';
import { SunIcon, ZapIcon, TrophyIcon } from 'lucide-react';

interface HeaderProps {
  user: User;
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  user,

  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
}) => {
  return (
    <header className="w-full bg-gradient-to-b from-[#1a1538] to-[#0f0c1d] text-white p-4 pb-6  shadow-lg">
      {/* Main Header with Logo and Notifications */}
      <div className="flex justify-between items-center mb-4">
        <div className="inline-flex items-center bg-gradient-to-r from-yellow-500 to-orange-500 text-transparent bg-clip-text">
          <SunIcon className="mr-2" size={24} />
          <h1 className="text-2xl font-extrabold tracking-wide">ЯСУКО</h1>
        </div>
        <div className="flex items-center gap-2">
          <Notifications
            notifications={notifications}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
            onDelete={onDelete}
          />
        </div>
      </div>

      {/* Energy Progress */}
      <div className="mb-4 bg-gradient-to-br from-[#1e183a] to-[#15122b] rounded-xl p-4 border border-purple-500/20 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <ZapIcon className="text-yellow-400 mr-2" size={18} />
            <span className="text-white font-semibold">
              ЭНЕРГИЯ: {user ? Math.round(user.energy.current) : 0}/{user ? user.energy.max : 0}
            </span>
          </div>
          <span className="text-xs bg-black/30 px-2 py-1 rounded text-gray-300">
            +1 каждые 3 мин
          </span>
        </div>
        
        <ProgressBar 
          current={user ? Math.round(user.energy.current) : 0} 
          max={user ? user.energy.max : 0}
          height="h-2"
          className="w-full"
         
        />
      </div>

      {/* User Ranking */}
      {user && user.position && (
        <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-xl p-4 border border-purple-500/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-yellow-500/20 p-2 rounded-lg mr-3">
                <TrophyIcon className="text-yellow-400" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-white">ВАШ РЕЙТИНГ</h3>
                <p className="text-sm text-gray-300">Обновляется каждые 5 минут</p>
              </div>
            </div>
            <div className="bg-black/30 px-4 py-2 rounded-lg border border-yellow-500/30">
              <span className="font-bold text-yellow-400 text-lg">#{user.position}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;