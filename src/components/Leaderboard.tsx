import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { 
  TrophyIcon, 
  RefreshCwIcon,
  GiftIcon,
  ChevronRightIcon,
  CrownIcon,
  FlameIcon,
  ZapIcon,
  StarIcon
} from 'lucide-react';
import { leaderboardService, LeaderboardUser } from '../services/leaderboardService';
import { tournamentService } from '../services/tournamentService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import MessageModal from './leaderboard/MessageModal';
import { useTelegram } from '../contexts/TelegramContext';

interface LeaderboardProps {
  users: User[];
  currentUser: User;
}

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
        const channel = supabase.channel('online-users');
        
        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const onlineUserIds: Record<string, boolean> = {};
            
            for (const [userId, presences] of Object.entries(state)) {
              if (Array.isArray(presences) && presences.length > 0) {
                const userPresence = presences[0] as any;
                if (userPresence && userPresence.user_id) {
                  onlineUserIds[userPresence.user_id] = true;
                }
              }
            }
            
            setOnlineUsers(onlineUserIds);
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && user) {
              await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
            }
          });
          
        presenceSubscriptionRef.current = channel;
        
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
        if (tournamentService && typeof tournamentService.getActiveTournaments === 'function') {
          const activeTournaments = await tournamentService.getActiveTournaments();
          if (Array.isArray(activeTournaments)) {
            setTournaments(activeTournaments);
          }
        } else {
          setTournaments([
            {
              id: "tournament-1",
              name: "ЕЖЕНЕДЕЛЬНЫЙ ТУРНИР",
              description: "Сделайте больше тапов и войдите в топ-20 игроков недели!",
              endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              prizePool: 5000,
              requiredPosition: 20,
              icon: <FlameIcon className="text-orange-500" size={18} />
            },
            {
              id: "tournament-2",
              name: "МЕСЯЧНОЕ СОРЕВНОВАНИЕ",
              description: "Примите участие в престижном ежемесячном турнире!",
              endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              prizePool: 10000,
              requiredPosition: 50,
              icon: <CrownIcon className="text-yellow-500" size={18} />
            }
          ]);
        }
      } catch (error) {
        console.error('Error loading tournaments:', error);
        setTournaments([
          {
            id: "tournament-1",
            name: "ЕЖЕНЕДЕЛЬНЫЙ ТУРНИР",
            description: "Сделайте больше тапов и войдите в топ-20 игроков недели!",
            endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            prizePool: 5000,
            requiredPosition: 20,
            icon: <FlameIcon className="text-orange-500" size={18} />
          },
          {
            id: "tournament-2",
            name: "МЕСЯЧНОЕ СОРЕВНОВАНИЕ",
            description: "Примите участие в престижном ежемесячном турнире!",
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            prizePool: 10000,
            requiredPosition: 50,
            icon: <CrownIcon className="text-yellow-500" size={18} />
          }
        ]);
      }
    };
    
    loadTournaments();
  }, []);
  
  // Загрузка лидерборда
  useEffect(() => {
    const loadLeaderboard = async () => {
      setIsLoading(true);
      try {
        const users = await leaderboardService.getLeaderboard(100);
        setLeaderboardUsers(users);
        
        if (user) {
          const rank = await leaderboardService.getUserRank(user.id);
          setUserRank(rank || 0);
          
          const currentUserInList = users.some(u => u.id === user.id);
          if (!currentUserInList && rank) {
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
                characterType: 'yasuko',
                characterLevel: Math.floor(data.total_clicks / 1000) + 1,
                isOnline: true,
                lastActivity: data.last_login || new Date().toISOString(),
                rank: rank,
                change: 0,
                status: data.status || 'Привет, мир!'
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
  
  // Подписка на обновления таблицы пользователей
  useEffect(() => {
    try {
      const usersSubscription = supabase
        .channel('users-changes')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'users'
        }, (payload) => {
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
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.impactOccurred('light');
      }
      
      const channelId = [user.id, selectedUser.id].sort().join('_');
      
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
      
      try {
        await supabase.rpc('send_message_with_notification', {
          sender_id: user.id,
          receiver_id: selectedUser.id,
          content: message,
          is_sticker: isSticker
        });
      } catch (rpcError) {
        console.error('Ошибка при отправке уведомления:', rpcError);
      }
      
      setShowMessageModal(false);
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      alert('Произошла ошибка при отправке сообщения');
    }
  };

  const handleClaimBonus = () => {
    setLastBonusClaim(new Date());
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('heavy');
    }
  };

  const handleRefreshLeaderboard = async () => {
    setIsRefreshingLeaderboard(true);
    try {
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


  const handleOpenMessageModal = (user: LeaderboardUser) => {
    setSelectedUser(user);
    setShowMessageModal(true);
  };

  const formatTimeLeft = (endDate: string) => {
    try {
      const end = new Date(endDate);
      const now = new Date();
      const diffMs = end.getTime() - now.getTime();
      
      if (diffMs <= 0) return "00д 00ч 00м";
      
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${days.toString().padStart(2, '0')}д ${hours.toString().padStart(2, '0')}ч ${minutes.toString().padStart(2, '0')}м`;
    } catch (e) {
      console.error("Error formatting time left:", e);
      return "Время истекло";
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#0f0c1d] via-[#1a1538] to-[#0f0c1d] min-h-screen p-4 pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center bg-gradient-to-r from-yellow-500 to-orange-500 text-transparent bg-clip-text">
            <TrophyIcon className="mr-2" size={24} />
            <h1 className="text-2xl font-extrabold tracking-wide">РЕЙТИНГ ИГРОКОВ</h1>
          </div>
          <p className="text-sm text-gray-400 mt-1">Соревнуйтесь с другими игроками</p>
        </div>
        
        {/* User Rank Badge */}
        {userRank > 0 && (
          <div className="mb-6 bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-xl p-4 border border-purple-500/30 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-yellow-500/20 p-2 rounded-lg mr-3">
                  <StarIcon className="text-yellow-400" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Ваша позиция</h3>
                  <p className="text-sm text-gray-300">Обновляется каждые 5 минут</p>
                </div>
              </div>
              <div className="bg-black/30 px-4 py-2 rounded-lg border border-yellow-500/30">
                <span className="font-bold text-yellow-400 text-lg">#{userRank}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tournaments */}
        <div className="space-y-4 mb-6">
          {tournaments.map((tournament) => (
            <div 
              key={tournament.id}
              className="bg-gradient-to-br from-[#2a1a4a] to-[#1a0e33] rounded-xl p-4 border border-purple-500/20 shadow-lg hover:border-purple-500/40 transition-all"
            >
              <div className="flex items-start">
                <div className="bg-purple-600/20 p-2 rounded-lg mr-3">
                  {tournament.icon || <TrophyIcon className="text-purple-400" size={18} />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-white">{tournament.name}</h3>
                    <span className="bg-purple-900/50 text-purple-300 text-xs px-2 py-1 rounded">
                      {formatTimeLeft(tournament.endDate)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{tournament.description}</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs bg-black/30 px-2 py-1 rounded text-yellow-400">
                      Приз: {tournament.prizePool.toLocaleString()} ₽
                    </span>
                    <button className="text-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-3 py-1 rounded-full flex items-center transition-all">
                      Участвовать <ChevronRightIcon size={14} className="ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Daily Bonus */}
        <div className="mb-6 bg-gradient-to-r from-blue-900/50 to-cyan-900/50 rounded-xl p-4 border border-cyan-500/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-cyan-500/20 p-2 rounded-lg mr-3">
                <GiftIcon className="text-cyan-400" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-white">Ежедневный бонус</h3>
                <p className="text-sm text-gray-300">Получайте награды каждый день</p>
              </div>
            </div>
            <button 
              onClick={handleClaimBonus}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-all"
            >
              Получить
            </button>
          </div>
        </div>
        
        {/* Leaderboard */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-1 rounded-lg mr-2">
                <TrophyIcon className="text-white" size={18} />
              </div>
              <h2 className="font-bold text-lg">Таблица лидеров</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                className="p-2 bg-indigo-900/50 hover:bg-indigo-900/70 rounded-lg transition-all"
                onClick={handleRefreshLeaderboard}
                disabled={isRefreshingLeaderboard}
              >
                <RefreshCwIcon 
                  size={16} 
                  className={isRefreshingLeaderboard ? "animate-spin text-indigo-300" : "text-indigo-200"} 
                />
              </button>
              <span className="text-sm bg-black/30 px-2 py-1 rounded text-gray-300">
                Игроков: {filteredUsers().length}
              </span>
            </div>
          </div>
          
          {/* Filters */}
          <div className="mb-4 overflow-x-auto pb-2">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-all ${
                  filter === 'all' 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                Все игроки
              </button>
              <button
                onClick={() => setFilter('top10')}
                className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-all ${
                  filter === 'top10' 
                    ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-md' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                Топ-10
              </button>
              <button
                onClick={() => setFilter('online')}
                className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-all ${
                  filter === 'online' 
                    ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-md' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                Онлайн
              </button>
            </div>
          </div>
          
        {/* Leaderboard List */}
{isLoading ? (
  <div className="flex justify-center py-10">
    <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
) : (
  <div className="space-y-3">
    {filteredUsers().length > 0 ? (
      filteredUsers().map((user, index) => (
        <div 
          key={user.id}
          className={`bg-gradient-to-br from-[#1e183a] to-[#15122b] rounded-xl p-4 border ${user.id === (currentUser?.id || '') ? 'border-yellow-500/40 shadow-lg shadow-yellow-500/10' : 'border-purple-500/20'} hover:border-purple-500/40 transition-all`}
        >
          <div className="flex items-center justify-between" onClick={() =>   setSelectedUser(user)}>
            {/* Left side - Rank and Avatar */}
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold ${
                index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
                index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                'bg-gradient-to-br from-purple-900 to-indigo-900 text-gray-300'
              }`}>
                {index + 1}
              </div>
              
              <div >
                <img 
                  src={user.avatar || '/default-avatar.png'} 
                  alt={user.name}
                  className="w-12 h-12 rounded-full border-2 border-purple-500/30"
                />
                {(onlineUsers[user.id] || false) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#15122b]"></div>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-[15px] text-white flex items-center">
                  {user.name}
                  {user.id === (currentUser?.id || '') && (
                    <span className="ml-2 bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded">Вы</span>
                  )}
                </h3>
                <p className="text-xs text-gray-400">Ур. {user.level}</p>
              </div>
            </div>
            
            {/* Right side - Score and Actions */}
            <div className="flex flex-col items-end">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white">{user.score.toLocaleString()}</span>
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              </div>
              
              <div className="flex space-x-2 mt-2">

                <button 
                  onClick={() => handleOpenMessageModal(user)}
                  className="text-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-2 py-1 rounded transition-all"
                >
                  Написать
                </button>
              </div>
            </div>
          </div>
          
          {/* Status (optional) */}
          {user.status && (
            <div className="mt-3 pt-3 border-t border-gray-800/50">
              <p className="text-sm text-gray-400 italic">"{user.status}"</p>
            </div>
          )}
        </div>
      ))
    ) : (
      <div className="bg-gradient-to-br from-[#1e183a] to-[#15122b] rounded-xl p-6 text-center border border-gray-700 shadow-lg">
        <div className="text-gray-500 mb-2">
          <ZapIcon className="mx-auto text-purple-500" size={24} />
        </div>
        <p className="text-gray-400">По вашему запросу ничего не найдено</p>
        <button 
          onClick={() => setFilter('all')}
          className="mt-3 text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all shadow-md"
        >
          Показать всех
        </button>
      </div>
    )}
  </div>
)}
          
          {/* Current User Position */}
          {user && !filteredUsers().some(u => u.id === user.id) && userRank > 0 && (
            <div className="mt-4 bg-gray-900/50 rounded-xl p-4 text-center border border-gray-700">
              <p className="text-gray-300">
                Ваша текущая позиция: <span className="text-yellow-400 font-bold">#{userRank}</span>
              </p>
            </div>
          )}
        </div>
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
  );
};

export default Leaderboard;