import { supabase } from '../lib/supabase';

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_sticker: boolean;
  is_read: boolean;
  created_at: string;
  sender?: {
    name: string;
    avatar_url?: string;
  };
}

export const messageService = {
  /**
   * Получение сообщений между двумя пользователями
   */
  async getMessages(userId1: string, userId2: string, limit: number = 50): Promise<Message[]> {
    try {
      // Создаем ID канала, сортируя ID пользователей
      const channelId = [userId1, userId2].sort().join('_');
      
      // Получаем сообщения
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            name,
            avatar_url
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
      
      // Если пользователь является получателем, отмечаем сообщения как прочитанные
      const unreadMessages = data?.filter(
        msg => msg.receiver_id === userId1 && !msg.is_read
      ) || [];
      
      if (unreadMessages.length > 0) {
        const unreadIds = unreadMessages.map(msg => msg.id);
        
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds);
      }
      
      // Возвращаем сообщения в обратном порядке (от старых к новым)
      return [...(data || [])].reverse();
    } catch (error) {
      console.error('Error in getMessages:', error);
      return [];
    }
  },
  
  /**
   * Отправка сообщения
   */
  async sendMessage(
    senderId: string, 
    receiverId: string, 
    content: string, 
    isSticker: boolean = false
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Создаем ID канала, сортируя ID пользователей
      const channelId = [senderId, receiverId].sort().join('_');
      
      // Отправляем сообщение
      const { data, error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          sender_id: senderId,
          receiver_id: receiverId,
          content,
          is_sticker: isSticker
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error sending message:', error);
        return { success: false, error: 'Ошибка при отправке сообщения' };
      }
      
      // Создаем уведомление для получателя с помощью функции send_message_with_notification
      try {
        await supabase.rpc('send_message_with_notification', {
          sender_id: senderId,
          receiver_id: receiverId,
          content: content,
          is_sticker: isSticker
        });
      } catch (rpcError) {
        console.error('Error in send_message_with_notification RPC:', rpcError);
        // Продолжаем, даже если RPC вызов не удался
      }
      
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return { success: false, error: 'Произошла ошибка при отправке сообщения' };
    }
  },
  
  /**
   * Подписка на новые сообщения
   */
  subscribeToMessages(userId: string, callback: (message: Message) => void): () => void {
    try {
      // Создаем канал для сообщений
      const channel = supabase
        .channel(`messages-${userId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${userId}`
        }, (payload) => {
          console.log('Новое сообщение:', payload);
          callback(payload.new as Message);
        })
        .subscribe();
      
      // Также подписываемся на отправляемые сообщения
      const outgoingChannel = supabase
        .channel(`messages-outgoing-${userId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `sender_id=eq.${userId}`
        }, (payload) => {
          console.log('Отправленное сообщение:', payload);
          callback(payload.new as Message);
        })
        .subscribe();
      
      // Возвращаем функцию для отписки
      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(outgoingChannel);
      };
    } catch (error) {
      console.error('Error subscribing to messages:', error);
      return () => {};
    }
  },
  
  /**
   * Отметка сообщения как прочитанного
   */
  async markAsRead(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
      
      if (error) {
        console.error('Error marking message as read:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }
};