import React from 'react';

interface TypingLoaderProps {
  widgetColor?: string;
}

const TypingLoader: React.FC<TypingLoaderProps> = ({ widgetColor = '#6366f1' }) => {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-bl-md shadow-sm">
      <span
        className="typing-loader__dot"
        style={{ backgroundColor: widgetColor }}
        aria-hidden
      />
      <span
        className="typing-loader__dot"
        style={{ backgroundColor: widgetColor }}
        aria-hidden
      />
      <span
        className="typing-loader__dot"
        style={{ backgroundColor: widgetColor }}
        aria-hidden
      />
    </div>
  );
};

export default TypingLoader;