import { useEffect, useRef } from 'react';
import { PiRobot } from 'react-icons/pi';
import { cn } from '../lib/utils'; 
import TypingLoader from './TypingLoader';
import FormattedText from './FormattedText';
import { getColorVariations } from '../utils/colorUtils';



// Unified Message type definition
export interface Message {
  text: string;
  sender: 'user' | 'bot' | 'system';
  type?: 'loader' | 'text';
  timestamp?: Date;
  _id?: string;
}

interface ChatMessagesProps {
  messages: Message[];
  isAgentTyping: boolean;
  agentName?: string;
  businessLogo?: string | null;
  widgetColor?: string;
}

// Helper function to format timestamp
const formatTime = (timestamp?: Date | string): string => {
  if (!timestamp) return '';
  
  // Handle both Date objects and string timestamps
  const date = timestamp instanceof Date 
    ? timestamp 
    : (typeof timestamp === 'string' ? new Date(timestamp) : null);
  
  if (!date || isNaN(date.getTime())) return '';
  
  // Format as "2:30 PM" or "14:30" (12-hour format with AM/PM)
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  return `${displayHours}:${displayMinutes} ${ampm}`;
};

// Helper function to format date for separators
const formatDate = (timestamp?: Date | string): string => {
  if (!timestamp) return '';
  
  const date = timestamp instanceof Date 
    ? timestamp 
    : (typeof timestamp === 'string' ? new Date(timestamp) : null);
  
  if (!date || isNaN(date.getTime())) return '';
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  
  // Format as "Jan 15, 2024"
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
  });
};

// Helper to check if two dates are on the same day
const isSameDay = (date1: Date | string | null, date2: Date | string | null): boolean => {
  if (!date1 || !date2) return false;
  
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  
  return d1.toDateString() === d2.toDateString();
};

const ChatMessages = ({ messages, isAgentTyping, agentName, businessLogo, widgetColor = '#ff21b0' }: ChatMessagesProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const colors = getColorVariations(widgetColor);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentTyping]);

  // Using your original JSX and class names
  return (
    <div className="flex flex-col gap-1 scrollbar-hide h-[350px] px-4 overflow-y-auto pt-6 pb-4 bg-gradient-to-b from-gray-50/50 to-white">
      {messages?.map((msg, index) => {
        // Use _id as key if available, otherwise use index + text + timestamp for uniqueness
        const messageKey = (msg as any)._id || `msg-${index}-${msg.text}-${msg.timestamp?.getTime() || Date.now()}`;
        
        // Check if we need to show a date separator
        const prevMsg = index > 0 ? messages[index - 1] : null;
        const showDateSeparator = prevMsg && 
          prevMsg.timestamp && 
          msg.timestamp && 
          !isSameDay(prevMsg.timestamp, msg.timestamp) &&
          msg.sender !== 'system';

        if (msg.sender === 'system') {
            return (
                <div key={messageKey} className="flex items-center justify-center my-2 animate-fade-in">
                    <div className="text-center text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                        <FormattedText text={msg.text} />
                    </div>
                </div>
            );
        }
        return (
            <div key={messageKey}>
              {/* Date Separator */}
              {showDateSeparator && msg.timestamp && (
                <div className="flex items-center justify-center my-4">
                  <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                    {formatDate(msg.timestamp)}
                  </div>
                </div>
              )}
              
              <div
                className={cn(
                  'flex items-end gap-2 animate-fade-in transition-all duration-200 mb-3',
                  msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
              {
                  msg.type === "loader" ? (
                  <div className="flex items-start gap-2">
                    <div 
                      className="relative w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md overflow-hidden"
                      style={{
                        background: `linear-gradient(to bottom right, ${colors.gradientStart}, ${colors.gradientEnd})`
                      }}
                    >
                      {businessLogo ? (
                        <>
                          <img 
                            src={businessLogo} 
                            alt="Business Logo" 
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                                if (fallback) {
                                  fallback.style.display = 'flex';
                                }
                              }
                            }}
                          />
                          <div className="logo-fallback hidden absolute inset-0 items-center justify-center">
                            <PiRobot className="w-4 h-4" />
                          </div>
                        </>
                      ) : (
                        <PiRobot className="w-4 h-4" />
                      )}
                    </div>
                    <TypingLoader widgetColor={widgetColor} />
                  </div>
                  ) :
                  (
                      <div className="flex items-end gap-2 max-w-[85%] group">
                        {/* Avatar for bot messages */}
                        {msg.sender === 'bot' && (
                          <div 
                            className="relative w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0 mb-1 overflow-hidden"
                            style={{
                              background: `linear-gradient(to bottom right, ${colors.gradientStart}, ${colors.gradientEnd})`
                            }}
                          >
                            {businessLogo ? (
                              <>
                                <img 
                                  src={businessLogo} 
                                  alt="Business Logo" 
                                  className="w-full h-full object-cover rounded-full"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                                      if (fallback) {
                                        fallback.style.display = 'flex';
                                      }
                                    }
                                  }}
                                />
                                <div className="logo-fallback hidden absolute inset-0 items-center justify-center">
                                  <PiRobot className="w-4 h-4" />
                                </div>
                              </>
                            ) : (
                              <PiRobot className="w-4 h-4" />
                            )}
                          </div>
                        )}
                        
                        <div className="flex flex-col">
                          <div
                              className={cn(
                                  'px-4 py-3 text-sm break-words rounded-2xl shadow-sm transition-all duration-200',
                                  'hover:shadow-md',
                                  msg.sender === 'user'
                                  ? 'text-white rounded-br-md'
                                  : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'
                              )}
                              style={msg.sender === 'user' ? {
                                background: `linear-gradient(to right, ${colors.gradientStart}, ${colors.gradientEnd})`
                              } : {}}
                          >
                              <FormattedText 
                                text={msg.text} 
                                className={msg.sender === 'user' ? 'text-white' : 'text-gray-800'}
                              />
                          </div>
                          {msg.timestamp && (
                              <div className={cn(
                                'flex items-center gap-1.5 mt-1.5 px-1',
                                msg.sender === 'user' ? 'justify-end' : 'justify-start'
                              )}>
                                {msg.sender === 'bot' && (
                                  <span className="text-xs font-medium text-gray-500">
                                    {agentName || 'AI'}
                                  </span>
                                )}
                                <span
                                    className={cn(
                                        'text-xs',
                                        msg.sender === 'user' ? 'text-gray-500' : 'text-gray-400'
                                    )}
                                >
                                    {formatTime(msg.timestamp)}
                                </span>
                                {/* Message status indicator for user messages */}
                                {msg.sender === 'user' && (
                                  <span className="text-xs text-gray-400">
                                    ✓
                                  </span>
                                )}
                              </div>
                          )}
                        </div>
                        
                        {/* Avatar for user messages */}
                        {msg.sender === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0 mb-1">
                            <span className="text-xs">You</span>
                          </div>
                        )}
                      </div>
                  )
              }
              </div>
            </div>
        )
      })}

      {isAgentTyping && (
        <div className="flex justify-start">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg">
            <TypingLoader widgetColor={widgetColor} />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default ChatMessages;