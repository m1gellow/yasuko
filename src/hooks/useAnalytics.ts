import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsService } from '../services/analyticsService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Хук для автоматического отслеживания просмотров страниц и других аналитических событий
 */
export function usePageTracking() {
  const location = useLocation();
  const { user } = useAuth();
  
  useEffect(() => {
    // Отслеживаем просмотр страницы при изменении URL
    if (user) {
      analyticsService.trackPageView(
        window.location.href,
        document.referrer,
        user.id
      );
    }
  }, [location.pathname, user]);
  
  return {
    trackEvent: (action: string, details: Record<string, any> = {}) => {
      analyticsService.trackAction(action, details, user?.id);
    }
  };
}

/**
 * Хук для использования аналитики в компонентах React
 */
export function useAnalytics() {
  const { user } = useAuth();
  
  return {
    trackPageView: (page: string, referrer?: string, additionalData: Record<string, any> = {}) => {
      if (user) {
        analyticsService.trackAction('page_view', {
          page,
          referrer: referrer || document.referrer || 'direct',
          user_agent: navigator.userAgent,
          ...additionalData
        }, user.id);
      }
    },
    
    trackClick: (elementId: string, elementType: string, additionalData: Record<string, any> = {}) => {
      if (user) {
        analyticsService.trackAction('click', {
          element_id: elementId,
          element_type: elementType,
          ...additionalData
        }, user.id);
      }
    },
    
    trackNavigation: (fromTab: string, toTab: string, additionalData: Record<string, any> = {}) => {
      if (user) {
        analyticsService.trackAction('navigation', {
          from_tab: fromTab,
          to_tab: toTab,
          ...additionalData
        }, user.id);
      }
    },
    
    trackItemView: (itemId: string, itemName: string, itemPrice: number, additionalData: Record<string, any> = {}) => {
      if (user) {
        analyticsService.trackAction('view_item', {
          item_id: itemId,
          item_name: itemName,
          item_price: itemPrice,
          ...additionalData
        }, user.id);
      }
    },
    
    trackPurchase: (
      itemId: string, 
      itemName: string, 
      itemPrice: number, 
      category: string, 
      additionalData: Record<string, any> = {}
    ) => {
      if (user) {
        analyticsService.trackAction('purchase', {
          item_id: itemId,
          item_name: itemName,
          item_price: itemPrice,
          item_category: category,
          ...additionalData
        }, user.id);
      }
    },
    
    trackError: (errorMessage: string, errorCode?: string, errorContext?: Record<string, any>) => {
      if (user) {
        analyticsService.trackAction('error', {
          error_message: errorMessage,
          error_code: errorCode,
          error_context: errorContext
        }, user.id);
      }
    },
    
    trackAction: (action: string, details: Record<string, any> = {}) => {
      if (user) {
        analyticsService.trackAction(action, details, user.id);
      }
    },
    
    trackGameEvent: (
      gameId: string, 
      eventType: 'start' | 'end' | 'win' | 'lose' | string, 
      eventData: Record<string, any> = {}
    ) => {
      if (user) {
        analyticsService.trackAction(`game_${eventType}`, {
          game_id: gameId,
          ...eventData
        }, user.id);
      }
    },
    
    trackTap: (
      characterType: string, 
      level: number, 
      position: {x: number, y: number}, 
      additionalData: Record<string, any> = {}
    ) => {
      if (user) {
        analyticsService.trackAction('tap', {
          character_type: characterType,
          level,
          position_x: position.x,
          position_y: position.y,
          ...additionalData
        }, user.id);
      }
    }
  };
}