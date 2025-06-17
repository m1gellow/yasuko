import React, { useState, useEffect, useRef, memo } from 'react';

interface CharacterViewProps {
  isAnimating: boolean;
  isEvolvingAnimation: boolean;
  onTap: (e: React.MouseEvent) => void;
  level: number;
  characterType: 'yasuko' | 'fishko';
}

const CharacterView: React.FC<CharacterViewProps> = memo(({ 
  isAnimating, 
  isEvolvingAnimation, 
  onTap, 
  level,
  characterType 
}) => {
  const [animationClass, setAnimationClass] = useState('');
  const [showCrack, setShowCrack] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [bodyAnimation, setBodyAnimation] = useState(0);
  const [tailAnimation, setTailAnimation] = useState(0);
  const [playTapSound, setPlayTapSound] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  
  const animationFrameRef = useRef<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tapSoundRef = useRef<HTMLAudioElement | null>(null);

  // Создаем ссылки на аудиоэлементы один раз
  useEffect(() => {
    try {
      tapSoundRef.current = new Audio('/assets/audio/tap-sound.mp3');
      
      // Проверяем загрузку звука
      tapSoundRef.current.addEventListener('canplaythrough', () => {
        setAudioLoaded(true);
      });
      
      tapSoundRef.current.addEventListener('error', () => {
        console.warn('Не удалось загрузить звук тапа. Звуки будут отключены.');
        setAudioLoaded(false);
      });
      
      // Предзагрузка изображений
      const walnutImg = new Image();
      walnutImg.src = '/assets/oreh.png';
      
      const squirrelImg = new Image();
      squirrelImg.src = '/assets/belka.png';
    } catch (error) {
      console.warn('Ошибка при инициализации аудио:', error);
    }
    
    return () => {
      // Очистка при размонтировании
      if (tapSoundRef.current) {
        tapSoundRef.current.pause();
        tapSoundRef.current.src = '';
      }
    };
  }, [level]);

  // Анимация для ореха (уровень 1)
  useEffect(() => {
    if (isAnimating && level === 1) {
      // Воспроизводим звук тапа только если загружен
      if (tapSoundRef.current && audioLoaded) {
        try {
          tapSoundRef.current.currentTime = 0;
          tapSoundRef.current.play().catch(err => {
            console.warn('Звук отключен из-за политики браузера или ошибки:', err);
          });
        } catch (error) {
          // Тихая обработка ошибки
        }
      }
      
      // Анимация нажатия
      setAnimationClass('scale-95');
      setShowCrack(true);
      
      // Увеличиваем интенсивность свечения при каждом тапе
      setGlowIntensity(prev => Math.min(prev + 15, 100));
      
      // Обрабатываем время между тапами для эффекта свечения
      const now = Date.now();
      const timeDiff = now - lastTapTime;
      
      // Если тапы идут часто, усиливаем свечение
      if (timeDiff < 500) {
        setGlowIntensity(prev => Math.min(prev + 20, 100));
      }
      
      setLastTapTime(now);
      
      // Сбрасываем анимацию через небольшое время
      setTimeout(() => {
        setAnimationClass('');
        setTimeout(() => setShowCrack(false), 300);
      }, 150);
      
      // Постепенное затухание свечения
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
      tapTimeoutRef.current = setTimeout(() => {
        setGlowIntensity(prev => Math.max(prev - 5, 0));
      }, 3000);
    }
  }, [isAnimating, level, lastTapTime, audioLoaded]);
  
  // Анимация для белки (уровень 2+)
  useEffect(() => {
    if (level >= 2) {
      // Запускаем анимацию белки
      if (!animationIntervalRef.current) {
        // Случайная начальная анимация
        setBodyAnimation(Math.floor(Math.random() * 3));
        setTailAnimation(Math.floor(Math.random() * 3));
        
        animationIntervalRef.current = setInterval(() => {
          // Обновляем кадр анимации каждые 150мс
          animationFrameRef.current = (animationFrameRef.current + 1) % 60;
          
          // Каждые ~1 сек меняем анимацию тела и хвоста
          if (animationFrameRef.current % 7 === 0) {
            setBodyAnimation(prev => (prev + 1) % 3);
          }
          
          if (animationFrameRef.current % 9 === 0) {
            setTailAnimation(prev => (prev + 1) % 3);
          }
        }, 150);
      }
    }
    
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, [level]);

  // Постепенное затухание свечения
  useEffect(() => {
    const interval = setInterval(() => {
      if (glowIntensity > 0) {
        setGlowIntensity(prev => Math.max(prev - 1, 0));
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [glowIntensity]);

  // Выбор правильного изображения персонажа
  const getCharacterImage = () => {
    if (characterType === 'yasuko') {
      // Уровни Ясуко
      switch (level) {
        case 1: return "/assets/oreh.png"; // Орех
        case 2:
        case 3: return "/assets/belka.png"; // Белка
        default: return "/assets/oreh.png";
      }
    } else {
      // Уровни Фишко
      switch (level) {
        case 1: return "/assets/fishko-egg.png";
        case 2: return "/assets/fishko-1.png";
        default: return "/assets/fishko-egg.png";
      }
    }
  };

  // Запасное изображение в случае ошибки загрузки
  const fallbackImage = characterType === 'yasuko' 
    ? "/assets/oreh.png"
    : "/assets/fishko-egg.png";

  // Дополнительный класс для анимации парения
  const floatingAnimation = level === 1 ? 'animate-float' : '';
  
  // Рендеринг белки (уровень 2+)
  const renderSquirrel = () => {
    return (
      <div className={`w-48 h-48 relative ${animationClass} transition-transform duration-150`}>
        {/* Эффект свечения вокруг белки */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{ 
            background: `radial-gradient(circle, rgba(255,165,0,${0.2 + (glowIntensity / 150)}) 0%, rgba(255,165,0,0) 70%)`,
            opacity: glowIntensity / 100,
            transform: 'scale(1.2)',
            transition: 'opacity 0.3s ease-out'
          }}
        />
        
        {/* Изображение белки с анимацией */}
        <img 
          src="/assets/belka.png"
          alt="Белка"
          className={`w-full h-full object-contain drop-shadow-md z-10 animate-float`}
          style={{ 
            transform: `${bodyAnimation === 1 ? 'translateY(-5px)' : bodyAnimation === 2 ? 'translateY(5px)' : 'translateY(0)'}`,
            transition: 'transform 0.3s ease-out'
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = fallbackImage;
          }}
        />
        
        {/* Частицы при тапе */}
        {isAnimating && (
          <>
            {Array.from({ length: 5 }).map((_, i) => {
              const angle = Math.random() * Math.PI * 2;
              const distance = 30 + Math.random() * 50;
              const size = 4 + Math.random() * 4;
              const speed = 0.5 + Math.random() * 1;
              const x = Math.cos(angle) * distance;
              const y = Math.sin(angle) * distance;
              
              return (
                <div
                  key={i}
                  className="absolute rounded-full bg-yellow-300 opacity-80"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                    animation: `float-up ${speed}s ease-out forwards`
                  }}
                />
              );
            })}
          </>
        )}
      </div>
    );
  };

  // Рендеринг ореха с анимацией (уровень 1)
  const renderWalnut = () => {
    return (
      <div 
        className={`w-48 h-48 flex items-center justify-center transition-transform duration-150 ${animationClass} ${isEvolvingAnimation ? 'animate-pulse' : ''} ${floatingAnimation} relative`}
      >
        {/* Эффект свечения вокруг ореха */}
        <div 
          className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{ 
            background: `radial-gradient(circle, rgba(255,215,0,${0.2 + (glowIntensity / 150)}) 0%, rgba(255,215,0,0) 70%)`,
            opacity: glowIntensity / 100,
            width: '100%',
            height: '100%',
            transition: 'opacity 0.3s ease-out'
          }}
        />
        
        {/* Изображение ореха */}
        <img 
          src={getCharacterImage()}
          alt={characterType === 'yasuko' ? "Ясуко" : "Фишко"}
          className="w-full h-full object-contain drop-shadow-md z-10"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = fallbackImage;
          }}
        />
        
        {/* Анимация трещин при тапе на орехе */}
        {showCrack && (
          <div className="absolute inset-0 z-20 pointer-events-none">
            {/* Несколько линий-трещин от центра */}
            {Array.from({ length: 5 }).map((_, i) => {
              const angle = i * 72 + Math.random() * 20 - 10;
              const length = 8 + Math.random() * 12;
              const width = 1 + Math.random();
              
              return (
                <div 
                  key={i}
                  className="absolute bg-[#5c3d24]"
                  style={{
                    width: `${width}px`,
                    height: `${length}px`,
                    left: '50%',
                    top: '50%',
                    transformOrigin: 'bottom center',
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${length / 2}px)`,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="flex items-center justify-center w-full cursor-pointer"
      onClick={onTap}
    >
      {/* Выбираем подходящий рендеринг на основе уровня */}
      {level === 1 && renderWalnut()}
      {level >= 2 && renderSquirrel()}
    </div>
  );
});

export default CharacterView;