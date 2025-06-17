import React, { useState, useEffect, useCallback } from 'react';
import { StoreItem } from '../types';
import { storeService } from '../services/storeService';
import { useAuth } from '../contexts/AuthContext';
import NutCatcherGame from './games/NutCatcherGame';
import { useGame } from '../contexts/GameContext';
import { supabase } from '../lib/supabase';
import StoreHeader from './store/StoreHeader';
import InventorySection from './store/InventorySection';
import PromoBanner from './store/PromoBanner';
import StoreSearch from './store/StoreSearch';
import GamesSection from './store/GamesSection';
import ItemsSection from './store/ItemsSection';
import EmptyState from './store/EmptyState';
import PromoCodeModal from './store/PromoCodeModal';

// Импортируем компоненты из новой структуры


interface StoreProps {
  items?: StoreItem[];
  userCoins: number;
  onPurchase: (item: StoreItem) => void;
}

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
  const { user } = useAuth();
  const { dispatch } = useGame();
  
  // Состояние для игры
  const [showNutCatcherGame, setShowNutCatcherGame] = useState(false);
  const [hasNutCatcherGame, setHasNutCatcherGame] = useState(false);

  // Загрузка товаров при монтировании компонента
  useEffect(() => {
    const loadStoreItems = async () => {
      setIsLoading(true);
      try {
        // Получаем данные из Supabase
        const storeItems = await storeService.getStoreItems(false);
        setItems(storeItems);
        
        // Проверяем, куплена ли игра
        const hasGame = localStorage.getItem('hasNutCatcherGame') === 'true';
        setHasNutCatcherGame(hasGame);
        
        // Загружаем приобретенные товары
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

    // Подписываемся на изменения в таблице game_items
    const subscription = supabase
      .channel('store-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'game_items' 
        }, 
        async () => {
          console.log('Обнаружены изменения в таблице game_items');
          // При изменении данных обновляем список товаров
          const updatedItems = await storeService.refetchStoreItems();
          setItems(updatedItems);
        })
      .subscribe();
    
    // Отписываемся при размонтировании компонента
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);
  
  // Фильтрация товаров
  const filteredItems = items.filter(item => {
    // Фильтрация по категории
    const categoryMatch = filter === 'all' || item.category === filter;
    
    // Фильтрация по поисковому запросу
    const searchMatch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return categoryMatch && searchMatch;
  });
  
  // Группировка товаров по категориям
  // Изменено: в специальные предложения попадают только товары категории 'energy'
  const specialOffers = filteredItems.filter(item => item.category === 'energy');
  const regularItems = filteredItems.filter(item => item.category !== 'energy');
  
  // Функция для применения промо-кода
  const handleApplyPromoCode = async () => {
    if (!promoCode.trim() || !user) {
      return;
    }
    
    try {
      const result = await storeService.applyPromoCode(user.id, promoCode.trim());
      
      setPromoCodeMessage({
        type: result.success ? 'success' : 'error',
        text: result.message
      });
      
      if (result.success) {
        setPromoCode('');
      }
      
      // Сбрасываем сообщение через 3 секунды
      setTimeout(() => {
        setPromoCodeMessage(null);
      }, 3000);
    } catch (error) {
      setPromoCodeMessage({
        type: 'error',
        text: 'Произошла ошибка при применении промокода'
      });
    }
  };
  
  // Обработчик покупки
  const handlePurchase = useCallback((item: StoreItem) => {
    if (userCoins >= item.price) {
      // Стандартная логика покупки
      onPurchase(item);
      
      // Добавляем в список купленных товаров
      setPurchasedItems(prev => [...prev, item]);
      
      // Сохраняем в localStorage для неавторизованных пользователей
      if (!user) {
        localStorage.setItem('app:purchasedItems', JSON.stringify([...purchasedItems, item]));
      }
      
      // Специфичная логика для разных типов товаров
      if (item.name === 'ЛОВИТЕЛЬ ОРЕХОВ') {
        setHasNutCatcherGame(true);
        localStorage.setItem('hasNutCatcherGame', 'true');
      }
    }
  }, [userCoins, onPurchase, purchasedItems, user]);
  
  // Обработчик игровых вознаграждений
  const handleGameEnergyEarned = (amount: number) => {
    if (amount > 0) {
      // Начисляем энергию через контекст игры
      dispatch({ 
        type: 'REGEN_ENERGY', 
        payload: amount 
      });
    }
  };
  
  // Обработчик изменения фильтра
  const handleFilterChange = (newFilter: any) => {
    setFilter(newFilter);
  };

  // Принудительное обновление данных
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
    <div className="bg-gradient-to-b from-[#1a1625] to-[#0d0b12] min-h-screen p-4 pb-20 text-white">
      <div className="max-w-md mx-auto">
        {/* Шапка магазина с кнопкой инвентаря и отображением монет */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-yellow-500">МАГАЗИН</h1>
          <div className="flex items-center gap-2">
            <StoreHeader
              userCoins={userCoins} 
              showInventory={showInventory} 
              setShowInventory={setShowInventory} 
            />
          </div>
        </div>
        
        {/* Раздел инвентаря, отображается только когда showInventory=true */}
        {showInventory && (
          <InventorySection
            purchasedItems={purchasedItems}
            onPlayNutCatcherGame={() => setShowNutCatcherGame(true)}
          />
        )}

        {/* Баннер промо-акции */}
        <PromoBanner onShowPromoCode={() => setShowPromoCodeModal(true)} />

        {/* Строка поиска */}
        <StoreSearch 
          searchQuery={searchQuery} 
          onSearchChange={setSearchQuery} 
        />
        
  
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm">Найдено товаров: {filteredItems.length}</span>
          <span className="text-sm">Для: {items.length > 0 ? 'ЯСУКО' : 'Загрузка...'}</span>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Секция игр */}
            <GamesSection 
              hasNutCatcherGame={hasNutCatcherGame}
              userCoins={userCoins}
              onBuyGame={() => {
                // Ищем игру "Ловитель орехов" среди товаров
                const nutCatcherGame = items.find(item => item.name === 'ЛОВИТЕЛЬ ОРЕХОВ');
                if (nutCatcherGame) {
                  handlePurchase(nutCatcherGame);
                }
              }}
              onPlayGame={() => setShowNutCatcherGame(true)}
              isVisible={(filter === 'all' || filter === 'games')}
            />
            
            {/* Специальные предложения */}
            <ItemsSection
              title="СПЕЦИАЛЬНЫЕ ПРЕДЛОЖЕНИЯ"
              items={specialOffers}
              userCoins={userCoins}
              onPurchase={handlePurchase}
            />
            
            {/* Обычные товары */}
            <ItemsSection 
              title="ТОВАРЫ"
              items={regularItems}
              userCoins={userCoins}
              onPurchase={handlePurchase}
            />
            
            {/* Сообщение, если ничего не найдено */}
            <EmptyState isVisible={filteredItems.length === 0} />
          </>
        )}
      </div>
      
      {/* Модальное окно для промокода */}
      {showPromoCodeModal && (
        <PromoCodeModal 
          promoCode={promoCode}
          setPromoCode={setPromoCode}
          promoCodeMessage={promoCodeMessage}
          onApply={handleApplyPromoCode}
          onClose={() => {
            setShowPromoCodeModal(false);
            setPromoCode('');
            setPromoCodeMessage(null);
          }}
        />
      )}
      
      {/* Модальное окно с игрой */}
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