import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { gameService } from '../../services/gameService';
import { useTelegram } from '../../contexts/TelegramContext';

interface ProfileStatusEditorProps {
  initialStatus: string;
  onClose: () => void;
  onSave: (status: string) => void;
}

const ProfileStatusEditor: React.FC<ProfileStatusEditorProps> = ({
  initialStatus,
  onClose,
  onSave
}) => {
  const [newStatus, setNewStatus] = useState(initialStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const { telegram } = useTelegram();

  const handleSave = async () => {
    if (!newStatus.trim()) {
      setError('Статус не может быть пустым');
      return;
    }
    
    // Хаптик-фидбек перед сохранением
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Отслеживание сохранения статуса
      if (user) {
        await gameService.trackUserAction(user.id, 'status_save', {
          old_status: initialStatus,
          new_status: newStatus,
          status_length: newStatus.length,
          timestamp: new Date().toISOString()
        });
      }
      
      // Обновляем статус в контексте игры
      onSave(newStatus);
      
      // Если пользователь авторизован, обновляем статус в базе данных
      if (user) {
        await userService.updateUser(user.id, { status: newStatus });
      }
      
      // Показываем сообщение об успехе
      setSuccess(true);
      
      // Хаптик-фидбек при успешном сохранении
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('success');
      }
      
      // Закрываем окно редактирования через небольшую задержку
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Ошибка при сохранении статуса:', error);
      
      setError('Произошла ошибка при сохранении статуса');
      
      // Хаптик-фидбек при ошибке
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('error');
      }
      
      // Отслеживание ошибки
      if (user) {
        await gameService.trackUserAction(user.id, 'status_save_error', {
          error: String(error),
          timestamp: new Date().toISOString()
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      // Отслеживание закрытия без сохранения
      if (user) {
        gameService.trackUserAction(user.id, 'status_edit_cancel', {
          timestamp: new Date().toISOString()
        }).catch(console.error);
      }
      
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={handleClickOutside}>
      <div className="bg-[#252538] rounded-lg w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-[#323248] flex justify-between items-center">
          <h3 className="font-bold text-lg text-yellow-400">Редактирование статуса</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#3a3a55]"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                <Save className="text-white\" size={32} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Статус сохранен!</h4>
              <p className="text-gray-300">Ваш статус успешно обновлен</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md mb-4 flex items-start">
                  <AlertCircle size={18} className="mr-2 mt-1 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              
              <div className="mb-4">
                <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-2">
                  Ваш статус:
                </label>
                <textarea
                  id="status"
                  value={newStatus}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewStatus(value);
                    
                    // Отслеживаем ввод текста при достижении определенной длины
                    if (user && (value.length === 10 || value.length === 50 || value.length === 90)) {
                      gameService.trackUserAction(user.id, 'status_typing', {
                        length: value.length,
                        timestamp: new Date().toISOString()
                      }).catch(console.error);
                    }
                  }}
                  className="w-full bg-[#323248] rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-2 text-base resize-none"
                  rows={3}
                  placeholder="Напишите свой статус..."
                  maxLength={100}
                ></textarea>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Максимум 100 символов</span>
                  <span className={newStatus.length > 90 ? 'text-yellow-500' : ''}>
                    Осталось: {100 - newStatus.length}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-[#323248] rounded-lg text-white hover:bg-[#3a3a55] transition-colors"
                  disabled={isSaving}
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-600 transition-colors flex items-center"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin mr-2"></span>
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Сохранить
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileStatusEditor;