import React from 'react';

const defaultResponses = ['Pricing Plans', 'Need Help?', 'How does this work?'];

const DefaultResponseTemplete: React.FC = () => {
  return (
    <div className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
      {defaultResponses.map((label, index) => (
        <button
          key={index}
          className="bg-[#F1F2F4] cursor-pointer text-[#A3ABB8] text-sm px-4 py-2 rounded-xl whitespace-nowrap hover:bg-gray-200 transition"
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default DefaultResponseTemplete;