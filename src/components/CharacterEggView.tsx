import React, { useState, useEffect, useRef } from 'react';

interface CharacterEggViewProps {
  isAnimating: boolean;
  isEvolvingAnimation: boolean;
  cracksIntensity: number;
  onTap: (e: React.MouseEvent) => void;
}

const CharacterEggView: React.FC<CharacterEggViewProps> = ({
  isAnimating,
  isEvolvingAnimation,
  cracksIntensity,
  onTap
}) => {
  const [animationClass, setAnimationClass] = useState('');
  const [showAnimation, setShowAnimation] = useState<boolean>(isEvolvingAnimation);
  const [eggShellPieces, setEggShellPieces] = useState<Array<{ 
    id: number, 
    x: number, 
    y: number, 
    rotation: number, 
    size: number 
  }>>([]);
  
  const shellPiecesIdRef = useRef(0);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Эффект для запуска анимации при тапе
  useEffect(() => {
    if (isAnimating) {
      setAnimationClass('scale-105');
      setTimeout(() => setAnimationClass(''), 150);
    }
  }, [isAnimating]);

  // Эффект для анимации эволюции
  useEffect(() => {
    if (isEvolvingAnimation) {
      setShowAnimation(true);

      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }

      animationTimeoutRef.current = setTimeout(() => {
        setShowAnimation(false);
      }, 7000);
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [isEvolvingAnimation]);

  // Эффект для создания отлетающих кусочков скорлупы при увеличении трещин
  useEffect(() => {
    // Создаем новый кусочек скорлупы только при достаточном изменении интенсивности
    if (cracksIntensity > 20 && Math.random() < 0.3) {
      // Определяем случайные параметры для кусочка скорлупы
      const randomAngle = Math.random() * Math.PI * 2;
      const distance = 100 + Math.random() * 100;

      // Создаем от 1 до 3 кусочков скорлупы с разными параметрами
      const numPieces = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < numPieces; i++) {
        const angle = randomAngle + (Math.random() - 0.5) * Math.PI / 4; // Небольшое отклонение от основного угла
        const newShellPiece = {
          id: shellPiecesIdRef.current++,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          rotation: Math.random() * 720 - 360, // Случайный поворот от -360 до 360 градусов
          size: 6 + Math.random() * 6 // Размер от 6 до 12 пикселей
        };

        setEggShellPieces(prev => [...prev, newShellPiece]);

        // Удаляем кусочки через некоторое время
        setTimeout(() => {
          setEggShellPieces(prev => prev.filter(piece => piece.id !== newShellPiece.id));
        }, 1500 + Math.random() * 500); // От 1.5 до 2 секунд
      }
    }
  }, [cracksIntensity]);

  // Вычисление параметров подсветки в зависимости от интенсивности трещин
  const glowSize = 5 + (cracksIntensity / 5); // От 5 до 25 пикселей
  const glowColor = `rgba(255, 215, 85, ${0.2 + cracksIntensity / 200})`;
  const glowOpacity = 0.2 + cracksIntensity / 100; // От 0.2 до 1.2

  return (
    <div 
      className="relative w-48 h-48 flex items-center justify-center cursor-pointer"
      onClick={onTap}
    >
      {/* Эффект свечения яйца */}
      <div 
        className="absolute rounded-full"
        style={{
          width: `${glowSize * 2}px`,
          height: `${glowSize * 2}px`,
          background: glowColor,
          filter: `blur(${glowSize / 2}px)`,
          opacity: glowOpacity,
          transition: 'all 0.3s ease-out'
        }}
      />

      {/* Основное изображение яйца */}
      <div
        className={`transform ${animationClass} transition-transform duration-300 relative ${showAnimation ? 'animate-pulse' : ''}`}
        style={{
          opacity: isEvolvingAnimation ? (Math.sin(Date.now() / 100) * 0.5 + 0.5) : 1,
          filter: isEvolvingAnimation ? 'brightness(1.5)' : 'none'
        }}
      >
        <div className="w-32 h-40 bg-gradient-to-b from-yellow-100 to-yellow-200 rounded-[50%] relative overflow-hidden">
          {/* Трещины на яйце */}
          {cracksIntensity > 0 && Array.from({ length: Math.min(20, Math.ceil(cracksIntensity / 5)) }).map((_, i) => {
            const angle = Math.random() * 360;
            const top = 20 + Math.random() * 60;
            const left = 20 + Math.random() * 60;
            const width = 1 + Math.random() * 2;
            const length = 8 + Math.random() * 15;
            
            return (
              <div 
                key={i} 
                className="absolute bg-black/70" 
                style={{
                  top: `${top}%`,
                  left: `${left}%`,
                  width: `${width}px`,
                  height: `${length}px`,
                  transform: `rotate(${angle}deg)`,
                  opacity: 0.7
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Отлетающие кусочки скорлупы */}
      {eggShellPieces.map(piece => (
        <div
          key={piece.id}
          className="absolute bg-yellow-100 rounded-sm"
          style={{
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            top: '50%',
            left: '50%',
            transform: `translate(${piece.x}px, ${piece.y}px) rotate(${piece.rotation}deg)`,
            transition: 'all 1.5s ease-out',
          }}
        />
      ))}
    </div>
  );
};

export default CharacterEggView;