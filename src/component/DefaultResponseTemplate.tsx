import React from 'react';

interface DefaultResponseTempleteProps {
  defaultResponses: { question: string; answer: string }[];
  onSelect: (question: string, answer: string) => void;
}

const DefaultResponseTemplete: React.FC<DefaultResponseTempleteProps> = ({
  defaultResponses,
  onSelect
}) => {
  return (
    <div className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
      {defaultResponses.map((item, index) => (
        <button
          key={index}
          className="bg-[#F1F2F4] cursor-pointer text-[#A3ABB8] text-sm px-4 py-2 rounded-xl whitespace-nowrap hover:bg-gray-200 transition"
          onClick={() => onSelect(item.question, item.answer)}
        >
          {item.question}
        </button>
      ))}
    </div>
  );
};

export default DefaultResponseTemplete;
