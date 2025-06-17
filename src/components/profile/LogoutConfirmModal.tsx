import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTelegram } from '../../contexts/TelegramContext';

interface LogoutConfirmModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({ onClose, onConfirm }) => {
  const { telegram } = useTelegram();
  
  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCancel = () => {
    // Хаптик-фидбек при отмене
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    onClose();
  };
  
  const handleConfirm = () => {
    // Хаптик-фидбек при подтверждении
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={handleClickOutside}>
      <div className="bg-[#252538] rounded-lg p-6 w-full max-w-xs shadow-xl">
        <div className="flex items-center mb-4 text-yellow-400">
          <AlertTriangle size={24} className="mr-2" />
          <h3 className="text-lg font-bold">Выход из аккаунта</h3>
        </div>
        
        <p className="mb-6 text-gray-200">Вы уверены, что хотите выйти из аккаунта? Ваш прогресс сохранится.</p>
        
        <div className="flex justify-end space-x-3">
          <button 
            className="px-4 py-2 bg-[#323248] rounded text-white hover:bg-[#3a3a55] transition-colors"
            onClick={handleCancel}
          >
            Отмена
          </button>
          <button 
            className="px-4 py-2 bg-red-500 rounded text-white hover:bg-red-600 transition-colors flex items-center"
            onClick={handleConfirm}
          >
            <X size={18} className="mr-1" />
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;