import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Сервис для отслеживания аналитики пользователей
 */
export const analyticsService = {
  /**
   * Отслеживание действия пользователя
   * @param action Тип действия
   * @param details Дополнительные данные о действии
   * @param userId ID пользователя (опционально, по умолчанию берется из текущей сессии)
   */
  async trackAction(action: string, details: Record<string, any> = {}, userId?: string): Promise<void> {
    try {
      // Проверяем наличие userId
      if (!userId) {
        const { data: sessionData } = await supabase.auth.getSession();
        userId = sessionData.session?.user.id;
        
        if (!userId) {
          console.warn('Невозможно отследить действие: пользователь не авторизован');
          return;
        }
      }

      // Добавляем timestamp к деталям
      const detailsWithTimestamp = {
        ...details,
        timestamp: new Date().toISOString()
      };

      // Вызываем RPC функцию track_user_action с четким порядком параметров:
      // 1. p_user_id - ID пользователя
      // 2. p_action - действие
      // 3. p_details - детали
      const { error } = await supabase.rpc('track_user_action', {
        p_user_id: userId,
        p_action: action,
        p_details: detailsWithTimestamp
      });

      if (error) {
        console.error('Ошибка при отслеживании действия пользователя:', error);
        
        // Запасной вариант - прямая вставка в таблицу
        try {
          const { error: insertError } = await supabase
            .from('user_stats')
            .insert({
              user_id: userId,
              action: action === 'tap' ? 'click' : action, // преобразуем tap в click для совместимости
              data: detailsWithTimestamp,
              timestamp: new Date().toISOString()
            });
            
          if (insertError) {
            console.error('Ошибка при вставке в таблицу:', insertError);
          }
        } catch (fallbackError) {
          console.error('Ошибка при вставке в таблицу:', fallbackError);
        }
      }
    } catch (error) {
      console.error('Ошибка при отслеживании действия пользователя:', error);
    }
  },

  /**
   * Отслеживание просмотра страницы
   * @param url URL страницы
   * @param referrer Источник перехода
   * @param userId ID пользователя
   */
  trackPageView(url: string, referrer?: string, userId?: string): void {
    this.trackAction('page_view', {
      url,
      referrer: referrer || document.referrer || 'direct',
      user_agent: navigator.userAgent
    }, userId);
  },

  /**
   * Отслеживание клика по элементу
   * @param elementId ID элемента
   * @param elementType Тип элемента
   * @param additionalData Дополнительные данные
   * @param userId ID пользователя
   */
  trackClick(elementId: string, elementType: string, additionalData: Record<string, any> = {}, userId?: string): void {
    this.trackAction('click', {
      element_id: elementId,
      element_type: elementType,
      ...additionalData
    }, userId);
  },

  /**
   * Отслеживание навигации между вкладками
   * @param fromTab Исходная вкладка
   * @param toTab Целевая вкладка
   * @param userId ID пользователя
   */
  trackNavigation(fromTab: string, toTab: string, userId?: string): void {
    this.trackAction('navigation', {
      from_tab: fromTab,
      to_tab: toTab
    }, userId);
  },

  /**
   * Отслеживание просмотра товара
   * @param itemId ID товара
   * @param itemName Название товара
   * @param itemPrice Цена товара
   * @param userId ID пользователя
   */
  trackItemView(itemId: string, itemName: string, itemPrice: number, userId?: string): void {
    this.trackAction('view_item', {
      item_id: itemId,
      item_name: itemName,
      item_price: itemPrice
    }, userId);
  },

  /**
   * Отслеживание покупки товара
   * @param itemId ID товара
   * @param itemName Название товара
   * @param itemPrice Цена товара
   * @param category Категория товара
   * @param additionalData Дополнительные данные
   * @param userId ID пользователя
   */
  trackPurchase(
    itemId: string, 
    itemName: string, 
    itemPrice: number, 
    category: string, 
    additionalData: Record<string, any> = {}, 
    userId?: string
  ): void {
    this.trackAction('purchase', {
      item_id: itemId,
      item_name: itemName,
      item_price: itemPrice,
      item_category: category,
      ...additionalData
    }, userId);
  },

  /**
   * Отслеживание ошибки
   * @param errorMessage Сообщение об ошибке
   * @param errorCode Код ошибки
   * @param errorContext Контекст ошибки
   * @param userId ID пользователя
   */
  trackError(errorMessage: string, errorCode?: string, errorContext?: Record<string, any>, userId?: string): void {
    this.trackAction('error', {
      error_message: errorMessage,
      error_code: errorCode,
      error_context: errorContext
    }, userId);
  },
  
  /**
   * Отслеживание игрового события
   * @param gameId ID игры
   * @param eventType Тип события (start, end, win, lose, etc.)
   * @param eventData Данные события
   * @param userId ID пользователя
   */
  trackGameEvent(
    gameId: string, 
    eventType: 'start' | 'end' | 'win' | 'lose' | string, 
    eventData: Record<string, any> = {}, 
    userId?: string
  ): void {
    this.trackAction(`game_${eventType}`, {
      game_id: gameId,
      ...eventData
    }, userId);
  },
  
  /**
   * Отслеживание тапа по персонажу
   * @param characterType Тип персонажа
   * @param level Уровень персонажа
   * @param position Позиция тапа
   * @param additionalData Дополнительные данные
   * @param userId ID пользователя
   */
  trackTap(
    characterType: string, 
    level: number, 
    position: {x: number, y: number}, 
    additionalData: Record<string, any> = {}, 
    userId?: string
  ): void {
    this.trackAction('tap', {
      character_type: characterType,
      level,
      position_x: position.x,
      position_y: position.y,
      ...additionalData
    }, userId);
  }
};

