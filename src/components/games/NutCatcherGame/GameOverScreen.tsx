import React from 'react';

interface GameOverScreenProps {
  score: number;
  energyEarned: number;
  highScore: number;
  onRestart: () => void;
  onExit: () => void;
  canPlay: boolean;
  timeToReset: string;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ 
  score, 
  energyEarned, 
  highScore, 
  onRestart, 
  onExit,
  canPlay,
  timeToReset
}) => {
  return (
    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-6 z-20 overflow-auto">
      <h2 className="text-2xl font-bold text-yellow-500 mb-4">ИГРА ОКОНЧЕНА</h2>
      
      <div className="bg-[#252538] p-4 rounded-lg w-full max-w-xs mb-6 shadow-xl">
        <div className="flex justify-between items-center mb-2">
          <span>Счет:</span>
          <span className="font-bold text-yellow-400">{score}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span>Энергия:</span>
          <span className="font-bold text-blue-400">+{energyEarned}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Рекорд:</span>
          <span className="font-bold">{highScore}</span>
        </div>
      </div>
      
      <div className="flex flex-col space-y-3 mb-4 w-full max-w-xs">
        <button 
          onClick={onRestart}
          disabled={!canPlay}
          className={`px-6 py-2 ${canPlay ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-600'} text-black rounded-lg font-bold transition-colors`}
        >
          {canPlay ? 'ИГРАТЬ СНОВА' : 'ЛИМИТ ИГР ИСЧЕРПАН'}
        </button>
        
        <button 
          onClick={onExit}
          className="px-6 py-2 bg-[#323248] hover:bg-[#3d3d58] text-white rounded-lg transition-colors"
        >
          ВЫЙТИ
        </button>
      </div>
      
      {!canPlay && (
        <div className="w-full max-w-xs bg-[#2a2a40] p-3 rounded-lg">
          <p className="text-yellow-400 text-sm mb-2">
            Вы достигли дневного лимита игр (3 игры).
          </p>
          <p className="text-sm text-gray-300">
            Сброс лимита через: <span className="font-bold">{timeToReset}</span>
          </p>
        </div>
      )}
      
      {score > highScore && (
        <div className="mt-4 text-yellow-500 font-bold animate-pulse">
          🎉 Новый рекорд! 🎉
        </div>
      )}
    </div>
  );
};

export default GameOverScreen;