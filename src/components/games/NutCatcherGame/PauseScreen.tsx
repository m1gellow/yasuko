import React from 'react';

interface PauseScreenProps {
  onResume: () => void;
  onExit: () => void;
}

const PauseScreen: React.FC<PauseScreenProps> = ({ onResume, onExit }) => {
  return (
    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
      <h2 className="text-2xl font-bold text-yellow-500 mb-6">ПАУЗА</h2>
      <div className="flex flex-col space-y-3 mb-4 w-full max-w-xs">
        <button 
          onClick={onResume}
          className="px-6 py-2 bg-yellow-500 text-black rounded-lg font-bold"
        >
          ПРОДОЛЖИТЬ
        </button>
        
        <button 
          onClick={onExit}
          className="px-6 py-2 bg-[#323248] text-white rounded-lg"
        >
          ВЫЙТИ
        </button>
      </div>
    </div>
  );
};

export default PauseScreen;