/**
 * Хук для использования аналитики в компонентах React
 */
export function useAnalytics() {
  const { user } = useAuth();
  
  return {
    trackPageView: (url: string, referrer?: string, additionalData: Record<string, any> = {}) => {
      analyticsService.trackPageView(url, referrer, user?.id);
    },
    
    trackClick: (elementId: string, elementType: string, additionalData: Record<string, any> = {}) => {
      analyticsService.trackClick(elementId, elementType, additionalData, user?.id);
    },
    
    trackNavigation: (fromTab: string, toTab: string, additionalData: Record<string, any> = {}) => {
      analyticsService.trackAction('navigation', {
        from_tab: fromTab,
        to_tab: toTab,
        ...additionalData
      }, user?.id);
    },
    
    trackItemView: (itemId: string, itemName: string, itemPrice: number, additionalData: Record<string, any> = {}) => {
      analyticsService.trackItemView(itemId, itemName, itemPrice, user?.id);
    },
    
    trackPurchase: (
      itemId: string, 
      itemName: string, 
      itemPrice: number, 
      category: string, 
      additionalData: Record<string, any> = {}
    ) => {
      analyticsService.trackPurchase(itemId, itemName, itemPrice, category, additionalData, user?.id);
    },
    
    trackError: (errorMessage: string, errorCode?: string, errorContext?: Record<string, any>) => {
      analyticsService.trackError(errorMessage, errorCode, errorContext, user?.id);
    },
    
    trackAction: (action: string, details: Record<string, any> = {}) => {
      analyticsService.trackAction(action, details, user?.id);
    },
    
    trackGameEvent: (
      gameId: string, 
      eventType: 'start' | 'end' | 'win' | 'lose' | string, 
      eventData: Record<string, any> = {}
    ) => {
      analyticsService.trackGameEvent(gameId, eventType, eventData, user?.id);
    },
    
    trackTap: (
      characterType: string, 
      level: number, 
      position: {x: number, y: number}, 
      additionalData: Record<string, any> = {}
    ) => {
      analyticsService.trackTap(characterType, level, position, additionalData, user?.id);
    }
  };
}