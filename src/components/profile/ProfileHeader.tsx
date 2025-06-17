import React, { useState, useEffect } from 'react';
import { PencilIcon, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useGame } from '../../contexts/GameContext';
import { userService } from '../../services/userService';
import { gameService } from '../../services/gameService';
import { useTelegram } from '../../contexts/TelegramContext';

interface ProfileHeaderProps {
  name: string;
  id: string;
  mood: string;
  thoughtStatus: string;
  onEditStatus: () => void;
  onEditAvatar?: () => void;
  avatar?: string;
}

// Предопределенные статусы для выбора
const PRESET_STATUSES = [
  'Привет, мир!',
  'Я люблю тапать!',
  'В поисках приключений',
  'Развиваю своего Ясуко',
  'Настроение отличное!',
  'Идём к вершине рейтинга!',
  'Мой Ясуко самый милый!',
  'Заходите в гости!',
  'Хочу больше монет...',
  'Ищу друзей для игры'
];

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  name,
  id,
  mood,
  thoughtStatus,
  onEditStatus,
  onEditAvatar,
  avatar
}) => {
  const { user } = useAuth();
  const { state, dispatch } = useGame();
  const { telegram } = useTelegram();
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [statusList, setStatusList] = useState<string[]>(PRESET_STATUSES);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  // Загрузка аватара и статусов при монтировании
  useEffect(() => {
    const loadAvatar = async () => {
      if (avatar) {
        setAvatarUrl(avatar);
      } else if (user && user.avatar_url) {
        setAvatarUrl(user.avatar_url);
      } else if (state.profile.avatar) {
        setAvatarUrl(state.profile.avatar);
      }
    };
    
    const loadStatuses = async () => {
      if (!user) return;
      
      try {
        setLoadingStatuses(true);
        // Получаем все фразы с категорией "status"
        const { data, error } = await supabase
          .from('phrases')
          .select('text')
          .eq('category', 'status');
          
        if (error) {
          console.error('Ошибка при загрузке статусов:', error);
          return;
        }
        
        if (data && data.length > 0) {
          setStatusList(data.map(item => item.text));
        }
      } catch (error) {
        console.error('Ошибка при загрузке статусов:', error);
      } finally {
        setLoadingStatuses(false);
      }
    };
    
    loadAvatar();
    loadStatuses();
  }, [user, avatar, state.profile.avatar]);

  const handleAvatarClick = () => {
    // Тактильная отдача через Telegram API
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    // Отслеживание клика по аватару
    if (user) {
      gameService.trackUserAction(user.id, 'avatar_click', {
        timestamp: new Date().toISOString()
      });
    }
    
    if (onEditAvatar) {
      onEditAvatar();
    } else {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          handleAvatarUpload(files[0]);
        }
      };
      fileInput.click();
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) {
      setError('Вы должны войти в систему, чтобы загрузить аватар');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Отслеживаем начало загрузки аватара
      await gameService.trackUserAction(user.id, 'avatar_upload_start', {
        file_size: file.size,
        file_type: file.type,
        timestamp: new Date().toISOString()
      });
      
      // Используем сервис для загрузки аватара
      const { success, url, error: uploadError } = await userService.updateAvatar(user.id, file);
      
      if (!success || !url) {
        throw new Error(uploadError || 'Не удалось загрузить аватар');
      }

      // Отслеживаем успешную загрузку аватара
      await gameService.trackUserAction(user.id, 'avatar_upload_success', {
        avatar_url: url,
        timestamp: new Date().toISOString()
      });

      // Обновляем локальное состояние
      setAvatarUrl(url);
      dispatch({ type: 'SET_AVATAR', payload: url });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError('Не удалось загрузить аватар. Пожалуйста, попробуйте еще раз.');
      
      // Отслеживаем ошибку при загрузке аватара
      if (user) {
        gameService.trackUserAction(user.id, 'avatar_upload_error', {
          error_message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Выбор предустановленного статуса
  const selectPresetStatus = async (status: string) => {
    if (!user) {
      dispatch({ type: 'SET_THOUGHT_STATUS', payload: status });
      setShowStatusMenu(false);
      return;
    }
    
    try {
      // Тактильная отдача через Telegram API
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.selectionChanged();
      }
      
      // Отслеживаем выбор статуса
      await gameService.trackUserAction(user.id, 'status_set', {
        previous_status: thoughtStatus,
        new_status: status,
        preset: true,
        timestamp: new Date().toISOString()
      });
      
      // Обновляем статус в базе данных
      await userService.updateUser(user.id, { status });
      
      // Обновляем локальное состояние
      dispatch({ type: 'SET_THOUGHT_STATUS', payload: status });
      setShowStatusMenu(false);
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
    }
  };

  return (
    <div className="bg-[#252538] p-4 rounded-lg mb-4 shadow-lg">
      <div className="flex items-center gap-4">
        <div 
          className="w-20 h-20 rounded-full bg-[#323248] flex items-center justify-center overflow-hidden cursor-pointer relative shadow-md group hover:shadow-lg transition-shadow"
          onClick={handleAvatarClick}
        >
          {isUploading ? (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={name} 
                  className="w-full h-full object-cover"
                  onError={() => setAvatarUrl(null)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <Upload size={18} className="mb-1" />
                  <span className="text-xs">Аватар</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="bg-yellow-500 rounded-full p-1">
                  <PencilIcon size={16} className="text-black" />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{name}</h1>
          <p className="text-sm text-gray-400 truncate">{id.length > 12 ? `ID: ${id.substring(0, 8)}...` : `ID: ${id}`}</p>
          <div className="mt-1 inline-block px-2 py-1 bg-yellow-500/20 rounded-full">
            <span className="text-yellow-500 text-sm">{mood}</span>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mt-2 p-2 bg-red-500/20 text-red-300 text-sm rounded">
          {error}
        </div>
      )}
      
      <div className="mt-4 relative">
        <div className="bg-[#323248] p-3 rounded-lg flex items-center justify-between group hover:bg-[#363652] transition-colors">
          <p className="text-gray-300">{thoughtStatus}</p>
          <button 
            onClick={() => {
              // Тактильная отдача через Telegram API
              if (telegram?.HapticFeedback) {
                telegram.HapticFeedback.selectionChanged();
              }
              
              // Отслеживаем открытие меню статусов
              if (user) {
                gameService.trackUserAction(user.id, 'status_menu_open', {
                  current_status: thoughtStatus,
                  timestamp: new Date().toISOString()
                });
              }
              
              setShowStatusMenu(prev => !prev);
            }}
            className="text-gray-400 hover:text-white flex items-center"
            aria-label={showStatusMenu ? "Скрыть статусы" : "Показать статусы"}
          >
            {showStatusMenu ? 
              <ChevronUp size={16} className="ml-2" /> : 
              <ChevronDown size={16} className="ml-2" />
            }
          </button>
        </div>
        
        {/* Выпадающее меню со статусами */}
        {showStatusMenu && (
          <div className="absolute z-50 bg-[#323248] rounded-lg shadow-lg  border border-[#3f3f58] animate-fade-in-down">
            {loadingStatuses ? (
              <div className="p-4 text-center">
                <div className="w-6 h-6 border-2 border-t-transparent border-yellow-500 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-400">Загрузка статусов...</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {statusList.map((status, index) => (
                  <button
                    key={index}
                    className="w-full text-left px-4 py-2 hover:bg-[#3a3a52] text-sm transition-colors border-b border-[#3d3d58] last:border-b-0"
                    onClick={() => selectPresetStatus(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
            <div className="p-2 border-t border-[#252538]">
              <button
                onClick={() => {
                  // Тактильная отдача через Telegram API
                  if (telegram?.HapticFeedback) {
                    telegram.HapticFeedback.impactOccurred('light');
                  }
                  
                  // Отслеживаем нажатие кнопки ручного ввода статуса
                  if (user) {
                    gameService.trackUserAction(user.id, 'custom_status_edit', {
                      current_status: thoughtStatus,
                      timestamp: new Date().toISOString()
                    });
                  }
                  
                  onEditStatus();
                }}
                className="w-full text-center bg-yellow-500 text-black rounded-lg px-4 py-2 text-sm font-medium hover:bg-yellow-600 transition-colors"
              >
                Написать свой статус
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;