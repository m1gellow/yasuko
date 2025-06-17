import React, { useState, useEffect, useCallback } from 'react';
import { CalendarIcon, CheckCircleIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { userProgressService } from '../../services/userProgressService';
import { useTelegram } from '../../contexts/TelegramContext';

interface Task {
  id: number;
  title: string;
  progress: number;
  target: number;
  reward: number;
  completed: boolean;
  action?: () => void;
}

interface DailyTasksProps {
  tasks: Task[];
  timeLeft: string;
  totalReward: number;
}

const DailyTasks: React.FC<DailyTasksProps> = ({ tasks: initialTasks, timeLeft, totalReward }) => {
  const { user } = useAuth();
  const { telegram } = useTelegram();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [remainingTime, setRemainingTime] = useState(timeLeft);
  const [isLoading, setIsLoading] = useState(false);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Вычисление оставшегося времени до сброса
  const calculateRemainingTime = useCallback(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diffMs = tomorrow.getTime() - now.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHrs}ч ${diffMins}м`;
  }, []);

  // Загрузка актуальных задач из Supabase с кэшированием
  useEffect(() => {
    if (!user) return;
    
    const cacheKey = `daily_tasks_${user.id}`;
    const cachedData = localStorage.getItem(cacheKey);
    let shouldFetch = true;
    
    // Проверяем кэш - если данные есть и не старше 5 минут, используем их
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        const cacheAge = Date.now() - timestamp;
        
        // Кэш действителен 5 минут
        if (cacheAge < 5 * 60 * 1000) {
          setTasks(data.tasks);
          setCompletedTasksCount(data.completedCount);
          shouldFetch = false;
        }
      } catch (e) {
        console.error('Ошибка при чтении кэша:', e);
      }
    }
    
    if (shouldFetch) {
      fetchDailyTasks();
    }
    
    // Функция для загрузки задач
    async function fetchDailyTasks() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Получаем данные пользователя
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('total_clicks, feed_clicks, pet_clicks')
          .eq('id', user.id)
          .single();
          
        if (userError) {
          console.error('Ошибка при получении данных пользователя:', userError);
          setError('Не удалось загрузить данные пользователя');
          setIsLoading(false);
          return;
        }
        
        // Получаем ранг пользователя
        const { data: rankData, error: rankError } = await supabase.rpc('get_user_rank', { 
          user_id: user.id 
        });
        
        if (rankError) {
          console.error('Ошибка при получении ранга пользователя:', rankError);
        }
        
        // Проверяем выполненные сегодня задания
        const today = new Date().toISOString().split('T')[0];
        const { data: completedTasks, error: tasksError } = await supabase
          .from('user_stats')
          .select('action, data')
          .eq('user_id', user.id)
          .like('action', 'idle')
          .gte('timestamp', `${today}T00:00:00`)
          .lte('timestamp', `${today}T23:59:59`);
          
        if (tasksError) {
          console.error('Ошибка при получении выполненных заданий:', tasksError);
        }
        
        // Создаем список выполненных заданий
        const completedTaskIds: string[] = [];
        
        if (completedTasks) {
          completedTasks.forEach(task => {
            if (task.data && task.data.event === 'task_complete') {
              const taskId = task.data.task_id;
              if (taskId) completedTaskIds.push(taskId);
            }
          });
        }
        
        // Обновляем задачи
        const updatedTasks: Task[] = [
          {
            id: 1,
            title: "Сделать 100 тапов",
            progress: Math.min((userData.total_clicks % 100), 100),
            target: 100,
            reward: 200,
            completed: (userData.total_clicks % 100) >= 100 || completedTaskIds.includes('daily_taps')
          },
          {
            id: 2,
            title: "Покормить 3 раза",
            progress: Math.min((userData.feed_clicks % 3), 3),
            target: 3,
            reward: 150,
            completed: (userData.feed_clicks % 3) >= 3 || completedTaskIds.includes('daily_feed')
          },
          {
            id: 3,
            title: "Войти в топ-50",
            progress: rankData && rankData <= 50 ? 1 : 0,
            target: 1,
            reward: 300,
            completed: (rankData && rankData <= 50) || completedTaskIds.includes('daily_rank')
          },
          {
            id: 4,
            title: "Сыграть в мини-игру",
            progress: localStorage.getItem('nutCatcherGamesPlayed') ? 1 : 0,
            target: 1,
            reward: 100,
            completed: completedTaskIds.includes('daily_game'),
            action: () => {
              // Открываем мини-игру
              const event = new CustomEvent('open-mini-game');
              window.dispatchEvent(event);
            }
          }
        ];
        
        setTasks(updatedTasks);
        
        // Подсчитываем выполненные задания
        setCompletedTasksCount(updatedTasks.filter(task => task.completed).length);
        
        // Сохраняем в кэш
        localStorage.setItem(cacheKey, JSON.stringify({
          data: {
            tasks: updatedTasks,
            completedCount: updatedTasks.filter(task => task.completed).length
          },
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Ошибка при загрузке ежедневных заданий:', error);
        setError('Не удалось загрузить ежедневные задания');
      } finally {
        setIsLoading(false);
      }
    }
    
    // Обновляем оставшееся время каждую минуту
    const updateTime = () => {
      setRemainingTime(calculateRemainingTime());
    };
    
    updateTime(); // Начальное обновление
    const interval = setInterval(updateTime, 60000);
    
    // Добавляем слушатель события открытия мини-игры
    const handleOpenMiniGame = () => {
      const miniGameTask = tasks.find(task => task.id === 4);
      if (miniGameTask && miniGameTask.action) {
        miniGameTask.action();
      }
    };
    
    window.addEventListener('open-mini-game', handleOpenMiniGame);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('open-mini-game', handleOpenMiniGame);
    };
  }, [user, calculateRemainingTime]);
  
  // Обработка выполнения задания
  const handleCompleteTask = async (task: Task) => {
    if (!user || task.completed) return;
    
    // Проверяем, выполнена ли задача
    if (task.progress < task.target) {
      // Если у задачи есть действие, выполняем его
      if (task.action) {
        // Хаптик-фидбек перед выполнением действия
        if (telegram?.HapticFeedback) {
          telegram.HapticFeedback.impactOccurred('light');
        }
        
        task.action();
        return;
      }
      
      alert('Задание еще не выполнено!');
      return;
    }
    
    // Хаптик-фидбек перед выполнением действия
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Сохраняем данные о выполнении задания
      await supabase.from('user_stats').insert({
        user_id: user.id,
        action: 'idle',
        data: {
          event: 'task_complete',
          task_id: `daily_${task.id === 1 ? 'taps' : task.id === 2 ? 'feed' : task.id === 3 ? 'rank' : 'game'}`,
          reward: task.reward,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
      
      // Начисляем награду
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          total_clicks: supabase.rpc('increment', { value: task.reward })
        })
        .eq('id', user.id);
        
      if (updateError) {
        throw new Error('Не удалось начислить награду');
      }
      
      // Создаем уведомление
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'reward',
        title: 'Ежедневное задание выполнено!',
        message: `Вы получили ${task.reward} монет за выполнение задания "${task.title}"`,
        is_read: false,
        data: {
          task_id: task.id,
          task_title: task.title,
          reward: task.reward
        }
      });
      
      // Обновляем локальное состояние
      setTasks(prev => 
        prev.map(t => t.id === task.id ? { ...t, completed: true } : t)
      );
      
      setCompletedTasksCount(prev => prev + 1);
      
      // Хаптик-фидбек при успешном выполнении
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('success');
      }
      
      // Обновляем кэш
      const cacheKey = `daily_tasks_${user.id}`;
      const cachedDataString = localStorage.getItem(cacheKey);
      if (cachedDataString) {
        try {
          const cachedData = JSON.parse(cachedDataString);
          const updatedTasks = cachedData.data.tasks.map((t: Task) => 
            t.id === task.id ? { ...t, completed: true } : t
          );
          
          localStorage.setItem(cacheKey, JSON.stringify({
            data: {
              tasks: updatedTasks,
              completedCount: completedTasksCount + 1
            },
            timestamp: Date.now()
          }));
        } catch (e) {
          console.error('Ошибка при обновлении кэша:', e);
        }
      }
      
      // Показываем сообщение
      alert(`Поздравляем! Вы получили награду: ${task.reward} монет!`);
    } catch (error) {
      console.error('Ошибка при выполнении задания:', error);
      setError('Произошла ошибка при выполнении задания');
      
      // Хаптик-фидбек при ошибке
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <CalendarIcon className="text-yellow-500 mr-2" size={20} />
          <h2 className="text-lg font-bold">ЕЖЕДНЕВНЫЕ ЗАДАНИЯ</h2>
        </div>
        <span className="text-sm text-gray-400">Сброс через: {remainingTime}</span>
      </div>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md mb-4 flex items-start">
          <AlertCircle size={18} className="mr-2 mt-1 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      <div className="bg-[#252538] p-4 rounded-lg shadow-lg">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="bg-[#2D2D44] p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">{task.title}</h3>
                  <span className="text-yellow-500 font-bold">+{task.reward}</span>
                </div>
                
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{task.progress}/{task.target}</span>
                    <span>{Math.round((task.progress / task.target) * 100)}%</span>
                  </div>
                  <div className="w-full bg-[#323248] h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${task.completed ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, (task.progress / task.target) * 100)}%` }}
                    />
                  </div>
                </div>
                
                {task.completed ? (
                  <div className="flex items-center text-green-500 text-sm">
                    <CheckCircleIcon size={14} className="mr-1" />
                    <span>Выполнено</span>
                  </div>
                ) : task.progress >= task.target ? (
                  <button
                    onClick={() => handleCompleteTask(task)}
                    className="w-full bg-green-500 text-white py-2 rounded font-medium text-sm mt-2 hover:bg-green-600 transition-colors"
                  >
                    Получить награду
                  </button>
                ) : task.action ? (
                  <button
                    onClick={() => handleCompleteTask(task)}
                    className="w-full bg-blue-500 text-white py-2 rounded font-medium text-sm mt-2 hover:bg-blue-600 transition-colors"
                  >
                    Выполнить задание
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 bg-yellow-500/20 p-3 rounded-lg flex items-center justify-between">
          <span className="text-sm">Выполнено заданий: {completedTasksCount}/{tasks.length}</span>
          <span className="font-bold text-yellow-500">+{totalReward} МОНЕТ</span>
        </div>
        
        {completedTasksCount === tasks.length && (
          <div className="mt-2 bg-green-500/20 p-2 rounded text-center text-green-300 text-sm">
            <p>Поздравляем! Вы выполнили все задания на сегодня!</p>
            <p>Проверьте профиль завтра для новых заданий</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyTasks;