import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../../contexts/GameContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useTelegram } from '../../../contexts/TelegramContext';
import { XIcon, Clock, BoltIcon, TrophyIcon, PauseIcon, PlayIcon } from 'lucide-react';
import { GameResult } from '../../../types';
import { gameService } from '../../../services/gameService';

import GameArea from './GameArea';
import GameHeader from './GameHeader';
import StartScreen from './StartScreen';
import GameOverScreen from './GameOverScreen';
import PauseScreen from './PauseScreen';
import GameStats from './GameStats';

interface NutCatcherGameProps {
  onClose: () => void;
  onEnergyEarned: (amount: number) => void;
}

const NutCatcherGame: React.FC<NutCatcherGameProps> = ({ onClose, onEnergyEarned }) => {
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60); // 60 секунд на игру
  const [energyEarned, setEnergyEarned] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('nutCatcherHighScore') || '0');
  });
  const [gamesPlayed, setGamesPlayed] = useState(() => {
    // Получаем количество сыгранных игр сегодня из localStorage
    const storedGames = localStorage.getItem('nutCatcherGamesPlayed');
    if (!storedGames) return 0;
    
    try {
      const gamesData = JSON.parse(storedGames);
      // Проверяем, не устарели ли данные (сброс счетчика каждый день)
      const today = new Date().toISOString().split('T')[0];
      if (gamesData.date !== today) {
        return 0; // Новый день - сбрасываем счетчик
      }
      return gamesData.count;
    } catch {
      return 0;
    }
  });
  const [canPlay, setCanPlay] = useState(true);
  const [showTips, setShowTips] = useState(false);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [timeToReset, setTimeToReset] = useState<string>('');
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const { telegram } = useTelegram();

  // Проверяем, может ли пользователь играть (не больше 3 игр в день)
  useEffect(() => {
    const maxDailyGames = 3;
    setCanPlay(gamesPlayed < maxDailyGames);
  }, [gamesPlayed]);
  
  // Расчет времени до сброса лимита игр
  useEffect(() => {
    const calculateTimeToReset = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const diffMs = tomorrow.getTime() - now.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      return `${diffHrs.toString().padStart(2, '0')}:${diffMins.toString().padStart(2, '0')}:${diffSecs.toString().padStart(2, '0')}`;
    };
    
    // Обновляем время каждую секунду для точного отсчета
    const updateTimer = () => {
      setTimeToReset(calculateTimeToReset());
    };
    
    // Инициализируем и запускаем таймер
    setTimeToReset(calculateTimeToReset());
    resetTimerRef.current = setInterval(updateTimer, 1000);
    
    // Очищаем таймер при размонтировании
    return () => {
      if (resetTimerRef.current) {
        clearInterval(resetTimerRef.current);
      }
    };
  }, []);
  
  // Запись количества сыгранных игр
  const recordGamePlayed = () => {
    const today = new Date().toISOString().split('T')[0];
    const newCount = gamesPlayed + 1;
    
    // Сохраняем в localStorage
    localStorage.setItem('nutCatcherGamesPlayed', JSON.stringify({
      date: today,
      count: newCount
    }));
    
    setGamesPlayed(newCount);
  };

  const startGame = () => {
    if (!canPlay) {
      // Уведомление о достижении лимита игр с вибрацией
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('error');
      }
      alert('Вы достигли лимита игр на сегодня (3 игры). Приходите завтра!');
      return;
    }
    
    setGameActive(true);
    setGameOver(false);
    setScore(0);
    setEnergyEarned(0);
    setTimeLeft(60);
    setIsPaused(false);
    recordGamePlayed();
    
    // Отслеживаем начало игры
    if (user) {
      gameService.trackUserAction(user.id, 'game_started', {
        game: 'nut_catcher',
        games_played_today: gamesPlayed + 1,
        games_left_today: Math.max(0, 3 - (gamesPlayed + 1)),
        timestamp: new Date().toISOString()
      }).catch(console.error);
    }
    
    // Хаптик-фидбек при начале игры
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
  };
  
  const togglePause = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    // Отслеживаем паузу или продолжение игры
    if (user) {
      gameService.trackUserAction(user.id, newPausedState ? 'game_paused' : 'game_resumed', {
        game: 'nut_catcher',
        time_left: timeLeft,
        score: score,
        timestamp: new Date().toISOString()
      }).catch(console.error);
    }
    
    // Хаптик-фидбек при паузе
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
  };
  
  const endGame = () => {
    setGameOver(true);
    
    // Сохранение лучшего результата
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('nutCatcherHighScore', score.toString());
    }
    
    // Показываем анимацию награды
    setShowRewardAnimation(true);
    setTimeout(() => {
      setShowRewardAnimation(false);
      
      // Выдаем энергию в качестве награды
      onEnergyEarned(energyEarned);
      
      // Создаем уведомление об успешной игре
      if (user) {
        try {
          // Записываем о получении энергии через мини-игру
          const notificationData = {
            user_id: user.id,
            type: 'reward',
            title: 'Награда за мини-игру',
            message: `Вы заработали +${energyEarned} энергии в игре "Ловитель орехов"!`,
            data: {
              game: 'nut-catcher',
              reward_type: 'energy',
              amount: energyEarned
            }
          };
          
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/notifications`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(notificationData)
          }).catch(err => console.error('Ошибка при создании уведомления:', err));
          
          // Отслеживаем окончание игры с результатами
          gameService.trackUserAction(user.id, 'game_finished', {
            game: 'nut_catcher',
            score: score,
            energy_earned: energyEarned,
            high_score: Math.max(highScore, score),
            is_high_score: score > highScore,
            game_duration: 60 - timeLeft,
            timestamp: new Date().toISOString()
          }).catch(console.error);
        } catch (err) {
          console.error('Ошибка при создании уведомления:', err);
        }
      }
    }, 2000);
    
    // Хаптик-фидбек при окончании игры
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
  };
  
  const closeGame = () => {
    // Хаптик-фидбек при закрытии
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
    
    // Если игра была активна, выдаем награду
    if (gameActive && !gameOver && energyEarned > 0) {
      onEnergyEarned(energyEarned);
      
      // Отслеживаем преждевременный выход из игры
      if (user) {
        gameService.trackUserAction(user.id, 'game_exit_early', {
          game: 'nut_catcher',
          score: score,
          energy_earned: energyEarned,
          time_left: timeLeft,
          timestamp: new Date().toISOString()
        }).catch(console.error);
      }
    } else {
      // Отслеживаем выход из игры
      if (user) {
        gameService.trackUserAction(user.id, 'game_exit', {
          game: 'nut_catcher',
          game_state: gameActive ? (gameOver ? 'finished' : 'active') : 'not_started',
          timestamp: new Date().toISOString()
        }).catch(console.error);
      }
    }
    
    // Убедимся, что все таймеры очищены
    if (resetTimerRef.current) {
      clearInterval(resetTimerRef.current);
    }
    onClose();
  };
  
  const handleScoreUpdate = (points: number) => {
    setScore(prev => prev + points);
    setEnergyEarned(prev => prev + points);
    
    // Вибрация через Telegram API
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
  };

  // Обновление таймера
  const updateTimer = () => {
    if (timeLeft <= 1) {
      endGame();
    } else {
      setTimeLeft(prev => prev - 1);
    }
  };
  
  const toggleTips = () => {
    const newTipsState = !showTips;
    setShowTips(newTipsState);
    
    // Отслеживаем просмотр подсказок
    if (user) {
      gameService.trackUserAction(user.id, newTipsState ? 'game_tips_opened' : 'game_tips_closed', {
        game: 'nut_catcher',
        timestamp: new Date().toISOString()
      }).catch(console.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-0 touch-none md:p-4">
      <div className="bg-[#1a1625] w-full h-full md:max-w-lg md:h-auto md:max-h-[90vh] rounded-lg overflow-hidden shadow-xl relative md:rounded-xl">
        {/* Шапка игры */}
        <GameHeader 
          title="ЛОВИТЕЛЬ ОРЕХОВ" 
          isPaused={isPaused}
          isGameActive={gameActive && !gameOver}
          onTogglePause={togglePause} 
          onClose={closeGame} 
        />
        
        {/* Статистика игры */}
        <GameStats 
          score={score} 
          energyEarned={energyEarned}
          timeLeft={timeLeft}
        />
        
        {/* Игровая область */}
        <GameArea
          isActive={gameActive && !gameOver && !isPaused}
          onScoreUpdate={handleScoreUpdate}
          onTimerUpdate={updateTimer}
        />
        
        {/* Анимация получения награды */}
        {showRewardAnimation && (
          <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/70">
            <div className="bg-yellow-500 text-black px-8 py-6 rounded-lg animate-bounce flex flex-col items-center">
              <BoltIcon size={48} className="mb-2" />
              <h3 className="text-xl font-bold">+{energyEarned} ЭНЕРГИИ!</h3>
            </div>
          </div>
        )}
        
        {/* Пауза */}
        {isPaused && (
          <PauseScreen 
            onResume={togglePause}
            onExit={closeGame}
          />
        )}
        
        {/* Экран начала игры */}
        {!gameActive && !gameOver && (
          <StartScreen 
            onStart={startGame} 
            highScore={highScore}
            gamesPlayed={gamesPlayed}
            gamesLimit={3}
            canPlay={canPlay}
            onShowTips={toggleTips}
            showTips={showTips}
            timeToReset={timeToReset}
            onClose={closeGame} // Передаем функцию закрытия
          />
        )}
        
        {/* Экран окончания игры */}
        {gameOver && (
          <GameOverScreen
            score={score}
            energyEarned={energyEarned}
            highScore={highScore} 
            onRestart={startGame}
            onExit={closeGame}
            canPlay={canPlay}
            timeToReset={timeToReset}
          />
        )}
      </div>
    </div>
  );
};

export default NutCatcherGame;