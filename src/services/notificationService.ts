import { supabase, Notification } from '../lib/supabase';
import { storage } from '../utils/storage';

// Constants
const NOTIFICATIONS_STORAGE_KEY = 'app:notifications';
const CACHE_EXPIRY_MINUTES = 5; // 5 minutes

class NotificationService {
  /**
   * Получение уведомлений пользователя
   */
  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      // Получаем уведомления из Supabase
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      return [];
    }
  }
  
  /**
   * Подписка на новые уведомления
   */
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void): () => void {
    try {
      // Создаем канал для уведомлений
      const channel = supabase
        .channel(`notifications-${userId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          console.log('Новое уведомление:', payload);
          callback(payload.new as Notification);
        })
        .subscribe();
      
      // Возвращаем функцию для отписки
      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      // Возвращаем пустую функцию отписки в случае ошибки
      return () => {};
    }
  }
  
  /**
   * Отметка уведомления как прочитанного
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }
  
  /**
   * Отметка всех уведомлений пользователя как прочитанных
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return false;
    }
  }
  
  /**
   * Удаление уведомления
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      return false;
    }
  }
  
  /**
   * Отправка уведомления пользователю
   */
  async sendNotification(
    userId: string, 
    title: string, 
    message: string, 
    type: 'achievement' | 'rating' | 'message' | 'system' | 'reward' = 'system',
    data: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      // Проверяем, нет ли уже такого уведомления о достижении за последние 24 часа
      if (type === 'achievement') {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        // Проверяем существующие уведомления о достижениях
        const { data: existingNotifications, error: checkError } = await supabase
          .from('notifications')
          .select('id, title, message')
          .eq('user_id', userId)
          .eq('type', 'achievement')
          .gt('created_at', oneDayAgo.toISOString());
        
        if (!checkError && existingNotifications) {
          // Проверяем, нет ли уведомления с таким же заголовком и сообщением
          const duplicate = existingNotifications.find(n => 
            n.title === title && n.message === message
          );
          
          if (duplicate) {
            console.log('Пропуск дублирующего уведомления о достижении:', title);
            return false; // Пропускаем создание дубликата
          }
        }
      }
    
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          data
        });
      
      if (error) {
        console.error('Error sending notification:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in sendNotification:', error);
      return false;
    }
  }
}

// Экспортируем экземпляр класса для использования в приложении
export const notificationService = new NotificationService();