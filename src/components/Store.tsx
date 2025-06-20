import React, { useState, useEffect, useCallback } from 'react';
import { StoreItem } from '../types';
import { storeService } from '../services/storeService';
import { useAuth } from '../contexts/AuthContext';
import NutCatcherGame from './games/NutCatcherGame';
import { useGame } from '../contexts/GameContext';
import { supabase } from '../lib/supabase';
import { useTelegram } from '../contexts/TelegramContext';
import { 
  Bitcoin, 
  Gift, 
  Search, 
  ShoppingCart,
  Zap, // для энергии
  Heart, // для здоровья
  Smile, // для настроения
  Apple, // для еды
  Shield, // для защиты
  Wand2, // для бустеров
  Gamepad, // для игр
  Gem // для премиум-товаров
} from 'lucide-react';

// Функция для получения иконки по категории товара
const getCategoryIcon = (category: string) => {
  switch(category) {
    case 'energy':
      return <Zap className="text-yellow-400" size={18} />;
    case 'health':
      return <Heart className="text-red-400" size={18} />;
    case 'mood':
      return <Smile className="text-green-400" size={18} />;
    case 'food':
      return <Apple className="text-orange-400" size={18} />;
    case 'protection':
      return <Shield className="text-blue-400" size={18} />;
    case 'boosters':
      return <Wand2 className="text-purple-400" size={18} />;
    case 'games':
      return <Gamepad className="text-pink-400" size={18} />;
    case 'premium':
      return <Gem className="text-teal-400" size={18} />;
    default:
      return <ShoppingCart className="text-gray-400" size={18} />;
  }
};

