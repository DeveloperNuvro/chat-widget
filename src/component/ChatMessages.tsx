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
  /** Workflow ask_question options – show as quick-reply buttons (value sent on click) */
  metadata?: { workflowOptions?: { value: string; label: string }[] };
}

interface ChatMessagesProps {
  messages: Message[];
  isAgentTyping: boolean;
  agentName?: string;
  businessLogo?: string | null;
  widgetColor?: string;
  /** When false, hide language select and all workflow step options (production: workflow OFF) */
  workflowActive?: boolean;
  /** When user taps a workflow option (e.g. language/category) – options are shown as message-style chips */
  onWorkflowOptionSelect?: (value: string, label: string) => void;
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

const ChatMessages = ({ messages, isAgentTyping, agentName, businessLogo, widgetColor = '#ff21b0', workflowActive = true, onWorkflowOptionSelect }: ChatMessagesProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const colors = getColorVariations(widgetColor);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentTyping]);

  return (
    <div className="flex flex-col gap-1 chat-scroll flex-1 min-h-0 px-4 overflow-y-auto pt-5 pb-4 bg-[#f8fafc]">
      {messages?.map((msg, index) => {
        // When workflow is OFF: hide workflow steps (language select, ask_question options)
        if (msg.sender === 'system' && !workflowActive) return null;
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
            const workflowOptions = workflowActive ? (msg as Message).metadata?.workflowOptions : undefined;
            return (
                <div key={messageKey} className="mb-4 animate-fade-in">
                    <div className="flex items-end gap-2.5">
                        <div
                            className="relative w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 overflow-hidden ring-2 ring-white shadow-sm"
                            style={{
                                background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`
                            }}
                        >
                            {businessLogo ? (
                                <>
                                    <img src={businessLogo} alt="Business" className="w-full h-full object-cover rounded-full" onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                            const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                                            if (fallback) fallback.style.display = 'flex';
                                        }
                                    }} />
                                    <div className="logo-fallback hidden absolute inset-0 items-center justify-center bg-gray-100">
                                        <PiRobot className="w-4 h-4 text-gray-500" />
                                    </div>
                                </>
                            ) : (
                                <PiRobot className="w-4 h-4" />
                            )}
                        </div>
                        <div className="flex flex-col gap-2.5 max-w-[82%]">
                            <div className="px-4 py-3 text-sm break-words rounded-2xl rounded-bl-md chat-bubble-bot bg-white text-gray-800 border border-gray-100/80">
                                <FormattedText text={msg.text} className="text-gray-800 leading-relaxed" />
                            </div>
                            {Array.isArray(workflowOptions) && workflowOptions.length > 0 && onWorkflowOptionSelect && (
                                <div className="flex flex-wrap gap-2.5">
                                    {workflowOptions.map((opt, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            className="chat-chip cursor-pointer px-4 py-2.5 text-sm font-semibold rounded-full border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
                                            style={{
                                                background: `linear-gradient(135deg, ${colors.primary}18, ${colors.primary}08)`,
                                                borderColor: `${colors.primary}50`,
                                                color: colors.dark,
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = `linear-gradient(135deg, ${colors.primary}28, ${colors.primary}15)`;
                                                e.currentTarget.style.borderColor = colors.primary;
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = `linear-gradient(135deg, ${colors.primary}18, ${colors.primary}08)`;
                                                e.currentTarget.style.borderColor = `${colors.primary}50`;
                                            }}
                                            onClick={() => onWorkflowOptionSelect(opt.value, opt.label)}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div key={messageKey}>
              {/* Date Separator */}
              {showDateSeparator && msg.timestamp && (
                <div className="flex items-center justify-center my-5">
                  <span className="text-xs font-medium text-gray-400 bg-white/90 border border-gray-100 px-3 py-1.5 rounded-full shadow-sm">
                    {formatDate(msg.timestamp)}
                  </span>
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
                  <div className="flex items-start gap-2.5 mb-4 animate-fade-in">
                    <div 
                      className="relative w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 overflow-hidden ring-2 ring-white shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`
                      }}
                    >
                      {businessLogo ? (
                        <>
                          <img src={businessLogo} alt="Business" className="w-full h-full object-cover rounded-full" onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }
                          }} />
                          <div className="logo-fallback hidden absolute inset-0 items-center justify-center bg-gray-100">
                            <PiRobot className="w-4 h-4 text-gray-500" />
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
                      <div className="flex items-end gap-2.5 max-w-[82%] group">
                        {msg.sender === 'bot' && (
                          <div 
                            className="relative w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 overflow-hidden ring-2 ring-white shadow-sm"
                            style={{
                              background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`
                            }}
                          >
                            {businessLogo ? (
                              <>
                                <img src={businessLogo} alt="Business" className="w-full h-full object-cover rounded-full" onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }
                                }} />
                                <div className="logo-fallback hidden absolute inset-0 items-center justify-center bg-gray-100">
                                  <PiRobot className="w-4 h-4 text-gray-500" />
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
                              'px-4 py-3 text-sm break-words rounded-2xl transition-all duration-200',
                              msg.sender === 'user'
                                ? 'text-white rounded-br-md chat-bubble-user'
                                : 'bg-white text-gray-800 rounded-bl-md border border-gray-100/80 chat-bubble-bot'
                            )}
                            style={msg.sender === 'user' ? {
                              background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
                              boxShadow: `0 1px 3px ${colors.primary}25`,
                            } : {}}
                          >
                            <FormattedText 
                              text={msg.text} 
                              className={cn('leading-relaxed', msg.sender === 'user' ? 'text-white' : 'text-gray-800')}
                            />
                          </div>
                          {msg.sender === 'bot' && workflowActive && Array.isArray((msg as Message).metadata?.workflowOptions) && (msg as Message).metadata!.workflowOptions!.length > 0 && onWorkflowOptionSelect && (
                            <div className="flex flex-wrap gap-2.5 mt-2">
                              {(msg as Message).metadata!.workflowOptions!.map((opt: { value: string; label: string }, idx: number) => (
                                <button
                                  key={idx}
                                  type="button"
                                  className="chat-chip cursor-pointer px-4 py-2.5 text-sm font-semibold rounded-full border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
                                  style={{
                                    background: `linear-gradient(135deg, ${colors.primary}18, ${colors.primary}08)`,
                                    borderColor: `${colors.primary}50`,
                                    color: colors.dark,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = `linear-gradient(135deg, ${colors.primary}28, ${colors.primary}15)`;
                                    e.currentTarget.style.borderColor = colors.primary;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = `linear-gradient(135deg, ${colors.primary}18, ${colors.primary}08)`;
                                    e.currentTarget.style.borderColor = `${colors.primary}50`;
                                  }}
                                  onClick={() => onWorkflowOptionSelect(opt.value, opt.label)}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                          {msg.timestamp && (
                            <div className={cn(
                              'flex items-center gap-1.5 mt-1.5 px-1',
                              msg.sender === 'user' ? 'justify-end' : 'justify-start'
                            )}>
                              {msg.sender === 'bot' && (
                                <span className="text-[11px] font-medium text-gray-400">
                                  {agentName || 'AI'}
                                </span>
                              )}
                              <span className={cn(
                                'text-[11px]',
                                msg.sender === 'user' ? 'text-gray-400' : 'text-gray-400'
                              )}>
                                {formatTime(msg.timestamp)}
                              </span>
                              {msg.sender === 'user' && (
                                <span className="text-[11px] text-gray-400">✓</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {msg.sender === 'user' && (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-[10px] font-semibold shadow-sm flex-shrink-0 ring-2 ring-white">
                            You
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
        <div className="flex justify-start mb-4">
          <TypingLoader widgetColor={widgetColor} />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default ChatMessages;