import React from 'react';
import { ClockIcon, GamepadIcon } from 'lucide-react';
import { StoreItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { gameService } from '../../services/gameService';

interface StoreItemCardProps {
  item: StoreItem;
  userCoins: number;
  onPurchase: (item: StoreItem) => void;
}

const StoreItemCard: React.FC<StoreItemCardProps> = ({ item, userCoins, onPurchase }) => {
  const { user } = useAuth();

  const handlePurchase = () => {
    // Проверяем, хватает ли монет
    if (userCoins < item.price) {
      // Если монет не хватает, отслеживаем неудачную попытку покупки
      if (user) {
        gameService.trackUserAction(user.id, 'purchase_attempt_failed', {
          item_id: item.id,
          item_name: item.name,
          item_price: item.price,
          item_category: item.category,
          user_coins: userCoins,
          coins_needed: item.price - userCoins,
          timestamp: new Date().toISOString()
        });
      }
      return;
    }

    // Если монет хватает, отслеживаем покупку
    if (user) {
      gameService.trackUserAction(user.id, 'purchase_item', {
        item_id: item.id,
        item_name: item.name,
        item_price: item.price,
        item_category: item.category,
        user_coins_before: userCoins,
        user_coins_after: userCoins - item.price,
        timestamp: new Date().toISOString()
      });
    }
    
    // Выполняем покупку
    onPurchase(item);
  };

  // Отслеживаем просмотр товара
  React.useEffect(() => {
    if (user) {
      gameService.trackUserAction(user.id, 'view_item', {
        item_id: item.id,
        item_name: item.name,
        item_price: item.price,
        item_category: item.category,
        has_discount: !!item.discountPercent,
        timestamp: new Date().toISOString()
      });
    }
  }, [item, user]);

  return (
    <div className="bg-[#252538] rounded-lg overflow-hidden">
      <div className="p-3">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-bold">{item.name}</h4>
          {item.discountPercent && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">
              -{item.discountPercent}%
            </span>
          )}
          {item.isNew && (
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
              НОВИНКА
            </span>
          )}
        </div>
        
        <div className="flex">
          <div className="w-14 h-14 bg-[#323248] rounded flex items-center justify-center mr-3">
            {item.category === 'energy' && <span className="text-3xl">⚡</span>}
            {item.category === 'food' && <span className="text-3xl">🍎</span>}
            {item.category === 'boosters' && <span className="text-3xl">🚀</span>}
            {item.category === 'accessories' && <span className="text-3xl">🌴</span>}
            {item.category === 'games' && <GamepadIcon size={28} className="text-blue-400" />}
          </div>
          
          <div className="flex-grow">
            <p className="text-sm text-gray-300 mb-2">{item.description}</p>
            
            {item.duration && (
              <div className="flex items-center text-xs text-gray-400 mb-1">
                <ClockIcon size={12} className="mr-1" />
                <span>{item.duration}</span>
              </div>
            )}
            
            {item.isPermanent && (
              <div className="flex items-center text-xs text-green-400 mb-1">
                <span>✓ Навсегда</span>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <div>
                {item.originalPrice && (
                  <span className="text-gray-400 line-through text-sm mr-2">
                    {item.originalPrice} МОН
                  </span>
                )}
                <span className="text-yellow-500 font-bold">{item.price} МОН</span>
              </div>
              
              <button 
                className={`px-4 py-1 rounded font-medium ${
                  userCoins >= item.price 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
                onClick={handlePurchase}
                disabled={userCoins < item.price}
              >
                КУПИТЬ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreItemCard;