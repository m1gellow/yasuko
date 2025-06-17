import React, { useState, useEffect } from 'react';
import { referralService } from '../../services/referralService';
import { useAuth } from '../../contexts/AuthContext';
import { useGame } from '../../contexts/GameContext';
import { LinkIcon, CopyIcon, ShareIcon, CheckIcon, PlusIcon, XIcon, TrashIcon, AlertCircle, Link2 } from 'lucide-react';
import { useTelegram } from '../../contexts/TelegramContext';

const ReferralSection: React.FC = () => {
  const { user } = useAuth();
  const { state, dispatch } = useGame();
  const { telegram } = useTelegram();
  const [referralLinks, setReferralLinks] = useState<Array<{
    id: string;
    code: string;
    created_at: string;
    use_count: number;
    is_active: boolean;
    expires_at: string | null;
  }>>([]);
  const [stats, setStats] = useState({
    totalLinks: 0,
    totalUses: 0,
    activeLinks: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLinkOptions, setNewLinkOptions] = useState({
    expiresInDays: 30,
    maxUses: 10,
    rewardCoins: 100,
    rewardEnergy: 100
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [filteredLinks, setFilteredLinks] = useState<Array<{
    id: string;
    code: string;
    created_at: string;
    use_count: number;
    is_active: boolean;
    expires_at: string | null;
  }>>([]);
  const [showInactive, setShowInactive] = useState(false);

  // Загрузка реферальных ссылок пользователя
  useEffect(() => {
    if (!user) return;
    
    const loadReferralData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const links = await referralService.getUserReferralLinks(user.id);
        setReferralLinks(links);
        
        // Устанавливаем только активные ссылки по умолчанию
        setFilteredLinks(links.filter(link => link.is_active));
        
        const stats = await referralService.getReferralStats(user.id);
        setStats(stats);
      } catch (error) {
        console.error('Error loading referral data:', error);
        setError('Не удалось загрузить реферальные данные. Пожалуйста, попробуйте позже.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadReferralData();
  }, [user]);

  // Фильтрация ссылок при изменении флага showInactive
  useEffect(() => {
    if (showInactive) {
      setFilteredLinks(referralLinks);
    } else {
      setFilteredLinks(referralLinks.filter(link => link.is_active));
    }
  }, [showInactive, referralLinks]);

  // Создание новой реферальной ссылки
  const handleCreateReferral = async () => {
    if (!user) return;
    
    // Хаптик-фидбек
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + newLinkOptions.expiresInDays);
      
      const result = await referralService.createReferralLink(user.id, {
        expiresAt: newLinkOptions.expiresInDays > 0 ? expiresAt : undefined,
        maxUses: newLinkOptions.maxUses > 0 ? newLinkOptions.maxUses : undefined,
        reward: {
          coins: newLinkOptions.rewardCoins,
          energy: newLinkOptions.rewardEnergy
        }
      });
      
      if (result.success && result.code) {
        // Обновляем список ссылок
        const links = await referralService.getUserReferralLinks(user.id);
        setReferralLinks(links);
        
        // Обновляем отфильтрованный список ссылок
        if (showInactive) {
          setFilteredLinks(links);
        } else {
          setFilteredLinks(links.filter(link => link.is_active));
        }
        
        const stats = await referralService.getReferralStats(user.id);
        setStats(stats);
        
        // Хаптик-фидбек при успешном создании
        if (telegram?.HapticFeedback) {
          telegram.HapticFeedback.notificationOccurred('success');
        }
        
        // Закрываем модальное окно
        setShowCreateModal(false);
        
        // Сразу открываем диалог шаринга для новой ссылки
        if (result.code) {
          shareToTelegram(result.code);
        }
      } else {
        console.error('Failed to create referral link:', result.error);
        setError('Не удалось создать реферальную ссылку');
        
        // Хаптик-фидбек при ошибке
        if (telegram?.HapticFeedback) {
          telegram.HapticFeedback.notificationOccurred('error');
        }
      }
    } catch (error) {
      console.error('Error creating referral link:', error);
      setError('Произошла ошибка при создании реферальной ссылки');
      
      // Хаптик-фидбек при ошибке
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Копирование реферальной ссылки
  const copyReferralLink = (code: string) => {
    const fullLink = referralService.generateShareableLink(code);
    
    // Хаптик-фидбек
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
    
    navigator.clipboard.writeText(fullLink)
      .then(() => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
        
        // Хаптик-фидбек при успешном копировании
        if (telegram?.HapticFeedback) {
          telegram.HapticFeedback.notificationOccurred('success');
        }
        
        // Показываем сообщение об успешном копировании
        alert('Ссылка скопирована в буфер обмена!');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        setError('Не удалось скопировать ссылку');
        
        // Хаптик-фидбек при ошибке
        if (telegram?.HapticFeedback) {
          telegram.HapticFeedback.notificationOccurred('error');
        }
      });
  };

  // Поделиться в Telegram
  const shareToTelegram = (code: string) => {
    const fullLink = referralService.generateShareableLink(code);
    const shareText = encodeURIComponent(`Играй в Ясуко вместе со мной и получи +100 энергии и +100 монет! Присоединяйся по этой ссылке: ${fullLink}`);
    
    // Хаптик-фидбек
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('medium');
    }
    
    try {
      // Если есть Telegram WebApp API, используем его
      if (telegram?.WebApp) {
        // Используем openTelegramLink для открытия шаринга в Telegram
        telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(fullLink)}&text=${shareText}`);
        setShareSuccess(true);
        
        setTimeout(() => {
          setShareSuccess(false);
        }, 2000);
      } else if (window.Telegram && window.Telegram.WebApp) {
        // Альтернативный способ доступа к Telegram WebApp API
        window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(fullLink)}&text=${shareText}`);
        setShareSuccess(true);
        
        setTimeout(() => {
          setShareSuccess(false);
        }, 2000);
      } else {
        // Если API недоступно, открываем стандартное окно шаринга
        window.open(`https://t.me/share/url?url=${encodeURIComponent(fullLink)}&text=${shareText}`, '_blank');
      }
    } catch (error) {
      console.error('Ошибка при шаринге в Telegram:', error);
      
      // Запасной вариант - копируем ссылку
      navigator.clipboard.writeText(fullLink)
        .then(() => {
          alert('Ссылка скопирована! Теперь вы можете поделиться ею вручную.');
        })
        .catch(err => {
          console.error('Не удалось скопировать ссылку:', err);
          alert('Не удалось поделиться ссылкой. Вот полная ссылка:\n' + fullLink);
        });
    }
  };

  // Удаление (деактивация) реферальной ссылки
  const deactivateReferralLink = async (linkId: string) => {
    if (!user) return;
    
    // Хаптик-фидбек
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred('light');
    }
    
    try {
      const result = await referralService.deactivateReferralLink(linkId, user.id);
      
      if (result.success) {
        // Обновляем список ссылок
        const updatedLinks = referralLinks.map(link => 
          link.id === linkId ? { ...link, is_active: false } : link
        );
        setReferralLinks(updatedLinks);
        
        // Обновляем отфильтрованный список ссылок
        if (showInactive) {
          setFilteredLinks(updatedLinks);
        } else {
          setFilteredLinks(updatedLinks.filter(link => link.is_active));
        }
        
        // Обновляем статистику
        setStats(prev => ({
          ...prev,
          activeLinks: prev.activeLinks - 1
        }));
        
        // Хаптик-фидбек при успешном удалении
        if (telegram?.HapticFeedback) {
          telegram.HapticFeedback.notificationOccurred('success');
        }
      } else {
        console.error('Failed to deactivate referral link:', result.error);
        setError('Не удалось деактивировать реферальную ссылку');
        
        // Хаптик-фидбек при ошибке
        if (telegram?.HapticFeedback) {
          telegram.HapticFeedback.notificationOccurred('error');
        }
      }
    } catch (error) {
      console.error('Error deactivating referral link:', error);
      setError('Произошла ошибка при деактивации реферальной ссылки');
      
      // Хаптик-фидбек при ошибке
      if (telegram?.HapticFeedback) {
        telegram.HapticFeedback.notificationOccurred('error');
      }
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Бессрочно';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Link2 className="text-blue-400 mr-2" size={20} />
          <h2 className="text-lg font-bold">РЕФЕРАЛЬНАЯ ПРОГРАММА</h2>
        </div>
        <button 
          onClick={() => {
            // Хаптик-фидбек
            if (telegram?.HapticFeedback) {
              telegram.HapticFeedback.selectionChanged();
            }
            
            setShowCreateModal(true);
          }}
          className="bg-yellow-500 text-black px-3 py-1 rounded-full flex items-center text-sm hover:bg-yellow-600 transition-colors"
        >
          <PlusIcon size={14} className="mr-1" />
          Новая ссылка
        </button>
      </div>

      {/* Сообщение об успешной отправке ссылки */}
      {shareSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-down">
          <p className="text-center">Ссылка отправлена в Telegram!</p>
        </div>
      )}

      <div className="bg-[#252538] p-4 rounded-lg shadow-lg">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md mb-4 flex items-start">
            <AlertCircle size={18} className="mr-2 mt-1 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#2D2D44] p-3 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Всего ссылок</p>
            <p className="text-xl font-bold">{stats.totalLinks}</p>
          </div>
          <div className="bg-[#2D2D44] p-3 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Активно</p>
            <p className="text-xl font-bold text-green-500">{stats.activeLinks}</p>
          </div>
          <div className="bg-[#2D2D44] p-3 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Переходов</p>
            <p className="text-xl font-bold text-yellow-500">{stats.totalUses}</p>
          </div>
        </div>

        <p className="text-sm text-gray-300 mb-4">
          Создавайте реферальные ссылки и приглашайте друзей играть в Ясуко. 
          За каждого приглашенного друга вы получите <span className="text-yellow-400">+100 монет</span> и <span className="text-blue-400">+100 энергии</span>!
        </p>
        
        {/* Переключатель для показа неактивных ссылок */}
        <div className="flex justify-end mb-3">
          <label className="inline-flex items-center cursor-pointer">
            <span className="mr-2 text-xs text-gray-400">Показать неактивные</span>
            <input 
              type="checkbox" 
              checked={showInactive} 
              onChange={() => setShowInactive(!showInactive)} 
              className="sr-only peer"
            />
            <div className="relative w-9 h-5 bg-[#323248] peer-focus:ring-2 peer-focus:ring-yellow-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-gray-400 after:border-gray-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
          </label>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm font-medium flex items-center">
            <LinkIcon size={14} className="text-yellow-500 mr-2" />
            Ваши реферальные ссылки:
          </p>
          
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-8 h-8 border-4 border-t-transparent border-yellow-500 rounded-full animate-spin"></div>
            </div>
          ) : filteredLinks.length > 0 ? (
            <div className="max-h-64 overflow-y-auto pr-1 space-y-3">
              {filteredLinks.map(link => (
                <div 
                  key={link.id} 
                  className={`bg-[#2D2D44] rounded-lg p-3 ${!link.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center text-sm">
                      <LinkIcon size={14} className="text-yellow-500 mr-1" />
                      <span className="font-medium mr-2 text-blue-400">{link.code}</span>
                      {!link.is_active && (
                        <span className="bg-red-500/30 text-red-300 text-xs px-2 py-0.5 rounded">
                          Деактивирована
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {link.is_active && (
                        <>
                          <button 
                            onClick={() => copyReferralLink(link.code)} 
                            className="p-1 hover:bg-[#353553] rounded"
                            title="Копировать ссылку"
                            aria-label="Копировать ссылку"
                          >
                            {copiedCode === link.code ? (
                              <CheckIcon size={14} className="text-green-500" />
                            ) : (
                              <CopyIcon size={14} className="text-gray-400" />
                            )}
                          </button>
                          <button 
                            onClick={() => shareToTelegram(link.code)} 
                            className="p-1 hover:bg-[#353553] rounded"
                            title="Поделиться в Telegram"
                            aria-label="Поделиться в Telegram"
                          >
                            <ShareIcon size={14} className="text-blue-400" />
                          </button>
                        </>
                      )}
                      {link.is_active && (
                        <button 
                          onClick={() => deactivateReferralLink(link.id)} 
                          className="p-1 hover:bg-[#353553] rounded"
                          title="Деактивировать ссылку"
                          aria-label="Деактивировать ссылку"
                        >
                          <TrashIcon size={14} className="text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Создана:</span>
                      <span>{formatDate(link.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Истекает:</span>
                      <span>{formatDate(link.expires_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Использований:</span>
                      <span className={link.use_count > 0 ? "text-yellow-400" : ""}>{link.use_count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-[#2D2D44] rounded-lg">
              <p className="text-gray-400 text-sm">
                {showInactive ? 'У вас нет реферальных ссылок' : 'У вас нет активных реферальных ссылок'}
              </p>
              <button
                onClick={() => {
                  // Хаптик-фидбек
                  if (telegram?.HapticFeedback) {
                    telegram.HapticFeedback.selectionChanged();
                  }
                  
                  setShowCreateModal(true);
                }} 
                className="mt-2 px-4 py-2 bg-yellow-500 text-black rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors"
              >
                Создать ссылку
              </button>
            </div>
          )}
        </div>
        
        <div className="mt-4 bg-[#2D2D44] p-3 rounded-lg">
          <p className="text-sm font-medium mb-2">Как это работает:</p>
          <ol className="list-decimal list-inside text-xs text-gray-300 space-y-1 pl-2">
            <li>Создайте реферальную ссылку с наградой для вас и вашего друга</li>
            <li>Отправьте ее другу через Telegram или другой мессенджер</li>
            <li>Когда друг перейдет по ссылке и зарегистрируется, вы получите бонус</li>
            <li>+100 энергии и +100 монет будут автоматически начислены вам</li>
          </ol>
        </div>
      </div>
      
      {/* Модальное окно создания реферальной ссылки */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-[#252538] rounded-lg w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#323248]">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-yellow-400">Новая реферальная ссылка</h3>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#353553]"
                >
                  <XIcon size={18} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Срок действия (дней)
                  </label>
                  <input
                    type="number"
                    value={newLinkOptions.expiresInDays}
                    onChange={e => setNewLinkOptions({
                      ...newLinkOptions,
                      expiresInDays: parseInt(e.target.value) || 0
                    })}
                    className="w-full bg-[#323248] rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    min="0"
                    max="365"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    0 = бессрочно
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Максимальное количество использований
                  </label>
                  <input
                    type="number"
                    value={newLinkOptions.maxUses}
                    onChange={e => setNewLinkOptions({
                      ...newLinkOptions,
                      maxUses: parseInt(e.target.value) || 0
                    })}
                    className="w-full bg-[#323248] rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    min="0"
                    max="1000"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    0 = без ограничений
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Награда за приглашение
                  </label>
                  <div className="flex gap-3">
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400 text-xs">Монеты</span>
                      </div>
                      <input
                        type="number"
                        value={newLinkOptions.rewardCoins}
                        onChange={e => setNewLinkOptions({
                          ...newLinkOptions,
                          rewardCoins: parseInt(e.target.value) || 0
                        })}
                        className="w-full bg-[#323248] rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        min="0"
                        max="1000"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-blue-400 text-xs">Энергия</span>
                      </div>
                      <input
                        type="number"
                        value={newLinkOptions.rewardEnergy}
                        onChange={e => setNewLinkOptions({
                          ...newLinkOptions,
                          rewardEnergy: parseInt(e.target.value) || 0
                        })}
                        className="w-full bg-[#323248] rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        min="0"
                        max="500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button 
                  className="px-4 py-2 bg-[#323248] text-white rounded hover:bg-[#3a3a55] transition-colors"
                  onClick={() => setShowCreateModal(false)}
                >
                  Отмена
                </button>
                <button 
                  className={`px-4 py-2 ${isLoading ? 'bg-yellow-500/50 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600'} text-black rounded font-medium transition-colors`}
                  onClick={handleCreateReferral}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <span className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin mr-2"></span>
                      Создание...
                    </span>
                  ) : 'Создать ссылку'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralSection;