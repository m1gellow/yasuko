import React, { useState, useEffect, useRef } from 'react';
import { XIcon, SendIcon, SmileIcon, StickerIcon, ChevronDown } from 'lucide-react';
import { messageService, Message } from '../../services/messageService';
import { useAuth } from '../../contexts/AuthContext';
import { gameService } from '../../services/gameService';
import { useTelegram } from '../../contexts/TelegramContext';
import { LeaderboardUser } from '../../services/leaderboardService';

interface MessageModalProps {
  user: LeaderboardUser;
  onClose: () => void;
  onSend: (message: string, isSticker: boolean) => void;
}

const MessageModal: React.FC<MessageModalProps> = ({ user, onClose, onSend }) => {
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'stickers' | 'emoji'>('text');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user: currentUser } = useAuth();
  const { telegram } = useTelegram();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Список эмодзи для быстрого выбора
  const emojis = ['😊', '😂', '🥳', '👍', '❤️', '🎮', '🏆', '⭐', '🌟', '💪', '🎉', '🎈', 
                '😍', '🤩', '😎', '🙌', '👏', '🔥', '💯', '🏅', '🎖️', '🥇', '🎁', '💝'];

  // Список стикеров (заглушки)
  const stickers = Array.from({ length: 9 }).map((_, i) => ({
    id: `sticker_${i + 1}`,
    image: `https://api.dicebear.com/7.x/thumbs/svg?seed=sticker${i+1}`,
    code: `sticker_${i + 1}`
  }));

  // Получаем сообщения при открытии модального окна
  useEffect(() => {
    if (!currentUser) return;
    
    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const messageHistory = await messageService.getMessages(currentUser.id, user.id);
        setMessages(messageHistory);
        
        // Отслеживаем открытие чата с деталями
        await gameService.trackUserAction(currentUser.id, 'chat_opened_detailed', {
          chat_with: user.id,
          user_name: user.name, 
          messages_count: messageHistory.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error loading messages:', error);
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMessages();
  }, [currentUser, user.id, user.name]);
  
  // Прокручиваем к последнему сообщению при загрузке сообщений
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Подписка на новые сообщения
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = messageService.subscribeToMessages(
      currentUser.id,
      (newMessage) => {
        // Проверяем, от текущего собеседника ли сообщение
        if (newMessage.sender_id === user.id || newMessage.receiver_id === user.id) {
          setMessages(prev => [...prev, newMessage]);
          
          // Хаптик-фидбек при получении нового сообщения
          if (newMessage.sender_id === user.id && telegram?.HapticFeedback) {
            telegram.HapticFeedback.notificationOccurred('success');
          }
          
          // Отслеживаем получение нового сообщения
          if (newMessage.sender_id === user.id && currentUser) {
            gameService.trackUserAction(currentUser.id, 'message_received', {
              from_user: user.id,
              user_name: user.name,
              message_length: newMessage.content.length,
              is_sticker: newMessage.is_sticker,
              timestamp: new Date().toISOString()
            }).catch(console.error);
          }
        }
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [currentUser, user.id, user.name, telegram]);

  const handleSendMessage = async () => {
    if (!message.trim() || !currentUser) return;
    
    // Хаптик-фидбек при отправке сообщения
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
    
    // Отслеживаем отправку сообщения
    if (currentUser) {
      await gameService.trackUserAction(currentUser.id, 'message_sent_detailed', {
        to_user: user.id,
        user_name: user.name,
        message_length: message.length,
        is_sticker: false,
        timestamp: new Date().toISOString()
      });
    }
    
    // Отправляем через локальный onSend для немедленной обратной связи
    onSend(message, false);
    
    // Очищаем поле ввода
    setMessage('');
  };

  const handleEmojiClick = (emoji: string) => {
    if (!currentUser) return;
    
    // Хаптик-фидбек при выборе эмодзи
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    // Отслеживаем отправку эмодзи
    if (currentUser) {
      gameService.trackUserAction(currentUser.id, 'emoji_sent', {
        to_user: user.id,
        user_name: user.name,
        emoji: emoji,
        timestamp: new Date().toISOString()
      }).catch(console.error);
    }
    
    // Отправляем через локальный onSend
    onSend(emoji, false);
  };

  const handleStickerClick = (stickerId: string) => {
    if (!currentUser) return;
    
    // Хаптик-фидбек при выборе стикера
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
    
    // Отслеживаем отправку стикера
    if (currentUser) {
      gameService.trackUserAction(currentUser.id, 'sticker_sent', {
        to_user: user.id,
        user_name: user.name,
        sticker_id: stickerId,
        timestamp: new Date().toISOString()
      }).catch(console.error);
    }
    
    // Отправляем через локальный onSend
    onSend(stickerId, true);
  };

  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      // Хаптик-фидбек при закрытии чата
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.impactOccurred('light');
      }
      
      // Отслеживаем закрытие чата
      if (currentUser) {
        gameService.trackUserAction(currentUser.id, 'chat_closed', {
          chat_with: user.id,
          user_name: user.name,
          timestamp: new Date().toISOString()
        }).catch(console.error);
      }
      
      onClose();
    }
  };

  // Обработчик переключения вкладок
  const handleTabChange = (tab: 'text' | 'stickers' | 'emoji') => {
    // Хаптик-фидбек при переключении вкладки
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    setActiveTab(tab);
    
    // Отслеживаем переключение вкладки
    if (currentUser) {
      gameService.trackUserAction(currentUser.id, 'chat_tab_switch', {
        tab,
        timestamp: new Date().toISOString()
      }).catch(console.error);
    }
  };

  // Форматирование времени сообщения
  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "--:--";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-0 md:p-4 overflow-hidden" onClick={handleClickOutside}>
      <div className="bg-[#252538] rounded-lg w-full max-w-md flex flex-col h-[100vh] md:h-[80vh] md:max-h-[600px] md:mt-8" 
           onClick={e => e.stopPropagation()}
           style={{ maxWidth: '100vw' }}>
        <div className="p-4 border-b border-[#323248] flex-shrink-0 flex items-center justify-between sticky top-0 bg-[#252538] z-10">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-[#323248] overflow-hidden mr-3 shadow-md">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  👤
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm md:text-base">{user.name}</h3>
              <span className="text-xs text-gray-400">#{user.rank} в рейтинге</span>
            </div>
          </div>
          <button 
            onClick={() => {
              // Хаптик-фидбек при закрытии
              if (telegram?.HapticFeedback) {
                telegram.HapticFeedback.impactOccurred('light');
              }
              
              // Отслеживаем закрытие чата по кнопке
              if (currentUser) {
                gameService.trackUserAction(currentUser.id, 'chat_closed_button', {
                  chat_with: user.id,
                  user_name: user.name,
                  timestamp: new Date().toISOString()
                }).catch(console.error);
              }
              
              onClose();
            }} 
            className="text-gray-400 hover:text-white p-2 hover:bg-[#323248] rounded-full transition-colors"
            aria-label="Закрыть"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-grow overflow-y-auto p-4 flex flex-col bg-[#1E1E2D]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : messages.length > 0 ? (
            messages.map((msg, index) => {
              const isMine = currentUser && msg.sender_id === currentUser.id;
              
              return (
                <div 
                  key={msg.id || index}
                  className={`mb-3 max-w-[80%] ${isMine ? 'self-end' : 'self-start'}`}
                >
                  <div className={`p-3 rounded-lg ${
                    isMine ? 'bg-blue-600 text-white' : 'bg-[#323248] text-gray-100'
                  }`}>
                    {msg.is_sticker ? (
                      <div className="flex items-center justify-center w-16 h-16 md:w-24 md:h-24">
                        <StickerIcon size={32} className="text-gray-300" />
                      </div>
                    ) : (
                      <p className="break-words">{msg.content}</p>
                    )}
                  </div>
                  <div className={`text-xs text-gray-400 mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                    {formatMessageTime(msg.created_at)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Нет сообщений. Начните общение!</p>
            </div>
          )}
          {/* Элемент для автоскролла к последнему сообщению */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-[#323248] flex-shrink-0 bg-[#252538]">
          <div className="flex gap-2 mb-2">
            <button 
              onClick={() => handleTabChange('text')}
              className={`flex-1 py-1.5 rounded-full ${activeTab === 'text' ? 'bg-yellow-500 text-black' : 'bg-[#323248] text-white'} text-sm`}
            >
              Текст
            </button>
            <button 
              onClick={() => handleTabChange('emoji')}
              className={`flex-1 py-1.5 rounded-full ${activeTab === 'emoji' ? 'bg-yellow-500 text-black' : 'bg-[#323248] text-white'} text-sm`}
            >
              <SmileIcon size={16} className="mx-auto" />
            </button>
            <button 
              onClick={() => handleTabChange('stickers')}
              className={`flex-1 py-1.5 rounded-full ${activeTab === 'stickers' ? 'bg-yellow-500 text-black' : 'bg-[#323248] text-white'} text-sm`}
            >
              <StickerIcon size={16} className="mx-auto" />
            </button>
          </div>

          {activeTab === 'text' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Введите сообщение..."
                className="flex-1 bg-[#323248] rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm md:text-base"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className="bg-yellow-500 text-black p-2 rounded-full disabled:opacity-50 hover:bg-yellow-600 transition-colors"
                aria-label="Отправить"
              >
                <SendIcon size={20} />
              </button>
            </div>
          )}

          {activeTab === 'emoji' && (
            <div className="grid grid-cols-6 gap-2 h-40 overflow-y-auto bg-[#1E1E2D] rounded-lg p-2">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-2xl hover:bg-[#323248] rounded p-2 flex items-center justify-center transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'stickers' && (
            <div className="grid grid-cols-3 gap-2 h-40 overflow-y-auto bg-[#1E1E2D] rounded-lg p-2">
              {stickers.map((sticker) => (
                <button
                  key={sticker.id}
                  onClick={() => handleStickerClick(sticker.code)}
                  className="aspect-square bg-[#323248] rounded flex items-center justify-center hover:bg-[#3a3a52] transition-colors"
                >
                  <img 
                    src={sticker.image} 
                    alt="Стикер" 
                    className="w-16 h-16 object-contain"
                    onError={() => {
                      // Если изображение не загружается, показываем иконку вместо него
                      const target = event?.target as HTMLImageElement;
                      if (target) {
                        target.onerror = null;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const icon = document.createElement('div');
                          icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><circle cx="12" cy="12" r="10"/><path d="M8 11.8A3 3 0 0 0 12.2 8"/><path d="M15.5 15.5 12 12"/></svg>`;
                          parent.appendChild(icon);
                        }
                      }
                    }}
                  />
                </button>
              ))}
            </div>
          )}
          
          <div className="flex justify-center mt-2">
            <div className="w-16 h-1 bg-[#323248] rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;