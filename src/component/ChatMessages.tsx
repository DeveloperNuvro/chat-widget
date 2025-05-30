import { useEffect, useRef } from 'react';

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
          <div
            className={`px-4 py-2 max-w-[80%] text-sm whitespace-pre-line break-words rounded-xl ${msg.sender === 'user'
              ? 'bg-gradient-to-r from-[#5D17E9] to-[#8C52FF] text-white rounded-br-none'
              : 'bg-[#F4EEFF] text-[#8C52FF] rounded-bl-none'
              }`}
          >
            {msg.text}
          </div>
        </div>
      ))}

      {/* ✅ Show typing indicator once, aligned left (for bot/human) */}
      {isAgentTyping && (
        <div className="flex justify-start">
          <div className="self-start bg-[#8C52FF] rounded-md text-white text-left text-sm  italic px-3 mt-2">
              Human agent is typing...
            </div>
        </div>
      )}

      {/* Dummy div to auto-scroll */}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatMessages;
