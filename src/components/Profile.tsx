import React, { useState, useEffect } from 'react';
import { 
  LogOutIcon, 
  AlertCircle,
  Zap,
  Heart,
  Smile,
  Gamepad,
  Gem,
  Trophy,
  Star,
  Gift,
  Clock,
  User,
  Settings,
  Bitcoin
} from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/gameService';
import { leaderboardService } from '../services/leaderboardService';
import { userProgressService } from '../services/userProgressService';
import { useTelegram } from '../contexts/TelegramContext';
import ProgressBar from './ProgressBar';
import NutCatcherGame from './games/NutCatcherGame';

const Profile: React.FC = () => {
  const { state, dispatch } = useGame();
  const { user, signOut } = useAuth();
  const { telegram } = useTelegram();
  const [userRank, setUserRank] = useState<number>(0);
  const [characterData, setCharacterData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [showMiniGame, setShowMiniGame] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initUser = async () => {
      if (user) {
        setLoading(true);
        try {
          const character = await gameService.getCharacter(user.id);
          setCharacterData(character);
          
          const rank = await leaderboardService.getUserRank(user.id);
          setUserRank(rank);
          
          const progress = await userProgressService.getUserProgress(user.id);
          setUserProgress(progress);
        } catch (error) {
          console.error('Error loading profile data:', error);
          setError('Не удалось загрузить данные профиля');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    initUser();
  }, [user]);

  const handleFeed = async () => {
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    dispatch({ type: 'FEED_PET' });
    
    if (user) {
      try {
        await gameService.recordUserAction(user.id, 'feed');
        const updatedChar = await gameService.updateCharacter(user.id, {
          satiety: Math.min(100, (characterData?.satiety || 50) + 20),
          last_interaction: new Date().toISOString()
        });
        
        if (updatedChar.success) {
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
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    dispatch({ type: 'PLAY_WITH_PET' });
    
    if (user) {
      try {
        await gameService.recordUserAction(user.id, 'pet');
        const updatedChar = await gameService.updateCharacter(user.id, {
          mood: Math.min(100, (characterData?.mood || 50) + 20),
          last_interaction: new Date().toISOString()
        });
        
        if (updatedChar.success) {
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
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    signOut();
    window.location.reload();
  };

  const openMiniGame = () => {
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
    setShowMiniGame(true);
  };
  
  const handleEnergyEarned = (amount: number) => {
    if (amount > 0) {
      dispatch({ type: 'REGEN_ENERGY', payload: amount });
    }
  };

  const goals = userProgress ? [
    {
      id: 1,
      title: "Уровень",
      progress: userProgress.goals.level.current,
      target: userProgress.goals.level.target,
      reward: "эволюция",
      icon: <Star size={16} className="text-yellow-400" />
    },
    {
      id: 2,
      title: "Топ-20",
      progress: Math.min(userProgress.goals.ranking.current, 100),
      target: userProgress.goals.ranking.target,
      reward: "2000 монет",
      icon: <Trophy size={16} className="text-yellow-400" />
    },
    {
      id: 3,
      title: "Накопить",
      progress: Math.min(userProgress.goals.coins.current, 5000),
      target: userProgress.goals.coins.target,
      reward: "VIP-статус",
      icon: <Bitcoin size={16} className="text-yellow-400" />
    }
  ] : [
    {
      id: 1,
      title: "Уровень",
      progress: state.level.current,
      target: state.level.current + 1,
      reward: "эволюция",
      icon: <Star size={16} className="text-yellow-400" />
    },
    {
      id: 2,
      title: "Топ-20",
      progress: Math.min(userRank, 100),
      target: 20,
      reward: "2000 монет",
      icon: <Trophy size={16} className="text-yellow-400" />
    },
    {
      id: 3,
      title: "Накопить",
      progress: Math.min(state.coins, 5000),
      target: 5000,
      reward: "VIP-статус",
      icon: <Bitcoin size={16} className="text-yellow-400" />
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center py-4 relative bg-[#1E1E2D] min-h-screen">
      {/* Header with user info */}
      <div className="w-full max-w-md mb-4 px-4">
        <div className="flex justify-between items-center w-full bg-purple-900/50 p-3 rounded-lg shadow-lg">
          <div className="flex flex-col items-start">
            <p className="text-white text-sm font-bold">ПРОФИЛЬ</p>
            <p className="text-yellow-400 text-sm">{user?.name || state.name}</p>
          </div>
          
          <div className="flex justify-center items-center">
            <p className="text-white text-sm flex flex-col">
              УРОВЕНЬ: <span className="text-yellow-500 font-bold text-xl">
                {state.level.current}
              </span>
            </p>
          </div>
          
          <div className="flex flex-col items-end">
            <p className="text-white text-sm">РЕЙТИНГ: #{userRank || '?'}</p>
            <ProgressBar 
              current={userRank ? Math.max(0, 100 - userRank) : 50}
              max={100}
              height="h-1"
              className="mt-1 w-full"
              color="yellow"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-row items-center justify-center w-full px-4 relative">
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto relative">
          {/* Energy section */}
          <div className="w-full mb-4 bg-gradient-to-br from-[#1a1538] to-[#0f0c1d] rounded-xl p-4 border border-purple-500/30 shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <Zap className="text-blue-400 mr-2" size={18} />
                <div>
                  <h3 className="font-bold text-white">ЭНЕРГИЯ</h3>
                  <p className="text-xs text-gray-400">{state.energy.current}/{state.energy.max}</p>
                </div>
              </div>
              <button
                onClick={openMiniGame}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-lg text-sm"
              >
                ПОПОЛНИТЬ
              </button>
            </div>
            <ProgressBar 
              current={state.energy.current}
              max={state.energy.max}
              height="h-2"
              className="w-full"
              color="blue"
            />
          </div>

          {/* Character stats */}
          <div className="w-full mb-4 bg-gradient-to-br from-[#1a1538] to-[#0f0c1d] rounded-xl p-4 border border-purple-500/30 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center">
              <User className="mr-2 text-yellow-400" size={20} />
              ХАРАКТЕРИСТИКИ
            </h3>
            
            <div className="space-y-3">
              {/* Health */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Heart className="text-red-400 mr-2" size={16} />
                  <span className="text-white">Здоровье</span>
                </div>
                <span className="text-white font-bold">
                  {characterData?.life_power || state.profile.health || 90}%
                </span>
              </div>
              
              {/* Hunger */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Smile className="text-orange-400 mr-2" size={16} />
                  <span className="text-white">Сытость</span>
                </div>
                <div className="flex items-center">
                  <span className="text-white font-bold mr-2">
                    {characterData?.satiety || state.profile.hunger || 70}%
                  </span>
                  <button 
                    onClick={handleFeed}
                    className="bg-gradient-to-r from-orange-500 to-yellow-600 text-white px-2 py-1 rounded text-xs"
                  >
                    Кормить
                  </button>
                </div>
              </div>
              
              {/* Happiness */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Gem className="text-green-400 mr-2" size={16} />
                  <span className="text-white">Настроение</span>
                </div>
                <div className="flex items-center">
                  <span className="text-white font-bold mr-2">
                    {characterData?.mood || state.profile.happiness || 80}%
                  </span>
                  <button 
                    onClick={handlePlay}
                    className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-2 py-1 rounded text-xs"
                  >
                    Играть
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Goals */}
          <div className="w-full mb-4 bg-gradient-to-br from-[#1a1538] to-[#0f0c1d] rounded-xl p-4 border border-purple-500/30 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center">
              <Trophy className="mr-2 text-yellow-400" size={20} />
              ЦЕЛИ
            </h3>
            
            <div className="space-y-3">
              {goals.map(goal => (
                <div key={goal.id} className="bg-[#1E1E2D]/80 p-3 rounded-lg border border-purple-500/20">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center">
                      {goal.icon}
                      <span className="text-white ml-2">{goal.title}</span>
                    </div>
                    <span className="text-yellow-400 text-sm">+{goal.reward}</span>
                  </div>
                  <ProgressBar 
                    current={goal.progress}
                    max={goal.target}
                    height="h-1.5"
                    className="w-full mt-1"
                    color="yellow"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{goal.progress}/{goal.target}</span>
                    <span>{Math.round((goal.progress / goal.target) * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily tasks */}
          <div className="w-full mb-4 bg-gradient-to-br from-[#1a1538] to-[#0f0c1d] rounded-xl p-4 border border-purple-500/30 shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Gift className="mr-2 text-yellow-400" size={20} />
                ЕЖЕДНЕВНЫЕ ЗАДАНИЯ
              </h3>
              <div className="flex items-center text-xs text-gray-400">
                <Clock size={14} className="mr-1" />
                {calculateRemainingTime()}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="bg-[#1E1E2D]/80 p-3 rounded-lg border border-purple-500/20">
                <div className="flex justify-between items-center">
                  <span className="text-white">Сделать 100 тапов</span>
                  <span className="text-yellow-400">+200</span>
                </div>
                <ProgressBar 
                  current={state.dailyTasks.tapProgress}
                  max={state.dailyTasks.tapTarget}
                  height="h-1.5"
                  className="w-full mt-1"
                  color="purple"
                />
              </div>
              
              <div className="bg-[#1E1E2D]/80 p-3 rounded-lg border border-purple-500/20">
                <div className="flex justify-between items-center">
                  <span className="text-white">Покормить 3 раза</span>
                  <span className="text-yellow-400">+150</span>
                </div>
                <ProgressBar 
                  current={Math.min(state.achievements.feedCount % 3, 3)}
                  max={3}
                  height="h-1.5"
                  className="w-full mt-1"
                  color="purple"
                />
              </div>
              
              <div className="bg-[#1E1E2D]/80 p-3 rounded-lg border border-purple-500/20">
                <div className="flex justify-between items-center">
                  <span className="text-white">Сыграть в мини-игру</span>
                  <span className="text-yellow-400">+100</span>
                </div>
                <button 
                  onClick={openMiniGame}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-1 rounded text-sm mt-2"
                >
                  ИГРАТЬ
                </button>
              </div>
            </div>
          </div>

          {/* Logout button */}
          {user && (
            <div className="w-full mt-6">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center bg-red-500/90 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-all"
              >
                <LogOutIcon size={18} className="mr-2" />
                Выйти из аккаунта
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mini-game modal */}
      {showMiniGame && (
        <NutCatcherGame 
          onClose={() => setShowMiniGame(false)} 
          onEnergyEarned={handleEnergyEarned}
        />
      )}
    </div>
  );
};

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

export default Profile;