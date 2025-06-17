import React, { useState, useEffect } from 'react';
import { CalendarIcon, CheckIcon } from 'lucide-react';
import { dailyBonusService } from '../../services/dailyBonusService';
import { useAuth } from '../../contexts/AuthContext';
import { useGame } from '../../contexts/GameContext';
import { useTelegram } from '../../contexts/TelegramContext';

interface DailyBonusSectionProps {
  onClaim: () => void;
  lastClaim: Date;
}

const DailyBonusSection: React.FC<DailyBonusSectionProps> = ({ onClaim, lastClaim }) => {
  const { user } = useAuth();
  const { dispatch } = useGame();
  const { telegram } = useTelegram();
  const [isLoading, setIsLoading] = useState(false);
  const [bonusInfo, setBonusInfo] = useState({
    dayNumber: 1,
    streak: 1,
    canClaim: true,
    lastClaimed: lastClaim
  });

  useEffect(() => {
    const loadBonusInfo = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Получаем информацию о ежедневных бонусах
        const info = await dailyBonusService.getUserDailyBonusInfo(user.id);
        if (info) {
          setBonusInfo({
            dayNumber: info.dayNumber || 1,
            streak: info.streak || 1,
            canClaim: info.canClaim,
            lastClaimed: new Date(info.lastClaimed)
          });
        }
      } catch (error) {
        console.error('Error loading daily bonus info:', error);
        // Устанавливаем дефолтные значения при ошибке
        setBonusInfo({
          dayNumber: 1,
          streak: 1,
          canClaim: true,
          lastClaimed: new Date(Date.now() - 24 * 60 * 60 * 1000)
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBonusInfo();
  }, [user]);

  const handleClaimBonus = async () => {
    if (!user || !bonusInfo.canClaim || isLoading) return;
    
    setIsLoading(true);
    try {
      // Тактильная отдача через Telegram API
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.impactOccurred('medium');
      }
      
      // Получаем бонус
      const result = await dailyBonusService.claimDailyBonus(user.id);
      
      if (result.success && result.amount) {
        // Обновляем состояние игры
        dispatch({ 
          type: 'CLAIM_REWARD', 
          payload: { type: 'coins', amount: result.amount } 
        });
        
        // Обновляем локальное состояние
        setBonusInfo(prev => ({
          ...prev,
          dayNumber: result.dayNumber || prev.dayNumber,
          streak: result.streak || prev.streak,
          canClaim: false,
          lastClaimed: new Date()
        }));
        
        // Вызываем колбэк
        onClaim();
      }
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Создаем массив дней для отображения календаря (по 7 дней)
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = i + 1;
    const isClaimed = day < bonusInfo.dayNumber || (!bonusInfo.canClaim && day === bonusInfo.dayNumber);
    const isToday = day === bonusInfo.dayNumber;
    const isBonusDay = day === 7; // 7й день - бонусный
    
    let className = 'aspect-square rounded flex items-center justify-center ';
    
    if (isClaimed) {
      className += 'bg-green-500/20 text-green-500';
    } else if (isToday && bonusInfo.canClaim) {
      className += 'bg-yellow-500 text-black';
    } else if (isBonusDay) {
      className += 'bg-yellow-500/20 text-yellow-500';
    } else {
      className += 'bg-gray-700/20 text-gray-400';
    }
    
    return (
      <div key={day} className={className}>
        {isClaimed ? (
          <CheckIcon size={16} />
        ) : (
          isBonusDay ? '2x' : day
        )}
      </div>
    );
  });

  return (
    <div className="bg-[#252538] rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <CalendarIcon className="text-yellow-500 mr-2" size={20} />
          <h3 className="font-bold">БОНУС ЗА ЕЖЕДНЕВНЫЙ ВХОД</h3>
        </div>
        <span className="text-sm text-gray-400">День {bonusInfo.dayNumber || 1}</span>
      </div>
      
      <div className="grid grid-cols-7 gap-2 mb-4">
        {days}
      </div>

      <button
        onClick={handleClaimBonus}
        disabled={!bonusInfo.canClaim || isLoading}
        className={`w-full py-2 rounded-lg font-medium ${
          bonusInfo.canClaim ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-gray-300'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <span className="w-4 h-4 mr-2 border-2 border-t-transparent border-black rounded-full animate-spin"></span>
            Получение...
          </span>
        ) : bonusInfo.canClaim ? 'ПОЛУЧИТЬ БОНУС' : 'БОНУС ПОЛУЧЕН'}
      </button>
    </div>
  );
};

export default DailyBonusSection;