import React, { useState, useEffect } from 'react';
import { BrainIcon, LineChart, TrendingUpIcon, AlertCircle } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import { useAuth } from '../../contexts/AuthContext';
import { userProgressService } from '../../services/userProgressService';
import { supabase } from '../../lib/supabase';
import { useTelegram } from '../../contexts/TelegramContext';

interface AIAnalysisProps {
  tapData: number[];
  coinData: number[];
  performance: string;
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ tapData, coinData, performance }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
  const [lastAnalysisDate, setLastAnalysisDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tfLoaded, setTfLoaded] = useState(false);
  const { user } = useAuth();
  const { telegram } = useTelegram();

  // Загрузка TensorFlow.js
  useEffect(() => {
    const loadTensorFlow = async () => {
      try {
        await tf.ready();
        setTfLoaded(true);
      } catch (err) {
        console.error('Ошибка при загрузке TensorFlow.js:', err);
        setError('Не удалось загрузить аналитический модуль');
      }
    };
    
    loadTensorFlow();
  }, []);

  // Получаем последний анализ при монтировании компонента
  useEffect(() => {
    const fetchLastAnalysis = async () => {
      if (!user) return;

      try {
        // Получаем последнюю запись из user_stats с типом действия ai_analysis
        const { data, error } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .eq('action', 'idle') // Используем разрешенные значения из check constraint
          .order('timestamp', { ascending: false })
          .limit(1);

        if (error || !data || data.length === 0) {
          return;
        }

        // Получаем результат анализа из data поля
        const lastAnalysisData = data[0];
        if (lastAnalysisData.data && lastAnalysisData.data.analysis) {
          setLastAnalysis(lastAnalysisData.data.analysis);
          setLastAnalysisDate(new Date(lastAnalysisData.timestamp).toLocaleString('ru-RU'));
        }
      } catch (error) {
        console.error('Ошибка при получении последнего анализа:', error);
      }
    };

    fetchLastAnalysis();
  }, [user]);

  const performAnalysis = async () => {
    if (!user) {
      setError("Пожалуйста, войдите в систему, чтобы получить AI анализ.");
      return;
    }
    
    if (!tfLoaded) {
      setError("Аналитический модуль не загружен. Пожалуйста, попробуйте позже.");
      return;
    }

    // Хаптик-фидбек перед анализом
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }

    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Используем TensorFlow.js для анализа данных
      const tapTensor = tf.tensor1d(tapData);
      const coinTensor = tf.tensor1d(coinData);
      
      // Базовая статистика
      const tapSum = tapTensor.sum().dataSync()[0];
      const coinSum = coinTensor.sum().dataSync()[0];
      
      const tapMean = tapTensor.mean().dataSync()[0];
      const coinMean = coinTensor.mean().dataSync()[0];
      
      // Анализ тренда (наклон линии тренда)
      const x = tf.tensor1d([0, 1, 2, 3, 4, 5, 6]);
      const tapSlope = tf.tidy(() => {
        const xMean = x.mean();
        const tapMean = tapTensor.mean();
        const xDev = x.sub(xMean);
        const tapDev = tapTensor.sub(tapMean);
        return xDev.mul(tapDev).sum().div(xDev.square().sum());
      }).dataSync()[0];
      
      const coinSlope = tf.tidy(() => {
        const xMean = x.mean();
        const coinMean = coinTensor.mean();
        const xDev = x.sub(xMean);
        const coinDev = coinTensor.sub(coinMean);
        return xDev.mul(coinDev).sum().div(xDev.square().sum());
      }).dataSync()[0];
      
      // Анализируем данные
      let trend = "нейтральный";
      if (tapSlope > 0.5) trend = "растущий";
      else if (tapSlope < -0.5) trend = "падающий";
      
      let consistency = "стабильный";
      const tapStd = tapTensor.sub(tapMean).square().mean().sqrt().dataSync()[0];
      if (tapStd / tapMean > 0.5) consistency = "нестабильный";
      
      // Генерируем анализ на основе данных
      let analysisText = `Анализ вашей активности за неделю: вы сделали ${Math.round(tapSum)} тапов со средним значением ${Math.round(tapMean)} в день. `;
      
      if (tapSlope > 0.5) {
        analysisText += "Ваша активность стабильно растет! Продолжайте в том же духе. ";
      } else if (tapSlope > 0) {
        analysisText += "Вы показываете небольшой рост активности. Можно еще лучше! ";
      } else {
        analysisText += "Активность немного снижается. Не забывайте ежедневно играть для лучших результатов. ";
      }
      
      if (coinSum > 500) {
        analysisText += "Вы отлично накапливаете монеты! ";
      }
      
      if (tapStd / tapMean > 0.5) {
        analysisText += "Ваша активность нестабильна - попробуйте играть более регулярно каждый день. ";
      } else {
        analysisText += "У вас хорошая ежедневная стабильность активности. ";
      }
      
      // Добавляем рекомендации
      analysisText += "\n\nРекомендации: ";
      
      if (tapMean < 20) {
        analysisText += "Увеличьте количество ежедневных тапов, чтобы быстрее расти. ";
      }
      
      if (consistency === "нестабильный") {
        analysisText += "Старайтесь играть каждый день примерно одинаковое время для лучшего прогресса. ";
      }
      
      if (coinSlope < 0) {
        analysisText += "Обратите внимание на накопление монет - у вас наблюдается тенденция к снижению. ";
      }
      
      // Сохраняем результат анализа в системе
      try {
        // Записываем действие в базу данных - используем 'idle' как разрешенное значение
        await supabase
          .from('user_stats')
          .insert([{
            user_id: user.id,
            action: 'idle',
            timestamp: new Date().toISOString(),
            data: {
              event: 'ai_analysis',
              analysis: analysisText,
              metrics: {
                tapSum, coinSum, tapMean, coinMean, tapSlope, coinSlope, 
                trend, consistency, tapStd
              }
            }
          }]);
      } catch (dbError) {
        console.error('Ошибка при сохранении результатов анализа:', dbError);
      }
      
      setAnalysis(analysisText);
      setLastAnalysis(analysisText);
      setLastAnalysisDate(new Date().toLocaleString('ru-RU'));
      
      // Хаптик-фидбек при завершении анализа
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('success');
      }
      
      // Очищаем память TensorFlow
      tf.dispose([tapTensor, coinTensor, x]);
      
    } catch (error) {
      console.error('Ошибка при выполнении AI анализа:', error);
      setError("Не удалось выполнить анализ. Пожалуйста, попробуйте позже.");
      
      // Хаптик-фидбек при ошибке
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center mb-4">
        <BrainIcon className="text-purple-500 mr-2" size={20} />
        <h2 className="text-lg font-bold">AI АНАЛИЗ ИГРОКА</h2>
      </div>
      
      <div className="bg-[#252538] p-4 rounded-lg shadow-lg">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md mb-4 flex items-start">
            <AlertCircle size={18} className="mr-2 mt-1 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        {analysis ? (
          <div className="space-y-3">
            <div className="bg-[#2D2D44] p-3 rounded-lg">
              <div className="flex items-start mb-2">
                <LineChart size={16} className="text-blue-400 mt-1 mr-2 flex-shrink-0" />
                <div>
                  <p className="whitespace-pre-line text-sm">{analysis}</p>
                  <div className="text-xs text-gray-400 mt-3">Анализ от: {lastAnalysisDate}</div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setAnalysis(null)}
              className="w-full bg-purple-500 text-white py-2 rounded-lg font-medium hover:bg-purple-600 transition-colors"
            >
              Новый анализ
            </button>
          </div>
        ) : (
          <div>
            {lastAnalysis ? (
              <div className="mb-4 bg-[#2D2D44] p-3 rounded-lg">
                <div className="flex items-start">
                  <TrendingUpIcon size={16} className="text-blue-400 mt-1 mr-2 flex-shrink-0" />
                  <div>
                    <p className="whitespace-pre-line text-sm text-gray-300">{lastAnalysis}</p>
                    <div className="text-xs text-gray-400 mt-3">Анализ от: {lastAnalysisDate}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#2D2D44] p-3 rounded-lg mb-4">
                <p className="text-sm text-gray-300">
                  Искусственный интеллект проанализирует ваш игровой прогресс и предложит рекомендации для улучшения результатов.
                </p>
              </div>
            )}
            <button
              onClick={performAnalysis}
              disabled={isAnalyzing || !tfLoaded}
              className={`w-full ${
                isAnalyzing || !tfLoaded ? 'bg-purple-500/50 cursor-not-allowed' : 'bg-purple-500 hover:bg-purple-600'
              } text-white py-2 rounded-lg font-medium flex items-center justify-center transition-colors`}
            >
              {isAnalyzing ? (
                <>
                  <span className="animate-pulse">Анализируем...</span>
                  <div className="ml-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </>
              ) : !tfLoaded ? (
                <>
                  <span>Загрузка аналитики...</span>
                  <div className="ml-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </>
              ) : (
                <>
                  <BrainIcon size={16} className="mr-2" />
                  Выполнить AI анализ
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysis;