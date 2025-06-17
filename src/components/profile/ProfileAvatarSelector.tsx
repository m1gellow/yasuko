import React, { useState } from 'react';
import { Upload, X, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { useGame } from '../../contexts/GameContext';
import { useTelegram } from '../../contexts/TelegramContext';

interface ProfileAvatarSelectorProps {
  onClose: () => void;
}

const ProfileAvatarSelector: React.FC<ProfileAvatarSelectorProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { dispatch } = useGame();
  const { telegram } = useTelegram();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Проверка типа файла (только изображения)
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение');
      return;
    }
    
    // Проверка размера файла (не более 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5MB');
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    
    // Создаем превью изображения
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      return;
    }
    
    // Хаптик-фидбек при загрузке
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      const { success, url, error: uploadError } = await userService.updateAvatar(
        user.id,
        selectedFile
      );
      
      if (!success || !url) {
        throw new Error(uploadError || 'Ошибка при загрузке аватара');
      }
      
      // Обновляем локальное состояние
      dispatch({ type: 'SET_AVATAR', payload: url });
      
      // Показываем сообщение об успехе
      setSuccess(true);
      
      // Закрываем модальное окно через 2 секунды
      setTimeout(() => {
        onClose();
      }, 2000);
      
      // Хаптик-фидбек при успешной загрузке
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('success');
      }
    } catch (err) {
      console.error('Ошибка при загрузке аватара:', err);
      setError('Не удалось загрузить изображение. Попробуйте еще раз.');
      
      // Хаптик-фидбек при ошибке
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={handleClickOutside}>
      <div className="bg-[#252538] rounded-lg w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-[#323248] flex justify-between items-center">
          <h3 className="font-bold text-lg text-yellow-400">Загрузка аватара</h3>
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
                <Check className="text-white\" size={32} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Аватар загружен!</h4>
              <p className="text-gray-300">Ваш аватар успешно обновлен</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md mb-4">
                  {error}
                </div>
              )}
              
              <div className="mb-6">
                <div 
                  className={`w-40 h-40 mx-auto bg-[#323248] rounded-lg flex flex-col items-center justify-center overflow-hidden border-2 ${
                    selectedFile ? 'border-yellow-500' : 'border-dashed border-gray-600 hover:border-yellow-500'
                  } transition-all cursor-pointer`}
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Предпросмотр" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      <Upload size={32} className="mb-2 text-gray-400" />
                      <span className="text-sm text-gray-400">Нажмите, чтобы выбрать изображение</span>
                    </div>
                  )}
                </div>
                
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                
                <p className="text-center text-xs text-gray-400 mt-3">
                  Поддерживаются форматы JPG, PNG. <br/>Максимальный размер: 5MB
                </p>
              </div>
              
              <div className="flex justify-center space-x-3">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 bg-[#323248] text-white rounded hover:bg-[#3a3a55] transition-colors"
                >
                  Отмена
                </button>
                <button 
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className={`px-4 py-2 ${!selectedFile || isUploading ? 'bg-yellow-500/50 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600'} text-black rounded font-medium transition-colors`}
                >
                  {isUploading ? (
                    <span className="flex items-center">
                      <span className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin mr-2"></span>
                      Загрузка...
                    </span>
                  ) : 'Загрузить'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileAvatarSelector;