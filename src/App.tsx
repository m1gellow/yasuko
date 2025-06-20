import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TelegramOptionsScreen from './components/auth/TelegramOptionsScreen';
import OnboardingScreen from './components/onboarding/OnboardingScreen';
import { GameProvider, useGame } from './contexts/GameContext';
import { TelegramProvider, useTelegram } from './contexts/TelegramContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TapTarget, StoreItem } from './types';
import { gameService } from './services/gameService';
import { userService } from './services/userService';
import { referralService } from './services/referralService';
import { notificationService } from './services/notificationService';
import { leaderboardService } from './services/leaderboardService';
import { useOnboarding } from './hooks/useOnboarding';
import MainContent from './components/layout/MainContent';
import './index.css';
import { generateMainContentProps } from './utils/generateMainContentProps';

// Обертка для App с провайдерами
const AppWithProviders: React.FC = () => {
  return (
    <Router>
      <TelegramProvider debugMode={false}>
        <AuthProvider>
          <GameProvider>
            <AppContent />
          </GameProvider>
        </AuthProvider>
      </TelegramProvider>
    </Router>
  );
};

// Основное содержимое приложения
const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('game');
  const [tapTarget, setTapTarget] = useState<TapTarget>({
    id: 'target-1',
    name: 'ОРЕХ',
    basePoints: 1,
    image: '/assets/oreh.png',
    level: 1,
    requiredTaps: 100,
    currentTaps: 0,
    energy: 1,
    state: 'active',
  });
  const [purchasedItems, setPurchasedItems] = useState<StoreItem[]>([]);
  const [showPurchaseNotification, setShowPurchaseNotification] = useState(false);
  const [lastPurchase, setLastPurchase] = useState<StoreItem | null>(null);
  const [isTapAnimationActive, setIsTapAnimationActive] = useState(false);
  const [showCharacterCard, setShowCharacterCard] = useState(false);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [showTelegramAuth, setShowTelegramAuth] = useState(false);
  const [referralCodeProcessed, setReferralCodeProcessed] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<number>(0);

  const { state, dispatch } = useGame();
  const { user, loading: authLoading } = useAuth();
  const { telegram, user: telegramUser, isReady: isTelegramReady } = useTelegram();
  const { isFirstTime, isLoading: onboardingLoading, markOnboardingComplete } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Проверяем необходимость показа онбординга
  useEffect(() => {
    if (!onboardingLoading && isFirstTime) {
      setShowOnboarding(true);
    }
  }, [onboardingLoading, isFirstTime]);

  // Проверка, находимся ли мы в Telegram WebApp
  useEffect(() => {
    if (isTelegramReady && telegram?.initDataUnsafe) {
      // Мы в Telegram WebApp, но НЕ показываем авторизацию автоматически,
      // а ждем действия от пользователя
    }
  }, [isTelegramReady, telegram]);

  // Проверка на наличие реферальной ссылки при загрузке
  useEffect(() => {
    const processReferralCode = async () => {
      if (!user || referralCodeProcessed) return;

      const referralCode = referralService.extractReferralCodeFromUrl();
      if (referralCode) {
        try {
          const result = await referralService.useReferralCode(referralCode, user.id);

          if (result.success && result.reward) {
            // Тактильная отдача при получении награды
            if (telegram?.HapticFeedback) {
              telegram.HapticFeedback.notificationOccurred('success');
            }

            // Применяем награду
            if (result.reward.coins) {
              dispatch({
                type: 'CLAIM_REWARD',
                payload: { type: 'coins', amount: result.reward.coins },
              });
            }

            if (result.reward.energy) {
              dispatch({
                type: 'REGEN_ENERGY',
                payload: result.reward.energy,
              });
            }

            // Показываем уведомление о полученной награде
            alert(
              `Реферальный код активирован! Вы получили: ${result.reward.coins ? result.reward.coins + ' монет' : ''} ${result.reward.energy ? result.reward.energy + ' энергии' : ''}`,
            );
          }
        } catch (error) {
          console.error('Error processing referral code:', error);
        }

        setReferralCodeProcessed(true);
      }
    };

    processReferralCode();
  }, [user, dispatch, referralCodeProcessed, telegram]);

  // Загрузка ранга пользователя
  useEffect(() => {
    const loadUserRank = async () => {
      if (!user) return;

      try {
        const rank = await leaderboardService.getUserRank(user.id);
        setUserRank(rank);
      } catch (error) {
        console.error('Ошибка при загрузке ранга пользователя:', error);
      }
    };

    loadUserRank();

    // Обновляем ранг каждые 5 минут
    const rankInterval = setInterval(loadUserRank, 5 * 60 * 1000);
    return () => clearInterval(rankInterval);
  }, [user]);

  // Синхронизация с данными сервера при авторизации
  useEffect(() => {
    const initUser = async () => {
      if (user) {
        // Устанавливаем ID пользователя в GameContext
        dispatch({ type: 'SET_USER_ID', payload: user.id });

        // Загружаем персонажа пользователя из базы
        try {
          const character = await gameService.getCharacter(user.id);
          if (character) {
            // Обновляем состояние на основе данных из базы
            dispatch({
              type: 'UPDATE_CHARACTER',
              payload: {
                rating: character.rating || 0,
                mood: character.mood || 50,
                satiety: character.satiety || 50,
              },
            });

            // Обновляем уровень на основе рейтинга
            const currentLevel = character.rating && character.rating >= 100 ? 2 : 1;
            if (currentLevel !== state.level.current) {
              dispatch({
                type: 'SET_LEVEL',
                payload: currentLevel,
              });
            }

            // Обновляем тап-таргет на основе уровня
            setTapTarget((prev) => ({
              ...prev,
              level: currentLevel,
              name: getLevelName(currentLevel),
              requiredTaps: currentLevel >= 2 ? 999999 : 100,
              currentTaps: (character.rating || 0) % 100,
            }));
          }
        } catch (error) {
          console.error('Error loading character data:', error);
        }

        // Проверяем, нужно ли показывать экран авторизации
        setShowAuthScreen(false);
        setShowTelegramAuth(false);
      } else if (!authLoading && !showTelegramAuth) {
        // Если не авторизован и загрузка завершена, показываем экран авторизации
        setShowAuthScreen(true);
      }
    };

    initUser();
  }, [authLoading, dispatch, user, state.level.current, showTelegramAuth]);

  // Функция для определения имени персонажа по уровню
  const getLevelName = (level: number): string => {
    switch (level) {
      case 1:
        return 'ОРЕХ';
      case 2:
      case 3:
        return 'БЕЛКА';
      default:
        return 'ЯСУКО';
    }
  };

  // Загрузка уведомлений пользователя
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) return;

      try {
        // Получаем реальные уведомления из базы данных
        const userNotifications = await notificationService.getUserNotifications(user.id, 5);
        setNotifications(userNotifications);

        // Подписываемся на новые уведомления
        const unsubscribe = notificationService.subscribeToNotifications(user.id, (newNotification) => {
          setNotifications((prev) => [newNotification, ...prev].slice(0, 5));
        });

        return () => {
          if (typeof unsubscribe === 'function') {
            unsubscribe();
          }
        };
      } catch (error) {
        console.error('Error loading notifications:', error);

        // В случае ошибки, используем временные уведомления
        setNotifications([
          {
            id: '1',
            type: 'achievement',
            title: 'Новое достижение',
            message: 'Вы совершили 100 тапов! Получите награду в профиле.',
            is_read: false,
            created_at: new Date().toISOString(),
          },
          {
            id: '2',
            type: 'rating',
            title: 'Рейтинг улучшен',
            message: 'Ваша позиция в рейтинге: #99',
            is_read: false,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    };

    loadNotifications();
  }, [user]);

  // Рекомендации для AI Assistant на основе состояния игры
  const getRecommendations = useCallback(() => {
    const recommendations = [];

    // Проверяем уровень энергии
    if (state.energy.current < state.energy.max * 0.2) {
      recommendations.push({
        type: 'energy',
        message: 'Ваша энергия низкая. Восполните её или купите бустер в магазине.',
        priority: 5,
      });
    }

    // Проверяем параметры персонажа
    if (state.profile.hunger < 30) {
      recommendations.push({
        type: 'feed',
        message: 'Ваш персонаж голоден! Покормите его, чтобы избежать снижения здоровья.',
        priority: 4,
      });
    }

    if (state.profile.happiness < 30) {
      recommendations.push({
        type: 'play',
        message: 'Ваш персонаж грустит. Поиграйте с ним, чтобы повысить его настроение.',
        priority: 3,
      });
    }

    // Напоминаем о ежедневных заданиях
    if (!state.dailyTasks.completedToday) {
      recommendations.push({
        type: 'coins',
        message: 'Не забудьте выполнить ежедневные задания для получения дополнительных монет!',
        priority: 2,
      });
    }

    // Если скоро новый уровень
    const levelProgress = state.progress.current / state.progress.required;
    if (levelProgress > 0.8 && levelProgress < 1 && state.level.current < 2) {
      recommendations.push({
        type: 'level',
        message: 'Вы почти достигли нового уровня! Немного усилий и ваш персонаж эволюционирует!',
        priority: 1,
      });
    }

    // Если энергия на исходе, предложим сыграть в мини-игру
    if (state.energy.current < 10 && state.energy.current > 0) {
      recommendations.push({
        type: 'energy',
        message: 'Энергия заканчивается! Сыграйте в мини-игру или пригласите друга, чтобы получить +100 энергии!',
        priority: 6,
      });
    }

    return recommendations;
  }, [
    state.energy.current,
    state.energy.max,
    state.profile.hunger,
    state.profile.happiness,
    state.dailyTasks.completedToday,
    state.progress.current,
    state.progress.required,
    state.level.current,
  ]);

  // Handle tap - реализация логики: 1 тап = -1 энергия, +1 к общему рейтингу, +1 к личному рейтингу, +1 монета
  const handleTap = useCallback(
    (points: number) => {
      if (state.energy.current <= 0) return;

      setIsTapAnimationActive(true);
      setTimeout(() => setIsTapAnimationActive(false), 300);

      // Обновляем очки и энергию через GameContext
      dispatch({ type: 'TAP', payload: points });

      // Обновляем количество тапов
      setTapTarget((prevTarget) => {
        const newTaps = prevTarget.currentTaps + 1;
        const newLevel = Math.floor(state.progress.current / 100) + 1;

        // Если это изменило уровень, обновляем все данные
        if (newLevel !== prevTarget.level) {
          return {
            ...prevTarget,
            level: newLevel,
            name: getLevelName(newLevel),
            currentTaps: state.progress.current % 100,
            requiredTaps: newLevel >= 2 ? 999999 : 100, // 100 тапов на первый уровень, потом эволюции нет
          };
        }

        // Иначе просто обновляем текущие тапы
        return {
          ...prevTarget,
          currentTaps: newTaps,
          level: newLevel,
        };
      });

      // Если пользователь авторизован, обновляем данные на сервере
      if (user) {
        userService
          .updateUser(user.id, {
            total_clicks: (user.total_clicks || 0) + 1,
          })
          .catch(console.error);
      }
    },
    [dispatch, state.energy.current, state.progress.current, user],
  );

  // Handle level up
  const handleLevelUp = useCallback(() => {
    const newLevel = tapTarget.level + 1;

    // Ограничиваем максимальный уровень до 2 (белка)
    const finalLevel = Math.min(newLevel, 2);

    setTapTarget((prevTarget) => ({
      ...prevTarget,
      level: finalLevel,
      name: getLevelName(finalLevel),
      currentTaps: 0,
      requiredTaps: finalLevel >= 2 ? 999999 : 100, // Последний уровень - белка
      basePoints: prevTarget.basePoints + 0.5, // Небольшое повышение базовых очков
      state: 'active',
    }));

    // Level up через GameContext
    dispatch({ type: 'EVOLVE' });

    // Обновляем данные на сервере если пользователь авторизован
    if (user) {
      gameService
        .updateCharacter(user.id, {
          rating: 0, // Сбрасываем рейтинг при переходе на новый уровень
          last_interaction: new Date().toISOString(),
        })
        .catch(console.error);
    }
  }, [dispatch, user, tapTarget.level]);

  // Handle purchase
  const handlePurchase = useCallback(
    (item: StoreItem) => {
      // Check if user has enough coins
      if (state.coins < item.price) return;

      // Update user score через GameContext
      dispatch({ type: 'BUY_ITEM', payload: { price: item.price } });

      // Handle different item types
      if (item.category === 'energy') {
        // If it's a permanent energy upgrade
        if (item.isPermanent) {
          dispatch({
            type: 'UPDATE_ENERGY_MAX',
            payload: state.energy.max + 50,
          });
        } else {
          // If it's an instant energy refill
          dispatch({
            type: 'REGEN_ENERGY',
            payload: 200,
          });
        }
      } else if (item.category === 'games') {
        // Если покупается игра, добавляем ее в инвентарь
        if (user) {
          userService.addItemToUserInventory(user.id, item.id).catch(console.error);
        }
      }

      // Add to purchased items
      setPurchasedItems((prev) => [...prev, item]);

      // Show purchase notification
      setLastPurchase(item);
      setShowPurchaseNotification(true);
      setTimeout(() => setShowPurchaseNotification(false), 3000);
    },
    [dispatch, state.coins, state.energy.max, user],
  );

  // Handle energy refill
  const handleRefillEnergy = useCallback(() => {
    dispatch({
      type: 'REGEN_ENERGY',
      payload: state.energy.max - state.energy.current,
    });
  }, [dispatch, state.energy.max, state.energy.current]);

  // Обработчик переключения карточки персонажа
  const handleToggleCharacterCard = useCallback(() => {
    setShowCharacterCard((prev) => !prev);
  }, []);

  // Обработчики для уведомлений
  const handleMarkAsRead = async (id: string) => {
    if (user) {
      try {
        await notificationService.markAsRead(id, user.id);
        setNotifications((prev) =>
          prev.map((notification) => (notification.id === id ? { ...notification, is_read: true } : notification)),
        );
      } catch (error) {
        console.error('Ошибка при отметке уведомления как прочитанного:', error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (user) {
      try {
        await notificationService.markAllAsRead(user.id);
        setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
      } catch (error) {
        console.error('Ошибка при отметке всех уведомлений как прочитанных:', error);
      }
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (user) {
      try {
        await notificationService.deleteNotification(id, user.id);
        setNotifications((prev) => prev.filter((notification) => notification.id !== id));
      } catch (error) {
        console.error('Ошибка при удалении уведомления:', error);
        // Все равно удаляем из локального состояния
        setNotifications((prev) => prev.filter((notification) => notification.id !== id));
      }
    }
  };

  // Обработчик завершения онбординга
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    markOnboardingComplete();
  };

  // Обработчик успешной авторизации через Telegram
  const handleTelegramAuthSuccess = () => {
    setShowTelegramAuth(false);
  };

  // Показываем онбординг при первом запуске
  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }
 const MainContentProps = generateMainContentProps(
  user,
  state,
  userRank,
  notifications,
  tapTarget,
  showCharacterCard,
  showPurchaseNotification,
  lastPurchase,
  isTapAnimationActive,
  {
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDeleteNotification,
    handleRefillEnergy,
    handleTap,
    handleLevelUp,
    handlePurchase,
    setActiveTab,
    handleToggleCharacterCard,
    getRecommendations,
  }
);

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 min-h-screen text-white relative">
      {/* Экран авторизации */}
      {showAuthScreen && !showTelegramAuth && (
        <TelegramOptionsScreen onSuccess={() => setShowAuthScreen(false)} onClose={() => setShowAuthScreen(false)} />
      )}
      {/* Экран авторизации через Telegram */}
      {showTelegramAuth && (
        <TelegramOptionsScreen onSuccess={handleTelegramAuthSuccess} onClose={() => setShowTelegramAuth(false)} />
      )}
      {!showAuthScreen && !showTelegramAuth && (
        <Routes>
          <Route path="/" element={<MainContent {...MainContentProps} activeTab={activeTab} />} />
          <Route path="/leaderboard" element={<MainContent {...MainContentProps} activeTab={'leaderboard'} />} />
          <Route path="/store" element={<MainContent {...MainContentProps} activeTab={'store'} />} />
          <Route path="/profile" element={<MainContent {...MainContentProps} activeTab={'profile'} />} />
          <Route path="/gifts" element={<MainContent {...MainContentProps} activeTab={'gifts'} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </div>
  );
};

export default AppWithProviders;
