import React from 'react';
import { ShoppingCartIcon, PackageIcon } from 'lucide-react';

interface StoreHeaderProps {
  userCoins: number;
  showInventory: boolean;
  setShowInventory: (show: boolean) => void;
}

const StoreHeader: React.FC<StoreHeaderProps> = ({ userCoins, showInventory, setShowInventory }) => {
  return (
    <div className="flex items-center space-x-3">
      <button
        onClick={() => setShowInventory(!showInventory)}
        className={`px-3 py-1 rounded-full text-sm ${
          showInventory ? 'bg-yellow-500 text-black' : 'bg-[#252538] text-white'
        }`}
      >
        <PackageIcon size={16} className="inline mr-1" />
        Инвентарь
      </button>
      <div className="flex items-center">
        <ShoppingCartIcon size={16} className="text-yellow-500 mr-1" />
        <span className="text-yellow-500 font-bold">{userCoins} МОН</span>
      </div>
    </div>
  );
};

export default StoreHeader;