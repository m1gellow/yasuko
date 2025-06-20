import React, { memo, useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../Header';
import TapGame from '../TapGame';
import Leaderboard from '../Leaderboard';
import Store from '../Store';
import Profile from '../Profile';
import Gifts from '../Gifts';
import Navigation from '../Navigation';
import NutCatcherGame from '../games/NutCatcherGame';
import { useAnalytics } from '../../hooks/useAnalytics';
import { TabContentProps, MainContentProps } from '../../types';

// Определяем тип для табов
type TabKey = 'game' | 'leaderboard' | 'store' | 'profile' | 'gifts';

const TAB_TITLES: Record<TabKey, string> & { default: string } = {
  game: 'Ясуко - Главная',
  leaderboard: 'Ясуко - Рейтинг',
  store: 'Ясуко - Магазин',
  profile: 'Ясуко - Профиль',
  gifts: 'Ясуко - Подарки',
  default: 'Ясуко - Интерактивная игра-тамагочи',
};

const PATH_TO_TAB: Record<string, TabKey> = {
  '/': 'game',
  '/leaderboard': 'leaderboard',
  '/store': 'store',
  '/profile': 'profile',
  '/gifts': 'gifts',
};


const MainContent: React.FC<MainContentProps> = memo(({
  activeTab,
  user,
  notifications,
  state,
  tapTarget,
  lastPurchase,
  showCharacterCard,
  showPurchaseNotification,
  onTabChange,
  onTap,
  onLevelUp,
  onPurchase,
  onRefillEnergy,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onToggleCharacterCard,
}) => {
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [prevTab, setPrevTab] = useState(activeTab);
  const analytics = useAnalytics();
  const location = useLocation();

  // Формируем данные пользователя для дочерних компонентов
  const getUserData = useCallback(() => ({
    id: user?.id || 'guest',
    name: user?.name || 'Гость',
    username: user?.phone || 'guest',
    level: state.level.current,
    energy: {
      current: Math.round(state.energy.current),
      max: state.energy.max,
      replenishRate: state.energy.regenRate,
    },
    score: Math.round(state.coins),
    rating: state.progress.current,
    maxRating: state.progress.required,
    items: [],
    achievements: [],
    lastActive: new Date(),
    dailyLoginDay: 1,
    position: user?.position || 0,
  }), [user, state]);

  const userForComponents = getUserData();

  // Устанавливаем заголовок страницы
  useEffect(() => {
    document.title = TAB_TITLES[activeTab] || TAB_TITLES.default;
  }, [activeTab]);

  // Синхронизация URL и активного таба
  useEffect(() => {
    const newActiveTab = PATH_TO_TAB[location.pathname];
    if (newActiveTab && newActiveTab !== activeTab) {
      onTabChange(newActiveTab);
    }
  }, [location.pathname, activeTab, onTabChange]);


  // Затем в компоненте, где используется TAB_TITLES:
useEffect(() => {
  const title = TAB_TITLES[activeTab as TabKey] || TAB_TITLES.default;
  document.title = title;
}, [activeTab]);

  // Отправка аналитики при смене таба
  useEffect(() => {
    if (prevTab !== activeTab && user) {
      analytics.trackNavigation(prevTab, activeTab, {
        characterLevel: state.level.current,
        characterType: state.characterType,
        energyStatus: `${Math.round(state.energy.current)}/${state.energy.max}`,
        isCharacterCardVisible: showCharacterCard,
      });
      setPrevTab(activeTab);
    }
  }, [activeTab, prevTab, user, analytics, state, showCharacterCard]);

  // Отправка аналитики при загрузке страницы
  useEffect(() => {
    if (user) {
      analytics.trackPageView(activeTab, '', {
        characterLevel: state.level.current,
        characterType: state.characterType,
        userRank: user.position || 0,
      });
    }
  }, [user, activeTab, analytics, state]);

  // Обработчик мини-игры
  useEffect(() => {
    const handleOpenMiniGame = () => {
      setShowMiniGame(true);
      user && analytics.trackGameEvent('nut-catcher-game', 'start', {
        openedFrom: activeTab,
        openMethod: 'event',
      });
    };

    window.addEventListener('open-mini-game', handleOpenMiniGame);
    return () => window.removeEventListener('open-mini-game', handleOpenMiniGame);
  }, [activeTab, analytics, user]);

  const handleEnergyEarned = (amount: number) => {
    if (amount > 0) {
      onRefillEnergy();
      user && analytics.trackAction('energy_earned', {
        source: 'mini_game',
        amount,
        gameId: 'nut-catcher-game',
      });
    }
  };

  const TabContent: React.FC<TabContentProps> = ({ activeTab, tabName, children }) => (
    activeTab === tabName ? <>{children}</> : null
  );

  return (
    <>
      <TabContent activeTab={activeTab} tabName="game">
        <Header
          user={userForComponents}
          devMode={false}
          onRefillEnergy={onRefillEnergy}
          notifications={notifications}
          onMarkAsRead={onMarkAsRead}
          onMarkAllAsRead={onMarkAllAsRead}
          onDelete={onDeleteNotification}
        />
        <TapGame
          target={tapTarget}
          user={userForComponents}
          onTap={onTap}
          onLevelUp={onLevelUp}
          showCharacterCard={showCharacterCard}
        />
      </TabContent>

      <TabContent activeTab={activeTab} tabName="leaderboard">
        <Leaderboard users={[]} currentUser={userForComponents} />
      </TabContent>

      <TabContent activeTab={activeTab} tabName="store">
        <Store
          userCoins={Math.round(state.coins)}
          onPurchase={(item) => {
            onPurchase(item);
            user && analytics.trackPurchase(
              item.id, 
              item.name, 
              item.price, 
              item.category, 
              {
                discountPercent: item.discountPercent,
                isPermanent: item.isPermanent,
              }
            );
          }}
        />
      </TabContent>

      <TabContent activeTab={activeTab} tabName="profile">
        <Profile />
      </TabContent>

      <TabContent activeTab={activeTab} tabName="gifts">
        <Gifts />
      </TabContent>

      <Navigation 
        activeTab={activeTab} 
        onTabChange={onTabChange} 
        onToggleCharacterCard={onToggleCharacterCard} 
      />

      {showPurchaseNotification && lastPurchase && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-down">
          <p className="font-medium">Покупка успешна!</p>
          <p className="text-sm">{lastPurchase.name}</p>
        </div>
      )}

      {showMiniGame && (
        <NutCatcherGame
          onClose={() => {
            setShowMiniGame(false);
            user && analytics.trackGameEvent('nut-catcher-game', 'end', {
              closedFrom: activeTab,
              closeMethod: 'manual',
            });
          }}
          onEnergyEarned={handleEnergyEarned}
        />
      )}
    </>
  );
});

export default MainContent;