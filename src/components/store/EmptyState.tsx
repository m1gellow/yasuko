import React from 'react';

interface EmptyStateProps {
  isVisible: boolean;
  message?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  isVisible, 
  message = 'По вашему запросу товары не найдены' 
}) => {
  if (!isVisible) return null;
  
  return (
    <div className="bg-[#252538] p-8 rounded-lg text-center">
      <p className="text-gray-400">{message}</p>
    </div>
  );
};

export default EmptyState;