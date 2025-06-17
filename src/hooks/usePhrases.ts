import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { storage } from '../utils/storage';

interface Phrase {
  id: string;
  category: string;
  text: string;
}

// Предустановленные фразы для резервного использования при ошибках
const FALLBACK_PHRASES: Record<string, string[]> = {
  click: [
    'Ммм, мне нравится!',
    'Ещё, ещё!',
    'Продолжай тапать!',
    'Я расту с каждым тапом!',
    'Ты лучший!'
  ],
  feed: [
    'Вкусно! Спасибо!',
    'Наконец-то, я так голоден!',
    'Ммм, моя любимая еда!',
    'Теперь я сыт и доволен!'
  ],
  pet: [
    'Как приятно!',
    'Люблю, когда меня гладят!',
    'Продолжай, мне нравится!',
    'Ты знаешь, как меня порадовать!'
  ],
  idle: [
    'Эй, я скучаю!',
    'Не забывай обо мне!',
    'Где ты? Я жду!',
    'Мне одиноко без тебя...'
  ]
};

export function usePhrases(category?: 'click' | 'feed' | 'pet' | 'idle') {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const cacheKey = `phrases:${category || 'all'}`;
  const cacheDuration = 24 * 60; // кэшируем на 24 часа, фразы редко меняются
  
  useEffect(() => {
    const loadPhrases = async () => {
      try {
        // Сначала проверяем кэш
        const cachedPhrases = storage.get<Phrase[]>(cacheKey);
        if (cachedPhrases && cachedPhrases.length > 0) {
          setPhrases(cachedPhrases);
          setLoading(false);
          return;
        }
        
        // Если в кэше нет данных или возникла ошибка сети, используем предустановленные фразы
        if (category && FALLBACK_PHRASES[category]) {
          const fallbackData = FALLBACK_PHRASES[category].map((text, index) => ({
            id: `fallback-${index}`,
            category,
            text
          }));
          
          setPhrases(fallbackData);
          // Кэшируем для предотвращения повторных запросов
          storage.set(cacheKey, fallbackData, cacheDuration);
          setLoading(false);
          return;
        }
        
        // Пробуем получить данные из Supabase
        try {
          let query = supabase
            .from('phrases')
            .select('*');
            
          if (category) {
            query = query.eq('category', category);
          }
          
          const { data, error } = await query;
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            // Обновляем состояние и сохраняем в кэш
            setPhrases(data || []);
            storage.set(cacheKey, data, cacheDuration);
          } else {
            // Если данных нет, используем предустановленные фразы
            useFallbackPhrases();
          }
        } catch (fetchError) {
          console.error('Fetch error in usePhrases:', fetchError);
          // Используем предустановленные фразы при ошибке
          useFallbackPhrases();
        }
      } catch (err) {
        console.error('Error loading phrases:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        // Используем предустановленные фразы при любой ошибке
        useFallbackPhrases();
      } finally {
        setLoading(false);
      }
    };
    
    const useFallbackPhrases = () => {
      if (category && FALLBACK_PHRASES[category]) {
        const fallbackData = FALLBACK_PHRASES[category].map((text, index) => ({
          id: `fallback-${index}`,
          category,
          text
        }));
        
        setPhrases(fallbackData);
        // Кэшируем для предотвращения повторных запросов
        storage.set(cacheKey, fallbackData, cacheDuration);
      } else {
        // Если нет категории, собираем все фразы из всех категорий
        const allFallbackData: Phrase[] = [];
        Object.entries(FALLBACK_PHRASES).forEach(([cat, texts]) => {
          texts.forEach((text, index) => {
            allFallbackData.push({
              id: `fallback-${cat}-${index}`,
              category: cat,
              text
            });
          });
        });
        
        setPhrases(allFallbackData);
        storage.set(cacheKey, allFallbackData, cacheDuration);
      }
    };
    
    loadPhrases();
  }, [category, cacheKey]);
  
  // Функция для получения случайной фразы
  const getRandomPhrase = useCallback(() => {
    if (phrases.length === 0) {
      // Если нет фраз, возвращаем дефолтную фразу или используем резервную из FALLBACK_PHRASES
      if (category && FALLBACK_PHRASES[category] && FALLBACK_PHRASES[category].length > 0) {
        const randomIndex = Math.floor(Math.random() * FALLBACK_PHRASES[category].length);
        return FALLBACK_PHRASES[category][randomIndex];
      }
      return 'Мне нечего сказать...';
    }
    
    const randomIndex = Math.floor(Math.random() * phrases.length);
    return phrases[randomIndex].text;
  }, [phrases, category]);
  
  const refetch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Удаляем из кэша
      storage.remove(cacheKey);
      
      // Запрашиваем данные заново
      let query = supabase
        .from('phrases')
        .select('*');
        
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Обновляем состояние и сохраняем в кэш
        setPhrases(data);
        storage.set(cacheKey, data, cacheDuration);
      } else {
        // Если данных нет, используем предустановленные фразы
        if (category && FALLBACK_PHRASES[category]) {
          const fallbackData = FALLBACK_PHRASES[category].map((text, index) => ({
            id: `fallback-${index}`,
            category,
            text
          }));
          
          setPhrases(fallbackData);
          storage.set(cacheKey, fallbackData, cacheDuration);
        }
      }
    } catch (err) {
      console.error('Error refetching phrases:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      // Используем предустановленные фразы при ошибке
      if (category && FALLBACK_PHRASES[category]) {
        const fallbackData = FALLBACK_PHRASES[category].map((text, index) => ({
          id: `fallback-${index}`,
          category,
          text
        }));
        
        setPhrases(fallbackData);
        storage.set(cacheKey, fallbackData, cacheDuration);
      }
    } finally {
      setLoading(false);
    }
  };

  return { phrases, loading, error, refetch, getRandomPhrase };
}