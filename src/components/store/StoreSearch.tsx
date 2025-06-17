import React from 'react';
import { SearchIcon } from 'lucide-react';

interface StoreSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const StoreSearch: React.FC<StoreSearchProps> = ({ searchQuery, onSearchChange }) => {
  return (
    <div className="relative mb-4">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Поиск товаров..."
        className="w-full py-2 px-4 pr-10 bg-[#252538] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
      />
      <SearchIcon size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
    </div>
  );
};

export default StoreSearch;