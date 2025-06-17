import React from 'react';
import { Nut as NutType } from './GameArea';

interface NutProps {
  nut: NutType;
}

const Nut: React.FC<NutProps> = ({ nut }) => {
  // Функция выбора правильного изображения для типа ореха
  const getNutImage = (type: 'acorn' | 'walnut' | 'hazelnut') => {
    switch (type) {
      case 'acorn':
        return '/assets/golud.png'; // Маленький желудь
      case 'walnut':
        return '/assets/orehgame.png'; // Крупный орех
      case 'hazelnut':
        return '/assets/oreh.png'; // Альтернативное изображение для разнообразия
    }
  };

  return (
    <div 
      className="absolute"
      style={{
        left: `${nut.x}%`,
        top: `${nut.y}px`,
        width: `${nut.size}px`,
        height: `${nut.size}px`,
        transform: `rotate(${nut.rotation}deg)`,
        zIndex: 10
      }}
    >
      <img 
        src={getNutImage(nut.type)} 
        alt={nut.type} 
        className="w-full h-full object-contain"
        style={{
          filter: 'drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.3))'
        }}
      />
    </div>
  );
};

export default Nut;