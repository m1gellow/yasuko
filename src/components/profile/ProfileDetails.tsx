import React from 'react';
import { InfoIcon, Clock, Calendar, User, Activity } from 'lucide-react';

interface ProfileDetailsProps {
  characterCreatedAt: string | null;
  lastLogin: string | null;
  gender: string; 
  feedTime: number;
  consecutiveLogins: number;
}

const ProfileDetails: React.FC<ProfileDetailsProps> = ({ 
  characterCreatedAt,
  lastLogin,
  gender, 
  feedTime,
  consecutiveLogins
}) => {
  // Вычисляем возраст персонажа в днях
  const calculateAge = (createdAt: string | null) => {
    if (!createdAt) return '0';
    
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays.toString();
  };
  
  // Форматирование времени последнего кормления
  const formatLastFed = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    // Если меньше минуты
    if (diff < 60 * 1000) {
      return 'Только что';
    }
    
    // Если меньше часа
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes} мин. назад`;
    }
    
    // Если меньше суток
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours} ч. назад`;
    }
    
    // Более суток
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days} дн. назад`;
  };

  // Форматирование времени последнего входа
  const formatLastLogin = (lastLoginDate: string | null) => {
    if (!lastLoginDate) return 'Неизвестно';
    
    try {
      const date = new Date(lastLoginDate);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Неизвестно';
    }
  };
  
  return (
    <div className="bg-[#252538] rounded-lg p-4 mb-4 shadow-lg">
      <div className="flex items-center mb-3">
        <InfoIcon className="text-blue-400 mr-2" size={20} />
        <h3 className="font-bold text-base md:text-lg">ДЕТАЛИ ПРОФИЛЯ</h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-start">
          <Calendar size={16} className="text-gray-400 mt-1 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-sm md:text-base">
              <span className="text-gray-400">Возраст питомца</span>
              <span className="text-white font-medium">{calculateAge(characterCreatedAt)} дней</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-start">
          <User size={16} className="text-gray-400 mt-1 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-sm md:text-base">
              <span className="text-gray-400">Пол питомца</span>
              <span className="text-white font-medium">
                {gender === 'male' ? 'Мужской' : 
                 gender === 'female' ? 'Женский' : 'Не указан'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-start">
          <Clock size={16} className="text-gray-400 mt-1 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-sm md:text-base">
              <span className="text-gray-400">Последнее кормление</span>
              <span className="text-white font-medium">{formatLastFed(feedTime)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-start">
          <Activity size={16} className="text-gray-400 mt-1 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-sm md:text-base">
              <span className="text-gray-400">Последний вход</span>
              <span className="text-white font-medium">{formatLastLogin(lastLogin)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-start">
          <Calendar size={16} className="text-gray-400 mt-1 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-sm md:text-base">
              <span className="text-gray-400">Дней подряд</span>
              <span className="text-white font-medium">{consecutiveLogins}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Примечание о полу питомца */}
      {gender === 'other' && (
        <div className="mt-3 p-2 bg-[#323248] rounded-lg text-xs text-gray-300">
          Вы можете выбрать пол вашего питомца. Это повлияет на некоторые особенности взаимодействия и доступные аксессуары.
        </div>
      )}
    </div>
  );
};

export default ProfileDetails;