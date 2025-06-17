import React from 'react';

interface StoreCategoriesProps {
  activeFilter: 'all' | 'top10' | 'online' | 'yasuko' | 'fishko' | 'food' | 'boosters' | 'accessories' | 'games';
  onFilterChange: (filter: any) => void;
}

const StoreCategories: React.FC<StoreCategoriesProps> = ({ activeFilter, onFilterChange }) => {
  const categories = [
    { id: 'all', label: 'ВСЕ', icon: '📦' },
    { id: 'games', label: 'ИГРЫ', icon: '🎮' },
    { id: 'food', label: 'ЕДА', icon: '🍎' },
    { id: 'boosters', label: 'БУСТЫ', icon: '⚡' },
    { id: 'accessories', label: 'АКСЕССУАРЫ', icon: '🌴' },
  ];
  
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {categories.map(category => (
        <button 
          key={category.id}
          className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
            activeFilter === category.id ? 'bg-yellow-500 text-black' : 'bg-[#252538] text-white'
          }`}
          onClick={() => onFilterChange(category.id)}
        >
          <span className="mr-1">{category.icon}</span> {category.label}
        </button>
      ))}
    </div>
  );
};

export default StoreCategories;