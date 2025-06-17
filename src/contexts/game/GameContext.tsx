import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { GameState } from './types';
import { GameAction, resetDailyTasksAction } from './actions';
import { initialGameState } from './initialState';
import { gameReducer } from './reducer';
import { gameService } from '../../services/gameService';
import { leaderboardService } from '../../services/leaderboardService';

// Создание контекста
interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Провайдер контекста
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Получаем сохраненное состояние или используем начальное
  const savedState = gameService.loadGameState();
  const [state, dispatch] = useReducer(gameReducer, savedState || initialGameState);

  // Эффект для автоматического восстановления энергии
  useEffect(() => {
    const energyInterval = setInterval(() => {
      if (state.energy.current < state.energy.max) {
        dispatch({ type: 'REGEN_ENERGY', payload: state.energy.regenRate });
      }
    }, 180000); // Каждые 3 минуты (вместо 1 минуты)

    return () => clearInterval(energyInterval);
  }, [state.energy]);

  // Эффект для деградации параметров персонажа со временем
  useEffect(() => {
    const degradeInterval = setInterval(() => {
      // Уменьшаем голод и счастье каждые 2 часа
      const timeSinceLastFed = Date.now() - state.profile.lastFed;
      if (timeSinceLastFed > 7200000) { // 2 часа
        dispatch({
          type: 'UPDATE_PROFILE',
          payload: {
            hunger: Math.max(0, state.profile.hunger - 5),
            happiness: Math.max(0, state.profile.happiness - 3),
            health: state.profile.hunger < 20 ? Math.max(0, state.profile.health - 5) : state.profile.health,
          },
        });
      }
      
      // Если есть ID пользователя, записываем действие "простоя"
      if (state.userId) {
        gameService.recordUserAction(state.userId, 'idle').catch(console.error);
      }
    }, 3600000); // Каждый час

    return () => clearInterval(degradeInterval);
  }, [state.profile, state.userId]);

  // Эффект для сброса ежедневных заданий
  useEffect(() => {
    const resetDailyTasks = () => {
      const now = new Date();
      const lastReset = new Date(state.dailyTasks.lastReset);
      
      // Если последний сброс был не сегодня
      if (now.getDate() !== lastReset.getDate() || 
          now.getMonth() !== lastReset.getMonth() || 
          now.getFullYear() !== lastReset.getFullYear()) {
        dispatch(
          resetDailyTasksAction({
            tapTarget: 100 + (state.level.current * 10), // Увеличиваем цель с ростом уровня
            tapProgress: 0,
            completedToday: false,
            lastReset: now.getTime(),
          })
        );
      }
    };
    
    resetDailyTasks();
    const dailyCheckInterval = setInterval(resetDailyTasks, 3600000); // Проверяем каждый час
    
    return () => clearInterval(dailyCheckInterval);
  }, [state.dailyTasks.lastReset, state.level.current]);

  // Проверка и очистка временных баффов
  useEffect(() => {
    const checkBuffs = () => {
      const now = Date.now();
      let buffChanged = false;
      let newState = { ...state.tempBuffs };
      
      // Проверяем баффы монет
      if (state.tempBuffs.coinBuffEndTime && now > state.tempBuffs.coinBuffEndTime) {
        newState.coinMultiplier = 1;
        newState.coinBuffEndTime = undefined;
        buffChanged = true;
      }
      
      // Проверяем баффы энергии
      if (state.tempBuffs.energyBuffEndTime && now > state.tempBuffs.energyBuffEndTime) {
        newState.energyBuff = 0;
        newState.energyBuffEndTime = undefined;
        buffChanged = true;
      }
      
      // Если что-то изменилось, обновляем состояние
      if (buffChanged) {
        dispatch({ 
          type: 'UPDATE_BUFFS', 
          payload: newState 
        } as any);
      }
    };
    
    const buffInterval = setInterval(checkBuffs, 10000); // Каждые 10 секунд
    return () => clearInterval(buffInterval);
  }, [state.tempBuffs]);
  
  // Загрузка позиции пользователя в рейтинге
  useEffect(() => {
    const loadUserRank = async () => {
      if (state.userId) {
        try {
          const rank = await leaderboardService.getUserRank(state.userId);
          if (rank && rank !== state.ranking.position) {
            // Обновляем позицию пользователя в рейтинге
            dispatch({
              type: 'UPDATE_RANKING',
              payload: { position: rank }
            });
          }
        } catch (error) {
          console.error('Ошибка при загрузке рейтинга:', error);
        }
      }
    };
    
    loadUserRank();
    // Обновляем рейтинг каждые 5 минут
    const rankInterval = setInterval(loadUserRank, 5 * 60 * 1000);
    return () => clearInterval(rankInterval);
  }, [state.userId, state.ranking.position]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};

// Хук для использования контекста
export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};