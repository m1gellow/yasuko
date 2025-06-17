import React, { useState } from 'react';
import { XIcon } from 'lucide-react';

interface PromoCodeModalProps {
  promoCode: string;
  setPromoCode: (code: string) => void;
  promoCodeMessage: { type: 'success' | 'error', text: string } | null;
  onApply: () => void;
  onClose: () => void;
}

const PromoCodeModal: React.FC<PromoCodeModalProps> = ({
  promoCode,
  setPromoCode,
  promoCodeMessage,
  onApply,
  onClose
}) => {
  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={handleClickOutside}>
      <div className="bg-[#252538] rounded-lg w-full max-w-sm">
        <div className="p-4 border-b border-[#323248] flex justify-between items-center">
          <h3 className="font-bold text-lg text-yellow-500">Введите промокод</h3>
          <button className="text-gray-400 hover:text-white" onClick={onClose}>
            <XIcon size={20} />
          </button>
        </div>
        
        <div className="p-4">
          {promoCodeMessage && (
            <div className={`mb-4 p-3 rounded ${
              promoCodeMessage.type === 'success' 
                ? 'bg-green-500/20 text-green-300' 
                : 'bg-red-500/20 text-red-300'
            }`}>
              {promoCodeMessage.text}
            </div>
          )}
          
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="PROMO2025"
            className="w-full bg-[#323248] text-white p-3 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          
          <div className="flex justify-end space-x-3">
            <button 
              className="px-4 py-2 bg-[#323248] text-white rounded"
              onClick={onClose}
            >
              Отмена
            </button>
            <button 
              className="px-4 py-2 bg-yellow-500 text-black rounded font-medium"
              onClick={onApply}
            >
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromoCodeModal;