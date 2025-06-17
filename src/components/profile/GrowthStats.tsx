import React, { useEffect, useState, useRef } from 'react';
import { TrendingUpIcon, AlertCircle } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface GrowthStatsProps {
  tapData: number[];
  coinData: number[];
  averageTaps: number;
  averageCoins: number;
  totalTaps: number;
  performance: string;
}

const GrowthStats: React.FC<GrowthStatsProps> = ({
  tapData: initialTapData,
  coinData: initialCoinData,
  averageTaps: initialAvgTaps,
  averageCoins: initialAvgCoins,
  totalTaps: initialTotalTaps,
  performance: initialPerformance
}) => {
  const { user } = useAuth();
  const [tapData, setTapData] = useState<number[]>(initialTapData);
  const [coinData, setCoinData] = useState<number[]>(initialCoinData);
  const [averageTaps, setAverageTaps] = useState<number>(initialAvgTaps);
  const [averageCoins, setAverageCoins] = useState<number>(initialAvgCoins);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [trend, setTrend] = useState<string>('стабильный');
  const [consistency, setConsistency] = useState<string>('стабильный');
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coinCanvasRef = useRef<HTMLCanvasElement>(null);

  // Загрузка реальных данных из Supabase
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    const fetchUserStats = async () => {
      setIsLoading(true);
      
      try {
        // Получаем статистику действий за последние 7 дней
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: statsData, error } = await supabase
          .from('user_stats')
          .select('action, timestamp')
          .eq('user_id', user.id)
          .gte('timestamp', sevenDaysAgo.toISOString())
          .order('timestamp', { ascending: true });
          
        if (error) {
          console.error('Ошибка при получении статистики:', error);
          setIsLoading(false);
          return;
        }
        
        if (!statsData || statsData.length === 0) {
          setIsLoading(false);
          return; // Используем начальные данные
        }
        
        // Группируем данные по дням
        const dayBuckets: { [key: string]: { taps: number, coins: number } } = {};
        
        // Инициализируем последние 7 дней
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateKey = date.toISOString().split('T')[0];
          dayBuckets[dateKey] = { taps: 0, coins: 0 };
        }
        
        // Заполняем данными
        statsData.forEach(stat => {
          const dateKey = stat.timestamp.split('T')[0];
          if (!dayBuckets[dateKey]) {
            dayBuckets[dateKey] = { taps: 0, coins: 0 };
          }
          
          if (stat.action === 'click') {
            dayBuckets[dateKey].taps++;
            dayBuckets[dateKey].coins++;
          }
        });
        
        // Преобразуем в массивы для отображения
        const orderedDays = Object.keys(dayBuckets).sort();
        const newTapData = orderedDays.slice(-7).map(day => dayBuckets[day]?.taps || 0);
        const newCoinData = orderedDays.slice(-7).map(day => dayBuckets[day]?.coins || 0);
        
        // Вычисляем средние значения
        const newAvgTaps = Math.round(newTapData.reduce((sum, val) => sum + val, 0) / 7);
        const newAvgCoins = Math.round(newCoinData.reduce((sum, val) => sum + val, 0) / 7);
        
        setTapData(newTapData);
        setCoinData(newCoinData);
        setAverageTaps(newAvgTaps);
        setAverageCoins(newAvgCoins);
        
        // Анализируем тренд
        analyzeTrend(newTapData);
      } catch (error) {
        console.error('Ошибка при загрузке статистики роста:', error);
        setError('Не удалось загрузить статистику. Пожалуйста, попробуйте позже.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserStats();
  }, [user]);
  
  // Рисуем график тапов
  useEffect(() => {
    if (!canvasRef.current || isLoading) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Настраиваем размер canvas
    const devicePixelRatio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // Очищаем canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Определяем максимальное значение
    const maxValue = Math.max(...tapData, 1);
    
    // Отступы
    const padding = { top: 10, right: 10, bottom: 20, left: 30 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;
    
    // Рисуем оси
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(75, 85, 99, 0.3)';
    ctx.lineWidth = 1;
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();
    
    // Рисуем горизонтальные линии сетки
    ctx.textAlign = 'right';
    ctx.font = '10px Rubik, sans-serif';
    ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
    
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      const value = maxValue - (maxValue / gridLines) * i;
      
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(75, 85, 99, 0.1)';
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
      
      ctx.fillText(Math.round(value).toString(), padding.left - 5, y + 4);
    }
    
    // Рисуем дни недели
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const barWidth = chartWidth / tapData.length - 4;
    
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
    
    // Рисуем столбцы
    tapData.forEach((value, index) => {
      const x = padding.left + (chartWidth / tapData.length) * index + (chartWidth / tapData.length - barWidth) / 2;
      const barHeight = (value / maxValue) * chartHeight;
      const y = padding.top + chartHeight - barHeight;
      
      // Рисуем столбец
      ctx.beginPath();
      const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.9)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.5)');
      ctx.fillStyle = gradient;
      ctx.roundRect(x, y, barWidth, barHeight, 3);
      ctx.fill();
      
      // Подпись дня недели
      ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
      ctx.fillText(days[index], x + barWidth / 2, padding.top + chartHeight + 15);
    });
    
  }, [tapData, isLoading]);
  
  // Рисуем график монет
  useEffect(() => {
    if (!coinCanvasRef.current || isLoading) return;
    
    const canvas = coinCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Настраиваем размер canvas
    const devicePixelRatio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // Очищаем canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Определяем максимальное значение
    const maxValue = Math.max(...coinData, 1);
    
    // Отступы
    const padding = { top: 10, right: 10, bottom: 20, left: 30 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;
    
    // Рисуем оси
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(75, 85, 99, 0.3)';
    ctx.lineWidth = 1;
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();
    
    // Рисуем горизонтальные линии сетки
    ctx.textAlign = 'right';
    ctx.font = '10px Rubik, sans-serif';
    ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
    
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      const value = maxValue - (maxValue / gridLines) * i;
      
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(75, 85, 99, 0.1)';
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
      
      ctx.fillText(Math.round(value).toString(), padding.left - 5, y + 4);
    }
    
    // Рисуем дни недели
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const barWidth = chartWidth / coinData.length - 4;
    
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
    
    // Рисуем столбцы
    coinData.forEach((value, index) => {
      const x = padding.left + (chartWidth / coinData.length) * index + (chartWidth / coinData.length - barWidth) / 2;
      const barHeight = (value / maxValue) * chartHeight;
      const y = padding.top + chartHeight - barHeight;
      
      // Рисуем столбец
      ctx.beginPath();
      const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
      gradient.addColorStop(0, 'rgba(234, 179, 8, 0.9)');
      gradient.addColorStop(1, 'rgba(234, 179, 8, 0.5)');
      ctx.fillStyle = gradient;
      ctx.roundRect(x, y, barWidth, barHeight, 3);
      ctx.fill();
      
      // Подпись дня недели
      ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
      ctx.fillText(days[index], x + barWidth / 2, padding.top + chartHeight + 15);
    });
    
  }, [coinData, isLoading]);
  
  // Используем TensorFlow.js для анализа тренда
  const analyzeTrend = (data: number[]) => {
    try {
      if (data.every(val => val === 0)) {
        setTrend('нейтральный');
        setConsistency('стабильный');
        return;
      }
      
      // Создаем тензор из данных
      const tapTensor = tf.tensor1d(data);
      const mean = tapTensor.mean();
      const std = tapTensor.sub(mean).square().mean().sqrt();
      
      // Нормализуем данные
      const normalized = tapTensor.sub(mean).div(std);
      
      // Проверяем тренд по последним значениям
      const values = normalized.arraySync() as number[];
      const trendValue = values.slice(-3).reduce((sum, val) => sum + val, 0);
      
      if (trendValue > 0.5) {
        setTrend('рост');
      } else if (trendValue < -0.5) {
        setTrend('падение');
      } else {
        setTrend('стабильный');
      }
      
      // Проверяем консистентность
      const stdValue = std.arraySync() as number;
      if (stdValue < 0.5) {
        setConsistency('стабильный');
      } else {
        setConsistency('нестабильный');
      }
      
      // Очищаем память
      tapTensor.dispose();
      mean.dispose();
      std.dispose();
      normalized.dispose();
    } catch (error) {
      console.error('Ошибка при анализе тренда:', error);
      setTrend('неопределенный');
      setConsistency('неопределенный');
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center mb-4">
        <TrendingUpIcon className="text-yellow-500 mr-2" size={20} />
        <h2 className="text-lg font-bold">СТАТИСТИКА РОСТА</h2>
      </div>
      
      <div className="bg-[#252538] p-4 rounded-lg shadow-lg">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md mb-4 flex items-start">
            <AlertCircle size={18} className="mr-2 mt-1 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h3 className="text-sm text-gray-400 mb-2">Динамика тапов</h3>
              <div className="bg-[#1E1E2D] rounded-lg p-2 h-[180px]">
                <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
              </div>
            </div>
            
            <div className="mb-5">
              <h3 className="text-sm text-gray-400 mb-2">Динамика монет</h3>
              <div className="bg-[#1E1E2D] rounded-lg p-2 h-[180px]">
                <canvas ref={coinCanvasRef} style={{ width: '100%', height: '100%' }} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-[#2D2D44] p-3 rounded-lg">
                <p className="text-sm text-gray-400">Среднее тапов/день</p>
                <p className="text-xl font-bold">{averageTaps}</p>
              </div>
              <div className="bg-[#2D2D44] p-3 rounded-lg">
                <p className="text-sm text-gray-400">Среднее монет/день</p>
                <p className="text-xl font-bold text-yellow-500">{averageCoins}</p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-[#2D2D44] rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm">Производительность:</span>
                <span className="text-yellow-500 font-bold">{initialPerformance}</span>
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Тренд: <span className={`font-medium ${trend === 'рост' ? 'text-green-400' : trend === 'падение' ? 'text-red-400' : 'text-gray-400'}`}>{trend}</span>, 
                Стабильность: <span className={`font-medium ${consistency === 'стабильный' ? 'text-green-400' : 'text-yellow-400'}`}>{consistency}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GrowthStats;