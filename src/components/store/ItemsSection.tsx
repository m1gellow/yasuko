import React from 'react';
import { TagIcon } from 'lucide-react';
import StoreItemCard from './StoreItemCard';
import { StoreItem } from '../../types';

interface ItemsSectionProps {
  title: string;
  items: StoreItem[];
  userCoins: number;
  onPurchase: (item: StoreItem) => void;
}

const ItemsSection: React.FC<ItemsSectionProps> = ({ 
  title, 
  items, 
  userCoins, 
  onPurchase 
}) => {
  if (items.length === 0) return null;
  
  return (
    <div className="mb-4">
      <div className="flex items-center mb-3">
        {title === "СПЕЦИАЛЬНЫЕ ПРЕДЛОЖЕНИЯ" ? (
          <TagIcon className="text-yellow-500 mr-2" size={16} />
        ) : null}
        <h3 className="font-bold">{title}</h3>
      </div>
      
      <div className="space-y-4">
        {items.map((item) => (
          <StoreItemCard
            key={item.id}
            item={item}
            userCoins={userCoins}
            onPurchase={onPurchase}
          />
        ))}
      </div>
    </div>
  );
};

export default ItemsSection;