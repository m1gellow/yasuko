import React, { useState, useEffect } from 'react';
import ProfileHeader from './profile/ProfileHeader';
import ProfileStats from './profile/ProfileStats';
import ProfileGoals from './profile/ProfileGoals';
import DailyTasks from './profile/DailyTasks';
import GrowthStats from './profile/GrowthStats';
import CharacterStats from './profile/CharacterStats';
import AIAnalysis from './profile/AIAnalysis';
import ReferralSection from './profile/ReferralSection';
import AchievementsSection from './profile/AchievementsSection';

import ProfileStatusEditor from './profile/ProfileStatusEditor';
import ProfileAvatarSelector from './profile/ProfileAvatarSelector';
import LogoutConfirmModal from './profile/LogoutConfirmModal';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { LogOutIcon, AlertCircle } from 'lucide-react';
import { gameService } from '../services/gameService';
import { leaderboardService } from '../services/leaderboardService';
import { userProgressService } from '../services/userProgressService';
import NutCatcherGame from './games/NutCatcherGame';
import { useTelegram } from '../contexts/TelegramContext';
import ProfileDetails from './profile/ProfileDetails';

const Profile: React.FC = () => {
  const { state, dispatch } = useGame();
  const { user, signOut } = useAuth();
  const { telegram } = useTelegram();
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userRank, setUserRank] = useState<number>(0);
  const [characterData, setCharacterData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [showMiniGame, setShowMiniGame] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Синхронизация с данными сервера при авторизации
  useEffect(() => {
    const initUser = async () => {
      if (user) {
        setLoading(true);
        try {
          // Загружаем персонажа пользователя из базы
          const character = await gameService.getCharacter(user.id);
          setCharacterData(character);
          
          // Загружаем ранг пользователя
          const rank = await leaderboardService.getUserRank(user.id);
          setUserRank(rank);
          
          // Загружаем прогресс пользователя
          const progress = await userProgressService.getUserProgress(user.id);
          setUserProgress(progress);
        } catch (error) {
          console.error('Error loading profile data:', error);
          setError('Не удалось загрузить данные профиля. Пожалуйста, попробуйте позже.');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    initUser();
  }, [user]);

  const handleEditStatus = () => {
    // Хаптик-фидбек
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    setShowStatusEditor(true);
  };

  const handleEditAvatar = () => {
    // Хаптик-фидбек
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    setShowAvatarSelector(true);
  };

  const handleFeed = async () => {
    // Хаптик-фидбек
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    dispatch({ type: 'FEED_PET' });
    
    // Записываем в базу, если пользователь авторизован
    if (user) {
      try {
        await gameService.recordUserAction(user.id, 'feed');
        
        // Обновляем данные персонажа
        const updatedChar = await gameService.updateCharacter(user.id, {
          satiety: Math.min(100, (characterData?.satiety || 50) + 20),
          last_interaction: new Date().toISOString()
        });
        
        if (updatedChar.success) {
          // Обновляем локальные данные
          setCharacterData(prev => ({
            ...prev,
            satiety: Math.min(100, (prev?.satiety || 50) + 20),
            last_interaction: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('Error recording feed action:', error);
      }
    }
  };

  const handlePlay = async () => {
    // Хаптик-фидбек
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    dispatch({ type: 'PLAY_WITH_PET' });
    
    // Записываем в базу, если пользователь авторизован
    if (user) {
      try {
        await gameService.recordUserAction(user.id, 'pet');
        
        // Обновляем данные персонажа
        const updatedChar = await gameService.updateCharacter(user.id, {
          mood: Math.min(100, (characterData?.mood || 50) + 20),
          last_interaction: new Date().toISOString()
        });
        
        if (updatedChar.success) {
          // Обновляем локальные данные
          setCharacterData(prev => ({
            ...prev,
            mood: Math.min(100, (prev?.mood || 50) + 20),
            last_interaction: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('Error recording pet action:', error);
      }
    }
  };

  const handleLogout = () => {
    // Хаптик-фидбек
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    // Хаптик-фидбек
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.notificationOccurred('warning');
    }
    
    await signOut();
    setShowLogoutConfirm(false);
    // Перезагружаем страницу для сброса состояния приложения
    window.location.reload();
  };
  
  // Функция для открытия мини-игры
  const openMiniGame = () => {
    // Хаптик-фидбек
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
    
    setShowMiniGame(true);
  };
  
  // Обработчик получения энергии из мини-игры
  const handleEnergyEarned = (amount: number) => {
    if (amount > 0) {
      dispatch({ 
        type: 'REGEN_ENERGY', 
        payload: amount 
      });
    }
  };

  // Получаем реальные данные для целей
  const goals = userProgress ? [
    {
      id: 1,
      title: "Получить награду за уровень",
      progress: userProgress.goals.level.current,
      target: userProgress.goals.level.target,
      reward: "эволюция персонажа",
      type: 'primary' as const
    },
    {
      id: 2,
      title: "Войти в топ-20 рейтинга",
      progress: Math.min(userProgress.goals.ranking.current, 100),
      target: userProgress.goals.ranking.target,
      reward: "эксклюзивный фон и 2000 монет",
      type: 'special' as const
    },
    {
      id: 3,
      title: "Накопить 5000 монет",
      progress: Math.min(userProgress.goals.coins.current, 5000),
      target: userProgress.goals.coins.target,
      reward: "VIP-статус и уникальный аксессуар",
      type: 'secondary' as const
    }
  ] : [
    {
      id: 1,
      title: "Получить награду за уровень",
      progress: state.level.current,
      target: state.level.current + 1,
      reward: "эволюция персонажа",
      type: 'primary' as const
    },
    {
      id: 2,
      title: "Войти в топ-20 рейтинга",
      progress: Math.min(userRank, 100),
      target: 20,
      reward: "эксклюзивный фон и 2000 монет",
      type: 'special' as const
    },
    {
      id: 3,
      title: "Накопить 5000 монет",
      progress: Math.min(state.coins, 5000),
      target: 5000,
      reward: "VIP-статус и уникальный аксессуар",
      type: 'secondary' as const
    }
  ];

  // Получаем реальные данные для задач
  const tasks = userProgress ? [
    {
      id: 1,
      title: "Сделать 100 тапов",
      progress: userProgress.dailyTasks.tapProgress,
      target: userProgress.dailyTasks.tapTarget,
      reward: 200,
      completed: userProgress.dailyTasks.completedToday
    },
    {
      id: 2,
      title: "Покормить 3 раза",
      progress: Math.min(userProgress.feedCount % 3, 3),
      target: 3,
      reward: 150,
      completed: (userProgress.feedCount % 3) >= 3
    },
    {
      id: 3,
      title: "Войти в топ-50",
      progress: userRank <= 50 ? 1 : 0,
      target: 1,
      reward: 300,
      completed: userRank <= 50
    },
    {
      id: 4,
      title: "Сыграть в мини-игру",
      progress: localStorage.getItem('nutCatcherGamesPlayed') ? 1 : 0,
      target: 1,
      reward: 100,
      completed: localStorage.getItem('nutCatcherGamesPlayed') === 'true',
      action: openMiniGame
    }
  ] : [
    {
      id: 1,
      title: "Сделать 100 тапов",
      progress: state.dailyTasks.tapProgress,
      target: state.dailyTasks.tapTarget,
      reward: 200,
      completed: state.dailyTasks.tapProgress >= state.dailyTasks.tapTarget
    },
    {
      id: 2,
      title: "Покормить 3 раза",
      progress: Math.min(state.achievements.feedCount % 3, 3),
      target: 3,
      reward: 150,
      completed: (state.achievements.feedCount % 3) >= 3
    },
    {
      id: 3,
      title: "Войти в топ-50",
      progress: userRank <= 50 ? 1 : 0,
      target: 1,
      reward: 300,
      completed: userRank <= 50
    },
    {
      id: 4,
      title: "Сыграть в мини-игру",
      progress: localStorage.getItem('nutCatcherGamesPlayed') ? 1 : 0,
      target: 1,
      reward: 100,
      completed: localStorage.getItem('nutCatcherGamesPlayed') === 'true',
      action: openMiniGame
    }
  ];

  return (
    <div className="bg-gradient-to-b from-[#1a1625] to-[#0d0b12] min-h-screen p-4 pb-20">
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-yellow-500 text-center">ПРОФИЛЬ</h1>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md mb-4 flex items-start">
            <AlertCircle size={18} className="mr-2 mt-1 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div clasName="flex flex-col items-center justify-center">
            <ProfileHeader
              name={user?.name || state.name}
              id={user?.id || "user123456789"}
              mood={characterData?.mood ? `${characterData.mood}%` : state.profile.mood}
              thoughtStatus={user?.status || state.profile.thoughtStatus}
              onEditStatus={handleEditStatus}
              onEditAvatar={handleEditAvatar}
              avatar={user?.avatar_url || state.profile.avatar}
            />
            
            <ProfileStats
              coins={user ? user.total_clicks || 0 : state.coins}
              energy={state.energy.current}
              maxEnergy={state.energy.max}
            />
            
            {/* Энергетическая панель с кнопкой мини-игры */}
            <div className="bg-[#252538] p-4 rounded-lg mb-4 shadow-lg">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="font-bold text-lg">ЭНЕРГИЯ</h3>
                  <p className="text-xs text-gray-400">Нужна для тапов</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-blue-400">
                    {Math.round(state.energy.current)}/{state.energy.max}
                  </p>
                </div>
              </div>
              
              <div className="w-full bg-[#323248] h-3 rounded-full overflow-hidden mb-3">
                <div 
                  className="h-full bg-blue-500"
                  style={{ width: `${(state.energy.current / state.energy.max) * 100}%` }}
                />
              </div>
              
              <button
                onClick={openMiniGame}
                className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium flex items-center justify-center hover:bg-blue-600 transition-colors"
              >
                <span className="mr-2 text-lg">🎮</span>
                Играть в мини-игру для получения энергии
              </button>
            </div>
            
            <ProfileGoals goals={goals} />
            
            <DailyTasks
              tasks={tasks}
              timeLeft={calculateRemainingTime()}
              totalReward={650}
            />
            
            <ReferralSection />
            
            <GrowthStats
              tapData={userProgress?.growth?.tapsPerDay || state.growthHistory.tapsPerDay}
              coinData={userProgress?.growth?.coinsEarned || state.growthHistory.coinsEarned}
              averageTaps={userProgress?.growth?.avgTaps || Math.round(state.achievements.totalTaps / 7) || 17}
              averageCoins={userProgress?.growth?.avgCoins || Math.round(state.coins / 7) || 13}
              totalTaps={user?.total_clicks || state.achievements.totalTaps || 25}
              performance={user?.total_clicks > 100 ? "Растущая" : "Начальная"}
            />
            
            <CharacterStats
              health={(characterData?.life_power || state.profile.health) || 90}
              hunger={(characterData?.satiety || state.profile.hunger) || 70}
              happiness={(characterData?.mood || state.profile.happiness) || 80}
              lastFed={characterData?.last_interaction 
                ? new Date(characterData.last_interaction).toLocaleDateString() 
                : new Date(state.profile.lastFed).toLocaleDateString()}
              onFeed={handleFeed}
              onPlay={handlePlay}
            />
            
            <AchievementsSection
              totalTaps={user?.total_clicks || state.achievements.totalTaps}
              coins={user?.total_clicks || state.coins}
              feedCount={user?.feed_clicks || state.achievements.feedCount}
              petCount={user?.pet_clicks || 0}
            />
            
            <ProfileDetails 
              characterCreatedAt={characterData?.created_at || null}
              lastLogin={user?.last_login || null}
              gender={state.profile.gender}
              feedTime={characterData?.last_interaction 
                ? new Date(characterData.last_interaction).getTime()
                : state.profile.lastFed}
              consecutiveLogins={state.achievements.consecutiveLogins}
            />
            
            <AIAnalysis
              tapData={userProgress?.growth?.tapsPerDay || state.growthHistory.tapsPerDay}
              coinData={userProgress?.growth?.coinsEarned || state.growthHistory.coinsEarned}
              performance={user?.total_clicks > 100 ? "Растущая" : "Начальная"}
            />
            
            {/* Кнопка выхода */}
            {user && (
              <div className="bg-[#252538] rounded-lg p-4 mb-20 shadow-lg">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  <LogOutIcon size={18} className="mr-2" />
                  Выйти из аккаунта
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {showAvatarSelector && (
        <ProfileAvatarSelector onClose={() => setShowAvatarSelector(false)} />
      )}
      
      {showStatusEditor && (
        <ProfileStatusEditor 
          initialStatus={user?.status || state.profile.thoughtStatus} 
          onClose={() => setShowStatusEditor(false)} 
          onSave={(status) => {
            dispatch({ type: 'SET_THOUGHT_STATUS', payload: status });
          }}
        />
      )}
      
      {showLogoutConfirm && (
        <LogoutConfirmModal 
          onClose={() => setShowLogoutConfirm(false)} 
          onConfirm={confirmLogout} 
        />
      )}
      
      {/* Модальное окно с мини-игрой */}
      {showMiniGame && (
        <NutCatcherGame 
          onClose={() => setShowMiniGame(false)} 
          onEnergyEarned={handleEnergyEarned}
        />
      )}
    </div>
  );
};

export default Profile;

// Вспомогательная функция для форматирования оставшегося времени до сброса заданий
const calculateRemainingTime = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const diffMs = tomorrow.getTime() - now.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${diffHrs}ч ${diffMins}м`;
};