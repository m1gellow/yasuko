import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';

// Константа для localStorage
const ONBOARDING_COMPLETED_KEY = 'app:onboardingCompleted';

export function useOnboarding() {
  const [isFirstTime, setIsFirstTime] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    // Проверяем, проходил ли пользователь онбординг
    const onboardingCompleted = storage.get<boolean>(ONBOARDING_COMPLETED_KEY);
    setIsFirstTime(!onboardingCompleted);
    setIsLoading(false);
  }, []);
  
  const markOnboardingComplete = () => {
    storage.set(ONBOARDING_COMPLETED_KEY, true);
    setIsFirstTime(false);
  };
  
  return {
    isFirstTime,
    isLoading,
    markOnboardingComplete
  };
}