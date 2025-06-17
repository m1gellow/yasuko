import React from 'react';

interface NutCatchAnimationProps {
  x: number;
  y: number;
  points: string;
}

const NutCatchAnimation: React.FC<NutCatchAnimationProps> = ({ x, y, points }) => {
  return (
    <div 
      className="absolute text-lg font-bold text-yellow-400 animate-bounce"
      style={{
        left: `${x}%`,
        top: `${y}px`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      +{points}
    </div>
  );
};

export default NutCatchAnimation;