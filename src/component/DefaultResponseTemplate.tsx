import React from 'react';

interface DefaultResponseTemplateProps {
  defaultResponses: { question: string; answer: string }[];
  onSelect: (question: string, answer: string) => void;
}

const DefaultResponseTemplate: React.FC<DefaultResponseTemplateProps> = ({
  defaultResponses,
  onSelect,
}) => {
  return (
    <div className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide border-b border-gray-100/80 bg-gray-50/50">
      {defaultResponses.map((item, index) => (
        <button
          key={index}
          type="button"
          className="flex-shrink-0 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200/80 rounded-full whitespace-nowrap hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 transition-all duration-200 shadow-sm hover:shadow active:scale-[0.98]"
          onClick={() => onSelect(item.question, item.answer)}
        >
          {item.question}
        </button>
      ))}
    </div>
  );
};

export default DefaultResponseTemplate;