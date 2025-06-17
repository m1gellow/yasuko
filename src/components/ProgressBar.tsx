import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  height?: string; // Можем задавать высоту прогресс-бара
  className?: string; // Для дополнительных стилей
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  current, 
  max, 
  height = 'h-2', 
  className = '',
}) => {
  // Вычисляем процент заполнения
  const percent = Math.min(100, (current / max) * 100);
  
  
  return (
    // Контейнер с белой рамкой и внутренним отступом 1px
    <div className={`w-full border border-white rounded-full p-[1px]  ${className}`}>
      {/* Прогресс-бар с градиентом */}
      <div 
        className={`${height} bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-full transition-all duration-300 ease-out`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};

export default ProgressBar;