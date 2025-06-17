import React, { useState, useEffect } from 'react';
import { Target, Award, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { userProgressService } from '../../services/userProgressService';
import { useTelegram } from '../../contexts/TelegramContext';

// Memoized achievement item component
const AchievementItem: React.FC<{
  title: string;
  current: number;
  target: number;
  isCompleted?: boolean;
  onClaim?: () => void;
  hasClaimButton?: boolean;
}> = React.memo(({ title, current, target, isCompleted = false, onClaim, hasClaimButton = false }) => {
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Target className={`w-4 h-4 ${isCompleted ? 'text-green-400' : 'text-yellow-400'}`} />
          <span className="text-white text-sm md:text-base">{title}</span>
        </div>
        <span className={`text-sm md:text-base ${isCompleted ? 'text-green-400' : 'text-gray-400'}`}>
          {isCompleted ? 'Выполнено' : `${current}/${target}`}
        </span>
      </div>
      
      <div className="w-full bg-[#323248] h-2 rounded-full overflow-hidden">
        <div 
          className={`h-full ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${Math.min(100, (current / target) * 100)}%` }}
        />
      </div>
      
      {isCompleted && hasClaimButton && (
        <button 
          onClick={onClaim}
          className="w-full bg-green-500 text-white py-1 rounded text-sm font-medium mt-1 hover:bg-green-600 transition-colors"
        >
          Получить награду
        </button>
      )}
    </div>
  );
});

// Добавляем displayName
AchievementItem.displayName = 'AchievementItem';

