import React, { useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useTelegram } from '../../contexts/TelegramContext';
import { storage } from '../../utils/storage';
import OnboardingSlide from './OnboardingSlide';
import { XIcon, ArrowRight, ArrowLeft } from 'lucide-react';

// Константа для localStorage
const ONBOARDING_COMPLETED_KEY = 'app:onboardingCompleted';

// Слайды онбординга с информацией
const slides = [
  {
    id: 1,
    title: 'Добро пожаловать в Ясуко!',
    description: 'Здесь ваш персонаж эволюционирует от простого Ореха до удивительного Павлина Ясуко благодаря вашему уходу и вниманию.',
    image: '/assets/oreh.png',
    animationClass: 'animate-float'
  },
  {
    id: 2,
    title: 'Основная механика',
    description: 'Тапайте по персонажу, чтобы заработать монеты и рейтинг! Каждый тап расходует 1 энергию, но приближает вас к эволюции.',
    image: '/assets/vibro1.png',
    animationClass: 'animate-pulse'
  },
  {
    id: 3,
    title: 'Заботьтесь о питомце',
    description: 'Регулярно кормите и играйте с питомцем, чтобы поддерживать его здоровье и счастье. Здоровый питомец быстрее развивается!',
    image: '/assets/belka.png',
    animationClass: 'animate-float'
  },
  {
    id: 4,
    title: 'Соревнуйтесь и побеждайте',
    description: 'Участвуйте в еженедельных турнирах, поднимайтесь в рейтинге и выигрывайте ценные призы! Приглашайте друзей для получения бонусов.',
    image: '/assets/korzina.png',
    animationClass: ''
  },
  {
    id: 5,
    title: 'Собирайте достижения',
    description: 'Выполняйте задания, собирайте ачивки и обменивайте их на реальные призы! 10 значков = 1000₽!',
    image: '/assets/dub.png',
    animationClass: ''
  }
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFinalSlide, setIsFinalSlide] = useState(false);
  const { telegram } = useTelegram();
  const { dispatch } = useGame();
  
  // Проверяем, является ли текущий слайд последним
  useEffect(() => {
    setIsFinalSlide(currentSlide === slides.length - 1);
  }, [currentSlide]);
  
  // Навигация по слайдам
  const nextSlide = () => {
    // Хаптик-фидбек при переключении слайда
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };
  
  const prevSlide = () => {
    // Хаптик-фидбек при переключении слайда
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };
  
  // Завершение онбординга
  const completeOnboarding = () => {
    // Хаптик-фидбек при завершении
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    // Сохраняем информацию о том, что онбординг пройден
    storage.set(ONBOARDING_COMPLETED_KEY, true);
    
    // Даем стартовый бонус
    dispatch({ 
      type: 'CLAIM_REWARD', 
      payload: { type: 'coins', amount: 50 } 
    });
    
    dispatch({ 
      type: 'CLAIM_REWARD', 
      payload: { type: 'energy', amount: 50 } 
    });
    
    // Вызываем колбэк завершения
    onComplete();
  };
  
  // Пропуск онбординга
  const skipOnboarding = () => {
    // Хаптик-фидбек при пропуске
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
    
    // Сохраняем информацию о том, что онбординг пройден
    storage.set(ONBOARDING_COMPLETED_KEY, true);
    
    // Даем стартовый бонус
    dispatch({ 
      type: 'CLAIM_REWARD', 
      payload: { type: 'coins', amount: 50 } 
    });
    
    dispatch({ 
      type: 'CLAIM_REWARD', 
      payload: { type: 'energy', amount: 50 } 
    });
    
    // Вызываем колбэк завершения
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#1a1625] to-[#0d0b12] z-50 flex flex-col items-center">
      {/* Кнопка пропуска */}
      <button 
        className="absolute top-4 right-4 text-gray-400 hover:text-white"
        onClick={skipOnboarding}
      >
        <XIcon size={24} />
      </button>
      
      {/* Контент текущего слайда */}
      <div className="flex-1 flex items-center justify-center w-full">
        <OnboardingSlide 
          slide={slides[currentSlide]} 
          isActive={true}
        />
      </div>
      
      {/* Индикаторы слайдов */}
      <div className="flex justify-center space-x-2 mb-4">
        {slides.map((_, index) => (
          <div 
            key={index} 
            className={`w-2 h-2 rounded-full ${
              index === currentSlide ? 'bg-yellow-500' : 'bg-gray-500'
            }`}
          />
        ))}
      </div>
      
      {/* Кнопки навигации */}
      <div className="flex justify-between items-center w-full px-8 pb-8">
        <button
          onClick={prevSlide}
          className={`p-2 rounded-full ${
            currentSlide === 0 ? 'text-gray-600' : 'text-white bg-[#252538]'
          }`}
          disabled={currentSlide === 0}
        >
          <ArrowLeft size={24} />
        </button>
        
        <button
          onClick={nextSlide}
          className="bg-yellow-500 text-black px-6 py-2 rounded-full font-bold flex items-center"
        >
          {isFinalSlide ? (
            'Начать игру'
          ) : (
            <>
              Далее
              <ArrowRight size={20} className="ml-2" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default OnboardingScreen;