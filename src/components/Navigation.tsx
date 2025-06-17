import React, { useState, useEffect } from 'react';
import { HomeIcon, TrophyIcon, ShoppingBagIcon, UserIcon, RefreshCwIcon } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { useTelegram } from '../contexts/TelegramContext';
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/gameService';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onToggleCharacterCard: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, onToggleCharacterCard }) => {
  const { state, dispatch } = useGame();
  const { telegram } = useTelegram();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Отслеживание прокрутки для скрытия/показа навигации
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);
  
  const handleToggleCharacter = () => {
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    dispatch({ type: 'TOGGLE_CHARACTER' });
  };
  
  const handleToggleCard = () => {
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    // Отслеживание действия переключения карточки персонажа
    if (user) {
      gameService.trackUserAction(user.id, 'toggle_character_card', { 
        timestamp: new Date().toISOString(),
        character_type: state.characterType
      });
    }
    
    onToggleCharacterCard();
  };
  
  const handleTabChange = (tab: string) => {
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    // Отслеживание действия навигации
    if (user) {
      gameService.trackUserAction(user.id, 'navigation', { 
        from_tab: activeTab,
        to_tab: tab,
        timestamp: new Date().toISOString()
      });
    }
    
    // Изменяем состояние активного таба через родительский компонент
    onTabChange(tab);
    
    // Навигация на соответствующую страницу
    switch (tab) {
      case 'game':
        navigate('/');
        break;
      case 'leaderboard':
        navigate('/leaderboard');
        break;
      case 'store':
        navigate('/store');
        break;
      case 'profile':
        navigate('/profile');
        break;
      case 'gifts':
        navigate('/gifts');
        break;
    }
  };
  
  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 bg-[#1A1A27]/90 backdrop-blur-lg border-t border-[#2D2D3F] transition-transform duration-300 z-50 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="max-w-lg mx-auto relative flex justify-around items-center px-4 py-2">
        <button 
          className={`flex flex-col items-center justify-center w-16 pt-1 pb-1 ${activeTab === 'game' ? 'text-yellow-500' : 'text-gray-400'}`}
          onClick={() => handleTabChange('game')}
        >
          <HomeIcon size={20} />
          <span className="text-xs mt-1">Ясуко</span>
        </button>
        
        <button 
          className={`flex flex-col items-center justify-center w-16 pt-1 pb-1 ${activeTab === 'leaderboard' ? 'text-yellow-500' : 'text-gray-400'}`}
          onClick={() => handleTabChange('leaderboard')}
        >
          <TrophyIcon size={20} />
          <span className="text-xs mt-1">Топ</span>
        </button>
        
        <div className="relative w-16 flex justify-center">
          <button 
            className={`absolute -top-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
              state.characterType === 'yasuko' ? 'bg-yellow-500' : 'bg-blue-500'
            } ${activeTab === 'game' ? 'border-2 border-white' : ''}`}
            onClick={handleToggleCard}
          >
            <RefreshCwIcon size={24} className="text-[#1A1A27]" />
          </button>
        </div>
        
        <button 
          className={`flex flex-col items-center justify-center w-16 pt-1 pb-1 ${activeTab === 'store' ? 'text-yellow-500' : 'text-gray-400'}`}
          onClick={() => handleTabChange('store')}
        >
          <ShoppingBagIcon size={20} />
          <span className="text-xs mt-1">Магазин</span>
        </button>
        
        <button 
          className={`flex flex-col items-center justify-center w-16 pt-1 pb-1 ${activeTab === 'profile' ? 'text-yellow-500' : 'text-gray-400'}`}
          onClick={() => handleTabChange('profile')}
        >
          <UserIcon size={20} />
          <span className="text-xs mt-1">Профиль</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;