import React from 'react';

interface TypingLoaderProps {
  widgetColor?: string;
}

const TypingLoader: React.FC<TypingLoaderProps> = ({ widgetColor = '#ff21b0' }) => {
  return (
    <div className="flex items-center space-x-2 p-3 bg-gray-200 rounded-lg">
      <div
        className="h-2 w-2 rounded-full animate-bounce"
        style={{ backgroundColor: widgetColor, animationDelay: '0s' }}
      ></div>
      <div
        className="h-2 w-2 rounded-full animate-bounce"
        style={{ backgroundColor: widgetColor, animationDelay: '0.1s' }}
      ></div>
      <div
        className="h-2 w-2 rounded-full animate-bounce"
        style={{ backgroundColor: widgetColor, animationDelay: '0.2s' }}
      ></div>
    </div>
  );
};

export default TypingLoader;