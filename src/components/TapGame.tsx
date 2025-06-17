import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User } from '../types';
import { Volume2Icon, VolumeXIcon, LeafIcon, Music2Icon, SunIcon } from 'lucide-react';
import CharacterView from './CharacterView';
import CharacterInfoCard from './CharacterInfoCard';
import CharacterCard from './CharacterCard';
import { usePhrases } from '../hooks/usePhrases';
import { useTelegram } from '../contexts/TelegramContext';
import EnergyEmptyModal from './modals/EnergyEmptyModal';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/gameService';
import { useAnalytics } from '../hooks/useAnalytics';
import ProgressBar from './ProgressBar';
import { Bitcoin } from 'lucide-react';

interface TapGameProps {
  target: {
    id: string;
    name: string;
    basePoints: number;
    image: string;
    level: number;
    requiredTaps: number;
    currentTaps: number;
    energy: number;
    state: "sleeping" | "active" | "transitioning";
  };
  user: User;
  onTap: (points: number) => void;
  onLevelUp: () => void;
  showCharacterCard: boolean;
}

// Компонент игры тапинга, мемоизированный для предотвращения лишних перерисовок
const TapGame: React.FC<TapGameProps> = React.memo(({ 
  target, 
  user, 
  onTap, 
  onLevelUp, 
  showCharacterCard 
}) => {
  const [localTarget, setLocalTarget] = useState(target);
  const [tapAnimation, setTapAnimation] = useState(false);
  const [tapPoints, setTapPoints] = useState<{ points: number, x: number, y: number, id: number }[]>([]);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [combo, setCombo] = useState(1);
  const [isEvolvingAnimation, setIsEvolvingAnimation] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [natureEnabled, setNatureEnabled] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [audioLoaded, setAudioLoaded] = useState({
    tap: false,
    nature: false
  });
  const [showEnergyEmptyModal, setShowEnergyEmptyModal] = useState(false);
  const [characterData, setCharacterData] = useState<any>(null);
  const [tapPosition, setTapPosition] = useState<{x: number, y: number} | null>(null);
  const [hasDismissedEnergyModal, setHasDismissedEnergyModal] = useState(false);
  
  const pointsCounter = useRef(0);
  const tapAreaRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const tapSoundRef = useRef<HTMLAudioElement | null>(null);
  const natureSoundRef = useRef<HTMLAudioElement | null>(null);
  
  const { telegram } = useTelegram();
  const { phrases, getRandomPhrase } = usePhrases('click');
  const { state } = useGame();
  const { user: authUser } = useAuth();
  const analytics = useAnalytics();

  // Загрузка данных персонажа при монтировании компонента
  useEffect(() => {
    const loadCharacterData = async () => {
      if (authUser) {
        try {
          const character = await gameService.getCharacter(authUser.id);
          setCharacterData(character);
        } catch (error) {
          console.error('Ошибка при загрузке данных персонажа:', error);
        }
      }
    };
    
    loadCharacterData();
  }, [authUser]);

  // Инициализация звуков с проверкой загрузки
  useEffect(() => {
    try {
      // Создаем аудио элементы
      tapSoundRef.current = new Audio();
      natureSoundRef.current = new Audio();
      
      // Обработчики событий для отслеживания успешной загрузки
      if (tapSoundRef.current) {
        tapSoundRef.current.addEventListener('canplaythrough', () => {
          setAudioLoaded(prev => ({ ...prev, tap: true }));
        });
        
        tapSoundRef.current.addEventListener('error', () => {
          console.warn('Не удалось загрузить звук тапа. Звуки будут отключены.');
          setAudioLoaded(prev => ({ ...prev, tap: false }));
          setSoundEnabled(false); // Автоматически отключаем звук при проблемах
        });
        
        // Установка источника после добавления обработчиков
        tapSoundRef.current.src = '/assets/audio/tap-sound.mp3';
        tapSoundRef.current.load();
      }
      
      if (natureSoundRef.current) {
        natureSoundRef.current.addEventListener('canplaythrough', () => {
          setAudioLoaded(prev => ({ ...prev, nature: true }));
        });
        
        natureSoundRef.current.addEventListener('error', () => {
          console.warn('Не удалось загрузить звук природы. Фоновая музыка будет отключена.');
          setAudioLoaded(prev => ({ ...prev, nature: false }));
          setNatureEnabled(false); // Автоматически отключаем природу при проблемах
        });
        
        // Настройка фоновой музыки
        natureSoundRef.current.loop = true;
        natureSoundRef.current.volume = 0.3;
        natureSoundRef.current.src = '/assets/audio/nature.mp3';
        natureSoundRef.current.load();
      }
    } catch (error) {
      console.warn('Ошибка при инициализации аудио:', error);
      setSoundEnabled(false);
      setNatureEnabled(false);
    }
    
    return () => {
      // Остановка звуков и удаление обработчиков при размонтировании
      if (tapSoundRef.current) {
        tapSoundRef.current.pause();
        tapSoundRef.current.removeEventListener('canplaythrough', () => {});
        tapSoundRef.current.removeEventListener('error', () => {});
      }
      if (natureSoundRef.current) {
        natureSoundRef.current.pause();
        natureSoundRef.current.removeEventListener('canplaythrough', () => {});
        natureSoundRef.current.removeEventListener('error', () => {});
      }
    };
  }, []);

  // Обновляем локальный target при изменении пропсов
  useEffect(() => {
    setLocalTarget(target);
  }, [target]);

  // Эффект для показа случайных фраз при тапе
  useEffect(() => {
    if (tapAnimation && phrases.length > 0 && Math.random() > 0.6) { // 40% шанс на фразу
      setCurrentPhrase(getRandomPhrase());
      setShowPhrase(true);
      
      // Скрываем фразу через 2 секунды
      const timer = setTimeout(() => {
        setShowPhrase(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [tapAnimation, phrases, getRandomPhrase]);

  // Управление звуком природы
  useEffect(() => {
    if (natureSoundRef.current && audioLoaded.nature && natureEnabled) {
      try {
        natureSoundRef.current.play().catch(err => {
          console.warn('Ошибка воспроизведения звука природы:', err);
          setNatureEnabled(false);
        });
      } catch (error) {
        console.warn('Ошибка при воспроизведении звука природы:', error);
        setNatureEnabled(false);
      }
    } else if (natureSoundRef.current) {
      natureSoundRef.current.pause();
    }
    
    return () => {
      if (natureSoundRef.current) {
        natureSoundRef.current.pause();
      }
    };
  }, [natureEnabled, audioLoaded.nature]);

  // Проверка и отображение модального окна при нулевой энергии
  useEffect(() => {
    // Проверка энергии и показ модального окна
    if (Math.round(user.energy.current) <= 0 && !showEnergyEmptyModal && !hasDismissedEnergyModal) {
      // Показываем модальное окно с небольшой задержкой, чтобы избежать его появления при начальной загрузке
      const timer = setTimeout(() => {
        setShowEnergyEmptyModal(true);
        if (authUser) {
          analytics.trackAction('energy_empty', {
            characterLevel: localTarget.level,
            characterType: state.characterType,
            activeTab: 'game'
          });
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user.energy.current, showEnergyEmptyModal, hasDismissedEnergyModal, analytics, authUser, localTarget.level, state.characterType]);

  // Сброс флага hasDismissedEnergyModal когда энергия пополняется
  useEffect(() => {
    if (Math.round(user.energy.current) > 0 && hasDismissedEnergyModal) {
      setHasDismissedEnergyModal(false);
    }
  }, [user.energy.current, hasDismissedEnergyModal]);

  // Оптимизированный обработчик тапа
  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (Math.round(user.energy.current) <= 0) {
      // Если энергия закончилась, показываем модальное окно
      setShowEnergyEmptyModal(true);
      return;
    }
    
    if (localTarget.state !== 'active') return;
    
    // Хаптик фидбек через Telegram API
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    // Воспроизведение звука тапа с проверкой загрузки
    if (soundEnabled && tapSoundRef.current && audioLoaded.tap) {
      try {
        tapSoundRef.current.currentTime = 0;
        tapSoundRef.current.play().catch(err => {
          // Тихая обработка ошибки без вывода в консоль для улучшения UX
          // Это может быть пользовательское взаимодействие, которое еще не разрешило воспроизведение
        });
      } catch (error) {
        // Тихая обработка ошибки
      }
    }
    
    // Calculate position for the floating points
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Сохраняем позицию тапа для аналитики
    setTapPosition({x, y});
    
    // Calculate combo
    const now = Date.now();
    const timeDiff = now - lastTapTime;
    let newCombo = combo;
    
    if (timeDiff < 500) {
      newCombo = Math.min(combo + 0.1, 3);
    } else {
      newCombo = Math.max(1, combo - 0.2);
    }
    
    setLastTapTime(now);
    setCombo(newCombo);
    
    // Add point animation (+1 монета за каждый тап)
    const points = Math.ceil(1 * newCombo);
    const pointId = pointsCounter.current++;
    setTapPoints(prev => [...prev, { points, x, y, id: pointId }]);
    
    // Remove point animation after it fades out
    setTimeout(() => {
      setTapPoints(prev => prev.filter(p => p.id !== pointId));
    }, 1000);
    
    // Update target taps
    const newTaps = localTarget.currentTaps + 1;
    setLocalTarget(prev => ({
      ...prev,
      currentTaps: newTaps
    }));
    
    // Check if level up
    if (newTaps >= localTarget.requiredTaps && localTarget.level === 1) {
      setLocalTarget(prev => ({
        ...prev,
        state: 'transitioning'
      }));
      
      // Показать анимацию эволюции
      setIsEvolvingAnimation(true);
      
      setTimeout(() => {
        onLevelUp();
        setIsEvolvingAnimation(false);
      }, 2000);
    }
    
    // Trigger tap animation
    setTapAnimation(true);
    setTimeout(() => setTapAnimation(false), 150);
    
    // Отслеживаем тап в аналитике
    if (authUser) {
      // Исправляем здесь - используем новую функцию trackTap
      analytics.trackTap(state.characterType, localTarget.level, {x, y}, {
        energy: Math.round(state.energy.current),
        combo: newCombo.toFixed(1),
        points,
        currentTaps: newTaps,
        requiredTaps: localTarget.requiredTaps
      });
    }
    
    // Send points to parent
    onTap(points);
  }, [localTarget, onTap, onLevelUp, user.energy.current, combo, lastTapTime, telegram, soundEnabled, audioLoaded.tap, authUser, analytics, state.characterType, state.energy.current]);

  // Обработчик для кнопки звука
  const toggleSound = useCallback(() => {
    // Хаптик-фидбек при переключении звука
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    setSoundEnabled(prev => {
      if (authUser) {
        analytics.trackAction('toggle_sound', {
          newState: !prev,
          previousState: prev,
          characterLevel: localTarget.level,
          characterType: state.characterType
        });
      }
      return !prev;
    });
  }, [analytics, authUser, localTarget.level, state.characterType, telegram]);

  // Обработчик для кнопки звуков природы
  const toggleNature = useCallback(() => {
    // Хаптик-фидбек при переключении фоновой музыки
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    setNatureEnabled(prev => {
      if (authUser) {
        analytics.trackAction('toggle_nature', {
          newState: !prev,
          previousState: prev,
          characterLevel: localTarget.level,
          characterType: state.characterType
        });
      }
      return !prev;
    });
  }, [analytics, authUser, localTarget.level, state.characterType, telegram]);

  // Обработчик закрытия модального окна с нулевой энергией
  const handleCloseEnergyModal = useCallback(() => {
    setShowEnergyEmptyModal(false);
    // Устанавливаем флаг, что пользователь закрыл модальное окно
    setHasDismissedEnergyModal(true);
    
    if (authUser) {
      analytics.trackAction('energy_empty_modal_close', {
        characterLevel: localTarget.level,
        characterType: state.characterType
      });
    }
  }, [analytics, authUser, localTarget.level, state.characterType]);

  // Определяем статус энергии для отображения
  const energyStatus = useMemo(() => {
    return Math.round(user.energy.current) > 0 ? "АКТИВНЫЙ" : "СПЯЩИЙ";
  }, [user.energy.current]);

  return (
    <div className="flex flex-col items-center justify-center py-4 relative">
      {/* Новый дизайн отображения уровня, баланса и рейтинга */}
      <div className="w-full max-w-md mb-4 px-4">
        <div className="flex justify-between items-center w-full bg-purple-900/50 p-3 rounded-lg shadow-lg">
          {/* Левая колонка: УРОВЕНЬ */}
          <div className="flex flex-col items-start">
            <p className="text-white text-sm font-bold">УРОВЕНЬ {localTarget.level} ({localTarget.currentTaps % 100}/100)</p>
            <ProgressBar 
              current={localTarget.currentTaps % 100} 
              max={100} 
              height="h-2" 
              className="mt-1 w-full" 
              color="yellow"
            />
          </div>
          
          {/* Средняя колонка: ВАШ БАЛАНС */}
          <div className="flex justify-center items-center p-[1rem]">

              <p className="text-white text-sm flex flex-col">БАЛАНС:   <span className="text-yellow-500 flex flex-row items-center justify-center font-bold text-xl">{Math.round(user.score)}        <Bitcoin/>  </span>  </p>
    

          </div>
          
          {/* Правая колонка: РЕЙТИНГ */}
          <div className="flex flex-col items-end">
            <p className="text-white text-sm font-bold">РЕЙТИНГ: {user.position || '?'}/{100}</p>
            <ProgressBar 
              current={user.position ? Math.max(0, 100 - user.position) : 50}
              max={100}
              height="h-2"
              className="mt-1 w-full"
              color="yellow"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-row items-center justify-center w-full px-4 relative">
        {/* Основная область с персонажем */}
        <div className="flex-1 flex flex-col items-center justify-center pt-4 pb-8 max-w-md mx-auto relative">
          <div className="flex items-center w-full justify-center">
            {/* Кнопки управления слева */}
            <div className="absolute left-4 flex flex-col space-y-3 z-10">
              {/* Кнопка звука - обновленные иконки */}
              <button 
                className={`w-10 h-10 ${soundEnabled ? 'bg-yellow-500' : 'bg-red-500'} rounded-full flex items-center justify-center shadow-lg`}
                onClick={toggleSound}
                aria-label={soundEnabled ? "Выключить звук" : "Включить звук"}
              >
                {soundEnabled ? (
                  <Volume2Icon className="w-5 h-5 text-[#1E1E2D]" />
                ) : (
                  <VolumeXIcon className="w-5 h-5 text-[#1E1E2D]" />
                )}
              </button>
              
              {/* Кнопка звуков природы - обновленная иконка */}
              <button 
                className={`w-10 h-10 ${natureEnabled ? 'bg-green-500' : 'bg-gray-500'} rounded-full flex items-center justify-center shadow-lg`}
                onClick={toggleNature}
                aria-label={natureEnabled ? "Выключить звуки природы" : "Включить звуки природы"}
              >
                <Music2Icon className="w-5 h-5 text-[#1E1E2D]" />
              </button>
            </div>
            
            {/* Контейнер для персонажа */}
            <div 
              ref={tapAreaRef}
              className="relative cursor-pointer select-none"
              onClick={(e) => {
                handleTap(e);
              }}
            >
              {/* Character view component */}
              <div ref={characterRef}>
                <CharacterView 
                  isAnimating={tapAnimation}
                  isEvolvingAnimation={isEvolvingAnimation}
                  onTap={handleTap}
                  level={localTarget.level}
                  characterType="yasuko"
                />
              </div>
              
              {/* Текстовая фраза над персонажем */}
              {showPhrase && (
                <div 
                  className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black/50 px-3 py-2 rounded-lg text-white text-sm whitespace-nowrap animate-fade-in-down z-20"
                >
                  {currentPhrase}
                </div>
              )}
              
              {/* Floating points animations */}
              {tapPoints.map((point) => (
                <div 
                  key={point.id}
                  className="absolute pointer-events-none text-yellow-400 font-bold animate-float-up"
                  style={{ 
                    left: `${point.x}px`, 
                    top: `${point.y}px`,
                    opacity: 1,
                    animation: 'float-up 1s ease-out forwards'
                  }}
                >
                  +{point.points}
                </div>
              ))}
            </div>
          </div>
          
          {/* Информационная карточка с именем, статусом и прогрессом */}
          <div className="mt-6 w-full">
            <CharacterInfoCard 
              target={localTarget}
              energyStatus={energyStatus}
            />
          </div>
        </div>
      </div>
      
      {/* Character card - отображается только когда showCharacterCard == true */}
      {showCharacterCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4" onClick={e => {
          // Закрываем только при клике на задний фон
          if (e.target === e.currentTarget) {
            e.stopPropagation();
          }
        }}>
          <div className="max-w-sm w-full mx-auto">
            <CharacterCard 
              level={localTarget.level}
              health={characterData?.life_power || 90}
              happiness={characterData?.mood || 80}
              hunger={characterData?.satiety || 70}
              mood="Довольный"
              characterType="yasuko"
            />
          </div>
        </div>
      )}

      {/* Модальное окно при окончании энергии */}
      {showEnergyEmptyModal && (
        <EnergyEmptyModal onClose={handleCloseEnergyModal} />
      )}
    </div>
  );
});

export default TapGame;