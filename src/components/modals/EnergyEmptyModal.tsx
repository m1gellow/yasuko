import React, { useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { referralService } from '../../services/referralService';
import { useTelegram } from '../../contexts/TelegramContext';
import { BoltIcon, UsersIcon, GamepadIcon, XIcon, ZapIcon, GiftIcon } from 'lucide-react';

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

  const copyReferralLink = () => {
    if (!referralLink) return;

    navigator.clipboard.writeText(referralLink)
      .then(() => {
        setCopied(true);
        if (telegram?.HapticFeedback) {
          telegram.HapticFeedback.notificationOccurred('success');
        }
        
        setTimeout(() => setCopied(false), 2000);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          dispatch({ type: 'REGEN_ENERGY', payload: 100 });
          dispatch({ type: 'CLAIM_REWARD', payload: { type: 'coins', amount: 100 } });
          onClose();
        }, 2000);
      })
      .catch(err => {
        console.error('Не удалось скопировать ссылку:', err);
        alert('Не удалось скопировать ссылку. Пожалуйста, скопируйте её вручную.');
      });
  };
  
  const shareToTelegram = (link: string) => {
    try {
      if (telegram) {
        const shareText = `Присоединяйся к игре "Ясуко"! Получи +100 монет и +100 энергии по моей реферальной ссылке: ${link}`;
        
        if (telegram.WebApp) {
          telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`);
        } else if (telegram.openTelegramLink) {
          telegram.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`);
        } else {
          window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`, '_blank');
        }
        
        setShowSuccess(true);
        dispatch({ type: 'REGEN_ENERGY', payload: 100 });
        dispatch({ type: 'CLAIM_REWARD', payload: { type: 'coins', amount: 100 } });
        setTimeout(() => {
          setShowSuccess(false);
          onClose();
        }, 2000);
      } else {
        copyReferralLink();
      }
    } catch (error) {
      console.error('Ошибка при попытке поделиться в Telegram:', error);
      try {
        if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.openTelegramLink(
            `https://t.me/share/url?url=${encodeURIComponent(link)}`
          );
          setShowSuccess(true);
          dispatch({ type: 'REGEN_ENERGY', payload: 100 });
          dispatch({ type: 'CLAIM_REWARD', payload: { type: 'coins', amount: 100 } });
          setTimeout(() => {
            setShowSuccess(false);
            onClose();
          }, 2000);
        } else {
          copyReferralLink();
        }
      } catch (backupError) {
        copyReferralLink();
      }
    }
  };

  const openMiniGame = () => {
    window.dispatchEvent(new CustomEvent('open-mini-game'));
    onClose();
  };

  const handleClose = () => {
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.selectionChanged();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      {showSuccess ? (
        <div className="bg-gradient-to-br from-green-600 to-emerald-800 rounded-xl p-8 text-center max-w-md shadow-xl border border-green-400/30">
          <div className="bg-green-500/20 p-4 rounded-full inline-flex mb-4">
            <GiftIcon className="text-white" size={48} />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">БОНУС ПОЛУЧЕН!</h2>
          <p className="text-white/90">+100 энергии и +100 монет добавлено</p>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-[#1e183a] to-[#15122b] rounded-xl w-full max-w-sm shadow-xl border border-purple-500/30 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-800 p-4 flex justify-between items-center">
            <div className="flex items-center">
              <BoltIcon className="text-white mr-2" size={24} />
              <h2 className="text-xl font-bold text-white">ЭНЕРГИЯ ЗАКОНЧИЛАСЬ!</h2>
            </div>
            <button 
              onClick={handleClose} 
              className="text-white/80 hover:text-white p-1 rounded-full hover:bg-red-700/50 transition-all"
              aria-label="Закрыть"
            >
              <XIcon size={24} />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <p className="text-center text-gray-300 mb-6">
              Ваша энергия закончилась! Выберите способ восполнения:
            </p>
            
            <div className="space-y-4">
              {/* Mini Game Option */}
              <div className="bg-gradient-to-br from-[#2a1a4a] to-[#1a0e33] p-4 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all shadow-lg">
                <div className="flex items-center mb-3">
                  <div className="bg-yellow-500/20 p-2 rounded-lg mr-3">
                    <GamepadIcon className="text-yellow-400" size={20} />
                  </div>
                  <h3 className="font-bold text-white">Сыграть в мини-игру</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Играйте в мини-игру и получайте энергию за каждый пойманный орех!
                </p>
                <button 
                  onClick={openMiniGame}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-3 rounded-lg font-bold transition-all shadow-md"
                >
                  ИГРАТЬ
                </button>
              </div>
              
              {/* Referral Option */}
              <div className="bg-gradient-to-br from-[#2a1a4a] to-[#1a0e33] p-4 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all shadow-lg">
                <div className="flex items-center mb-3">
                  <div className="bg-blue-500/20 p-2 rounded-lg mr-3">
                    <UsersIcon className="text-blue-400" size={20} />
                  </div>
                  <h3 className="font-bold text-white">Пригласить друга</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Пригласите друга и получите бонус: +100 энергии и +100 монет, когда друг зарегистрируется!
                </p>
                
                {!referralLink ? (
                  <button 
                    onClick={handleCreateReferral}
                    disabled={creatingReferral || !user}
                    className={`w-full py-3 rounded-lg font-bold transition-all shadow-md ${
                      creatingReferral 
                        ? 'bg-gray-600 text-gray-400' 
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                    }`}
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
                  <div className="space-y-3">
                    <div className="bg-[#0f0c1d] p-3 rounded-lg text-gray-300 break-all text-sm border border-purple-500/20">
                      {referralLink}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={copyReferralLink}
                        className={`py-2 rounded-lg font-bold transition-all shadow-md ${
                          copied 
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                            : 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black'
                        }`}
                      >
                        {copied ? 'СКОПИРОВАНО!' : 'КОПИРОВАТЬ'}
                      </button>
                      <button 
                        onClick={() => shareToTelegram(referralLink)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2 rounded-lg font-bold transition-all shadow-md"
                      >
                        ОТПРАВИТЬ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 text-center text-sm text-gray-400">
              <div className="flex items-center justify-center mb-2">
                <ZapIcon className="text-yellow-400 mr-2" size={16} />
                <span>Энергия восстанавливается автоматически (1 каждые 3 минуты)</span>
              </div>
              <button 
                onClick={handleClose}
                className="text-gray-400 hover:text-white bg-[#1e183a] hover:bg-[#2a1a4a] px-6 py-2 rounded-lg transition-all border border-purple-500/20 mt-2"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnergyEmptyModal;