import React, { useState, useEffect } from 'react';
import { BellIcon, TrophyIcon, GiftIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';

interface NotificationsSectionProps {
  userRank: number;
}

const NotificationsSection: React.FC<NotificationsSectionProps> = ({ userRank }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const userNotifications = await notificationService.getUserNotifications(user.id, 5);
        setNotifications(userNotifications);
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNotifications();
  }, [user]);

  // Подписка на новые уведомления
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = notificationService.subscribeToNotifications(
      user.id,
      (newNotification) => {
        setNotifications(prev => [newNotification, ...prev].slice(0, 5));
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [user]);

  // Получаем только непрочитанные уведомления для счетчика
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Получаем два последних уведомления для отображения
  const recentNotifications = notifications.slice(0, 2);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'achievement': 
        return <TrophyIcon className="text-yellow-500 mr-2 mt-1" size={16} />;
      case 'reward': 
        return <GiftIcon className="text-green-500 mr-2 mt-1" size={16} />;
      case 'rating': 
        return <TrophyIcon className="text-blue-500 mr-2 mt-1" size={16} />;
      default: 
        return <BellIcon className="text-gray-500 mr-2 mt-1" size={16} />;
    }
  };

  const getBorderColorForType = (type: string) => {
    switch (type) {
      case 'achievement': return 'border-yellow-500';
      case 'reward': return 'border-green-500';
      case 'rating': return 'border-blue-500';
      default: return 'border-gray-500';
    }
  };

  return (
    <div className="bg-[#252538] rounded-lg p-3 mb-4">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <BellIcon className="text-yellow-500 mr-2" size={20} />
          <span className="font-medium">УВЕДОМЛЕНИЯ</span>
        </div>
        {unreadCount > 0 && (
          <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded">НОВЫЕ {unreadCount}</span>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-t-transparent border-yellow-500 rounded-full animate-spin"></div>
        </div>
      ) : recentNotifications.length > 0 ? (
        <div className="space-y-3">
          {recentNotifications.map((notification, index) => (
            <div 
              key={notification.id || index} 
              className={`border-l-4 ${getBorderColorForType(notification.type)} bg-[#2D2D44] rounded-r p-2`}
            >
              <div className="flex items-start">
                {getIconForType(notification.type)}
                <div>
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-gray-300 text-sm">{notification.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm">У вас пока нет уведомлений</p>
        </div>
      )}

      {/* Дополнительная информация о ранге */}
      <div className="mt-3 p-2 bg-[#2D2D44] rounded">
        <p className="text-sm">
          Ваша позиция в рейтинге: <span className="font-bold text-yellow-500">#{userRank || "?"}</span>
        </p>
      </div>
    </div>
  );
};

export default NotificationsSection;