import { GameState } from './types';
import { GameAction } from './actions';
import { initialGameState } from './initialState';
import { gameService } from '../../services/gameService';
import { userService } from '../../services/userService';

// Редуктор для управления состоянием игры
export function gameReducer(state: GameState, action: GameAction): GameState {
  let newState: GameState;
  
  console.log('GameAction:', action.type, action);
  
  switch (action.type) {
    case 'TAP':
      // Обработка тапа - увеличение прогресса, проверка энергии
      const tapValue = action.payload;
      const newCoins = state.coins + tapValue * state.tempBuffs.coinMultiplier;
      const newEnergy = Math.max(0, state.energy.current - 1);
      const newProgress = state.progress.current + 1;
      const totalTaps = state.achievements.totalTaps + 1;
      
      // Обновляем сегодняшний прогресс тапов
      const tapProgress = state.dailyTasks.tapProgress + 1;
      
      // Проверяем, нужно ли повысить уровень
      let currentLevel = state.level.current;
      
      // Логика эволюции: орех (уровень 1) -> белка (уровень 2)
      // Переход на уровень 2 происходит при 100 тапах
      if (newProgress >= 100 && currentLevel === 1) {
        currentLevel = 2;
      }
      
      newState = {
        ...state,
        coins: Math.round(newCoins), // округляем монеты
        energy: {
          ...state.energy,
          current: Math.round(newEnergy), // округляем энергию
        },
        progress: {
          current: newProgress,
          // Для белки (уровень 2) устанавливаем очень большое значение требуемого прогресса
          required: currentLevel >= 2 ? 999999 : 100,
        },
        level: {
          ...state.level,
          current: currentLevel,
        },
        achievements: {
          ...state.achievements,
          totalTaps: totalTaps,
        },
        dailyTasks: {
          ...state.dailyTasks,
          tapProgress: tapProgress,
          completedToday: tapProgress >= state.dailyTasks.tapTarget ? true : state.dailyTasks.completedToday,
        },
        ranking: {
          ...state.ranking,
          weeklyTaps: state.ranking.weeklyTaps + 1,
        },
        // Обновляем историю тапов и монет
        growthHistory: {
          ...state.growthHistory,
          tapsPerDay: [...state.growthHistory.tapsPerDay.slice(1), state.growthHistory.tapsPerDay[6] + 1],
          coinsEarned: [...state.growthHistory.coinsEarned.slice(1), state.growthHistory.coinsEarned[6] + tapValue]
        }
      };
      
      // Если есть ID пользователя, записываем статистику
      if (state.userId) {
        // Асинхронно записываем действие (не ждем завершения)
        gameService.recordUserAction(state.userId, 'click').catch(console.error);
        
        // Также обновляем данные персонажа
        gameService.updateCharacter(state.userId, {
          rating: newProgress,
          last_interaction: new Date().toISOString()
        }).catch(console.error);
        
        // Обновляем данные пользователя
        userService.updateUser(state.userId, { 
          total_clicks: totalTaps 
        }).catch(console.error);
      }
      
      break;

    case 'REGEN_ENERGY':
      // Восстановление энергии
      const energyAmount = Math.round(action.payload); // округляем количество энергии
      console.log('Regenerating energy:', energyAmount);
      
      newState = {
        ...state,
        energy: {
          ...state.energy,
          current: Math.round(Math.min(state.energy.max, state.energy.current + energyAmount)), // округляем текущую энергию
        },
      };
      break;

    case 'TOGGLE_SOUND':
      // Включение/выключение звука
      newState = {
        ...state,
        settings: {
          ...state.settings,
          soundEnabled: !state.settings.soundEnabled,
        },
      };
      break;

    case 'TOGGLE_NATURE':
      // Включение/выключение звуков природы
      newState = {
        ...state,
        settings: {
          ...state.settings,
          natureEnabled: !state.settings.natureEnabled,
        },
      };
      break;

    case 'EVOLVE':
      // Эволюция персонажа - увеличение уровня
      const newLevel = state.level.current + 1;
      // Ограничиваем максимальный уровень до 2 (белка)
      const finalLevel = Math.min(newLevel, 2);
      
      newState = {
        ...state,
        level: {
          ...state.level,
          current: finalLevel,
        },
        progress: {
          current: 0,
          // Если достигли уровня белки (2), устанавливаем очень большое значение, чтобы не было повышения уровня
          required: finalLevel >= 2 ? 999999 : 100, 
        },
      };
      
      // Если есть ID пользователя, обновляем персонажа
      if (state.userId) {
        gameService.updateCharacter(state.userId, {
          rating: 0, // Сбрасываем рейтинг при переходе на новый уровень
          last_interaction: new Date().toISOString()
        }).catch(console.error);
      }
      
      break;
      
    case 'SET_LEVEL':
      // Установка конкретного уровня
      const targetLevel = Math.min(action.payload, 2); // Ограничиваем до 2 (белка)
      
      newState = {
        ...state,
        level: {
          ...state.level,
          current: targetLevel,
        },
        progress: {
          current: 0,
          required: targetLevel >= 2 ? 999999 : 100,
        },
      };
      break;

    case 'UPDATE_PROFILE':
      // Обновление профиля
      newState = {
        ...state,
        profile: {
          ...state.profile,
          ...action.payload,
        },
      };
      break;
      
    case 'UPDATE_CHARACTER':
      // Обновление персонажа на основе данных из БД
      const { rating, mood, satiety } = action.payload;
      
      // Расчет уровня на основе рейтинга
      let levelBasedOnRating = 1;
      if (rating !== undefined) {
        if (rating >= 100) {
          levelBasedOnRating = 2; // Белка
        }
      }
      
      newState = {
        ...state,
        progress: {
          ...state.progress,
          current: rating !== undefined ? rating : state.progress.current,
          required: levelBasedOnRating >= 2 ? 999999 : 100
        },
        level: {
          ...state.level,
          current: levelBasedOnRating
        },
        profile: {
          ...state.profile,
          happiness: mood !== undefined ? mood : state.profile.happiness,
          hunger: satiety !== undefined ? satiety : state.profile.hunger,
          health: Math.floor(((satiety || state.profile.hunger) + (mood || state.profile.happiness)) / 2)
        }
      };
      break;

    case 'SET_AVATAR':
      // Установка аватара
      newState = {
        ...state,
        profile: {
          ...state.profile,
          avatar: action.payload,
        },
      };
      break;
      
    case 'SET_THOUGHT_STATUS':
      // Обновление статуса мысли
      newState = {
        ...state,
        profile: {
          ...state.profile,
          thoughtStatus: action.payload,
        },
      };
      break;

    case 'FEED_PET':
      // Кормление питомца
      const newHunger = Math.min(100, state.profile.hunger + 20);
      
      newState = {
        ...state,
        profile: {
          ...state.profile,
          hunger: newHunger,
          lastFed: Date.now(),
        },
        achievements: {
          ...state.achievements,
          feedCount: state.achievements.feedCount + 1,
        },
      };
      
      // Если есть ID пользователя, записываем статистику
      if (state.userId) {
        gameService.recordUserAction(state.userId, 'feed').catch(console.error);
        
        // Также обновляем данные персонажа
        gameService.updateCharacter(state.userId, {
          satiety: newHunger,
          last_interaction: new Date().toISOString()
        }).catch(console.error);
        
        // Обновляем счетчик кормлений у пользователя
        userService.updateUser(state.userId, {
          feed_clicks: (state.achievements.feedCount + 1)
        }).catch(console.error);
      }
      
      break;

    case 'PLAY_WITH_PET':
      // Игра с питомцем
      const newHappiness = Math.min(100, state.profile.happiness + 20);
      
      newState = {
        ...state,
        profile: {
          ...state.profile,
          happiness: newHappiness,
        },
        fishko: {
          ...state.fishko,
          happiness: Math.min(100, state.fishko.happiness + 20),
          pettedCount: state.fishko.pettedCount + 1,
        },
      };
      
      // Если есть ID пользователя, записываем статистику
      if (state.userId) {
        gameService.recordUserAction(state.userId, 'pet').catch(console.error);
        
        // Также обновляем данные персонажа
        gameService.updateCharacter(state.userId, {
          mood: newHappiness,
          last_interaction: new Date().toISOString()
        }).catch(console.error);
        
        // Обновляем счетчик поглаживаний у пользователя
        userService.updateUser(state.userId, { 
          pet_clicks: (state.fishko.pettedCount + 1) 
        }).catch(console.error);
      }
      
      break;

    case 'CLAIM_REWARD':
      // Получение награды
      const { type, amount } = action.payload;
      if (type === 'coins') {
        newState = {
          ...state,
          coins: Math.round(state.coins + amount), // округляем монеты
        };
      } else if (type === 'energy') {
        newState = {
          ...state,
          energy: {
            ...state.energy,
            current: Math.round(Math.min(state.energy.max, state.energy.current + amount)), // округляем энергию
          },
        };
      } else {
        return state;
      }
      break;

    case 'TOGGLE_CHARACTER':
      // Переключение между персонажами
      newState = {
        ...state,
        characterType: state.characterType === 'yasuko' ? 'fishko' : 'yasuko',
      };
      break;

    case 'BUY_ITEM':
      // Покупка предмета
      const newCoinAmount = state.coins - action.payload.price;
      if (newCoinAmount < 0) return state; // Недостаточно монет
      
      newState = {
        ...state,
        coins: Math.round(newCoinAmount), // округляем монеты
        achievements: {
          ...state.achievements,
          itemsBought: state.achievements.itemsBought + 1,
        },
      };
      
      // Если пользователь авторизован, обновляем монеты в БД
      if (state.userId) {
        userService.updateUser(state.userId, {
          total_clicks: newCoinAmount
        }).catch(console.error);
      }
      
      break;
      
    case 'UPDATE_ENERGY_MAX':
      // Увеличение максимальной энергии
      newState = {
        ...state,
        energy: {
          ...state.energy,
          max: Math.round(action.payload), // округляем максимальную энергию
        },
      };
      break;

    case 'APPLY_BUFF':
      // Применение временного баффа
      const now = Date.now();
      const buffDuration = action.payload.duration * 60 * 1000; // Переводим минуты в миллисекунды
      
      if (action.payload.type === 'coin') {
        newState = {
          ...state,
          tempBuffs: {
            ...state.tempBuffs,
            coinMultiplier: action.payload.multiplier,
            coinBuffEndTime: now + buffDuration,
          },
        };
      } else if (action.payload.type === 'energy') {
        newState = {
          ...state,
          tempBuffs: {
            ...state.tempBuffs,
            energyBuff: action.payload.multiplier,
            energyBuffEndTime: now + buffDuration,
          },
        };
      } else {
        return state;
      }
      break;
      
    case 'SET_USER_ID':
      // Установка ID пользователя
      console.log('Setting user ID:', action.payload);
      newState = {
        ...state,
        userId: action.payload,
      };
      break;
      
    case 'UPDATE_RANKING':
      // Обновление позиции в рейтинге
      newState = {
        ...state,
        ranking: {
          ...state.ranking,
          position: action.payload.position
        }
      };
      break;

    case 'RESET_DAILY_TASKS':
      // Сброс ежедневных заданий
      newState = {
        ...state,
        dailyTasks: {
          ...action.payload
        }
      };
      break;
      
    case 'SYNC_WITH_SERVER':
      // Синхронизация с сервером - в будущем здесь может быть код для загрузки данных с сервера
      // Пока просто возвращаем текущее состояние
      return state;

    case 'RESET':
      // Сброс состояния
      newState = initialGameState;
      break;

    default:
      return state;
  }
  
  // Сохраняем обновленное состояние в локальное хранилище
  gameService.saveGameState(newState);
  
  return newState;
}