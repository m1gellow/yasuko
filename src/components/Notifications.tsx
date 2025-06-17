import React, { useState, useEffect } from 'react';
import { BellIcon, XIcon, TrophyIcon, BarChartIcon as ChartIcon, GiftIcon, InfoIcon, MessageCircleIcon, BellOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTelegram } from '../contexts/TelegramContext';

export interface NotificationItem {
  id: string;
  type: 'achievement' | 'rating' | 'reward' | 'system' | 'message';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}

interface NotificationsProps {
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
}

const Notifications: React.FC<NotificationsProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { telegram } = useTelegram();
  
  // Получаем только непрочитанные уведомления для счетчика
  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  // Получаем два последних уведомления для отображения
  const recentNotifications = notifications.slice(0, 2);
  
  // При открытии/закрытии окна уведомлений
  useEffect(() => {
    if (isOpen && telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
  }, [isOpen, telegram]);
  
  // Убираем дубликаты уведомлений с одинаковыми заголовками и типами
  const uniqueNotifications = notifications.reduce((acc: NotificationItem[], current) => {
    // Для уведомлений типа achievement проверяем заголовок и сообщение
    if (current.type === 'achievement') {
      const duplicate = acc.find(item => 
        item.type === current.type && 
        item.title === current.title && 
        item.message === current.message
      );
      
      if (!duplicate) {
        acc.push(current);
      }
    } else {
      // Для других типов просто добавляем
      acc.push(current);
    }
    return acc;
  }, []);

  // Получение иконки по типу уведомления
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'achievement':
        return <TrophyIcon size={16} className="text-yellow-500" />;
      case 'rating':
        return <ChartIcon size={16} className="text-green-500" />;
      case 'reward':
        return <GiftIcon size={16} className="text-purple-500" />;
      case 'message':
        return <MessageCircleIcon size={16} className="text-blue-500" />;
      case 'system':
      default:
        return <InfoIcon size={16} className="text-blue-500" />;
    }
  };
  
  // Получение цвета линии по типу уведомления
  const getBorderColor = (type: string) => {
    switch (type) {
      case 'achievement':
        return 'border-yellow-500';
      case 'rating':
        return 'border-green-500';
      case 'reward':
        return 'border-purple-500';
      case 'message':
        return 'border-blue-500';
      case 'system':
      default:
        return 'border-gray-500';
    }
  };
  
  // Форматирование даты и времени
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'недавно';
    }
  };

  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };
  
  const handleOpenNotifications = () => {
    // Хаптик-фидбек при открытии
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    setIsOpen(true);
  };
  
  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Хаптик-фидбек при отметке прочитанным
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    onMarkAsRead(id);
  };
  
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Хаптик-фидбек при удалении
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
    
    onDelete(id);
  };
  
  const handleMarkAllAsRead = () => {
    // Хаптик-фидбек при отметке всех прочитанными
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.notificationOccurred('success');
    }
    
    onMarkAllAsRead();
  };

  return (
    <div className="relative flex items-center">
      {/* Аватар пользователя */}
      <div className="flex items-center mr-2">
        <div className="h-8 w-8 rounded-full overflow-hidden shadow-md">
          {user?.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.name} 
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(user.name);
              }}
            />
          ) : (
            <div className="h-full w-full bg-gray-600 flex items-center justify-center text-white">
              {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
            </div>
          )}
        </div>
        <span className="text-sm hidden md:block ml-2">{user?.name || 'Пользователь'}</span>
      </div>
      
      <button 
        onClick={handleOpenNotifications}
        className="relative p-2 rounded-full hover:bg-[#252538] transition-colors"
        aria-label={unreadCount > 0 ? `Уведомления: ${unreadCount} непрочитанных` : "Уведомления"}
      >
        <BellIcon size={20} className="text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-16 pb-4 px-4 overflow-y-auto" onClick={handleClickOutside}>
          <div className="bg-[#252538] rounded-lg w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#323248] sticky top-0 bg-[#252538] z-10">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Уведомления</h3>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-[#323248]"
                  aria-label="Закрыть"
                >
                  <XIcon size={18} />
                </button>
              </div>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-400 mt-1 hover:text-blue-300 transition-colors"
                >
                  Отметить все как прочитанные
                </button>
              )}
            </div>
            
            <div className="max-h-[70vh] overflow-y-auto">
              {uniqueNotifications.length > 0 ? (
                <div>
                  {uniqueNotifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={`p-4 border-b border-[#323248] hover:bg-[#2D2D44] ${!notification.is_read ? 'bg-[#2D2D44]/50' : ''} transition-colors`}
                      onClick={(e) => !notification.is_read && handleMarkAsRead(notification.id, e)}
                    >
                      <div className="flex">
                        <div className={`border-l-4 ${getBorderColor(notification.type)} pl-2 flex-grow`}>
                          <div className="flex items-start">
                            <div className="mr-2 mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div>
                              <h4 className="font-medium text-sm md:text-base">{notification.title}</h4>
                              <p className="text-xs md:text-sm text-gray-400">{notification.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDateTime(notification.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <button 
                          onClick={(e) => handleDelete(notification.id, e)}
                          className="text-gray-400 hover:text-red-500 ml-2 p-1 hover:bg-[#353553] rounded transition-colors"
                          aria-label="Удалить уведомление"
                        >
                          <XIcon size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="flex flex-col items-center">
                    <BellOff size={32} className="text-gray-500 mb-3" />
                    <p className="text-gray-400">У вас пока нет уведомлений</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;