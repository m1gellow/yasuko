import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import Notifications from './Notifications';
import ProgressBar from './ProgressBar';

interface HeaderProps {
  user: User;
  devMode?: boolean;
  onRefillEnergy: () => void;
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  devMode = false,
  onRefillEnergy,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
}) => {
  const { state } = useGame();
  const { user: authUser } = useAuth();

  // Рассчитываем процент энергии для отображения
  const energyPercent = user ? (Math.round(user.energy.current) / user.energy.max) * 100 : 0;

  // Определяем класс для энергии в зависимости от её количества
  const getEnergyStatusClass = () => {
    if (energyPercent < 20) return 'bg-red-500';
    if (energyPercent < 50) return 'bg-orange-500';
    return 'bg-[#2468F2]';
  };

  return (
    <header className="w-full bg-[#1E1E2D]/40 text-white p-4 rounded-b-lg">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl md:text-2xl font-bold text-yellow-500">ЯСУКО</h1>
        <div className="flex items-center gap-2">
          <Notifications
            notifications={notifications}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
            onDelete={onDelete}
          />
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[#FFD700] font-bold text-sm md:text-base">
            ЭНЕРГИЯ {user ? Math.round(user.energy.current) : 0}/{user ? user.energy.max : 0}
          </span>
        </div>

        <ProgressBar current={user ? Math.round(user.energy.current) : 0} max={user ? user.energy.max : 0} />

        <p className="text-xs md:text-sm text-[#85A4FF] mt-1">+1 ЗА ТАПИНГ — +1 ЧЕРЕЗ 3МИН</p>
      </div>

      <div className="mt-4 flex justify-center items-center">
        <div className="text-center">
          <p className="text-[#FFD700] font-bold text-sm md:text-base">
            РЕЙТИНГ ЯСУКО: {state.progress.current} ИЗ {state.progress.required}
          </p>
        </div>
      </div>

      {/* Текущий рейтинг пользователя */}
      {user && user.position && (
        <div className="mt-3 flex justify-center">
          <div className="bg-[#252538] px-3 py-1 rounded-full">
            <span className="text-sm">
              Ваша позиция в рейтинге: <strong className="text-yellow-400">#{user.position}</strong>
            </span>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