// Секция достижений
const AchievementsSection: React.FC<{
  totalTaps: number;
  coins: number;
  feedCount: number;
  petCount: number;
}> = ({ totalTaps: initialTotalTaps, coins: initialCoins, feedCount: initialFeedCount, petCount: initialPetCount }) => {
  const { user } = useAuth();
  const { telegram } = useTelegram();
  const [totalTaps, setTotalTaps] = useState(initialTotalTaps);
  const [coins, setCoins] = useState(initialCoins);
  const [feedCount, setFeedCount] = useState(initialFeedCount);
  const [petCount, setPetCount] = useState(initialPetCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimedAchievements, setClaimedAchievements] = useState<string[]>([]);

  // Загрузка данных из Supabase
  useEffect(() => {
    if (!user) return;
    
    const loadUserAchievements = async () => {
      setIsLoading(true);
      try {
        // Получаем прогресс пользователя
        const userProgress = await userProgressService.getUserProgress(user.id);
        
        // Обновляем состояние компонента
        setTotalTaps(userProgress.totalTaps);
        setCoins(userProgress.totalTaps); // В нашем приложении монеты = тапам
        setFeedCount(userProgress.feedCount);
        setPetCount(userProgress.petCount);
        
        // Получаем список достижений, награды за которые были получены
        const { data: claimedData, error: claimedError } = await supabase
          .from('users')
          .select('promo_codes_used')
          .eq('id', user.id)
          .maybeSingle();
          
        if (!claimedError && claimedData && claimedData.promo_codes_used) {
          // Предположим, что мы храним информацию о полученных достижениях в поле promo_codes_used
          const claimed = Array.isArray(claimedData.promo_codes_used) 
            ? claimedData.promo_codes_used.filter((code: string) => code.startsWith('achievement_'))
                .map((code: string) => code.replace('achievement_', ''))
            : [];
          setClaimedAchievements(claimed);
        } else {
          // Если данных нет или произошла ошибка, устанавливаем пустой массив
          setClaimedAchievements([]);
        }
      } catch (error) {
        console.error('Ошибка при загрузке достижений:', error);
        setClaimedAchievements([]);
        setError('Не удалось загрузить информацию о достижениях');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserAchievements();
  }, [user]);
  
  // Обработчик получения награды за достижение
  const handleClaimAchievement = async (achievement: string, rewardAmount: number) => {
    if (!user) return;
    
    // Хаптик-фидбек перед получением награды
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    try {
      // Проверяем, не получена ли уже награда
      if (claimedAchievements.includes(achievement)) {
        return;
      }
      
      // Прямое обновление поля total_clicks
      const { error: updateError } = await supabase
        .from('users')
        .update({ total_clicks: totalTaps + rewardAmount })
        .eq('id', user.id);
        
      if (updateError) {
        console.error('Ошибка при начислении награды:', updateError);
        setError('Не удалось начислить награду. Пожалуйста, попробуйте позже.');
        return;
      }
      
      // Записываем получение награды в promo_codes_used
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('promo_codes_used')
        .eq('id', user.id)
        .maybeSingle();
        
      if (userError) {
        console.error('Ошибка при получении данных пользователя:', userError);
        return;
      }
      
      // Формируем новый массив для поля promo_codes_used
      const currentCodes = userData && userData.promo_codes_used && Array.isArray(userData.promo_codes_used) 
        ? userData.promo_codes_used 
        : [];
      const updatedCodes = [...currentCodes, `achievement_${achievement}`];
      
      // Обновляем поле promo_codes_used
      const { error: updateCodesError } = await supabase
        .from('users')
        .update({ promo_codes_used: updatedCodes })
        .eq('id', user.id);
        
      if (updateCodesError) {
        console.error('Ошибка при обновлении полученных достижений:', updateCodesError);
        return;
      }
      
      // Создаем уведомление о полученной награде
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'reward',
        title: 'Награда получена!',
        message: `Вы получили ${rewardAmount} монет за достижение!`,
        is_read: false,
        data: {
          achievement,
          reward: rewardAmount
        }
      });
      
      // Добавляем в локальный список полученных наград
      setClaimedAchievements(prev => [...prev, achievement]);
      
      // Обновляем количество монет
      setCoins(prev => prev + rewardAmount);
      setTotalTaps(prev => prev + rewardAmount);
      
      // Хаптик-фидбек при успешном получении награды
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('success');
      }
      
      // Показываем уведомление
      alert(`Поздравляем! Вы получили ${rewardAmount} монет за достижение!`);
    } catch (error) {
      console.error('Ошибка при получении награды:', error);
      setError('Произошла ошибка при получении награды. Пожалуйста, попробуйте позже.');
      
      // Хаптик-фидбек при ошибке
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('error');
      }
    }
  };

  return (
    <div className="bg-[#252538] rounded-lg p-4 mb-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Award className="w-5 h-5 text-yellow-400 mr-2" />
          <h3 className="text-white font-bold">ДОСТИЖЕНИЯ</h3>
        </div>
        
        <div className="text-sm text-yellow-400">
          {Math.floor(totalTaps/1000)} / 5 ★
        </div>
      </div>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md mb-4 flex items-start">
          <AlertCircle size={18} className="mr-2 mt-1 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-t-transparent border-yellow-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <AchievementItem
            title="ПЕРВЫЕ 1000 ТАПОВ"
            current={totalTaps}
            target={1000}
            isCompleted={totalTaps >= 1000}
            hasClaimButton={totalTaps >= 1000 && !claimedAchievements.includes('taps_1000')}
            onClaim={() => handleClaimAchievement('taps_1000', 200)}
          />
          <AchievementItem
            title="НАКОПИТЬ 5000 МОНЕТ"
            current={coins}
            target={5000}
            isCompleted={coins >= 5000}
            hasClaimButton={coins >= 5000 && !claimedAchievements.includes('coins_5000')}
            onClaim={() => handleClaimAchievement('coins_5000', 1000)}
          />
          <AchievementItem
            title="ПОКОРМИТЬ 50 РАЗ"
            current={feedCount}
            target={50}
            isCompleted={feedCount >= 50}
            hasClaimButton={feedCount >= 50 && !claimedAchievements.includes('feed_50')}
            onClaim={() => handleClaimAchievement('feed_50', 150)}
          />
          <AchievementItem
            title="ПОГЛАДИТЬ 30 РАЗ"
            current={petCount}
            target={30}
            isCompleted={petCount >= 30}
            hasClaimButton={petCount >= 30 && !claimedAchievements.includes('pet_30')}
            onClaim={() => handleClaimAchievement('pet_30', 100)}
          />
        </div>
      )}
      
      {/* Информация о достижениях */}
      <div className="mt-4 bg-[#2D2D44] p-2 rounded-lg text-xs text-gray-300">
        <p>Собирайте звезды (★) за достижения! Каждые 1000 тапов дают 1 звезду.</p>
        <p className="mt-1">5★ = бонус 2500 монет и уникальный аксессуар.</p>
      </div>
    </div>
  );
};

export default AchievementsSection;