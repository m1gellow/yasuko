import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import TelegramHybridLogin from './TelegramHybridLogin';
import { useEmailAuth } from '../../hooks/useEmailAuth';
import { AlertTriangleIcon, CheckIcon, Loader2Icon, Eye, EyeOff, MailIcon, KeyIcon } from 'lucide-react';

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

  useEffect(() => {
    const savedEmail = localStorage.getItem('telegram_auth_email');
    const savedPassword = localStorage.getItem('telegram_auth_password');
    
    if (savedEmail) setEmail(savedEmail);
    if (savedPassword) setPassword(savedPassword);
  }, []);

  useEffect(() => {
    if (error || emailAuthError) {
      setError(null);
      resetError();
    }
  }, [email, password, resetError, emailAuthError]);
  
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
    <div className="bg-gradient-to-br from-[#1e183a] to-[#15122b] rounded-xl p-6 w-full max-w-md mx-auto border border-purple-500/20 shadow-lg">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center bg-gradient-to-r from-yellow-500 to-orange-500 text-transparent bg-clip-text">
          <MailIcon className="mr-2" size={24} />
          <h2 className="text-2xl font-extrabold tracking-wide">ВХОД В ИГРУ</h2>
        </div>
        <p className="text-sm text-gray-400 mt-1">Используйте email или Telegram</p>
      </div>
      
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 text-red-200 p-3 rounded-lg mb-4 flex items-start">
          <AlertTriangleIcon className="mr-2 mt-0.5 flex-shrink-0 text-red-400" size={16} />
          <span>{error}</span>
        </div>
      )}

      {telegramAuthError && (
        <div className="bg-red-900/30 border border-red-500/30 text-red-200 p-3 rounded-lg mb-4 flex items-start">
          <AlertTriangleIcon className="mr-2 mt-0.5 flex-shrink-0 text-red-400" size={16} />
          <span>Ошибка Telegram: {telegramAuthError}</span>
        </div>
      )}
      
      {showSuccess && (
        <div className="bg-green-900/30 border border-green-500/30 text-green-200 p-3 rounded-lg mb-4 flex items-start animate-pulse">
          <CheckIcon className="mr-2 mt-0.5 flex-shrink-0 text-green-400" size={16} />
          <span>Вход выполнен успешно!</span>
        </div>
      )}
      
      {/* Email Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MailIcon className="text-gray-400" size={18} />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#1e183a] rounded-lg border border-purple-500/30 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
              placeholder="example@mail.com"
              autoComplete="email"
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            Пароль
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <KeyIcon className="text-gray-400" size={18} />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-[#1e183a] rounded-lg border border-purple-500/30 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50"
              autoComplete="current-password"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-1"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isLoading || authLoading}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black py-3 rounded-lg font-bold disabled:opacity-70 flex items-center justify-center transition-all shadow-md"
        >
          {isLoading || authLoading ? (
            <>
              <Loader2Icon size={18} className="mr-2 animate-spin" /> Загрузка...
            </>
          ) : 'ВОЙТИ'}
        </button>
      </form>
      
      {/* Divider */}
      <div className="flex items-center my-6">
        <div className="flex-grow border-t border-purple-500/20"></div>
        <span className="px-3 text-gray-400 text-sm">или</span>
        <div className="flex-grow border-t border-purple-500/20"></div>
      </div>
      
      {/* Telegram Login */}
      <div className="mb-4">
        <TelegramHybridLogin 
          onSuccess={handleTelegramSuccess} 
          onError={handleTelegramError} 
        />
      </div>
      
      {/* Register Link */}
      <div className="mt-6 text-center">
        <p className="text-gray-400">
          Нет аккаунта?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
          >
            Зарегистрироваться
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;