import React from 'react';
import { TrophyIcon, BoltIcon, Clock } from 'lucide-react';

interface GameStatsProps {
  score: number;
  energyEarned: number;
  timeLeft: number;
}

const GameStats: React.FC<GameStatsProps> = ({ score, energyEarned, timeLeft }) => {
  return (
    <div className="bg-[#1E1E2D] p-2 flex items-center justify-between text-sm border-b border-[#323248]">
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <TrophyIcon size={16} className="text-yellow-400 mr-1" />
          <span className="font-bold">Счет: <span className="text-yellow-400">{score}</span></span>
        </div>
        <div className="flex items-center">
          <BoltIcon size={16} className="text-blue-400 mr-1" />
          <span className="font-bold">Энергия: <span className="text-blue-400">+{energyEarned}</span></span>
        </div>
      </div>
      <div className="flex items-center">
        <Clock size={16} className="text-white mr-1" />
        <span className={`font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};

export default GameStats;