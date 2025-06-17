import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { 
  TrophyIcon, 
  RefreshCwIcon,
  BellIcon, 
  GiftIcon
} from 'lucide-react';
import { leaderboardService, LeaderboardUser } from '../services/leaderboardService';
import { tournamentService } from '../services/tournamentService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import MessageModal from './leaderboard/MessageModal';
import CompetitionCard from './leaderboard/CompetitionCard';
import DailyBonusSection from './leaderboard/DailyBonusSection';
import LeaderboardItem from './leaderboard/LeaderboardItem';
import LeaderboardFilters from './leaderboard/LeaderboardFilters';
import NotificationsSection from './leaderboard/NotificationsSection';
import { useTelegram } from '../contexts/TelegramContext';

interface LeaderboardProps {
  users: User[];
  currentUser: User;
}

// Функция для форматирования времени последней активности
const formatLastActivity = (lastActiveDate: string): string => {
  try {
    const lastActive = new Date(lastActiveDate);
    const now = new Date();
    const diff = (now.getTime() - lastActive.getTime()) / 1000; // разница в секундах
    
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
    return `${Math.floor(diff / 86400)}д назад`;
  } catch (e) {
    console.error("Error formatting last activity date:", e);
    return "недавно";
  }
};

const Leaderboard: React.FC<LeaderboardProps> = ({ currentUser }) => {
  const [filter, setFilter] = useState<'all' | 'top10' | 'online' | 'yasuko' | 'fishko'>('all');
  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [lastBonusClaim, setLastBonusClaim] = useState(new Date(Date.now() - 25 * 60 * 60 * 1000));
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const { telegram } = useTelegram();
  const [userRank, setUserRank] = useState(0);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [isRefreshingLeaderboard, setIsRefreshingLeaderboard] = useState(false);
  
  // Ref for presence subscription
  const presenceSubscriptionRef = useRef<any>(null);
  
  // Функция для отслеживания онлайн-статуса пользователей
  useEffect(() => {
    const setupPresenceChannel = async () => {
      try {
        // Создаем канал presence для отслеживания онлайн-статуса
        const channel = supabase.channel('online-users');
        
        // Подписываемся на изменения статуса
        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const onlineUserIds: Record<string, boolean> = {};
            
            // Обрабатываем данные присутствия
            for (const [userId, presences] of Object.entries(state)) {
              if (Array.isArray(presences) && presences.length > 0) {
                const userPresence = presences[0] as any;
                if (userPresence && userPresence.user_id) {
                  onlineUserIds[userPresence.user_id] = true;
                }
              }
            }
            
            setOnlineUsers(onlineUserIds);
            console.log('Онлайн пользователи:', onlineUserIds);
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && user) {
              // Отправляем своё присутствие
              await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
            }
          });
          
        presenceSubscriptionRef.current = channel;
        
        // Отписываемся при размонтировании
        return () => {
          channel.unsubscribe();
        };
      } catch (error) {
        console.error('Ошибка при настройке presence канала:', error);
      }
    };
    
    setupPresenceChannel();
  }, [user]);
  
  // Загрузка турниров
  useEffect(() => {
    const loadTournaments = async () => {
      try {
        // Сначала проверим, есть ли tournamentService с функцией getActiveTournaments
        if (tournamentService && typeof tournamentService.getActiveTournaments === 'function') {
          const activeTournaments = await tournamentService.getActiveTournaments();
          if (Array.isArray(activeTournaments)) {
            setTournaments(activeTournaments);
          }
        } else {
          // Если tournamentService недоступен, используем моковые данные
          setTournaments([
            {
              id: "tournament-1",
              name: "ЕЖЕНЕДЕЛЬНЫЙ ТУРНИР",
              description: "Сделайте больше тапов и войдите в топ-20 игроков недели!",
              endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              prizePool: 5000,
              requiredPosition: 20
            },
            {
              id: "tournament-2",
              name: "МЕСЯЧНОЕ СОРЕВНОВАНИЕ",
              description: "Примите участие в престижном ежемесячном турнире!",
              endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              prizePool: 10000,
              requiredPosition: 50
            }
          ]);
        }
      } catch (error) {
        console.error('Error loading tournaments:', error);
        // Используем моковые данные в случае ошибки
        setTournaments([
          {
            id: "tournament-1",
            name: "ЕЖЕНЕДЕЛЬНЫЙ ТУРНИР",
            description: "Сделайте больше тапов и войдите в топ-20 игроков недели!",
            endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            prizePool: 5000,
            requiredPosition: 20
          },
          {
            id: "tournament-2",
            name: "МЕСЯЧНОЕ СОРЕВНОВАНИЕ",
            description: "Примите участие в престижном ежемесячном турнире!",
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            prizePool: 10000,
            requiredPosition: 50
          }
        ]);
      }
    };
    
    loadTournaments();
  }, []);
  
  // Загрузка лидерборда при монтировании компонента
  useEffect(() => {
    const loadLeaderboard = async () => {
      setIsLoading(true);
      try {
        // Получаем данные лидерборда
        const users = await leaderboardService.getLeaderboard(100);
        setLeaderboardUsers(users);
        
        // Если пользователь авторизован, получаем его ранг
        if (user) {
          const rank = await leaderboardService.getUserRank(user.id);
          setUserRank(rank || 0);
          
          // Проверяем, есть ли текущий пользователь в списке лидеров
          const currentUserInList = users.some(u => u.id === user.id);
          if (!currentUserInList && rank) {
            // Если пользователя нет в списке топ-100, но у него есть ранг, добавляем его
            const { data, error } = await supabase
              .from('users')
              .select('id, name, total_clicks, avatar_url, status, last_login')
              .eq('id', user.id)
              .single();
              
            if (!error && data) {
              const currentUserRankData: LeaderboardUser = {
                id: data.id,
                name: data.name,
                avatar: data.avatar_url || '',
                level: Math.floor(data.total_clicks / 1000) + 1,
                score: data.total_clicks,
                characterType: 'yasuko', // Предполагаемое значение
                characterLevel: Math.floor(data.total_clicks / 1000) + 1,
                isOnline: true,
                lastActivity: data.last_login || new Date().toISOString(),
                rank: rank,
                change: 0, // Нет данных для изменения ранга
                status: data.status || 'Привет, мир!' // Используем статус из базы данных
              };
              
              setLeaderboardUsers(prev => [...prev, currentUserRankData]);
            }
          }
        }
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLeaderboard();
  }, [user]);
  
  // Подписка на обновления таблицы пользователей в реальном времени
  useEffect(() => {
    // Настраиваем подписку на таблицу users
    try {
      const usersSubscription = supabase
        .channel('users-changes')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'users'
        }, (payload) => {
          console.log('Пользователь обновлен:', payload);
          
          // Обновляем пользователя в списке
          setLeaderboardUsers(prev => prev.map(user => {
            if (user.id === payload.new.id) {
              return {
                ...user,
                score: payload.new.total_clicks || user.score,
                lastActivity: payload.new.last_login || user.lastActivity
              };
            }
            return user;
          }));
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(usersSubscription);
      };
    } catch (error) {
      console.error('Ошибка при настройке подписки на обновления пользователей:', error);
    }
  }, []);
  
  const filteredUsers = () => {
    switch (filter) {
      case 'top10':
        return leaderboardUsers.slice(0, 10);
      case 'online':
        return leaderboardUsers.filter(user => onlineUsers[user.id]);
      case 'yasuko':
        return leaderboardUsers.filter(user => user.characterType === 'yasuko');
      case 'fishko':
        return leaderboardUsers.filter(user => user.characterType === 'fishko');
      default:
        return leaderboardUsers;
    }
  };

  const handleSendMessage = async (message: string, isSticker: boolean) => {
    if (!user || !selectedUser) return;
    
    try {
      // Тактильная отдача через Telegram API
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.impactOccurred('light');
      }
      
      // Создаем канал для сообщений между пользователями
      const channelId = [user.id, selectedUser.id].sort().join('_');
      
      // Отправляем сообщение
      const { error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          sender_id: user.id,
          receiver_id: selectedUser.id,
          content: message,
          is_sticker: isSticker
        });
        
      if (error) {
        console.error('Ошибка при отправке сообщения:', error);
        alert('Не удалось отправить сообщение');
        return;
      }
      
      // Пробуем отправить уведомление получателю через функцию
      try {
        await supabase.rpc('send_message_with_notification', {
          sender_id: user.id,
          receiver_id: selectedUser.id,
          content: message,
          is_sticker: isSticker
        });
      } catch (rpcError) {
        console.error('Ошибка при отправке уведомления:', rpcError);
        // Продолжаем, даже если уведомление не отправлено
      }
      
      console.log(`Сообщение ${isSticker ? '(стикер)' : ''} отправлено пользователю ${selectedUser.name}: ${message}`);
      setShowMessageModal(false);
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      alert('Произошла ошибка при отправке сообщения');
    }
  };

  const handleClaimBonus = () => {
    setLastBonusClaim(new Date());
  };

  const handleRefreshLeaderboard = async () => {
    setIsRefreshingLeaderboard(true);
    try {
      // Принудительно получаем свежие данные, обходя кэш
      const users = await leaderboardService.getLeaderboard(100, true);
      setLeaderboardUsers(users);
      
      if (user) {
        const rank = await leaderboardService.getUserRank(user.id);
        setUserRank(rank);
      }
    } catch (error) {
      console.error('Error refreshing leaderboard:', error);
    } finally {
      setIsRefreshingLeaderboard(false);
    }
  };

  const handleSelectUser = (user: LeaderboardUser) => {
    setSelectedUser(user);
  };

  const handleOpenMessageModal = (user: LeaderboardUser) => {
    setSelectedUser(user);
    setShowMessageModal(true);
  };

  // Форматирование оставшегося времени для турнира
  const formatTimeLeft = (endDate: string) => {
    try {
      const end = new Date(endDate);
      const now = new Date();
      const diffMs = end.getTime() - now.getTime();
      
      if (diffMs <= 0) return "00д 00ч 00м";
      
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${days}д ${hours}ч ${minutes}м`;
    } catch (e) {
      console.error("Error formatting time left:", e);
      return "Время истекло";
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#1a1625] to-[#0d0b12] min-h-screen p-4 pb-20">
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-yellow-500 text-center">РЕЙТИНГ</h1>
        </div>
        
        {/* Notifications section */}
        <NotificationsSection userRank={userRank || currentUser.position || 0} />

        {/* Competitions */}
        {tournaments.map((tournament, index) => (
          <CompetitionCard
            key={tournament.id}
            title={tournament.name}
            endTime={formatTimeLeft(tournament.endDate)}
            participants={120} // Заглушка, в будущем можно получать реальное количество участников
            position={userRank || currentUser.position || 0}
            requiredPosition={tournament.requiredPosition}
            prizePool={tournament.prizePool}
            tournamentId={tournament.id}
          />
        ))}

        {/* Daily Bonus */}
        <DailyBonusSection 
          onClaim={handleClaimBonus} 
          lastClaim={lastBonusClaim} 
        />
        
        {/* Leaderboard */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <TrophyIcon className="text-yellow-500 mr-2" size={18} />
              <h2 className="font-bold">Таблица лидеров</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                className="p-2 bg-[#252538] rounded-full hover:bg-[#323248]"
                onClick={handleRefreshLeaderboard}
                disabled={isRefreshingLeaderboard}
              >
                <RefreshCwIcon size={16} className={isRefreshingLeaderboard ? "animate-spin" : ""} />
              </button>
              <span className="text-sm text-gray-400">Всего: {filteredUsers().length}</span>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers().length > 0 ? (
                filteredUsers().map((user, index) => (
                  <LeaderboardItem 
                    key={user.id}
                    user={user}
                    index={index}
                    isCurrentUser={user.id === (currentUser?.id || '')}
                    isOnline={onlineUsers[user.id] || false}
                    formatLastActivity={formatLastActivity}
                    onSelect={() => handleSelectUser(user)}
                    onMessage={() => handleOpenMessageModal(user)}
                  />
                ))
              ) : (
                <div className="bg-[#252538] rounded-lg p-6 text-center">
                  <p className="text-gray-400">По вашему запросу ничего не найдено</p>
                </div>
              )}
            </div>
          )}
          
          {/* Показываем текущую позицию пользователя если его нет в отфильтрованном списке */}
          {user && !filteredUsers().some(u => u.id === user.id) && userRank > 0 && (
            <div className="mt-4 bg-[#252538] rounded-lg p-4">
              <p className="text-center">
                Ваша текущая позиция: <span className="text-yellow-500 font-bold">#{userRank}</span>
              </p>
            </div>
          )}
        </div>

        {/* Message Modal */}
        {showMessageModal && selectedUser && (
          <MessageModal
            user={selectedUser}
            onClose={() => setShowMessageModal(false)}
            onSend={handleSendMessage}
          />
        )}
      </div>
    </div>
  );
};

export default Leaderboard;