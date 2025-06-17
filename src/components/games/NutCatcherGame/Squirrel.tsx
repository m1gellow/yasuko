import React from 'react';

interface SquirrelProps {
  position: number;
  direction: number;
  frame: number;
  throwing: boolean;
}

const Squirrel: React.FC<SquirrelProps> = ({ 
  position, 
  direction, 
  frame, 
  throwing 
}) => {
  return (
    <div 
      className="absolute top-[5vh] md:top-[10vh] z-10" 
      style={{ 
        left: `${position}%`,
        transform: `translateX(-50%) scaleX(${direction})` 
      }}>
      <img 
        src="/assets/belka.png" 
        alt="Белка" 
        className="w-16 h-16 md:w-20 md:h-20 object-contain" 
        style={{ 
          filter: 'drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.4))'
        }}
      />
      
      {/* Анимация броска ореха */}
      {throwing && (
        <div className="absolute -bottom-1 left-0 right-0 mx-auto w-5 h-5 animate-bounce">
          <img 
            src="/assets/golud.png" 
            alt="Желудь" 
            className="w-full h-full object-contain" 
          />
        </div>
      )}
    </div>
  );
};

export default Squirrel;