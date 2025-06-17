import React from 'react';

interface BasketProps {
  position: number;
}

const Basket: React.FC<BasketProps> = ({ position }) => {
  return (
    <div 
      className="absolute bottom-10 z-20"
      style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
    >
      <div className="relative w-[70px] h-[55px] md:w-[80px] md:h-[60px]">
        <img 
          src="/assets/korzina.png" 
          alt="Корзина" 
          className="w-full h-full object-contain"
          style={{
            filter: 'drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.5))'
          }}
        />
      </div>
    </div>
  );
};

export default Basket;