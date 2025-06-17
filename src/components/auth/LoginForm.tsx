import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import TelegramHybridLogin from './TelegramHybridLogin';
import { useEmailAuth } from '../../hooks/useEmailAuth';
import { AlertTriangleIcon, CheckIcon, Loader2Icon, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { loading: authLoading } = useAuth();
  const { 
    signInWithEmail, 
    isLoading, 
    error: emailAuthError, 
    success,
    resetError 
  } = useEmailAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [telegramAuthError, setTelegramAuthError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Загружаем сохраненные учетные данные при монтировании компонента
  useEffect(() => {
    const savedEmail = localStorage.getItem('telegram_auth_email');
    const savedPassword = localStorage.getItem('telegram_auth_password');
    
    if (savedEmail) setEmail(savedEmail);
    if (savedPassword) setPassword(savedPassword);
  }, []);

  // Сбрасываем ошибки при изменении форм
  useEffect(() => {
    if (error || emailAuthError) {
      setError(null);
      resetError();
    }
  }, [email, password, resetError, emailAuthError]);
  
  // Показываем сообщение об успешном входе
  useEffect(() => {
    if (success) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError('Пожалуйста, заполните все поля');
      return;
    }
    
    try {
      const result = await signInWithEmail(email, password);
      
      if (!result.success) {
        setError(result.error || 'Ошибка при входе. Проверьте правильность email и пароля.');
      }
    } catch (err) {
      console.error('Ошибка при авторизации:', err);
      setError('Произошла ошибка при входе. Пожалуйста, попробуйте позже.');
    }
  };

  const handleTelegramSuccess = () => {
    console.log('Успешная авторизация через Telegram');
    setTelegramAuthError(null);
  };

  const handleTelegramError = (errorMessage: string) => {
    console.error('Ошибка при авторизации через Telegram:', errorMessage);
    setTelegramAuthError(errorMessage);
  };

  return (
    <div className="bg-[#252538] rounded-lg p-6 w-full max-w-md mx-auto">
      <h2 className="text-xl font-bold text-center text-yellow-400 mb-6">Вход в игру</h2>
      
      {/* Сообщения об ошибках или успехе */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-md mb-4 flex items-start">
          <AlertTriangleIcon className="mr-2 mt-0.5 flex-shrink-0 text-red-400" size={16} />
          <span>{error}</span>
        </div>
      )}

      {telegramAuthError && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-md mb-4 flex items-start">
          <AlertTriangleIcon className="mr-2 mt-0.5 flex-shrink-0 text-red-400" size={16} />
          <span>Ошибка Telegram: {telegramAuthError}</span>
        </div>
      )}
      
      {showSuccess && (
        <div className="bg-green-500/20 border border-green-500 text-green-200 p-3 rounded-md mb-4 flex items-start animate-pulse">
          <CheckIcon className="mr-2 mt-0.5 flex-shrink-0 text-green-400" size={16} />
          <span>Вход выполнен успешно!</span>
        </div>
      )}
      
      {/* Форма входа по email/паролю */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-[#323248] rounded border border-[#454569] text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            placeholder="example@mail.com"
            autoComplete="email"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
            Пароль
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-[#323248] rounded border border-[#454569] text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 pr-10"
              autoComplete="current-password"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-1"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isLoading || authLoading}
          className="w-full bg-yellow-500 text-black py-2 rounded-md font-bold disabled:opacity-50 flex items-center justify-center"
        >
          {isLoading || authLoading ? (
            <>
              <Loader2Icon size={18} className="mr-2 animate-spin" /> Загрузка...
            </>
          ) : 'Войти'}
        </button>
      </form>
      
      <div className="flex items-center my-4">
        <div className="flex-grow border-t border-gray-600"></div>
        <span className="px-3 text-gray-400 text-sm">или</span>
        <div className="flex-grow border-t border-gray-600"></div>
      </div>
      
      {/* Telegram логин */}
      <div className="mb-4">
        <TelegramHybridLogin 
          onSuccess={handleTelegramSuccess} 
          onError={handleTelegramError} 
        />
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-gray-400">
          Нет аккаунта?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-yellow-400 hover:underline"
          >
            Зарегистрироваться
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;