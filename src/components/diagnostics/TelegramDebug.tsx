import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../contexts/TelegramContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTelegramAuth } from '../../hooks/useTelegramAuth';

const TelegramDebug: React.FC = () => {
  const { telegram, user: telegramUser, isReady, error } = useTelegram();
  const { user: authUser, loading } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [sessionState, setSessionState] = useState<any>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  
  const {
    authenticateWithTelegram,
    checkCurrentSession,
    authInProgress,
    lastAuthError,
    lastAuthResult,
    initDataStatus
  } = useTelegramAuth();
  
  const handleTestAuth = async () => {
    await authenticateWithTelegram();
  };
  
  const handleCheckSession = async () => {
    setIsCheckingSession(true);
    const result = await checkCurrentSession();
    setSessionState(result);
    setIsCheckingSession(false);
  };
  
  // Проверяем сессию при открытии панели
  useEffect(() => {
    if (expanded && !sessionState) {
      handleCheckSession();
    }
  }, [expanded, sessionState]);

  if (!expanded) {
    return (
      <div className="fixed bottom-20 left-4 bg-blue-500 text-white p-2 rounded-full cursor-pointer shadow-lg z-50" onClick={() => setExpanded(true)}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-[#1E1E2D] rounded-lg p-4 w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-yellow-500">Telegram Debug Panel</h2>
          <button 
            onClick={() => setExpanded(false)}
            className="bg-[#323248] text-white p-2 rounded-lg hover:bg-[#3a3a55]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold mb-2">Статус WebApp</h3>
            <div className="bg-[#252538] p-3 rounded-lg overflow-auto">
              <div className="grid grid-cols-2 gap-2">
                <div>WebApp готов:</div>
                <div className={isReady ? 'text-green-500' : 'text-red-500'}>
                  {isReady ? 'Да ✓' : 'Нет ✗'}
                </div>
                
                <div>Ошибка:</div>
                <div className={error ? 'text-red-500' : 'text-green-500'}>
                  {error || 'Нет'}
                </div>
                
                <div>initData:</div>
                <div className={initDataStatus.available ? 'text-green-500' : 'text-red-500'}>
                  {initDataStatus.available ? `Доступен (${initDataStatus.length} символов)` : 'Отсутствует ✗'}
                </div>
                
                <div>User доступен:</div>
                <div className={telegramUser ? 'text-green-500' : 'text-red-500'}>
                  {telegramUser ? 'Да ✓' : 'Нет ✗'}
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-2">Статус авторизации</h3>
            <div className="bg-[#252538] p-3 rounded-lg overflow-auto h-full">
              <div className="grid grid-cols-2 gap-2">
                <div>Пользователь:</div>
                <div className={authUser ? 'text-green-500' : 'text-red-500'}>
                  {loading ? 'Загрузка...' : (authUser ? 'Авторизован ✓' : 'Не авторизован ✗')}
                </div>
                
                {authUser && (
                  <>
                    <div>ID:</div>
                    <div className="text-blue-400 text-xs">{authUser.id}</div>
                    
                    <div>Имя:</div>
                    <div>{authUser.name}</div>
                    
                    <div>Telegram ID:</div>
                    <div>{authUser.telegram_id || 'Не привязан'}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold mb-2">Telegram пользователь</h3>
            <div className="bg-[#252538] p-3 rounded-lg overflow-auto">
              {telegramUser ? (
                <pre className="text-xs whitespace-pre-wrap text-gray-300">
                  {JSON.stringify({
                    id: telegramUser.id,
                    username: telegramUser.username,
                    first_name: telegramUser.first_name,
                    last_name: telegramUser.last_name,
                    photo_url: telegramUser.photo_url
                  }, null, 2)}
                </pre>
              ) : (
                <p className="text-red-500">Данные пользователя Telegram отсутствуют</p>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-2">Состояние сессии</h3>
            <div className="bg-[#252538] p-3 rounded-lg overflow-auto">
              {sessionState ? (
                <>
                  <div className="mb-2">
                    <span className={sessionState.hasSession ? 'text-green-500' : 'text-red-500 font-bold'}>
                      {sessionState.message}
                    </span>
                  </div>
                  {sessionState.user && (
                    <div className="mb-2">
                      <div className="text-sm text-gray-400 mb-1">Пользователь сессии:</div>
                      <pre className="text-xs whitespace-pre-wrap text-gray-300">
                        {JSON.stringify({
                          id: sessionState.user.id,
                          email: sessionState.user.email,
                          role: sessionState.user.role,
                        }, null, 2)}
                      </pre>
                    </div>
                  )}
                  {sessionState.expires_at && (
                    <div>
                      <span className="text-sm text-gray-400">Срок действия: </span>
                      <span className="text-blue-300">
                        {new Date(sessionState.expires_at * 1000).toLocaleString()}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-400">{isCheckingSession ? 'Проверка сессии...' : 'Нажмите "Проверить сессию"'}</p>
              )}
              
              <button 
                onClick={handleCheckSession}
                className="mt-3 bg-[#323248] text-white px-3 py-1 rounded-lg text-sm"
                disabled={isCheckingSession}
              >
                {isCheckingSession ? 'Проверка...' : 'Проверить сессию'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-lg font-bold mb-2">Проверка авторизации</h3>
          <div className="bg-[#252538] p-3 rounded-lg">
            <p className="text-sm text-gray-400 mb-3">
              Это действие проверит авторизацию через Telegram, вызвав Edge Function напрямую
            </p>
            
            <button 
              onClick={handleTestAuth}
              className={`${authInProgress ? 'bg-blue-700' : 'bg-[#2AABEE]'} text-white px-4 py-2 rounded-lg font-medium mb-3 w-full md:w-auto`}
              disabled={authInProgress || !telegramUser}
            >
              {authInProgress ? 'Выполняется...' : 'Тестировать авторизацию'}
            </button>
            
            {lastAuthError && (
              <div className="bg-red-900/30 border border-red-800 p-2 rounded-lg mb-3">
                <p className="text-red-400 text-sm">{lastAuthError}</p>
              </div>
            )}
            
            {lastAuthResult && (
              <div className="mt-3">
                <div className="text-sm text-gray-400 mb-1">Последний результат:</div>
                <pre className="text-xs whitespace-pre-wrap text-gray-300 bg-[#1a1a2a] p-2 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify({
                    success: lastAuthResult.success,
                    hasUser: !!lastAuthResult.user,
                    hasSession: !!lastAuthResult.session,
                    userId: lastAuthResult.user?.id,
                    sessionToken: lastAuthResult.session?.access_token ? '[TOKEN PRESENT]' : '[NO TOKEN]',
                    error: lastAuthResult.error
                  }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-lg font-bold mb-2">Переменные окружения</h3>
          <div className="bg-[#252538] p-3 rounded-lg overflow-auto">
            <div className="grid grid-cols-2 gap-2">
              <div>VITE_SUPABASE_URL:</div>
              <div className="text-xs overflow-hidden text-ellipsis">
                {import.meta.env.VITE_SUPABASE_URL || 'Не задано'}
              </div>
              
              <div>Длина VITE_SUPABASE_ANON_KEY:</div>
              <div>
                {import.meta.env.VITE_SUPABASE_ANON_KEY ? 
                  import.meta.env.VITE_SUPABASE_ANON_KEY.length + ' символов' : 
                  'Не задано'}
              </div>
              
              <div>Режим Vite:</div>
              <div className={import.meta.env.DEV ? 'text-green-500' : 'text-blue-500'}>
                {import.meta.env.DEV ? 'Разработка (DEV)' : 'Продакшн (PROD)'}
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => setExpanded(false)}
            className="bg-[#323248] text-white px-4 py-2 rounded-lg hover:bg-[#3a3a55] w-full"
          >
            Закрыть
          </button>
          
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 w-full"
          >
            Очистить кэш и перезагрузить
          </button>
        </div>
      </div>
    </div>
  );
};

export default TelegramDebug;