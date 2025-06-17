import React from 'react';

const Tree: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-start justify-center">
      <img 
        src="/assets/dub.png" 
        alt="Дуб" 
        className="absolute top-0 left-1/2 transform -translate-x-1/2 h-[40vh] md:h-[50vh] object-contain z-1"
        style={{
          filter: 'brightness(0.8)',
        }}
      />
    </div>
  );
};

export default Tree;