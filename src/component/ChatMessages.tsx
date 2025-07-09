import { useEffect, useRef } from 'react';

import TypingLoader from './TypingLoader';

const ChatMessages = ({ messages, isAgentTyping }: { messages: { text: string; sender: 'user' | 'bot' }[], isAgentTyping: boolean }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentTyping]);

  return (
    <div className="flex flex-col gap-2 w-[350px] scrollbar-hide h-[350px] px-3 overflow-y-auto pt-10 pb-4 bg-white">
      {messages?.map((msg: any, index) => (
        <div
          key={index}
          className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {
            msg.type === "loader" ? (
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg max-w-[75%]">
                <TypingLoader />
              </div>
            ) :
              (
                <div
                  className={`px-4 py-2 max-w-[80%] text-sm whitespace-pre-line break-words rounded-xl ${msg.sender === 'user'
                    ? 'bg-gradient-to-r from-[#ff21b0] to-[#c24d99] text-white rounded-br-none'
                    : 'bg-[#f8e7f2] text-[#ff21b0] rounded-bl-none'
                    }`}
                >
                  {msg.text}
                </div>
              )
          }
        </div>
      ))}

      {isAgentTyping && (
        <div className="flex justify-start">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg">
            <TypingLoader />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default ChatMessages;