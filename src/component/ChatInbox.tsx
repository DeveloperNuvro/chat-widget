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

  const customerIdRef = useRef(customerId);
  useEffect(() => { customerIdRef.current = customerId; }, [customerId]);

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

  useEffect(() => {
    if (customerId && conversationId && messages.length === 0) {
      publicApi.get(`/api/v1/customer/widget/messages/${customerId}`)
        .then(res => {
          if (res.data?.data?.data && Array.isArray(res.data.data.data)) {
            const formattedMessages: Message[] = res.data.data.data.map((msg: any) => ({
              text: msg.message,
              sender: msg.sender === 'customer' ? 'user' : (msg.sender === 'system' ? 'system' : 'bot'),
              type: 'text',
            })).reverse();
            setChatState(prev => ({ ...prev, messages: formattedMessages, showChat: true }));
          }
        })
        .catch(() => resetChat());
    }
  }, [customerId, conversationId, messages.length, setChatState, resetChat]);

  useEffect(() => {
    const newSocket = io(API_BASE_URL, { transports: ['websocket'], withCredentials: true });
    setSocket(newSocket);
    if (customerId) {
      newSocket.emit('joinCustomerRoom', customerId);
    }
    return () => { newSocket.disconnect(); };
  }, [customerId]);


  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: any) => {
      if (payload.sender === 'customer') { return; }
      
      if (payload.sender === 'agent' && payload.agentName) {
        setHeaderAgentName(payload.agentName);
      }
      
      const senderType: Message['sender'] = payload.sender === 'system' ? 'system' : 'bot';
      const newMessage: Message = { text: payload.message, sender: senderType, type: 'text' };

      setChatState(prev => {
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

    const userMessage: Message = { text, sender: 'user', type: 'text' };
    let finalMessages: Message[] = [...messages, userMessage];
    
    // CRITICAL: Show the AI thinking loader ONLY when the conversation is in 'ai_only' mode.
    // When a human agent is connected (status is 'live' or 'ticket'), this block is skipped,
    // and no loader is displayed for user messages.
    if (conversationStatus === 'ai_only') {
      finalMessages.push({ text: '', sender: 'bot', type: 'loader' });
    }
      
    setChatState(prev => ({ ...prev, messages: finalMessages }));
    setInput('');

    try {
      await publicApi.post(`/api/v1/messages/send`, {
        message: text,
        businessId,
        customerId,
        agentName: initialAgentName,
      });
    } catch (error) {
      toast.error('Failed to send message.');
      setChatState(prev => ({ 
        ...prev, 
        messages: prev.messages.filter(m => m.type !== 'loader' && m !== userMessage) 
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
        <Header agentName={headerAgentName} setOpen={setOpen} onReset={resetChat} />
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