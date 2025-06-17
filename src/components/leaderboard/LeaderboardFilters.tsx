import React from 'react';

interface LeaderboardFiltersProps {
  activeFilter: 'all' | 'top10' | 'online' | 'yasuko' | 'fishko';
  onFilterChange: (filter: 'all' | 'top10' | 'online' | 'yasuko' | 'fishko') => void;
}

const LeaderboardFilters: React.FC<LeaderboardFiltersProps> = ({ 
  activeFilter, 
  onFilterChange 
}) => {
  return (
    <div className="mb-4">
      <p className="text-gray-400 mb-2">ФИЛЬТРЫ</p>
      <div className="flex flex-wrap gap-2 mb-2">
        <button 
          className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
            activeFilter === 'all' ? 'bg-yellow-500 text-black' : 'bg-[#252538] text-white'
          }`}
          onClick={() => onFilterChange('all')}
        >
          Все игроки
        </button>
        <button 
          className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
            activeFilter === 'top10' ? 'bg-yellow-500 text-black' : 'bg-[#252538] text-white'
          }`}
          onClick={() => onFilterChange('top10')}
        >
          Топ-10
        </button>
        <button 
          className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
            activeFilter === 'online' ? 'bg-yellow-500 text-black' : 'bg-[#252538] text-white'
          }`}
          onClick={() => onFilterChange('online')}
        >
          Онлайн
        </button>
        <button 
          className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
            activeFilter === 'yasuko' ? 'bg-yellow-500 text-black' : 'bg-[#252538] text-white'
          }`}
          onClick={() => onFilterChange('yasuko')}
        >
          С Ясуко
        </button>
        <button 
          className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
            activeFilter === 'fishko' ? 'bg-yellow-500 text-black' : 'bg-[#252538] text-white'
          }`}
          onClick={() => onFilterChange('fishko')}
        >
          С Фишко
        </button>
      </div>
    </div>
  );
};

export default LeaderboardFilters;