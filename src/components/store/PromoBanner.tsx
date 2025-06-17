import React, { useState, useEffect } from 'react';
import { TagIcon, ClockIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PromoBannerProps {
  onShowPromoCode: () => void;
}

// Интерфейс для промоакции
interface Promotion {
  id: string;
  title: string;
  description: string;
  expires_at: string | null;
}

const PromoBanner: React.FC<PromoBannerProps> = ({ onShowPromoCode }) => {
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Загрузка активной промоакции
  useEffect(() => {
    const loadPromotion = async () => {
      setLoading(true);
      try {
        // Получаем активные промоакции с датой истечения в будущем
        const { data, error } = await supabase
          .from('promo_codes')
          .select('id, title, description, expires_at')
          .gt('expires_at', new Date().toISOString())
          .order('expires_at', { ascending: true })
          .limit(1);
        
        if (error) {
          console.error('Ошибка при загрузке промоакций:', error);
          setPromotion(null);
        } else if (data && data.length > 0) {
          setPromotion(data[0]);
        } else {
          setPromotion(null);
        }
      } catch (error) {
        console.error('Ошибка при загрузке промоакций:', error);
        setPromotion(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadPromotion();
  }, []);

  // Обновление таймера обратного отсчета
  useEffect(() => {
    if (!promotion || !promotion.expires_at) return;
    
    const updateTimeLeft = () => {
      const now = new Date();
      const expiryDate = new Date(promotion.expires_at!);
      const diffMs = expiryDate.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        setTimeLeft('00д : 00ч : 00м : 00с');
        return;
      }
      
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      setTimeLeft(`${days}д : ${hours.toString().padStart(2, '0')}ч : ${minutes.toString().padStart(2, '0')}м : ${seconds.toString().padStart(2, '0')}с`);
    };
    
    // Обновляем таймер каждую секунду
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    
    return () => clearInterval(interval);
  }, [promotion]);

  // Рендерим пустой div если нет активной акции и всё ещё загружается
  if (loading) {
    return (
      <div className="bg-purple-700/50 rounded-lg p-4 mb-4 relative overflow-hidden flex items-center justify-center h-24">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Если нет активных промоакций
  if (!promotion) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-700 to-purple-600 rounded-lg p-4 mb-4 relative overflow-hidden">
      <div>
        <h2 className="font-bold text-xl">{promotion.title}</h2>
        <p className="text-purple-200">{promotion.description || "Специальное предложение!"}</p>
        
        {promotion.expires_at && (
          <div className="mt-2 bg-purple-900/50 px-2 py-1 rounded inline-flex items-center">
            <ClockIcon size={14} className="mr-1" />
            <span className="text-sm">ОСТАЛОСЬ: {timeLeft}</span>
          </div>
        )}
        
        <button
          className="w-full bg-white text-purple-700 py-2 rounded-lg font-bold mt-3 flex items-center justify-center"
          onClick={onShowPromoCode}
        >
          <TagIcon size={16} className="mr-2" />
          ВВЕСТИ ПРОМОКОД
        </button>
      </div>
    </div>
  );
};

export default PromoBanner;