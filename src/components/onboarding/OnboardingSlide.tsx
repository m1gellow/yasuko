import React from 'react';
import { motion } from 'framer-motion';

interface OnboardingSlideProps {
  slide: {
    id: number;
    title: string;
    description: string;
    image: string;
    animationClass: string;
  };
  isActive: boolean;
}

const OnboardingSlide: React.FC<OnboardingSlideProps> = ({ slide, isActive }) => {
  const variants = {
    hidden: { opacity: 0, x: 100 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 }
  };

  return (
    <motion.div
      key={slide.id}
      initial="hidden"
      animate={isActive ? "visible" : "hidden"}
      exit="exit"
      variants={variants}
      transition={{ duration: 0.5 }}
      className="max-w-md w-full px-4 py-8 flex flex-col items-center"
    >
      <div className="mb-8 relative w-48 h-48 flex items-center justify-center">
        <img 
          src={slide.image} 
          alt={slide.title}
          className={`w-full h-full object-contain ${slide.animationClass}`}
        />
      </div>
      
      <h2 className="text-2xl font-bold text-yellow-500 mb-4 text-center">
        {slide.title}
      </h2>
      
      <p className="text-center text-gray-300">
        {slide.description}
      </p>
    </motion.div>
  );
};

export default OnboardingSlide;