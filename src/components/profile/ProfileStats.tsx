import React from 'react';
import { CoinsIcon, BoltIcon, Award } from 'lucide-react';

interface ProfileStatsProps {
  coins: number;
  energy: number;
  maxEnergy: number;
}

const ProfileStats: React.FC<ProfileStatsProps> = ({ coins, energy, maxEnergy }) => {
  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="bg-[#252538] p-4 rounded-lg flex flex-col justify-center items-center shadow-lg">
        <CoinsIcon className="text-yellow-500 mb-2\" size={24} />
        <p className="text-sm text-gray-400 mb-1">МОНЕТЫ</p>
        <p className="text-xl font-bold text-yellow-500">{Math.round(coins)}</p>
      </div>
      
      <div className="bg-[#252538] p-4 rounded-lg flex flex-col justify-center items-center shadow-lg">
        <BoltIcon className="text-blue-500 mb-2" size={24} />
        <p className="text-sm text-gray-400 mb-1">ЭНЕРГИЯ</p>
        <p className="text-xl font-bold">
          {Math.round(energy)}<span className="text-gray-400 text-sm">/{maxEnergy}</span>
        </p>
      </div>
      
      <div className="bg-[#252538] p-4 rounded-lg flex flex-col justify-center items-center shadow-lg">
        <Award className="text-green-500 mb-2" size={24} />
        <p className="text-sm text-gray-400 mb-1">РАНГ</p>
        <p className="text-xl font-bold text-green-500">
          {Math.floor(coins/1000)} <span className="text-sm">★</span>
        </p>
      </div>
    </div>
  );
};

export default ProfileStats;