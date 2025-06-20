import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User } from '../types';
import { Volume2Icon, VolumeXIcon, LeafIcon, Music2Icon, SunIcon, Bitcoin } from 'lucide-react';
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

  useEffect(() => {
    try {
      tapSoundRef.current = new Audio();
      natureSoundRef.current = new Audio();
      
      if (tapSoundRef.current) {
        tapSoundRef.current.addEventListener('canplaythrough', () => {
          setAudioLoaded(prev => ({ ...prev, tap: true }));
        });
        
        tapSoundRef.current.addEventListener('error', () => {
          setAudioLoaded(prev => ({ ...prev, tap: false }));
          setSoundEnabled(false);
        });
        
        tapSoundRef.current.src = '/assets/audio/tap-sound.mp3';
        tapSoundRef.current.load();
      }
      
      if (natureSoundRef.current) {
        natureSoundRef.current.addEventListener('canplaythrough', () => {
          setAudioLoaded(prev => ({ ...prev, nature: true }));
        });
        
        natureSoundRef.current.addEventListener('error', () => {
          setAudioLoaded(prev => ({ ...prev, nature: false }));
          setNatureEnabled(false);
        });
        
        natureSoundRef.current.loop = true;
        natureSoundRef.current.volume = 0.3;
        natureSoundRef.current.src = '/assets/audio/nature.mp3';
        natureSoundRef.current.load();
      }
    } catch (error) {
      setSoundEnabled(false);
      setNatureEnabled(false);
    }
    
    return () => {
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

  useEffect(() => {
    setLocalTarget(target);
  }, [target]);

  useEffect(() => {
    if (tapAnimation && phrases.length > 0 && Math.random() > 0.6) {
      setCurrentPhrase(getRandomPhrase());
      setShowPhrase(true);
      
      const timer = setTimeout(() => {
        setShowPhrase(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [tapAnimation, phrases, getRandomPhrase]);

  useEffect(() => {
    if (natureSoundRef.current && audioLoaded.nature && natureEnabled) {
      try {
        natureSoundRef.current.play().catch(err => {
          setNatureEnabled(false);
        });
      } catch (error) {
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

  useEffect(() => {
    if (Math.round(user.energy.current) <= 0 && !showEnergyEmptyModal && !hasDismissedEnergyModal) {
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

  useEffect(() => {
    if (Math.round(user.energy.current) > 0 && hasDismissedEnergyModal) {
      setHasDismissedEnergyModal(false);
    }
  }, [user.energy.current, hasDismissedEnergyModal]);

  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (Math.round(user.energy.current) <= 0) {
      setShowEnergyEmptyModal(true);
      return;
    }
    
    if (localTarget.state !== 'active') return;
    
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    if (soundEnabled && tapSoundRef.current && audioLoaded.tap) {
      try {
        tapSoundRef.current.currentTime = 0;
        tapSoundRef.current.play().catch(err => {});
      } catch (error) {}
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setTapPosition({x, y});
    
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
    
    const points = Math.ceil(1 * newCombo);
    const pointId = pointsCounter.current++;
    setTapPoints(prev => [...prev, { points, x, y, id: pointId }]);
    
    setTimeout(() => {
      setTapPoints(prev => prev.filter(p => p.id !== pointId));
    }, 1000);
    
    const newTaps = localTarget.currentTaps + 1;
    setLocalTarget(prev => ({
      ...prev,
      currentTaps: newTaps
    }));
    
    if (newTaps >= localTarget.requiredTaps && localTarget.level === 1) {
      setLocalTarget(prev => ({
        ...prev,
        state: 'transitioning'
      }));
      
      setIsEvolvingAnimation(true);
      
      setTimeout(() => {
        onLevelUp();
        setIsEvolvingAnimation(false);
      }, 2000);
    }
    
    setTapAnimation(true);
    setTimeout(() => setTapAnimation(false), 150);
    
    if (authUser) {
      analytics.trackTap(state.characterType, localTarget.level, {x, y}, {
        energy: Math.round(state.energy.current),
        combo: newCombo.toFixed(1),
        points,
        currentTaps: newTaps,
        requiredTaps: localTarget.requiredTaps
      });
    }
    
    onTap(points);
  }, [localTarget, onTap, onLevelUp, user.energy.current, combo, lastTapTime, telegram, soundEnabled, audioLoaded.tap, authUser, analytics, state.characterType, state.energy.current]);

  const toggleSound = useCallback(() => {
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

  const toggleNature = useCallback(() => {
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

  const handleCloseEnergyModal = useCallback(() => {
    setShowEnergyEmptyModal(false);
    setHasDismissedEnergyModal(true);
    
    if (authUser) {
      analytics.trackAction('energy_empty_modal_close', {
        characterLevel: localTarget.level,
        characterType: state.characterType
      });
    }
  }, [analytics, authUser, localTarget.level, state.characterType]);

  const energyStatus = useMemo(() => {
    return Math.round(user.energy.current) > 0 ? "АКТИВНЫЙ" : "СПЯЩИЙ";
  }, [user.energy.current]);

  return (
    <div className="bg-gradient-to-b from-[#0f0c1d] via-[#1a1538] to-[#0f0c1d] min-h-screen p-4 pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center bg-gradient-to-r from-yellow-500 to-orange-500 text-transparent bg-clip-text">
            <SunIcon className="mr-2" size={24} />
            <h1 className="text-2xl font-extrabold tracking-wide">ТАП-ИГРА</h1>
          </div>
          <p className="text-sm text-gray-400 mt-1">Тапайте и зарабатывайте монеты</p>
        </div>

        {/* Stats Bar */}
        <div className="mb-6 bg-gradient-to-br from-[#2a1a4a] to-[#1a0e33] rounded-xl p-4 border border-purple-500/20 shadow-lg">
          <div className="flex justify-between items-center">
            {/* Level */}
            <div className="flex-1 pr-2">
              <p className="text-xs text-gray-400 mb-1">УРОВЕНЬ</p>
              <div className="flex items-center">
                <span className="text-white font-bold text-lg mr-2">{localTarget.level}</span>
                <ProgressBar 
                  current={localTarget.currentTaps % 100} 
                  max={100} 
                  height="h-2" 
                  className="flex-1" 
                
                />
              </div>
            </div>
            
            {/* Balance */}
            <div className="flex-1 px-2 border-l border-r border-purple-500/20">
              <p className="text-xs text-gray-400 mb-1">БАЛАНС</p>
              <div className="flex items-center justify-center">
                <span className="text-yellow-400 font-bold text-lg flex items-center">
                  {Math.round(user.score)}
                  <Bitcoin className="ml-1 text-yellow-400" size={18} />
                </span>
              </div>
            </div>
            
            {/* Rating */}
            <div className="flex-1 pl-2">
              <p className="text-xs text-gray-400 mb-1">РЕЙТИНГ</p>
              <div className="flex items-center">
                <span className="text-white font-bold text-lg mr-2">#{user.position || '?'}</span>
                <ProgressBar 
                  current={user.position ? Math.max(0, 100 - user.position) : 50}
                  max={100}
                  height="h-2"
                  className="flex-1"
                  
                />
              </div>
            </div>
          </div>
        </div>

        {/* Character Area */}
        <div className="relative bg-gradient-to-br from-[#1e183a] to-[#15122b] rounded-xl p-6 border border-purple-500/20 shadow-lg mb-6">
          {/* Sound Controls */}
          <div className="absolute top-4 right-4 flex space-x-2 z-10">
            <button 
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${
                soundEnabled 
                  ? 'bg-gradient-to-br from-yellow-500 to-orange-500' 
                  : 'bg-gradient-to-br from-gray-700 to-gray-800'
              }`}
              onClick={toggleSound}
            >
              {soundEnabled ? (
                <Volume2Icon className="w-5 h-5 text-white" />
              ) : (
                <VolumeXIcon className="w-5 h-5 text-gray-300" />
              )}
            </button>
            
            <button 
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${
                natureEnabled 
                  ? 'bg-gradient-to-br from-green-500 to-teal-500' 
                  : 'bg-gradient-to-br from-gray-700 to-gray-800'
              }`}
              onClick={toggleNature}
            >
              <Music2Icon className={`w-5 h-5 ${natureEnabled ? 'text-white' : 'text-gray-300'}`} />
            </button>
          </div>
          
          {/* Character */}
          <div 
            ref={tapAreaRef}
            className="relative cursor-pointer select-none mx-auto w-full flex justify-center"
            onClick={handleTap}
          >
            <div ref={characterRef}>
              <CharacterView 
                isAnimating={tapAnimation}
                isEvolvingAnimation={isEvolvingAnimation}
                onTap={handleTap}
                level={localTarget.level}
                characterType="yasuko"
              />
            </div>
            
            {showPhrase && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-black/50 px-3 py-2 rounded-lg text-white text-sm whitespace-nowrap animate-fade-in-down z-20">
                {currentPhrase}
              </div>
            )}
            
            {tapPoints.map((point) => (
              <div 
                key={point.id}
                className="absolute pointer-events-none text-yellow-400 font-bold text-lg animate-float-up z-10"
                style={{ 
                  left: `${point.x}px`, 
                  top: `${point.y}px`,
                  textShadow: '0 0 8px rgba(255, 215, 0, 0.7)'
                }}
              >
                +{point.points}
              </div>
            ))}
          </div>
          
          {/* Character Info */}
          <div className="mt-6">
            <CharacterInfoCard 
              target={localTarget}
              energyStatus={energyStatus}
            />
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-xl p-4 border border-purple-500/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-purple-500/20 p-2 rounded-lg mr-3">
                <LeafIcon className="text-purple-400" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-white">ЭНЕРГИЯ</h3>
                <p className="text-sm text-gray-300">
                  {Math.round(user.energy.current)}/{user.energy.max} ({energyStatus})
                </p>
              </div>
            </div>
            <div className="bg-black/30 px-4 py-2 rounded-lg border border-purple-500/30">
              <span className="font-bold text-purple-400 text-lg">x{combo.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Character Card Modal */}
      {showCharacterCard && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#1e183a] to-[#15122b] rounded-xl border border-purple-500/30 shadow-xl max-w-sm w-full p-4">
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

      {/* Energy Empty Modal */}
      {showEnergyEmptyModal && (
        <EnergyEmptyModal onClose={handleCloseEnergyModal} />
      )}
    </div>
  );
});

export default TapGame;