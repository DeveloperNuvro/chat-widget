import React from 'react';

const TypingLoader: React.FC = () => {
  return (
    <div className="flex items-center space-x-2 p-3 bg-gray-200 rounded-lg">
      <div
        className="h-2 w-2 bg-[#ff21b0] rounded-full animate-bounce"
        style={{ animationDelay: '0s' }}
      ></div>
      <div
        className="h-2 w-2 bg-[#ff21b0] rounded-full animate-bounce"
        style={{ animationDelay: '0.1s' }}
      ></div>
      <div
        className="h-2 w-2 bg-[#ff21b0] rounded-full animate-bounce"
        style={{ animationDelay: '0.2s' }}
      ></div>
    </div>
  );
};

export default TypingLoader;