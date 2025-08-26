import { useEffect, useRef } from 'react';
import { cn } from '../lib/utils'; 
import TypingLoader from './TypingLoader';



// Unified Message type definition
export interface Message {
  text: string;
  sender: 'user' | 'bot' | 'system';
  type?: 'loader' | 'text';
}

interface ChatMessagesProps {
  messages: Message[];
  isAgentTyping: boolean;
}

const ChatMessages = ({ messages, isAgentTyping }: ChatMessagesProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentTyping]);

  // Using your original JSX and class names
  return (
    <div className="flex flex-col gap-2  scrollbar-hide h-[350px] px-3 overflow-y-auto pt-10 pb-4">
      {messages?.map((msg, index) => {
        if (msg.sender === 'system') {
            return (
                <div key={index} className="flex items-center justify-center my-2">
                    <div className="text-center text-xs text-white px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                        {msg.text}
                    </div>
                </div>
            );
        }
        return (
            <div
                key={index}
                className={cn('flex', msg.sender === 'user' ? 'justify-end' : 'justify-start')}
            >
            {
                msg.type === "loader" ? (
                <TypingLoader/>
                ) :
                (
                    <div
                    className={cn(
                        'px-4 py-2 max-w-[80%] text-sm whitespace-pre-line break-words rounded-xl',
                        msg.sender === 'user'
                        ? 'bg-gradient-to-r from-[#ff21b0] to-[#c24d99] text-white rounded-br-none'
                        : 'bg-[#f8e7f2] text-[#ff21b0] rounded-bl-none'
                    )}
                    >
                    {msg.text}
                    </div>
                )
            }
            </div>
        )
      })}

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