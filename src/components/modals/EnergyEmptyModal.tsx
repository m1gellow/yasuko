import React, { useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { referralService } from '../../services/referralService';
import { useTelegram } from '../../contexts/TelegramContext';
import { BoltIcon, UsersIcon, GamepadIcon, XIcon } from 'lucide-react';

interface EnergyEmptyModalProps {
  onClose: () => void;
}

const EnergyEmptyModal: React.FC<EnergyEmptyModalProps> = ({ onClose }) => {
  const [creatingReferral, setCreatingReferral] = useState(false);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { dispatch } = useGame();
  const { user } = useAuth();
  const { telegram } = useTelegram();

  // Создание реферальной ссылки для приглашения друга
  const handleCreateReferral = async () => {
    if (!user) {
      alert('Для создания приглашения необходимо войти в систему');
      onClose();
      return;
    }

    setCreatingReferral(true);
    try {
      const result = await referralService.createReferralLink(user.id, {
        reward: { coins: 100, energy: 100 }
      });
      
      if (result.success && result.code) {
        const shareableLink = referralService.generateShareableLink(result.code);
        setReferralLink(shareableLink);
        
        // Если есть Telegram API, сразу открываем диалог шаринга
        if (telegram?.WebApp) {
          shareToTelegram(shareableLink);
        }
      } else {
        alert('Не удалось создать приглашение. Пожалуйста, попробуйте ещё раз.');
      }
    } catch (error) {
      console.error('Ошибка при создании приглашения:', error);
      alert('Произошла ошибка при создании приглашения');
    } finally {
      setCreatingReferral(false);
    }
  };

  // Копирование реферальной ссылки в буфер обмена
  const copyReferralLink = () => {
    if (!referralLink) return;

    navigator.clipboard.writeText(referralLink)
      .then(() => {
        setCopied(true);
        // Тактильная отдача через Telegram API
        if (telegram?.HapticFeedback) {
          telegram.HapticFeedback.notificationOccurred('success');
        }
        
        setTimeout(() => setCopied(false), 2000);
        
        // Показываем сообщение об успехе и закрываем модальное окно через 2 секунды
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          // Начисляем бонус пользователю за приглашение
          dispatch({ 
            type: 'REGEN_ENERGY', 
            payload: 100 
          });
          dispatch({ 
            type: 'CLAIM_REWARD', 
            payload: { type: 'coins', amount: 100 } 
          });
          onClose();
        }, 2000);
      })
      .catch(err => {
        console.error('Не удалось скопировать ссылку:', err);
        alert('Не удалось скопировать ссылку. Пожалуйста, скопируйте её вручную.');
      });
  };
  
  // Поделиться в Telegram
  const shareToTelegram = (link: string) => {
    try {
      if (telegram) {
        // Подготовка текста для шаринга
        const shareText = `Присоединяйся к игре "Ясуко"! Получи +100 монет и +100 энергии по моей реферальной ссылке: ${link}`;
        
        // Используем нативное API Telegram для шаринга
        if (telegram.WebApp) {
          // Используем правильный метод для открытия ссылки шаринга в Telegram
          telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`);
        } else if (telegram.openTelegramLink) {
          // Резервный вариант для некоторых версий API
          telegram.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`);
        } else {
          // Если нет методов для открытия ссылки, используем стандартное окно
          window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`, '_blank');
        }
        
        // Отмечаем успешное приглашение
        setShowSuccess(true);
        
        // Начисляем бонус немедленно для лучшего UX
        dispatch({ 
          type: 'REGEN_ENERGY', 
          payload: 100 
        });
        
        dispatch({ 
          type: 'CLAIM_REWARD', 
          payload: { type: 'coins', amount: 100 } 
        });
        
        // Закрываем окно через небольшую задержку
        setTimeout(() => {
          setShowSuccess(false);
          onClose();
        }, 2000);
      } else {
        // Если API нет, просто копируем ссылку
        copyReferralLink();
      }
    } catch (error) {
      console.error('Ошибка при попытке поделиться в Telegram:', error);
      
      // Запасной вариант - используем глобальный объект Telegram
      try {
        if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.openTelegramLink(
            `https://t.me/share/url?url=${encodeURIComponent(link)}`
          );
          
          setShowSuccess(true);
          
          // Начисляем бонус
          dispatch({ 
            type: 'REGEN_ENERGY', 
            payload: 100 
          });
          dispatch({ 
            type: 'CLAIM_REWARD', 
            payload: { type: 'coins', amount: 100 } 
          });
          
          setTimeout(() => {
            setShowSuccess(false);
            onClose();
          }, 2000);
        } else {
          // Если все методы не работают, просто копируем в буфер
          copyReferralLink();
        }
      } catch (backupError) {
        // В крайнем случае просто копируем в буфер
        copyReferralLink();
      }
    }
  };

  // Открытие мини-игры для восполнения энергии
  const openMiniGame = () => {
    window.dispatchEvent(new CustomEvent('open-mini-game'));
    onClose();
  };

  // Обработчик для закрытия модального окна
  const handleClose = () => {
    // Хаптик-фидбек при закрытии
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    
    // Просто закрываем модальное окно
    onClose();
  };

  return (
 <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      {showSuccess ? (
        <div className="bg-green-600 rounded-lg p-8 text-center max-w-md animate-bounce shadow-lg">
          <BoltIcon className="text-white mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-white mb-2">БОНУС ПОЛУЧЕН!</h2>
          <p className="text-white">+100 энергии и +100 монет добавлено</p>
        </div>
      ) : (
        <div className="bg-[#252538] rounded-lg w-full max-h-[70vh] flex flex-col max-w-[300px] shadow-xl">
          <div className="bg-red-500 p-4 flex justify-between items-center">
            <div className="flex items-center">
              <BoltIcon className="text-white mr-2" size={24} />
              <h2 className="text-xl font-bold text-white">ЭНЕРГИЯ ЗАКОНЧИЛАСЬ!</h2>
            </div>
            <button 
              onClick={handleClose} 
              className="text-white hover:text-gray-200 p-1 rounded-full bg-red-600 hover:bg-red-700"
              aria-label="Закрыть"
            >
              <XIcon size={24} />
            </button>
          </div>
          
          <div className="p-6 flex-grow overflow-y-auto">
            <p className="text-center text-lg mb-6">
              Ваша энергия закончилась! Выберите способ восполнения:
            </p>
            
            <div className="space-y-4">
              <div className="bg-[#323248] p-4 rounded-lg hover:bg-[#3d3d58] transition-colors shadow-md">
                <div className="flex items-center mb-3">
                  <GamepadIcon className="text-yellow-400 mr-3" size={24} />
                  <h3 className="font-bold">Сыграть в мини-игру</h3>
                </div>
                <p className="text-sm text-gray-300 mb-4">
                  Играйте в мини-игру и получайте энергию за каждый пойманный орех!
                </p>
                <button 
                  onClick={openMiniGame}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold transition-colors"
                >
                  ИГРАТЬ
                </button>
              </div>
              
              <div className="bg-[#323248] p-4 rounded-lg hover:bg-[#3d3d58] transition-colors shadow-md">
                <div className="flex items-center mb-3">
                  <UsersIcon className="text-blue-400 mr-3" size={24} />
                  <h3 className="font-bold">Пригласить друга</h3>
                </div>
                <p className="text-sm text-gray-300 mb-4">
                  Пригласите друга и получите бонус: +100 энергии и +100 монет, когда друг зарегистрируется!
                </p>
                
                {!referralLink ? (
                  <button 
                    onClick={handleCreateReferral}
                    disabled={creatingReferral || !user}
                    className={`w-full ${creatingReferral ? 'bg-gray-500' : 'bg-blue-500 hover:bg-blue-600'} text-white py-3 rounded-lg font-bold transition-colors`}
                  >
                    {creatingReferral ? (
                      <span className="flex items-center justify-center">
                        <span className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></span>
                        СОЗДАНИЕ ССЫЛКИ...
                      </span>
                    ) : (
                      'ПРИГЛАСИТЬ ДРУГА'
                    )}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-[#1E1E2D] p-3 rounded text-gray-300 break-all text-sm">
                      {referralLink}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={copyReferralLink}
                        className={`py-2 rounded-lg font-bold ${copied ? 'bg-green-500' : 'bg-yellow-500 hover:bg-yellow-600'} text-black transition-colors`}
                      >
                        {copied ? 'СКОПИРОВАНО!' : 'КОПИРОВАТЬ'}
                      </button>
                      <button 
                        onClick={() => shareToTelegram(referralLink)}
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-bold transition-colors"
                      >
                        ОТПРАВИТЬ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 flex justify-center">
              <button 
                onClick={handleClose}
                className="text-gray-400 hover:text-white bg-[#323248] hover:bg-[#3a3a55] px-4 py-2 rounded-lg transition-colors"
              >
                Закрыть
              </button>
            </div>
            
            <div className="mt-4 text-center text-sm text-gray-400">
              Вы также можете подождать - энергия восстанавливается со временем
              <br />
              (1 энергия каждые 3 минуты)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnergyEmptyModal;