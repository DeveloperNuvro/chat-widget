import { useEffect, useRef } from 'react';

const ChatMessages = ({ messages }: { messages: { text: string; sender: 'user' | 'bot' }[] }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col gap-2 w-[350px] scrollbar-hide h-[350px] px-3 overflow-y-auto pt-10 pb-4 bg-white">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`px-4 py-2 max-w-[80%] text-sm whitespace-pre-line break-words rounded-xl ${
              msg.sender === 'user'
                ? 'bg-gradient-to-r from-[#5D17E9] to-[#8C52FF] text-white rounded-br-none'
                : 'bg-[#F4EEFF] text-[#8C52FF] rounded-bl-none'
            }`}
          >
            {msg.text}
          </div>
        </div>
      ))}
      {/* Dummy div to scroll to bottom */}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatMessages;
