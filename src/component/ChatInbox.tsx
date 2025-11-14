// ChatInbox.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { io, Socket } from 'socket.io-client';
import { z } from 'zod';
import toast from 'react-hot-toast';

import ChatMessages, { Message } from './ChatMessages';
import DefaultResponseTemplate from './DefaultResponseTemplate';
import Header from './Header';
import InputBox from './InputBox';
import { useLocalStorage } from './useLocalStorage';
import { publicApi } from '../api/axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

interface ChatState {
  showChat: boolean;
  name: string;
  phone: string;
  email: string;
  messages: Message[];
  customerId: string | null;
  conversationId: string | null;
  conversationStatus: 'ai_only' | 'live' | 'ticket' | 'closed';
  currentAgentName: string | null;
}

type FormErrors = Partial<Record<'name' | 'phone' | 'email', string>>;


const ChatInbox = ({
  agentName: initialAgentName,
  setOpen,
  businessId,
}: {
  agentName: string;
  businessId: string;
  setOpen: (isOpen: boolean) => void;
}) => {
  const { t } = useTranslation();
  const localStorageKey = `chat_state_${businessId}`;

  const getInitialState = (): ChatState => ({
    showChat: false,
    name: '',
    phone: '',
    email: '',
    messages: [],
    customerId: null,
    conversationId: null,
    conversationStatus: 'ai_only',
    currentAgentName: initialAgentName,
  });

  const [chatState, setChatState] = useLocalStorage<ChatState>(localStorageKey, getInitialState());
  const { showChat, name, phone, email, messages, customerId, conversationId, conversationStatus, currentAgentName } = chatState;

  const [input, setInput] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false); // This is ONLY for human agents
  const [socket, setSocket] = useState<Socket | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [defaultResponses, setDefaultResponses] = useState<{ question: string; answer: string }[]>([]);
  
  const [headerAgentName, setHeaderAgentName] = useState<string>(initialAgentName?.toString() ?? currentAgentName?.toString() ?? '');

  // Message polling fallback mechanism
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<Date | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const pollingIntervalRef = useRef<number | null>(null);
  const lastMessageTimestampRef = useRef<Date | null>(null);
  const socketConnectedRef = useRef(false);

  const customerIdRef = useRef(customerId);
  useEffect(() => { customerIdRef.current = customerId; }, [customerId]);
  
  // Sync refs with state
  useEffect(() => { lastMessageTimestampRef.current = lastMessageTimestamp; }, [lastMessageTimestamp]);
  useEffect(() => { socketConnectedRef.current = socketConnected; }, [socketConnected]);

  const formSchema = z.object({
    name: z.string().min(1, { message: t('error.nameRequired') }),
    phone: z.string().min(10, { message: t('error.invalidPhone') }),
    email: z.string().email({ message: t('error.invalidEmail') }),
  });

  const resetChat = useCallback(() => {
    localStorage.removeItem(localStorageKey);
    setChatState(getInitialState());
    setInput('');
    setDefaultResponses([]);
    setErrors({});
  }, [localStorageKey, setChatState]);

  useEffect(() => {
    if (conversationStatus === 'closed') {
      const closeTimer = setTimeout(() => {
        setOpen(false);
        setTimeout(() => { resetChat(); }, 500); 
      }, 3000);
      return () => clearTimeout(closeTimer);
    }
  }, [conversationStatus, setOpen, resetChat]);

  // Initial message fetch when conversation starts
  useEffect(() => {
    if (customerId && conversationId && messages.length === 0) {
      publicApi.get(`/api/v1/customer/widget/messages/${customerId}`)
        .then(res => {
          if (res.data?.data?.data && Array.isArray(res.data.data.data)) {
            const formattedMessages: Message[] = res.data.data.data.map((msg: any) => ({
              text: msg.message,
              sender: msg.sender === 'customer' ? 'user' : (msg.sender === 'system' ? 'system' : 'bot'),
              type: 'text',
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            })).reverse();
            
            // Set last message timestamp for polling
            if (formattedMessages.length > 0) {
              const lastMsg = formattedMessages[formattedMessages.length - 1];
              if (lastMsg.timestamp) {
                setLastMessageTimestamp(lastMsg.timestamp);
              }
            }
            
            setChatState(prev => ({ ...prev, messages: formattedMessages, showChat: true }));
          }
        })
        .catch(() => resetChat());
    }
  }, [customerId, conversationId, messages.length, setChatState, resetChat]);

  // API polling fallback function to fetch new messages
  const fetchNewMessages = useCallback(async () => {
    if (!customerId) {
      return;
    }

    try {
      const timestampParam = lastMessageTimestampRef.current 
        ? `&since=${lastMessageTimestampRef.current.toISOString()}`
        : '';
      
      const response = await publicApi.get(
        `/api/v1/customer/widget/messages/${customerId}?limit=50${timestampParam}`
      );

      if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
        const newMessages: Message[] = response.data.data.data
          .map((msg: any) => ({
            text: msg.message,
            sender: msg.sender === 'customer' ? 'user' : (msg.sender === 'system' ? 'system' : 'bot'),
            type: 'text',
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            _id: msg._id, // Use message ID to prevent duplicates
          }))
          .filter((msg: any) => {
            // Filter out messages we already have
            return !messages.some((existingMsg: any) => {
              // Check by ID first
              if (existingMsg._id && msg._id && existingMsg._id === msg._id) {
                return true;
              }
              
              // Check by text and timestamp
              if (existingMsg.text === msg.text) {
                const existingTimestamp = existingMsg.timestamp instanceof Date 
                  ? existingMsg.timestamp 
                  : (typeof existingMsg.timestamp === 'string' ? new Date(existingMsg.timestamp) : null);
                const msgTimestamp = msg.timestamp instanceof Date 
                  ? msg.timestamp 
                  : (typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : null);
                
                if (existingTimestamp && msgTimestamp && 
                    !isNaN(existingTimestamp.getTime()) && !isNaN(msgTimestamp.getTime())) {
                  return existingTimestamp.getTime() === msgTimestamp.getTime();
                }
              }
              
              return false;
            });
          })
          .filter((msg: any) => {
            // Only include messages newer than lastMessageTimestamp
            if (!lastMessageTimestampRef.current || !msg.timestamp) return true;
            
            const msgTimestamp = msg.timestamp instanceof Date 
              ? msg.timestamp 
              : (typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : null);
            
            if (!msgTimestamp || isNaN(msgTimestamp.getTime())) return true;
            
            return msgTimestamp > lastMessageTimestampRef.current;
          });

        if (newMessages.length > 0) {
          // Update last message timestamp
          const latestTimestamp = newMessages.reduce((latest, msg) => {
            const msgTime = (msg as any).timestamp;
            return msgTime && (!latest || msgTime > latest) ? msgTime : latest;
          }, null as Date | null);

          if (latestTimestamp) {
            setLastMessageTimestamp(latestTimestamp);
          }

          // Add new messages to state
          setChatState(prev => {
            const existingIds = new Set(prev.messages.map((m: any) => m._id).filter(Boolean));
            const existingTexts = new Set(prev.messages.map((m: any) => m.text).filter(Boolean));
            
            // Filter out duplicates by ID or by text (for optimistic messages without IDs)
            const uniqueNewMessages = newMessages.filter((msg: any) => {
              // Skip if ID already exists
              if (msg._id && existingIds.has(msg._id)) return false;
              
              // Skip if text matches and it's a recent message (within last 5 seconds) - likely the same optimistic message
              if (msg.text && existingTexts.has(msg.text)) {
                const existingMsg = prev.messages.find((m: any) => m.text === msg.text);
                if (existingMsg && existingMsg.timestamp) {
                  const timeDiff = Math.abs(
                    (msg.timestamp instanceof Date ? msg.timestamp.getTime() : new Date(msg.timestamp).getTime()) -
                    (existingMsg.timestamp instanceof Date ? existingMsg.timestamp.getTime() : new Date(existingMsg.timestamp).getTime())
                  );
                  // If messages are within 5 seconds of each other with same text, consider it duplicate
                  if (timeDiff < 5000) return false;
                }
              }
              
              return true;
            });
            
            if (uniqueNewMessages.length === 0) return prev;
            
            // Update optimistic messages with real IDs if they match
            const updatedMessages = prev.messages.map((m: any) => {
              if (m._id && m._id.startsWith('temp-')) {
                // Find matching message by text and timestamp
                const matchingMsg = uniqueNewMessages.find((newMsg: any) => 
                  newMsg.text === m.text && 
                  Math.abs(
                    (newMsg.timestamp instanceof Date ? newMsg.timestamp.getTime() : new Date(newMsg.timestamp).getTime()) -
                    (m.timestamp instanceof Date ? m.timestamp.getTime() : new Date(m.timestamp).getTime())
                  ) < 5000
                );
                if (matchingMsg && matchingMsg._id) {
                  return { ...m, _id: matchingMsg._id };
                }
              }
              return m;
            });
            
            // Remove loader if we got a real message
            const messagesWithoutLoader = updatedMessages.filter(m => m.type !== 'loader');
            
            // Filter out messages that were updated (to avoid duplicates)
            const finalNewMessages = uniqueNewMessages.filter((newMsg: any) => {
              return !updatedMessages.some((m: any) => 
                m._id === newMsg._id || 
                (m.text === newMsg.text && m._id && m._id.startsWith('temp-') && Math.abs(
                  (newMsg.timestamp instanceof Date ? newMsg.timestamp.getTime() : new Date(newMsg.timestamp).getTime()) -
                  (m.timestamp instanceof Date ? m.timestamp.getTime() : new Date(m.timestamp).getTime())
                ) < 5000)
              );
            });
            
            return {
              ...prev,
              messages: [...messagesWithoutLoader, ...finalNewMessages],
            };
          });
        }
      }
    } catch (error) {
      console.error('[Chat Widget] Error fetching new messages via API:', error);
      // Don't throw - just log, we'll retry on next poll
    }
  }, [customerId, messages, setChatState]);

  // Start/stop polling based on socket connection status
  useEffect(() => {
    if (!customerId || !showChat) {
      // Clear polling if no customer or chat not shown
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Always poll as backup, but adjust frequency based on socket connection
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (!socketConnected) {
      // Socket is disconnected - poll aggressively every 3 seconds
      pollingIntervalRef.current = setInterval(() => {
        fetchNewMessages();
      }, 3000);
    } else {
      // Socket is connected - poll slowly every 10 seconds as backup
      pollingIntervalRef.current = setInterval(() => {
        fetchNewMessages();
      }, 10000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [customerId, showChat, socketConnected, fetchNewMessages]);

  useEffect(() => {
    const newSocket = io(API_BASE_URL, { 
      transports: ['websocket'], 
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
    
    setSocket(newSocket);
    
    // Socket connection handlers
    newSocket.on('connect', () => {
      console.log('[Chat Widget] Socket connected');
      setSocketConnected(true);
      if (customerId) {
        newSocket.emit('joinCustomerRoom', customerId);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('[Chat Widget] Socket disconnected');
      setSocketConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Chat Widget] Socket connection error:', error);
      setSocketConnected(false);
    });

    if (customerId) {
      newSocket.emit('joinCustomerRoom', customerId);
    }
    
    return () => { 
      newSocket.disconnect();
      setSocketConnected(false);
    };
  }, [customerId]);


  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: any) => {
      if (payload.sender === 'customer') { return; }
      
      if (payload.sender === 'agent' && payload.agentName) {
        setHeaderAgentName(payload.agentName);
      }
      
      const senderType: Message['sender'] = payload.sender === 'system' ? 'system' : 'bot';
      // Get timestamp from payload (could be timestamp, createdAt, or current time)
      const messageTimestamp = payload.timestamp 
        ? new Date(payload.timestamp) 
        : (payload.createdAt ? new Date(payload.createdAt) : new Date());
      const newMessage: Message = { 
        text: payload.message, 
        sender: senderType, 
        type: 'text',
        timestamp: messageTimestamp,
        _id: payload._id || payload.id, // Store message ID to prevent duplicates
      };

      // Update last message timestamp
      setLastMessageTimestamp(messageTimestamp);

      setChatState(prev => {
        // Check if message already exists (prevent duplicates from API polling)
        const messageExists = prev.messages.some((m: any) => {
          // Check by ID first (most reliable)
          if (m._id && newMessage._id && m._id === newMessage._id) {
            return true;
          }
          
          // Check by text and timestamp
          if (m.text === newMessage.text) {
            const mTimestamp = m.timestamp instanceof Date 
              ? m.timestamp 
              : (typeof m.timestamp === 'string' ? new Date(m.timestamp) : null);
            const newTimestamp = messageTimestamp instanceof Date 
              ? messageTimestamp 
              : (typeof messageTimestamp === 'string' ? new Date(messageTimestamp) : null);
            
            if (mTimestamp && newTimestamp && !isNaN(mTimestamp.getTime()) && !isNaN(newTimestamp.getTime())) {
              return mTimestamp.getTime() === newTimestamp.getTime();
            }
          }
          
          return false;
        });

        if (messageExists) {
          return prev; // Don't add duplicate
        }

        // This correctly replaces the AI loader with the AI's response
        const messagesWithoutLoader = prev.messages.filter(m => m.type !== 'loader');
        return { ...prev, messages: [...messagesWithoutLoader, newMessage] };
      });
    };

    const handleConversationUpdate = (payload: { status: 'live' | 'closed' | 'ticket'; agentName?: string }) => {
      if(payload.status === 'live' && payload.agentName) {
        toast.success(`You are now connected with ${payload.agentName}`);
      }
      
      setHeaderAgentName(payload.agentName || initialAgentName);

      setChatState(prev => ({
        ...prev,
        // This correctly removes any lingering AI loader when a human takes over
        messages: prev.messages.filter(m => m.type !== 'loader'),
        conversationStatus: payload.status,
        currentAgentName: payload.agentName || prev.currentAgentName,
      }));
    };
    
    // This handler is ONLY for the HUMAN agent's typing indicator
    const handleAgentTyping = () => {
      if (conversationStatus === 'live') {
        setIsAgentTyping(true);
      }
    };
    
    // This handler is ONLY for the HUMAN agent's typing indicator
    const handleAgentStoppedTyping = () => {
      setIsAgentTyping(false);
    };

    const handleConversationClosed = (payload: { conversationId: string; closedBy: 'system' | 'agent' }) => {
      console.log(`Conversation closed by ${payload.closedBy}.`);
      setChatState(prev => ({ ...prev, conversationStatus: 'closed' }));
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('conversationUpdated', handleConversationUpdate);
    socket.on('agentTyping', handleAgentTyping);
    socket.on('agentStoppedTyping', handleAgentStoppedTyping);
    socket.on('conversationClosedBySystem', handleConversationClosed);
    socket.on('conversationClosedByAgent', handleConversationClosed);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('conversationUpdated', handleConversationUpdate);
      socket.off('agentTyping', handleAgentTyping);
      socket.off('agentStoppedTyping', handleAgentStoppedTyping);
      socket.off('conversationClosedBySystem', handleConversationClosed);
      socket.off('conversationClosedByAgent', handleConversationClosed);
    };
  }, [socket, setChatState, initialAgentName, conversationStatus]); // Important: conversationStatus is a dependency
  
  const startChatSession = async () => {
    const result = formSchema.safeParse({ name, phone, email });
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors as FormErrors);
      return;
    }
    try {
      const response = await publicApi.post(`/api/v1/messages/create-chat-session`, {
        name, email, phone, businessId, customerId,
      });
      const { customerId: newCustomerId, conversationId: newConversationId } = response.data.data;
      setErrors({});
      setChatState(prev => ({ ...prev, customerId: newCustomerId, conversationId: newConversationId, showChat: true }));
    } catch (error) {
      toast.error("Could not start chat session.");
    }
  };

  const sendMessage = async (messageToSend?: string) => {
    const text = (messageToSend || input).trim();
    if (!text || !businessId || !customerId) return;

    const messageTimestamp = new Date();
    // Create a temporary ID for the optimistic message to help with duplicate prevention
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const userMessage: Message = { 
      text, 
      sender: 'user', 
      type: 'text',
      timestamp: messageTimestamp,
      _id: tempId, // Temporary ID for duplicate prevention
    };
    let finalMessages: Message[] = [...messages, userMessage];
    
    // Update last message timestamp for user messages too
    setLastMessageTimestamp(messageTimestamp);
    
    // CRITICAL: Show the AI thinking loader ONLY when the conversation is in 'ai_only' mode.
    // When a human agent is connected (status is 'live' or 'ticket'), this block is skipped,
    // and no loader is displayed for user messages.
    if (conversationStatus === 'ai_only') {
      finalMessages.push({ text: '', sender: 'bot', type: 'loader' });
    }
      
    setChatState(prev => ({ ...prev, messages: finalMessages }));
    setInput('');

    try {
      const response = await publicApi.post(`/api/v1/messages/send`, {
        message: text,
        businessId,
        customerId,
        agentName: initialAgentName,
      });
      
      // If the response includes the message ID, update the optimistic message
      if (response.data?.data?._id) {
        setChatState(prev => ({
          ...prev,
          messages: prev.messages.map((m: any) => 
            m._id === tempId ? { ...m, _id: response.data.data._id } : m
          )
        }));
      }
    } catch (error) {
      toast.error('Failed to send message.');
      setChatState(prev => ({ 
        ...prev, 
        messages: prev.messages.filter(m => m.type !== 'loader' && m._id !== tempId) 
      }));
      setInput(text);
    }
  };
  
  const handleDefaultResponseClick = (question: string, answer: string) => {
    const userMessage: Message = { text: question, sender: 'user', type: 'text' };
    const botMessage: Message = { text: answer, sender: 'bot', type: 'text' };
    setChatState(prev => ({ ...prev, messages: [...prev.messages, userMessage, botMessage] }));
  };
  
  useEffect(() => {
    if (businessId && initialAgentName && showChat) {
      publicApi.get(`/api/v1/business/${businessId}/${initialAgentName}/default-responses`)
        .then(response => setDefaultResponses(response.data?.data?.defaultFAQResponses || []))
        .catch(err => console.error('Error fetching default responses:', err));
    }
  }, [showChat, businessId, initialAgentName]);

  return (
    <div className="w-full h-full bg-white rounded-[16px] shadow-md flex flex-col overflow-hidden">
      <div className="flex-shrink-0">
        <Header 
          agentName={headerAgentName} 
          setOpen={setOpen} 
          onReset={resetChat}
          socketConnected={socketConnected}
        />
      </div>
      <div className="flex-grow overflow-y-auto">
        {!showChat ? (
          <div className="flex flex-col justify-center items-center p-6 h-full">
            <h3 className="text-lg font-bold mb-1">{t('greeting')}</h3>
            <p className="text-xs text-gray-500 mb-6 text-center">{t('formInstruction')}</p>
            <div className="w-full mb-3">
              <input className={`w-full px-3 py-2 border outline-none rounded-md text-sm ${errors.name ? 'border-red-500' : 'border-gray-300'}`} type="text" placeholder={t('namePlaceholder')} value={name} onChange={(e) => setChatState(prev => ({ ...prev, name: e.target.value }))}/>
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div className="w-full mb-3">
              <input className={`w-full px-3 py-2 border outline-none rounded-md text-sm ${errors.phone ? 'border-red-500' : 'border-gray-300'}`} type="tel" placeholder={t('phonePlaceholder')} value={phone} onChange={(e) => setChatState(prev => ({ ...prev, phone: e.target.value }))}/>
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div className="w-full mb-4">
              <input className={`w-full px-3 py-2 border outline-none rounded-md text-sm ${errors.email ? 'border-red-500' : 'border-gray-300'}`} type="email" placeholder={t('emailPlaceholder')} value={email} onChange={(e) => setChatState(prev => ({ ...prev, email: e.target.value }))}/>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <button onClick={startChatSession} className="w-full bg-[#ff21b0] cursor-pointer text-white py-2 rounded-md font-medium hover:bg-[#f18cce] transition">
              {t('continueButton')}
            </button>
          </div>
        ) : (
          <>
            <ChatMessages messages={messages} isAgentTyping={isAgentTyping} />
            <DefaultResponseTemplate
              defaultResponses={defaultResponses}
              onSelect={handleDefaultResponseClick}
            />
            <InputBox
              input={input}
              setInput={setInput}
              sendMessage={() => sendMessage()}
              disabled={conversationStatus === 'closed'}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInbox;