import React from 'react';

interface ComboMessageProps {
  message: string;
}

const ComboMessage: React.FC<ComboMessageProps> = ({ message }) => {
  return (
    <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-yellow-500 text-black px-6 py-3 rounded-full font-bold text-xl animate-bounce">
      {message}
    </div>
  );
};

export default ComboMessage;