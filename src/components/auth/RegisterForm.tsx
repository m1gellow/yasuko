import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTelegram } from '../../contexts/TelegramContext';
import { useEmailAuth } from '../../hooks/useEmailAuth';
import { LucideUser, AlertTriangleIcon, CheckIcon, Loader2Icon, Eye, EyeOff } from 'lucide-react';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onRegistrationSuccess?: () => void; // New prop for handling successful registration
  telegramData?: any;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ 
  onSwitchToLogin, 
  onRegistrationSuccess,
  telegramData 
}) => {
  const { loading: authLoading } = useAuth();
  const { user: telegramUser } = useTelegram();
  const { 
    signUpWithEmail,
    isLoading, 
    error: emailAuthError, 
    success, 
    resetError 
  } = useEmailAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usingTelegram, setUsingTelegram] = useState<boolean>(false);
  const [telegramId, setTelegramId] = useState<number | undefined>(undefined);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Генерация случайного пароля
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let newPassword = '';
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
    setConfirmPassword(newPassword);
    return newPassword;
  };

  // При загрузке компонента заполняем поля данными из Telegram, если они есть
  useEffect(() => {
    if (telegramUser) {
      setName(`${telegramUser.first_name} ${telegramUser.last_name || ''}`);
      if (telegramUser.username) {
        setPhone(`@${telegramUser.username}`);
      }
      setEmail(`telegram${telegramUser.id}@example.com`);
      setTelegramId(telegramUser.id);
      setUsingTelegram(true);
      setAvatarUrl(telegramUser.photo_url || null);
      
      // Генерируем случайный пароль, так как пользователь не будет его использовать
      const randomPassword = generateRandomPassword();
    }
    else if (telegramData?.user) {
      const tgData = telegramData.user;
      setName(`${tgData.first_name} ${tgData.last_name || ''}`);
      if (tgData.username) {
        setPhone(`@${tgData.username}`);
      }
      setEmail(`telegram${tgData.id}@example.com`);
      setTelegramId(tgData.id);
      setUsingTelegram(true);
      setAvatarUrl(tgData.photo_url || null);
      
      // Генерируем случайный пароль, так как пользователь не будет его использовать
      const randomPassword = generateRandomPassword();
    }
    
    // Проверяем, есть ли сохраненные данные Telegram в localStorage
    const savedEmail = localStorage.getItem('telegram_auth_email');
    const savedPassword = localStorage.getItem('telegram_auth_password');
    
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setConfirmPassword(savedPassword);
      
      // Попытаемся определить имя из email
      const username = savedEmail.split('@')[0].replace('telegram', '');
      if (!name) {
        setName(`Telegram User ${username}`);
      }
      
      setUsingTelegram(true);
    }
  }, [telegramUser, telegramData]);
  
  // Сбрасываем ошибки при изменении форм
  useEffect(() => {
    if (error || emailAuthError) {
      setError(null);
      resetError();
    }
  }, [name, email, phone, password, confirmPassword, resetError]);
  
  // Показываем сообщение об успешной регистрации
  useEffect(() => {
    if (success) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
        // Вместо перехода на страницу входа, вызываем onRegistrationSuccess
        if (onRegistrationSuccess) {
          onRegistrationSuccess();
        } else {
          // Для обратной совместимости
          onSwitchToLogin();
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [success, onSwitchToLogin, onRegistrationSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация полей
    if (!name || !email || !password || !confirmPassword) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    
    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Введите корректный email адрес');
      return;
    }
    
    // Валидация телефона, только если не указан формат Telegram (@username)
    if (phone && phone.length > 0 && !phone.startsWith('@')) {
      const phoneRegex = /^\+?\d{10,14}$/;
      if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
        setError('Введите корректный номер телефона');
        return;
      }
    }
    
    // Сохраняем email и пароль в localStorage перед регистрацией
    try {
      localStorage.setItem('recent_registration_email', email);
      localStorage.setItem('recent_registration_password', password);
      
      if (usingTelegram) {
        localStorage.setItem('telegram_auth_email', email);
        localStorage.setItem('telegram_auth_password', password);
      }
    } catch (storageError) {
      console.warn('Не удалось сохранить учетные данные в localStorage', storageError);
    }
    
    // Регистрация пользователя через хук useEmailAuth
    try {
      const result = await signUpWithEmail(name, email, password, phone, telegramId);
      
      if (result.success) {
        // Успешная регистрация будет обработана в useEffect выше
      } else {
        setError(result.error || 'Ошибка при регистрации');
      }
    } catch (e) {
      setError('Произошла непредвиденная ошибка при регистрации');
      console.error('Unexpected error during registration:', e);
    }
  };

  return (
    <div className="bg-[#252538] rounded-lg p-6 w-full max-w-md mx-auto">
      <h2 className="text-xl font-bold text-center text-yellow-400 mb-6">
        {usingTelegram ? 'Завершить регистрацию' : 'Регистрация'}
      </h2>
      
      {usingTelegram && (
        <div className="mb-4 p-3 bg-[#2AABEE]/20 border border-[#2AABEE] rounded-md flex items-center">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="Telegram Avatar" 
              className="w-10 h-10 rounded-full mr-3"
            />
          ) : (
            <LucideUser size={24} className="text-[#2AABEE] mr-3" />
          )}
          <div>
            <p className="text-sm text-white">
              Регистрация с данными из Telegram
            </p>
            <p className="text-xs text-gray-400">Некоторые поля уже заполнены</p>
          </div>
        </div>
      )}
      
      {/* Сообщения об ошибках или успехе */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-md mb-4 flex items-start">
          <AlertTriangleIcon className="mr-2 mt-0.5 flex-shrink-0 text-red-400" size={16} />
          <div>
            <p>{error}</p>
            {error.includes('уже существует') && (
              <div className="mt-2">
                <button
                  onClick={onSwitchToLogin}
                  className="text-yellow-400 hover:underline"
                >
                  Перейти на страницу входа
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {showSuccess && (
        <div className="bg-green-500/20 border border-green-500 text-green-200 p-3 rounded-md mb-4 flex items-start animate-pulse">
          <CheckIcon className="mr-2 mt-0.5 flex-shrink-0 text-green-400" size={16} />
          <span>Регистрация прошла успешно!</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
            Имя <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-[#323248] rounded border border-[#454569] text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            placeholder="Ваше имя"
            autoComplete="name"
            disabled={usingTelegram}
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
            Email <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-[#323248] rounded border border-[#454569] text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="example@mail.com"
              autoComplete="email"
              disabled={usingTelegram}
            />
            {usingTelegram && (
              <button 
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(email)
                    .then(() => alert('Email скопирован!'))
                    .catch(err => console.error('Не удалось скопировать email:', err));
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-1"
                title="Скопировать email"
              >
                <Copy size={16} />
              </button>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">
            Телефон / Логин
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2 bg-[#323248] rounded border border-[#454569] text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            placeholder="+7XXXXXXXXXX или @username"
            autoComplete="tel"
            disabled={usingTelegram}
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
            Пароль <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-[#323248] rounded border border-[#454569] text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 pr-10"
              autoComplete="new-password"
              disabled={usingTelegram}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-1"
              title={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            {usingTelegram && (
              <button 
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(password)
                    .then(() => alert('Пароль скопирован!'))
                    .catch(err => console.error('Не удалось скопировать пароль:', err));
                }}
                className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-1"
                title="Скопировать пароль"
              >
                <Copy size={16} />
              </button>
            )}
          </div>
          {usingTelegram && (
            <button
              type="button"
              onClick={() => {
                const newPassword = generateRandomPassword();
                alert(`Сгенерирован новый пароль: ${newPassword}`);
              }}
              className="mt-2 text-xs text-blue-400 hover:underline"
            >
              Сгенерировать новый пароль
            </button>
          )}
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
            Подтвердите пароль <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-[#323248] rounded border border-[#454569] text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 pr-10"
              autoComplete="new-password"
              disabled={usingTelegram}
            />
            <button 
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-1"
              title={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
          ) : (usingTelegram ? 'Завершить регистрацию' : 'Зарегистрироваться')}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <p className="text-gray-400">
          Уже есть аккаунт?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-yellow-400 hover:underline"
          >
            Войти
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;