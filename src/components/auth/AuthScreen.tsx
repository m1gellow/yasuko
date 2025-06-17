import React, { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { useAuth } from '../../contexts/AuthContext';
import { CheckIcon, XIcon } from 'lucide-react';

interface AuthScreenProps {
  onClose?: () => void;
  telegramData?: any;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onClose, telegramData }) => {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  // Проверяем, есть ли сохраненные данные Telegram
  useEffect(() => {
    // Проверяем наличие предварительно сохраненных данных Telegram в localStorage
    const email = localStorage.getItem('telegram_auth_email');
    const password = localStorage.getItem('telegram_auth_password');
    
    if (email && password && showLogin) {
      // Устанавливаем данные в форму с небольшой задержкой
      setTimeout(() => {
        // Находим элементы формы по id и устанавливаем значения
        const emailInput = document.getElementById('email') as HTMLInputElement;
        const passwordInput = document.getElementById('password') as HTMLInputElement;
        
        if (emailInput && passwordInput) {
          emailInput.value = email;
          passwordInput.value = password;
        }
      }, 300);
    }
  }, [showLogin]);

  // Проверка авторизации при монтировании компонента
  useEffect(() => {
    if (user) {
      // Если пользователь авторизован, показываем кратковременное сообщение об успехе
      setShowSuccessScreen(true);
      const timer = setTimeout(() => {
        onClose?.();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [user, onClose]);

  // Если показываем экран успешной авторизации
  if (showSuccessScreen) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-[#252538] rounded-lg p-8 w-full max-w-md mx-auto text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
              <CheckIcon size={32} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Успешная авторизация</h2>
            <p className="text-gray-400">Переход в игру...</p>
          </div>
        </div>
      </div>
    );
  }

  // Если пользователь уже авторизован, закрываем экран
  if (user && !showSuccessScreen) {
    onClose?.();
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      {showLogin ? (
        <LoginForm
          onSwitchToRegister={() => setShowLogin(false)}
        />
      ) : (
        <RegisterForm
          onSwitchToLogin={() => setShowLogin(true)}
          onRegistrationSuccess={onClose}
          telegramData={telegramData}
        />
      )}
      
      {/* Кнопка закрытия */}
      {onClose && (
        <button 
          className="absolute top-4 right-4 bg-[#323248] text-gray-300 p-2 rounded-lg hover:bg-[#3a3a55]"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <XIcon className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

export default AuthScreen;