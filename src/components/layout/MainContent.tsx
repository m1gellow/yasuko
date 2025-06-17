import React, { memo, useEffect, useState } from 'react';
import Header from '../Header';
import TapGame from '../TapGame';
import Leaderboard from '../Leaderboard';
import Store from '../Store';
import Profile from '../Profile';
import Gifts from '../Gifts';
import Navigation from '../Navigation';
import { TapTarget, StoreItem, User } from '../../types';
import { GameState } from '../../contexts/GameContext';
import NutCatcherGame from '../games/NutCatcherGame';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useLocation, useNavigate } from 'react-router-dom';

interface MainContentProps {
  activeTab: string;
  user: User | null;
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  state: GameState;
  tapTarget: TapTarget;
  onRefillEnergy: () => void;
  onTap: (points: number) => void;
  onLevelUp: () => void;
  showCharacterCard: boolean;
  getRecommendations: () => any[];
  onPurchase: (item: StoreItem) => void;
  onTabChange: (tab: string) => void;
  onToggleCharacterCard: () => void;
  showPurchaseNotification: boolean;
  lastPurchase: StoreItem | null;
  isTapAnimationActive: boolean;
}

const MainContent: React.FC<MainContentProps> = memo(({
  activeTab,
  user,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  state,
  tapTarget,
  onRefillEnergy,
  onTap,
  onLevelUp,
  showCharacterCard,
  onPurchase,
  onTabChange,
  onToggleCharacterCard,
  showPurchaseNotification,
  lastPurchase,
  isTapAnimationActive
}) => {
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [prevTab, setPrevTab] = useState(activeTab);
  const analytics = useAnalytics();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Преобразуем данные пользователя в формат, ожидаемый другими компонентами
  const userForComponents = user ? {
    ...user,
    id: user.id,
    name: user.name,
    username: user.phone || "guest",
    level: state.level.current,
    energy: {
      current: Math.round(state.energy.current), // округляем энергию
      max: state.energy.max,
      replenishRate: state.energy.regenRate
    },
    score: Math.round(state.coins), // округляем монеты
    rating: state.progress.current,
    maxRating: state.progress.required,
    items: [],
    achievements: [],
    lastActive: new Date(),
    dailyLoginDay: 1,
    position: user.position
  } : {
    id: "guest",
    name: "Гость",
    username: "guest",
    level: state.level.current,
    energy: {
      current: Math.round(state.energy.current), // округляем энергию
      max: state.energy.max,
      replenishRate: state.energy.regenRate
    },
    score: Math.round(state.coins), // округляем монеты
    rating: state.progress.current,
    maxRating: state.progress.required,
    items: [],
    achievements: [],
    lastActive: new Date(),
    dailyLoginDay: 1,
    position: 0
  };
  
  // Устанавливаем заголовок вкладки в зависимости от текущей страницы
  React.useEffect(() => {
    let pageTitle = 'Ясуко - Интерактивная игра-тамагочи';
    
    switch(activeTab) {
      case 'game':
        pageTitle = 'Ясуко - Главная';
        break;
      case 'leaderboard':
        pageTitle = 'Ясуко - Рейтинг';
        break;
      case 'store':
        pageTitle = 'Ясуко - Магазин';
        break;
      case 'profile':
        pageTitle = 'Ясуко - Профиль';
        break;
      case 'gifts':
        pageTitle = 'Ясуко - Подарки';
        break;
    }
    
    document.title = pageTitle;
  }, [activeTab]);
  
  // Синхронизируем активный таб с текущим URL-маршрутом
  useEffect(() => {
    const path = location.pathname;
    let newActiveTab = activeTab;
    
    if (path === '/') {
      newActiveTab = 'game';
    } else if (path === '/leaderboard') {
      newActiveTab = 'leaderboard';
    } else if (path === '/store') {
      newActiveTab = 'store';
    } else if (path === '/profile') {
      newActiveTab = 'profile';
    } else if (path === '/gifts') {
      newActiveTab = 'gifts';
    }
    
    if (newActiveTab !== activeTab) {
      onTabChange(newActiveTab);
    }
  }, [location.pathname, activeTab, onTabChange]);
  
  // Отслеживание изменения вкладки для аналитики
  useEffect(() => {
    if (prevTab !== activeTab && user) {
      analytics.trackNavigation(prevTab, activeTab, {
        characterLevel: state.level.current,
        characterType: state.characterType,
        energyStatus: `${Math.round(state.energy.current)}/${state.energy.max}`,
        isCharacterCardVisible: showCharacterCard
      });
      setPrevTab(activeTab);
    }
  }, [activeTab, user, prevTab, analytics, state.level.current, state.characterType, state.energy.current, state.energy.max, showCharacterCard]);
  
  // Отслеживание загрузки страницы
  useEffect(() => {
    if (user) {
      analytics.trackPageView(activeTab, '', {
        characterLevel: state.level.current,
        characterType: state.characterType,
        userRank: user.position || 0
      });
    }
  }, [user, activeTab, analytics, state.level.current, state.characterType]);
  
  // Слушаем кастомное событие для открытия мини-игры
  useEffect(() => {
    const handleOpenMiniGame = () => {
      setShowMiniGame(true);
      if (user) {
        analytics.trackGameEvent('nut-catcher-game', 'start', {
          openedFrom: activeTab,
          openMethod: 'event'
        });
      }
    };
    
    window.addEventListener('open-mini-game', handleOpenMiniGame);
    
    return () => {
      window.removeEventListener('open-mini-game', handleOpenMiniGame);
    };
  }, [activeTab, analytics, user]);
  
  // Обработчик получения энергии из мини-игры
  const handleEnergyEarned = (amount: number) => {
    if (amount > 0) {
      onRefillEnergy();
      if (user) {
        analytics.trackAction('energy_earned', {
          source: 'mini_game',
          amount,
          gameId: 'nut-catcher-game'
        });
      }
    }
  };

  return (
    <>
      {activeTab === 'game' && (
        <>
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
        </>
      )}
      
      {activeTab === 'leaderboard' && (
        <Leaderboard 
          users={[]} // Данные загружаются внутри компонента
          currentUser={userForComponents} 
        />
      )}
      
      {activeTab === 'store' && (
        <Store 
          userCoins={Math.round(state.coins)} // округляем монеты
          onPurchase={(item) => {
            onPurchase(item);
            if (user) {
              analytics.trackPurchase(
                item.id, 
                item.name, 
                item.price, 
                item.category, 
                { discountPercent: item.discountPercent, isPermanent: item.isPermanent }
              );
            }
          }} 
        />
      )}
      
      {activeTab === 'profile' && (
        <Profile />
      )}
      
      {activeTab === 'gifts' && (
        <Gifts />
      )}
      
      <Navigation 
        activeTab={activeTab} 
        onTabChange={onTabChange} 
        onToggleCharacterCard={onToggleCharacterCard}
      />
      
      {/* Purchase notification */}
      {showPurchaseNotification && lastPurchase && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-down">
          <p className="font-medium">Покупка успешна!</p>
          <p className="text-sm">{lastPurchase.name}</p>
        </div>
      )}
      
      {/* Мини-игра */}
      {showMiniGame && (
        <NutCatcherGame
          onClose={() => {
            setShowMiniGame(false);
            if (user) {
              analytics.trackGameEvent('nut-catcher-game', 'end', {
                closedFrom: activeTab,
                closeMethod: 'manual'
              });
            }
          }}
          onEnergyEarned={handleEnergyEarned}
        />
      )}
    </>
  );
});

export default MainContent;