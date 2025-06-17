import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { storage } from '../utils/storage';

interface UseSupabaseOptions<T> {
  table: string;
  query?: any;
  select?: string;
  cacheKey?: string;
  cacheDuration?: number; // в минутах
  dependencies?: any[];
  transformData?: (data: any) => T[];
}

/**
 * Хук для удобного получения данных из Supabase с кэшированием
 */
export function useSupabase<T>({
  table,
  query,
  select = '*',
  cacheKey,
  cacheDuration = 5, // 5 минут по умолчанию
  dependencies = [],
  transformData
}: UseSupabaseOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  const key = cacheKey || `supabase:${table}`;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Сначала проверяем кэш
        const cachedData = storage.get<T[]>(key);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return;
        }

        // Если данных в кэше нет, запрашиваем из Supabase
        let supabaseQuery = supabase
          .from(table)
          .select(select);

        // Применяем дополнительные параметры запроса, если они есть
        if (query) {
          Object.entries(query).forEach(([method, params]) => {
            // @ts-ignore
            supabaseQuery = supabaseQuery[method](...(Array.isArray(params) ? params : [params]));
          });
        }

        const { data: responseData, error: responseError } = await supabaseQuery;

        if (responseError) {
          throw new Error(responseError.message);
        }

        // Преобразуем данные, если указан трансформер
        const processedData = transformData ? transformData(responseData) : responseData;
        
        // Сохраняем в кэш и устанавливаем результат
        storage.set<T[]>(key, processedData, cacheDuration);
        setData(processedData);
      } catch (err) {
        console.error(`Error fetching data from ${table}:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, dependencies);

  const refetch = async () => {
    // Удаляем данные из кэша
    storage.remove(key);
    
    setLoading(true);
    setError(null);
    
    try {
      let supabaseQuery = supabase
        .from(table)
        .select(select);

      if (query) {
        Object.entries(query).forEach(([method, params]) => {
          // @ts-ignore
          supabaseQuery = supabaseQuery[method](...(Array.isArray(params) ? params : [params]));
        });
      }

      const { data: responseData, error: responseError } = await supabaseQuery;

      if (responseError) {
        throw new Error(responseError.message);
      }

      const processedData = transformData ? transformData(responseData) : responseData;
      storage.set<T[]>(key, processedData, cacheDuration);
      setData(processedData);
    } catch (err) {
      console.error(`Error refetching data from ${table}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
}