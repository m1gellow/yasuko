import React, { useState, useEffect, useRef, useCallback } from 'react';
import Squirrel from './Squirrel';
import Basket from './Basket';
import Nut from './Nut';
import ComboMessage from './ComboMessage';
import Tree from './Tree';
import NutCatchAnimation from './NutCatchAnimation';
import { useTelegram } from '../../../contexts/TelegramContext';

export const NUT_TYPES = ['acorn', 'walnut', 'hazelnut'] as const;
export const NUT_POINTS = {
  acorn: 1,
  walnut: 2,
  hazelnut: 3
};

export interface Nut {
  id: number;
  x: number;
  y: number;
  speed: number;
  rotation: number;
  size: number;
  type: 'acorn' | 'walnut' | 'hazelnut';
}

interface GameAreaProps {
  isActive: boolean;
  onScoreUpdate: (points: number) => void;
  onTimerUpdate: () => void;
}

const GameArea: React.FC<GameAreaProps> = ({ isActive, onScoreUpdate, onTimerUpdate }) => {
  const [nuts, setNuts] = useState<Nut[]>([]);
  const [basketPosition, setBasketPosition] = useState(50);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [gameWidth, setGameWidth] = useState(0);
  const [gameHeight, setGameHeight] = useState(0);
  const [squirrel, setSquirrel] = useState({ 
    position: 50, 
    direction: 1, 
    throwing: false, 
    frame: 0 
  });
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [comboTimer, setComboTimer] = useState(0);
  const [showComboMessage, setShowComboMessage] = useState(false);
  const [comboMessage, setComboMessage] = useState('');
  const [nutCatchAnimation, setNutCatchAnimation] = useState<{x: number, y: number, active: boolean}>({
    x: 0, y: 0, active: false
  });
  const [score, setScore] = useState(0); // Добавляем состояние для отслеживания счета
  const [elapsedTime, setElapsedTime] = useState(0); // Отслеживаем прошедшее время для ускорения
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const lastNutTime = useRef<number>(0);
  const nutIdCounter = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tapSoundRef = useRef<HTMLAudioElement | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  
  const { telegram } = useTelegram();
  
  const COMBO_DURATION = 3; // секунды для комбо
  const BASKET_WIDTH_PERCENTAGE = 25; // процент от ширины для корзины (увеличено для более легкой ловли)
  const GAME_DURATION = 60; // секунд

  // Загрузка звуков при монтировании
  useEffect(() => {
    try {
      tapSoundRef.current = new Audio('/assets/audio/tap-sound.mp3');
      
      // Проверяем загрузку звука
      tapSoundRef.current.addEventListener('canplaythrough', () => {
        setAudioLoaded(true);
      });
      
      tapSoundRef.current.addEventListener('error', () => {
        console.warn('Не удалось загрузить звук. Звуки будут отключены.');
        setAudioLoaded(false);
      });
      
      return () => {
        if (tapSoundRef.current) {
          tapSoundRef.current.pause();
          tapSoundRef.current.removeEventListener('canplaythrough', () => {});
          tapSoundRef.current.removeEventListener('error', () => {});
        }
      };
    } catch (error) {
      console.warn('Ошибка при инициализации аудио:', error);
      return () => {};
    }
  }, []);

  // Инициализация размеров игры
  useEffect(() => {
    if (gameAreaRef.current) {
      const { clientWidth, clientHeight } = gameAreaRef.current;
      setGameWidth(clientWidth);
      setGameHeight(clientHeight);
    }
    
    // Сброс переменных
    nutIdCounter.current = 0;
    lastNutTime.current = 0;
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);
  
  // Функция обработки изменения размера окна
  const handleResize = () => {
    if (gameAreaRef.current) {
      const { clientWidth, clientHeight } = gameAreaRef.current;
      setGameWidth(clientWidth);
      setGameHeight(clientHeight);
    }
  };

  // Эффект для анимации белки
  useEffect(() => {
    if (!isActive) return;
    
    const animateSquirrel = () => {
      animationFrameRef.current = (animationFrameRef.current + 1) % 60;
      
      // Меняем кадр анимации каждые 10 кадров
      if (animationFrameRef.current % 10 === 0) {
        setSquirrel(prev => ({
          ...prev,
          frame: (prev.frame + 1) % 4,
          throwing: Math.random() > 0.7
        }));
      }
      
      setSquirrel(prev => {
        // Случайно меняем направление движения
        const newDirection = Math.random() > 0.98 ? prev.direction * -1 : prev.direction;
        
        // Двигаем белку
        let newPosition = prev.position + newDirection * 0.5;
        
        // Проверяем границы
        if (newPosition < 10) {
          return { ...prev, position: 10, direction: 1, frame: prev.frame };
        } else if (newPosition > 90) {
          return { ...prev, position: 90, direction: -1, frame: prev.frame };
        }
        
        return { 
          ...prev, 
          position: newPosition, 
          direction: newDirection,
          frame: prev.frame
        };
      });
    };
    
    const interval = setInterval(animateSquirrel, 50);
    
    return () => clearInterval(interval);
  }, [isActive]);
  
  // Эффект для обновления таймера игры и отслеживания времени
  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsedTime(0);
      return;
    }
    
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
      onTimerUpdate();
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, onTimerUpdate]);

  // Эффект для сброса комбо-множителя
  useEffect(() => {
    if (!isActive || comboTimer <= 0) return;
    
    const interval = setInterval(() => {
      setComboTimer(prev => {
        if (prev <= 0) {
          setComboMultiplier(1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [comboTimer, isActive]);
  
  // Эффект для скрытия сообщения о комбо
  useEffect(() => {
    if (!showComboMessage) return;
    
    const timeout = setTimeout(() => {
      setShowComboMessage(false);
    }, 1500);
    
    return () => clearTimeout(timeout);
  }, [showComboMessage]);
  
  // Игровой цикл
  useEffect(() => {
    if (!isActive) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      return;
    };
    
    const gameLoop = (timestamp: number) => {
      // Вычисляем коэффициент ускорения на основе прошедшего времени
      // В начале игры коэффициент = 1, ближе к концу до 1.5 (50% ускорение)
      const speedMultiplier = 1 + (elapsedTime / GAME_DURATION) * 0.5;
      
      // Создание новых орехов
      if (timestamp - lastNutTime.current > 800 - Math.min(400, score * 10)) { // Увеличиваем частоту со счетом
        lastNutTime.current = timestamp;
        
        // Если белка "кидает", генерируем орехи с ее позиции
        if (squirrel.throwing) {
          // Преимущественно генерируем небольшие желуди (тип acorn)
          // Увеличиваем шанс желудя до 70%
          const nutTypeRand = Math.random();
          const nutType = 
            nutTypeRand < 0.7 ? 'acorn' :
            nutTypeRand < 0.85 ? 'walnut' : 'hazelnut';
          
          const newNut: Nut = {
            id: nutIdCounter.current++,
            x: squirrel.position + (Math.random() * 10) - 5, // Рядом с белкой с небольшим разбросом
            y: 10, // Позиция сверху (белка находится сверху)
            speed: (2 + Math.random() * 3 + Math.min(3, score / 20)) * speedMultiplier, // Скорость увеличивается со временем
            rotation: Math.random() * 360,
            size: nutType === 'acorn' ? 25 + Math.random() * 15 : 40 + Math.random() * 20, // Желуди меньше других орехов
            type: nutType
          };
          
          setNuts(prevNuts => [...prevNuts, newNut]);
        } else {
          // Иногда орехи падают случайным образом из дерева
          if (Math.random() > 0.5) {
            // Преимущественно генерируем небольшие желуди (тип acorn)
            const nutTypeRand = Math.random();
            const nutType = 
              nutTypeRand < 0.7 ? 'acorn' :
              nutTypeRand < 0.85 ? 'walnut' : 'hazelnut';
            
            const newNut: Nut = {
              id: nutIdCounter.current++,
              x: Math.random() * 80 + 10, // Позиция от 10% до 90%
              y: 10, // Позиция сверху
              speed: (2 + Math.random() * 3 + Math.min(3, score / 20)) * speedMultiplier, // Скорость увеличивается со временем
              rotation: Math.random() * 360,
              size: nutType === 'acorn' ? 25 + Math.random() * 15 : 40 + Math.random() * 20, // Желуди меньше других орехов
              type: nutType
            };
            
            setNuts(prevNuts => [...prevNuts, newNut]);
          }
        }
      }
      
      // Обновление позиций орехов
      setNuts(prevNuts => {
        const updatedNuts = prevNuts.map(nut => {
          const newY = nut.y + nut.speed;
          const newRotation = nut.rotation + 5;
          
          // Проверка столкновения с корзиной
          if (newY > gameHeight - 100 && newY < gameHeight - 20) {
            const nutCenter = nut.x;
            const basketLeft = basketPosition - BASKET_WIDTH_PERCENTAGE / 2;
            const basketRight = basketPosition + BASKET_WIDTH_PERCENTAGE / 2;
            
            // Улучшенная логика попадания - увеличен диапазон для облегчения ловли
            if (nutCenter > basketLeft && nutCenter < basketRight) {
              // Проверяем тип ореха - больше очков получаем за желуди (тип acorn)
              const pointsEarned = nut.type === 'acorn' ? 
                NUT_POINTS[nut.type] * comboMultiplier * 2 : // Удваиваем очки для желудей
                NUT_POINTS[nut.type] * comboMultiplier; // Базовые очки для других типов
              
              // Воспроизводим звук и вибрацию
              if (tapSoundRef.current && audioLoaded) {
                tapSoundRef.current.currentTime = 0;
                tapSoundRef.current.play().catch(err => {
                  console.warn('Звук отключен из-за политики браузера:', err);
                });
              }
              
              // Вибрация через Telegram API
              if (telegram?.HapticFeedback) {
                telegram.HapticFeedback.impactOccurred('light');
              }
              
              // Обновляем счет - используем целые числа
              setScore(prevScore => Math.floor(prevScore + pointsEarned));
              onScoreUpdate(Math.floor(pointsEarned));
              
              // Показываем анимацию поимки
              setNutCatchAnimation({
                x: basketPosition,
                y: gameHeight - 70,
                active: true
              });
              setTimeout(() => setNutCatchAnimation({x: 0, y: 0, active: false}), 500);
              
              // Обновляем комбо
              setComboMultiplier(prev => Math.min(3, prev + 0.1));
              setComboTimer(COMBO_DURATION);
              
              // Если комбо достигло новой отметки, показываем сообщение
              if (comboMultiplier >= 1.5 && comboMultiplier < 2 && !showComboMessage) {
                setComboMessage('КОМБО x1.5!');
                setShowComboMessage(true);
              } else if (comboMultiplier >= 2 && comboMultiplier < 2.5 && !showComboMessage) {
                setComboMessage('КОМБО x2!');
                setShowComboMessage(true);
              } else if (comboMultiplier >= 2.5 && !showComboMessage) {
                setComboMessage('СУПЕР КОМБО x3!');
                setShowComboMessage(true);
              }
              
              return null; // Удаляем пойманный орех
            }
          }
          
          // Проверка падения на землю
          if (newY > gameHeight) {
            // Сбрасываем комбо при пропуске ореха
            setComboMultiplier(1);
            setComboTimer(0);
            return null; // Удаляем упавший орех
          }
          
          return { ...nut, y: newY, rotation: newRotation };
        }).filter((nut): nut is Nut => nut !== null);
        
        return updatedNuts;
      });
      
      requestRef.current = requestAnimationFrame(gameLoop);
    };
    
    requestRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [isActive, score, basketPosition, gameHeight, squirrel.throwing, squirrel.position, comboMultiplier, onScoreUpdate, audioLoaded, telegram, elapsedTime]);
  
  // Обработчики касания/мыши для управления корзиной
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setTouchStart(e.touches[0].clientX);
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (touchStart === null || !gameWidth) return;
    const touchX = e.touches[0].clientX;
    const deltaX = touchX - touchStart;
    
    // Ограничиваем позицию корзины в пределах игрового поля
    setBasketPosition(prev => {
      const newPosition = prev + (deltaX / gameWidth * 100);
      return Math.max(10, Math.min(90, newPosition));
    });
    
    setTouchStart(touchX);
  }, [touchStart, gameWidth]);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setTouchStart(null);
  }, []);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    
    // Позиция корзины в процентах от ширины
    const newPosition = (relativeX / rect.width) * 100;
    setBasketPosition(Math.max(10, Math.min(90, newPosition)));
  }, []);

  return (
    <div 
      ref={gameAreaRef}
      className="relative h-[70vh] max-h-[600px] overflow-hidden bg-gradient-to-b from-[#1a3c69] to-[#341a69] touch-none w-full"
      onTouchStart={isActive ? handleTouchStart : undefined}
      onTouchMove={isActive ? handleTouchMove : undefined}
      onTouchEnd={isActive ? handleTouchEnd : undefined}
      onMouseMove={isActive ? handleMouseMove : undefined}
    >
      {/* Дерево на заднем плане */}
      <Tree />
      
      {/* Белка */}
      {isActive && (
        <Squirrel 
          position={squirrel.position}
          direction={squirrel.direction}
          frame={squirrel.frame}
          throwing={squirrel.throwing}
        />
      )}
      
      {/* Падающие орехи */}
      {nuts.map(nut => (
        <Nut 
          key={nut.id} 
          nut={nut}
        />
      ))}
      
      {/* Анимация поимки ореха */}
      {nutCatchAnimation.active && (
        <NutCatchAnimation 
          x={nutCatchAnimation.x}
          y={nutCatchAnimation.y}
          points={comboMultiplier.toFixed(1)}
        />
      )}
      
      {/* Корзина / ловушка */}
      <Basket position={basketPosition} />
      
      {/* Множитель комбо */}
      {isActive && comboMultiplier > 1 && (
        <div className="absolute top-24 right-4 z-10 bg-yellow-500/80 text-black px-3 py-1 rounded-lg font-bold">
          Комбо x{comboMultiplier.toFixed(1)}
        </div>
      )}
      
      {/* Сообщение о комбо */}
      {showComboMessage && (
        <ComboMessage message={comboMessage} />
      )}
    </div>
  );
};

export default GameArea;

export { Nut }