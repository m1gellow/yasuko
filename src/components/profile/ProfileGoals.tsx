import React, { useState, useEffect } from 'react';
import { StarIcon, TrophyIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useTelegram } from '../../contexts/TelegramContext';

interface Goal {
  id: number;
  title: string;
  progress: number;
  target: number;
  reward: string;
  type: 'primary' | 'secondary' | 'special';
}

interface ProfileGoalsProps {
  goals: Goal[];
}

const ProfileGoals: React.FC<ProfileGoalsProps> = ({ goals: initialGoals }) => {
  const { user } = useAuth();
  const { telegram } = useTelegram();
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [isLoading, setIsLoading] = useState(false);
  const [activeGoal, setActiveGoal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Загрузка актуальных целей из Supabase с кэшированием
  useEffect(() => {
    if (!user) return;
    
    // Проверяем кэш
    const cacheKey = `goals_${user.id}`;
    const cachedData = localStorage.getItem(cacheKey);
    let shouldFetch = true;
    
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        // Если кэш не старше 5 минут, используем его
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setGoals(data);
          shouldFetch = false;
        }
      } catch (e) {
        console.error('Ошибка при чтении кэша целей:', e);
      }
    }
    
    if (shouldFetch) {
      fetchUserGoals();
    }
    
    async function fetchUserGoals() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Получаем данные пользователя
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('total_clicks')
          .eq('id', user.id)
          .single();
          
        if (userError) {
          console.error('Ошибка при получении данных пользователя:', userError);
          setError('Не удалось загрузить данные пользователя');
          setIsLoading(false);
          return;
        }
        
        // Получаем данные персонажа
        const { data: characterData, error: characterError } = await supabase
          .from('character')
          .select('rating')
          .eq('id', user.id)
          .maybeSingle();
          
        if (characterError) {
          console.error('Ошибка при получении данных персонажа:', characterError);
        }
        
        // Получаем ранг пользователя
        const { data: rankData, error: rankError } = await supabase.rpc('get_user_rank', { 
          user_id: user.id 
        });
        
        if (rankError) {
          console.error('Ошибка при получении ранга пользователя:', rankError);
        }
        
        // Вычисляем уровень по рейтингу
        const characterRating = characterData?.rating || 0;
        const currentLevel = Math.floor(characterRating / 100) + 1;
        
        // Обновляем цели
        const updatedGoals: Goal[] = [
          {
            id: 1,
            title: "Получить награду за уровень",
            progress: characterRating,
            target: currentLevel * 100,
            reward: `эволюция персонажа (Уровень ${currentLevel + 1})`,
            type: 'primary' 
          },
          {
            id: 2,
            title: "Войти в топ-20 рейтинга",
            progress: Math.min(rankData || 100, 100),
            target: 20,
            reward: "эксклюзивный фон и 2000 монет",
            type: 'special'
          },
          {
            id: 3,
            title: "Накопить 5000 монет",
            progress: Math.min(userData.total_clicks, 5000),
            target: 5000,
            reward: "VIP-статус и уникальный аксессуар",
            type: 'secondary'
          }
        ];
        
        setGoals(updatedGoals);
        
        // Сохраняем в кэш
        localStorage.setItem(cacheKey, JSON.stringify({
          data: updatedGoals,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Ошибка при загрузке целей:', error);
        setError('Не удалось загрузить информацию о целях');
      } finally {
        setIsLoading(false);
      }
    }
  }, [user]);
  
  // Обработчик клика по карточке цели
  const handleGoalClick = (goalId: number) => {
    // Хаптик-фидбек при нажатии
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    setActiveGoal(activeGoal === goalId ? null : goalId);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center mb-4">
        <StarIcon className="text-yellow-500 mr-2" size={20} />
        <h2 className="text-lg font-bold">ВАШИ ЦЕЛИ</h2>
      </div>
      
      <div className="bg-[#252538] p-4 rounded-lg shadow-lg">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md mb-4 flex items-start">
            <AlertCircle size={18} className="mr-2 mt-1 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <div 
                key={goal.id} 
                className="bg-[#2D2D44] p-4 rounded-lg cursor-pointer transition-all hover:bg-[#353553]"
                onClick={() => handleGoalClick(goal.id)}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">{goal.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    goal.type === 'primary' ? 'bg-blue-500/30 text-blue-400' :
                    goal.type === 'special' ? 'bg-purple-500/30 text-purple-400' : 'bg-green-500/30 text-green-400'
                  }`}>
                    Цель {goal.id}
                  </span>
                </div>
                
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{Math.round(goal.progress)}/{goal.target}</span>
                    <span>{Math.round((goal.progress / goal.target) * 100)}%</span>
                  </div>
                  <div className="w-full bg-[#323248] h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        goal.type === 'primary' ? 'bg-blue-500' :
                        goal.type === 'special' ? 'bg-purple-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, (goal.progress / goal.target) * 100)}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-gray-400">
                  <TrophyIcon size={14} className="mr-1" />
                  <span>Награда: {goal.reward}</span>
                </div>
                
                {/* Дополнительная информация о цели */}
                {activeGoal === goal.id && (
                  <div className="mt-4 pt-3 border-t border-gray-600 text-sm text-gray-300 animate-fade-in-down">
                    {goal.id === 1 && (
                      <div>
                        <p>Чтобы получить эволюцию персонажа, продолжайте тапать и увеличивать свой рейтинг.</p>
                        <p className="mt-2 text-yellow-400">
                          С каждым уровнем ваш персонаж будет меняться и получать новые способности.
                        </p>
                      </div>
                    )}
                    
                    {goal.id === 2 && (
                      <div>
                        <p>Для продвижения в рейтинге:</p>
                        <ul className="list-disc list-inside mt-1">
                          <li>Тапайте чаще для накопления рейтинга</li>
                          <li>Участвуйте в ежедневных заданиях</li>
                          <li>Приглашайте друзей по реферальной ссылке</li>
                        </ul>
                        <p className="mt-2 text-yellow-400">
                          Топ-20 игроков получают эксклюзивные награды каждую неделю!
                        </p>
                      </div>
                    )}
                    
                    {goal.id === 3 && (
                      <div>
                        <p>Накопите 5000 монет для получения эксклюзивных привилегий:</p>
                        <ul className="list-disc list-inside mt-1">
                          <li>Уникальный фон для вашего профиля</li>
                          <li>Особый значок VIP</li>
                          <li>Доступ к премиум-аксессуарам</li>
                        </ul>
                        <p className="mt-2 text-yellow-400">
                          Тапы и ежедневные задания - лучший способ накопить монеты!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileGoals;