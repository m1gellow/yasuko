import React from 'react';
import { PackageIcon } from 'lucide-react';
import InventoryItem from './InventoryItem';
import { StoreItem } from '../../types';

interface InventorySectionProps {
  purchasedItems: StoreItem[];
  onPlayNutCatcherGame: () => void;
}

const InventorySection: React.FC<InventorySectionProps> = ({ purchasedItems, onPlayNutCatcherGame }) => {
  return (
    <div className="bg-[#252538] rounded-lg p-4 mb-4">
      <h2 className="font-bold mb-3 flex items-center">
        <PackageIcon size={18} className="text-yellow-500 mr-2" />
        ПРИОБРЕТЕННЫЕ ТОВАРЫ
      </h2>
      
      {purchasedItems.length > 0 ? (
        <div className="space-y-3">
          {purchasedItems.map((item) => (
            <InventoryItem 
              key={item.id} 
              item={item}
              onPlay={item.id === 'nut-catcher-game' ? onPlayNutCatcherGame : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400">
          <p>У вас пока нет приобретенных товаров</p>
        </div>
      )}
    </div>
  );
};

export default InventorySection;