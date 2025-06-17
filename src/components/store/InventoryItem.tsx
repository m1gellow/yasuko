import React from 'react';
import { GamepadIcon } from 'lucide-react';
import { StoreItem } from '../../types';

interface InventoryItemProps {
  item: StoreItem;
  onPlay?: () => void;
}

const InventoryItem: React.FC<InventoryItemProps> = ({ item, onPlay }) => {
  return (
    <div className="bg-[#323248] rounded-lg p-3 flex items-center">
      <div className="w-10 h-10 bg-[#252538] rounded flex items-center justify-center mr-3">
        {item.category === 'energy' && <span className="text-xl">⚡</span>}
        {item.category === 'food' && <span className="text-xl">🍎</span>}
        {item.category === 'boosters' && <span className="text-xl">🚀</span>}
        {item.category === 'accessories' && <span className="text-xl">🌴</span>}
        {item.category === 'games' && <GamepadIcon size={20} className="text-blue-400" />}
      </div>
      <div className="flex-grow">
        <p className="font-medium">{item.name}</p>
        <p className="text-xs text-gray-400">{item.description}</p>
      </div>
      
      {item.category === 'games' && item.id === 'nut-catcher-game' && onPlay && (
        <button
          onClick={onPlay}
          className="ml-auto bg-green-500 text-white px-3 py-1 rounded text-sm"
        >
          Играть
        </button>
      )}
    </div>
  );
};

export default InventoryItem;