const Store: React.FC<StoreProps> = ({ userCoins, onPurchase }) => {
  const [filter, setFilter] = useState<'all' | 'food' | 'boosters' | 'accessories' | 'games'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<StoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPromoCodeModal, setShowPromoCodeModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeMessage, setPromoCodeMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState<StoreItem[]>([]);
  const [showNutCatcherGame, setShowNutCatcherGame] = useState(false);
  const [hasNutCatcherGame, setHasNutCatcherGame] = useState(false);
  
  const { user } = useAuth();
  const { dispatch } = useGame();
  const { telegram } = useTelegram();

  useEffect(() => {
    const loadStoreItems = async () => {
      setIsLoading(true);
      try {
        const storeItems = await storeService.getStoreItems(false);
        setItems(storeItems);
        
        const hasGame = localStorage.getItem('hasNutCatcherGame') === 'true';
        setHasNutCatcherGame(hasGame);
        
        if (user) {
          const purchased = await storeService.getPurchasedItems(user.id);
          setPurchasedItems(purchased);
        } else {
          const localPurchased = localStorage.getItem('app:purchasedItems');
          if (localPurchased) {
            setPurchasedItems(JSON.parse(localPurchased));
          }
        }
      } catch (error) {
        console.error('Error loading store items:', error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStoreItems();

    const subscription = supabase
      .channel('store-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'game_items' 
        }, 
        async () => {
          const updatedItems = await storeService.refetchStoreItems();
          setItems(updatedItems);
        })
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);
  
  const filteredItems = items.filter(item => {
    const categoryMatch = filter === 'all' || item.category === filter;
    const searchMatch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return categoryMatch && searchMatch;
  });
  
  const specialOffers = filteredItems.filter(item => item.category === 'energy');
  const regularItems = filteredItems.filter(item => item.category !== 'energy');
  
  const handleApplyPromoCode = async () => {
    if (!promoCode.trim() || !user) return;
    
    try {
      const result = await storeService.applyPromoCode(user.id, promoCode.trim());
      
      setPromoCodeMessage({
        type: result.success ? 'success' : 'error',
        text: result.message
      });
      
      if (result.success) setPromoCode('');
      
      setTimeout(() => setPromoCodeMessage(null), 3000);
    } catch (error) {
      setPromoCodeMessage({
        type: 'error',
        text: 'Произошла ошибка при применении промокода'
      });
    }
  };
  
  const handlePurchase = useCallback((item: StoreItem) => {
    if (userCoins >= item.price) {
      onPurchase(item);
      setPurchasedItems(prev => [...prev, item]);
      
      if (!user) {
        localStorage.setItem('app:purchasedItems', JSON.stringify([...purchasedItems, item]));
      }
      
      if (item.name === 'ЛОВИТЕЛЬ ОРЕХОВ') {
        setHasNutCatcherGame(true);
        localStorage.setItem('hasNutCatcherGame', 'true');
      }
    }
  }, [userCoins, onPurchase, purchasedItems, user]);
  
  const handleGameEnergyEarned = (amount: number) => {
    if (amount > 0) {
      dispatch({ type: 'REGEN_ENERGY', payload: amount });
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const refreshedItems = await storeService.refetchStoreItems();
      setItems(refreshedItems);
    } catch (error) {
      console.error('Ошибка при обновлении товаров:', error);
    } finally {
      setIsLoading(false);
    }
  };

return (
    <div className="flex flex-col items-center justify-center py-4 relative bg-[#1E1E2D] min-h-screen">
      {/* Header with coins */}
      <div className="w-full max-w-md mb-4 px-4">
        <div className="flex justify-between items-center w-full bg-purple-900/50 p-3 rounded-lg shadow-lg">
          <div className="flex flex-col items-start">
            <p className="text-white text-sm font-bold">МАГАЗИН</p>
            <button 
              className={`mt-1 text-sm ${showInventory ? 'text-yellow-400' : 'text-gray-400'}`}
              onClick={() => setShowInventory(!showInventory)}
            >
              {showInventory ? 'ТОВАРЫ' : 'ИНВЕНТАРЬ'}
            </button>
          </div>
          
          <div className="flex justify-center items-center">
            <p className="text-white text-sm flex flex-col">
              БАЛАНС: <span className="text-yellow-500 flex flex-row items-center justify-center font-bold text-xl">
                {userCoins} <Bitcoin size={18} className="ml-1" />
              </span>
            </p>
          </div>
          
          <div className="flex flex-col items-end">
            <button 
              className="text-sm text-white bg-purple-600 px-3 py-1 rounded-lg"
              onClick={() => setShowPromoCodeModal(true)}
            >
              ПРОМОКОД
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-row items-center justify-center w-full px-4 relative">
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto relative">
          {/* Inventory section */}
          {showInventory && (
            <div className="w-full mb-6 bg-gradient-to-br from-[#1a1538] to-[#0f0c1d] rounded-xl p-4 border border-purple-500/30 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                <ShoppingCart className="mr-2 text-yellow-400" size={20} />
                ВАШ ИНВЕНТАРЬ
              </h3>
              
              {hasNutCatcherGame && (
                <div className="bg-[#1E1E2D]/80 p-3 rounded-lg mb-3 border border-yellow-500/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-white">ЛОВИТЕЛЬ ОРЕХОВ</h4>
                      <p className="text-xs text-gray-400">Игра для заработка энергии</p>
                    </div>
                    <button 
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 rounded-lg text-sm"
                      onClick={() => setShowNutCatcherGame(true)}
                    >
                      ИГРАТЬ
                    </button>
                  </div>
                </div>
              )}
              
              {purchasedItems.length === 0 && (
                <div className="text-center py-4 text-gray-400">
                  Ваш инвентарь пуст
                </div>
              )}
            </div>
          )}

          {/* Search */}
          <div className="w-full mb-4 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Поиск товаров..."
                className="w-full bg-[#1A1A27] text-white pl-10 pr-4 py-2 rounded-lg border border-purple-500/30 focus:border-purple-500/50 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Promo banner */}
          <div 
            className="w-full mb-6 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-xl p-4 border border-purple-500/30 cursor-pointer hover:border-purple-500/50 transition-all"
            onClick={() => setShowPromoCodeModal(true)}
          >
            <div className="flex items-center">
              <Gift className="text-yellow-400 mr-3" size={24} />
              <div>
                <h3 className="font-bold text-white">АКТИВИРУЙТЕ ПРОМОКОД</h3>
                <p className="text-sm text-gray-300">Получите бонусные монеты</p>
              </div>
            </div>
          </div>

          {/* Items list */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="w-full space-y-4">
          {/* Special offers */}
          {specialOffers.length > 0 && (
            <div className="bg-gradient-to-br from-[#1a1538] to-[#0f0c1d] rounded-xl p-4 border border-purple-500/30 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-3">СПЕЦИАЛЬНЫЕ ПРЕДЛОЖЕНИЯ</h3>
              <div className="space-y-3">
                {specialOffers.map(item => (
                  <div key={item.id} className="bg-[#1E1E2D]/80 p-3 rounded-lg border border-purple-500/20">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start">
                        <div className="mr-3 mt-1">
                          {getCategoryIcon(item.category)}
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{item.name}</h4>
                          <p className="text-xs text-gray-400">{item.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-yellow-400 font-bold flex items-center">
                          {item.price} <Bitcoin size={14} className="ml-1" />
                        </span>
                        <button 
                          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-lg text-sm mt-2 disabled:opacity-50"
                          onClick={() => handlePurchase(item)}
                          disabled={userCoins < item.price}
                        >
                          КУПИТЬ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

              {/* Regular items */}
          {regularItems.length > 0 && (
            <div className="bg-gradient-to-br from-[#1a1538] to-[#0f0c1d] rounded-xl p-4 border border-purple-500/30 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-3">ТОВАРЫ</h3>
              <div className="space-y-3">
                {regularItems.map(item => (
                  <div key={item.id} className="bg-[#1E1E2D]/80 p-3 rounded-lg border border-purple-500/20">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start">
                        <div className="mr-3 mt-1">
                          {getCategoryIcon(item.category)}
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{item.name}</h4>
                          <p className="text-xs text-gray-400">{item.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-yellow-400 font-bold flex items-center">
                          {item.price} <Bitcoin size={14} className="ml-1" />
                        </span>
                        <button 
                          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-lg text-sm mt-2 disabled:opacity-50"
                          onClick={() => handlePurchase(item)}
                          disabled={userCoins < item.price}
                        >
                          КУПИТЬ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
              {/* Empty state */}
              {filteredItems.length === 0 && !isLoading && (
                <div className="bg-gradient-to-br from-[#1a1538] to-[#0f0c1d] rounded-xl p-6 text-center border border-purple-500/30">
                  <ZapIcon className="mx-auto text-purple-500 mb-2" size={24} />
                  <p className="text-gray-400">Товары не найдены</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showPromoCodeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#1a1538] to-[#0f0c1d] rounded-xl p-6 w-full max-w-md border border-purple-500/30 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4">АКТИВАЦИЯ ПРОМОКОДА</h3>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Введите промокод"
                className="w-full bg-[#1A1A27] text-white px-4 py-2 rounded-lg border border-purple-500/30 focus:border-purple-500/50 focus:outline-none"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              {promoCodeMessage && (
                <p className={`mt-2 text-sm ${promoCodeMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {promoCodeMessage.text}
                </p>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium"
                onClick={handleApplyPromoCode}
              >
                АКТИВИРОВАТЬ
              </button>
              <button
                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
                onClick={() => {
                  setShowPromoCodeModal(false);
                  setPromoCodeMessage(null);
                }}
              >
                ОТМЕНА
              </button>
            </div>
          </div>
        </div>
      )}

      {showNutCatcherGame && (
        <NutCatcherGame
          onClose={() => setShowNutCatcherGame(false)}
          onEnergyEarned={handleGameEnergyEarned}
        />
      )}
    </div>
  );
};

export default Store;