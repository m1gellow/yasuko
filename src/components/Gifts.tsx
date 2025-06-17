import React, { useState } from 'react';
import { GiftIcon, CalendarIcon, ClockIcon, CheckIcon, LockIcon } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

interface GiftItemProps {
  number: number;
  title: string;
  threshold: number;
  unlocked?: boolean;
  onClaim?: () => void;
}

const GiftItem: React.FC<GiftItemProps> = ({ number, title, threshold, unlocked = false, onClaim }) => {
  return (
    <div className={`bg-[#252538] p-3 rounded-lg ${unlocked ? 'border border-yellow-500' : ''}`}>
      <div className="flex items-start">
        <div className={`rounded-full flex items-center justify-center w-10 h-10 mr-3 ${unlocked ? 'bg-yellow-500 text-black' : 'bg-[#323248] text-gray-400'}`}>
          {number}
        </div>
        <div className="flex-grow">
          <div className="flex justify-between">
            <h4 className="font-medium">{title}</h4>
            {unlocked ? (
              <button 
                onClick={onClaim}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm"
              >
                Получить
              </button>
            ) : (
              <span className="text-gray-400 flex items-center">
                <LockIcon size={14} className="mr-1" />
                {threshold}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface SeasonSectionProps {
  season: string;
  daysLeft: number;
  progress: number;
  maxProgress: number;
}

const SeasonSection: React.FC<SeasonSectionProps> = ({ season, daysLeft, progress, maxProgress }) => {
  return (
    <div className="bg-[#252538] rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg text-yellow-400">{season}</h3>
        <div className="flex items-center text-sm">
          <ClockIcon size={14} className="mr-1 text-gray-400" />
          <span>Осталось: {daysLeft} дней</span>
        </div>
      </div>
      
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span>Прогресс сезона</span>
          <span>{progress}/{maxProgress}</span>
        </div>
        <div className="w-full bg-[#323248] h-2 rounded-full overflow-hidden">
          <div 
            className="bg-yellow-500 h-full"
            style={{ width: `${(progress / maxProgress) * 100}%` }}
          />
        </div>
      </div>
      
      <p className="text-sm text-gray-400">
        Собирайте очки каждый день, чтобы получить все сезонные награды до окончания сезона!
      </p>
    </div>
  );
};

interface TaskItemProps {
  title: string;
  description: string;
  progress: number;
  goal: number;
  reward: string;
  completed?: boolean;
  onComplete?: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ 
  title, 
  description, 
  progress, 
  goal, 
  reward, 
  completed = false,
  onComplete 
}) => {
  return (
    <div className="bg-[#252538] p-3 rounded-lg mb-3">
      <div className="flex justify-between mb-2">
        <h4 className="font-medium">{title}</h4>
        <span className="text-yellow-500">{reward}</span>
      </div>
      
      <p className="text-sm text-gray-400 mb-2">{description}</p>
      
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span>Прогресс</span>
          <span>{progress}/{goal}</span>
        </div>
        <div className="w-full bg-[#323248] h-2 rounded-full overflow-hidden">
          <div 
            className={`h-full ${completed ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(100, (progress / goal) * 100)}%` }}
          />
        </div>
      </div>
      
      {completed && (
        <button 
          onClick={onComplete}
          className="w-full bg-green-500 text-white py-1 rounded font-medium text-sm"
        >
          <CheckIcon size={14} className="inline mr-1" />
          Завершено
        </button>
      )}
    </div>
  );
};

interface RewardItemProps {
  level: number;
  description: string;
  isUnlocked: boolean;
  onClaim?: () => void;
}

const RewardItem: React.FC<RewardItemProps> = ({ level, description, isUnlocked, onClaim }) => {
  return (
    <div className={`bg-[#252538] p-3 rounded-lg mb-3 ${isUnlocked ? 'border border-yellow-500' : ''}`}>
      <div className="flex items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${isUnlocked ? 'bg-yellow-500 text-black' : 'bg-[#323248] text-gray-400'}`}>
          {level}
        </div>
        
        <div className="flex-grow">
          <p className="text-sm">{description}</p>
        </div>
        
        {isUnlocked && (
          <button 
            onClick={onClaim}
            className="bg-green-500 text-white px-3 py-1 rounded text-sm"
          >
            Получить
          </button>
        )}
      </div>
    </div>
  );
};

const Gifts: React.FC = () => {
  const { state } = useGame();
  const [activeTab, setActiveTab] = useState<'seasons' | 'rewards' | 'tasks'>('seasons');
  
  // Данные для сезонных подарков
  const seasonGifts = [
    { number: 1, title: "+100 МОНЕТ", threshold: 100, unlocked: true },
    { number: 2, title: "+50 ЭНЕРГИИ", threshold: 200, unlocked: false },
    { number: 3, title: "АКСЕССУАР: ШЛЯПА", threshold: 400, unlocked: false },
    { number: 4, title: "+200 МОНЕТ", threshold: 600, unlocked: false },
    { number: 5, title: "БОНУС X2 МОНЕТЫ (24Ч)", threshold: 800, unlocked: false },
    { number: 6, title: "ЭКСКЛЮЗИВНЫЙ ФОН", threshold: 1000, unlocked: false },
    { number: 7, title: "+500 МОНЕТ", threshold: 1200, unlocked: false },
  ];
  
  // Данные для наград за уровни
  const levelRewards = [
    { level: 2, description: "Эволюция персонажа: ЯЙЦО", isUnlocked: state.level.current >= 2 },
    { level: 3, description: "Эволюция персонажа: ПАВЛИН ЯСУКО", isUnlocked: state.level.current >= 3 },
    { level: 4, description: "Эволюция персонажа: СУПЕР ЯСУКО", isUnlocked: state.level.current >= 4 },
    { level: 5, description: "+200 К МАКСИМАЛЬНОЙ ЭНЕРГИИ", isUnlocked: state.level.current >= 5 },
    { level: 6, description: "УНИКАЛЬНЫЙ АКСЕССУАР", isUnlocked: state.level.current >= 6 },
  ];
  
  // Данные для ежедневных заданий
  const dailyTasks = [
    { 
      title: "Ежедневные тапы", 
      description: "Сделайте 100 тапов за день", 
      progress: state.dailyTasks.tapProgress, 
      goal: state.dailyTasks.tapTarget, 
      reward: "+50 МОН", 
      completed: state.dailyTasks.tapProgress >= state.dailyTasks.tapTarget && !state.dailyTasks.completedToday
    },
    { 
      title: "Покормите питомца", 
      description: "Покормите вашего питомца 3 раза сегодня", 
      progress: 1, 
      goal: 3, 
      reward: "+25 МОН", 
      completed: false
    },
    { 
      title: "Поднимитесь в рейтинге", 
      description: "Поднимитесь на 5 позиций в рейтинге", 
      progress: 2, 
      goal: 5, 
      reward: "+100 МОН", 
      completed: false
    },
  ];

  // Обработчики событий
  const handleClaimGift = (number: number) => {
    console.log(`Claiming gift ${number}`);
    // Здесь будет логика получения подарка
  };
  
  const handleClaimReward = (level: number) => {
    console.log(`Claiming reward for level ${level}`);
    // Здесь будет логика получения награды за уровень
  };
  
  const handleCompleteTask = (title: string) => {
    console.log(`Completing task: ${title}`);
    // Здесь будет логика завершения задания
  };

  return (
    <div className="bg-[#1E1E2D] min-h-screen p-4 pb-20 text-white">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-yellow-500">ПОДАРКИ И НАГРАДЫ</h1>
      </div>
      
      {/* Табы */}
      <div className="flex mb-4 border-b border-[#323248]">
        <button 
          className={`flex-1 py-2 text-center ${activeTab === 'seasons' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-gray-400'}`}
          onClick={() => setActiveTab('seasons')}
        >
          Сезон
        </button>
        <button 
          className={`flex-1 py-2 text-center ${activeTab === 'rewards' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-gray-400'}`}
          onClick={() => setActiveTab('rewards')}
        >
          Уровни
        </button>
        <button 
          className={`flex-1 py-2 text-center ${activeTab === 'tasks' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-gray-400'}`}
          onClick={() => setActiveTab('tasks')}
        >
          Задания
        </button>
      </div>
      
      {/* Содержимое для вкладки Сезон */}
      {activeTab === 'seasons' && (
        <div>
          <SeasonSection 
            season="ВЕСЕННИЙ СЕЗОН" 
            daysLeft={31} 
            progress={150} 
            maxProgress={1200} 
          />
          
          <h3 className="font-bold mb-3 flex items-center">
            <GiftIcon size={18} className="text-yellow-500 mr-2" />
            СЕЗОННЫЕ ПОДАРКИ
          </h3>
          
          <div className="space-y-3 mb-6">
            {seasonGifts.map((gift) => (
              <GiftItem 
                key={gift.number}
                number={gift.number}
                title={gift.title}
                threshold={gift.threshold}
                unlocked={gift.unlocked}
                onClaim={() => handleClaimGift(gift.number)}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Содержимое для вкладки Уровни */}
      {activeTab === 'rewards' && (
        <div>
          <div className="bg-yellow-500 text-black p-4 rounded-lg mb-4">
            <div className="flex items-center">
              <div className="rounded-full bg-black text-white w-12 h-12 flex items-center justify-center text-xl font-bold mr-4">
                {state.level.current}
              </div>
              <div>
                <h3 className="font-bold text-lg">ВАШ ТЕКУЩИЙ УРОВЕНЬ</h3>
                <p className="text-sm">
                  Развивайте вашего персонажа, чтобы получать награды за уровни
                </p>
              </div>
            </div>
          </div>
          
          <h3 className="font-bold mb-3">НАГРАДЫ ЗА УРОВНИ</h3>
          
          <div className="space-y-3 mb-6">
            {levelRewards.map((reward) => (
              <RewardItem 
                key={reward.level}
                level={reward.level}
                description={reward.description}
                isUnlocked={reward.isUnlocked}
                onClaim={() => handleClaimReward(reward.level)}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Содержимое для вкладки Задания */}
      {activeTab === 'tasks' && (
        <div>
          <div className="bg-[#252538] p-4 rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CalendarIcon size={18} className="text-yellow-500 mr-2" />
                <h3 className="font-bold">ЕЖЕДНЕВНЫЕ ЗАДАНИЯ</h3>
              </div>
              <div className="bg-yellow-500 text-black px-2 py-1 rounded-full text-xs">
                {new Date().toLocaleDateString('ru-RU')}
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Выполняйте задания каждый день, чтобы получать бонусы и продвигаться в сезоне.
            </p>
          </div>
          
          <div className="space-y-3 mb-6">
            {dailyTasks.map((task, index) => (
              <TaskItem 
                key={index}
                title={task.title}
                description={task.description}
                progress={task.progress}
                goal={task.goal}
                reward={task.reward}
                completed={task.completed}
                onComplete={() => handleCompleteTask(task.title)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Gifts;