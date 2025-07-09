// ChatInbox.tsx

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { io, Socket } from 'socket.io-client';
import axios, { AxiosError } from 'axios';
import { z } from 'zod';

import ChatMessages from './ChatMessages';
import DefaultResponseTemplete from './DefaultResponseTemplate';
import Header from './Header';
import InputBox from './InputBox';
import { useLocalStorage } from './useLocalStorage';
import toast from 'react-hot-toast';

const API_BASE_URL = 'https://nuvro-dtao9.ondigitalocean.app';
const socket: Socket = io(API_BASE_URL, {
  transports: ['websocket'],
  withCredentials: true,
});

interface Message {
  text: string;
  sender: 'user' | 'bot';
  isTypingIndicator?: boolean;
  type?: 'loader' | 'text';
}

interface ChatState {
  showChat: boolean;
  name: string;
  phone: string;
  email: string;
  messages: Message[];
  customerId: string | null;
}

const initialChatState: ChatState = {
  showChat: false,
  name: '',
  phone: '',
  email: '',
  messages: [],
  customerId: null,
};

type FormErrors = Partial<Record<keyof Omit<ChatState, 'messages' | 'showChat' | 'customerId'>, string>>;

const ChatInbox = ({
  agentName,
  setOpen,
  businessId,
}: {
  agentName: string;
  businessId: string;
  setOpen: (isOpen: boolean) => void;
}) => {
  const { t } = useTranslation();

  const localStorageKey = `chat_state_${businessId}_${agentName}`;
  const [chatState, setChatState] = useLocalStorage<ChatState>(localStorageKey, initialChatState);

  const [input, setInput] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [defaultResponses, setDefaultResponses] = useState<{ question: string; answer: string }[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showChat, name, phone, email, messages, customerId } = chatState;

  // --- THE FIX: PART 1 ---
  // Create a ref to hold a stable reference to our message handler.
  const handleNewMessageRef = useRef<((data: any) => void) | null>(null);


  const formSchema = z.object({
    name: z.string().min(1, { message: t('error.nameRequired') }),
    phone: z.string().regex(/^(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/, {
      message: t('error.invalidPhone'),
    }),
    email: z.string().email({ message: t('error.invalidEmail') }),
  });

  const resetChat = () => {
    socket.disconnect();
    socket.connect();
    localStorage.removeItem(localStorageKey);
    setChatState(initialChatState);
    setInput('');
    setDefaultResponses([]);
    setErrors({});
    setOpen(false);
  };

  const handleContinue = () => {
    const result = formSchema.safeParse({ name, phone, email });
    if (result.success) {
      setErrors({});
      setChatState(prev => ({ ...prev, showChat: true }));
    } else {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        phone: fieldErrors.phone?.[0],
        email: fieldErrors.email?.[0],
      });
    }
  };

  const sendMessage = async (messageToSend?: string) => {
    const text = (messageToSend || input).trim();
    if (!text || !businessId) return;

    const userMessage: Message = { text, sender: 'user' };
    const botLoaderMessage: Message = { text: '', sender: 'bot', type: 'loader' };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage, botLoaderMessage],
    }));
    setInput('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/messages/send`, {
        message: text,
        businessId,
        customerId,
        name,
        email,
        phone,
        agentName,
      });
      console.log('Message sent successfully:', response);
      if (response.data.data.customerId && !customerId) {
        setChatState(prev => ({ ...prev, customerId: response.data.data.customerId }));
      }
    } catch (error) {

      const axiosError = error as AxiosError<{ message: string }>;
      const errorMessage = axiosError.response?.data?.message || 'Failed to send message. Please try again.';
      toast.error(errorMessage);

      setChatState(prev => ({
        ...prev,
        messages: prev.messages.filter(m => m.text !== text && m.type !== 'loader'),
      }));
    }
  };

  const handleDefaultResponseClick = (question: string, answer: string) => {
    const userMessage: Message = { text: question, sender: 'user' };
    const botMessage: Message = { text: answer, sender: 'bot' };
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage, botMessage]
    }));
  };

  useEffect(() => {
    if (businessId && agentName && showChat) {
      axios
        .get(`${API_BASE_URL}/api/v1/business/${businessId}/${agentName}/default-responses`)
        .then(response => {
          if (response.data?.data?.defaultFAQResponses) {
            setDefaultResponses(response.data.data.defaultFAQResponses);
          } else {
            setDefaultResponses([]);
          }
        })
        .catch(err => {
          console.error('Error fetching default responses:', err);
          setDefaultResponses([]);
        });
    }
  }, [showChat, businessId, agentName]);


  
  useEffect(() => {
    handleNewMessageRef.current = (data: { sender: 'agent' | 'user'; message: string; customerId?: string }) => {
     
      if (data.customerId !== customerId) {
        return;
      }

      if (data.sender === 'agent') {
        setIsAgentTyping(false);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

        setChatState(prev => {
          const messagesWithoutLoader = prev.messages.filter(m => m.type !== 'loader');

          // if (messagesWithoutLoader.some(m => m.text === data.message && m.sender === 'bot')) {
          //   return { ...prev, messages: messagesWithoutLoader };
          // }
          return {
            ...prev,
            messages: [...messagesWithoutLoader, { text: data.message, sender: 'bot', type: 'text' }]
          };
        });
      }
    };
  }); 


  useEffect(() => {
   
    if (customerId) {
      socket.emit("joinCustomerRoom", customerId);
    }

  
    const messageHandlerWrapper = (data: any) => {
      if (handleNewMessageRef.current) {
        handleNewMessageRef.current(data);
      }
    };

    const handleTyping = () => {
      setIsAgentTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setIsAgentTyping(false), 4000);
    };

   
    socket.on('newMessage', messageHandlerWrapper);
    socket.on("typing", handleTyping);

  
    return () => {
      socket.off('newMessage', messageHandlerWrapper);
      socket.off('typing', handleTyping);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
    
  }, [customerId]);

  return (
    <div className="w-[360px] h-[530px] bg-white rounded-[16px] shadow-md flex flex-col overflow-hidden z-[9999]">
      <div className="flex-shrink-0">
        <Header
          agentName={agentName}
          setOpen={setOpen}
          onReset={resetChat}
        />
      </div>
      <div className="flex-grow overflow-y-auto">
        {!showChat ? (
          <div className="flex flex-col justify-center items-center p-6">
            <h3 className="text-lg font-bold mb-1">{t('greeting')}</h3>
            <p className="text-xs text-gray-500 mb-6 text-center">{t('formInstruction')}</p>
            <div className="w-full mb-3">
              <input
                className={`w-full px-3 py-2 border outline-none rounded-md text-sm ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                type="text" placeholder={t('namePlaceholder')} value={name}
                onChange={(e) => {
                  setChatState(prev => ({ ...prev, name: e.target.value }));
                  if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                }}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div className="w-full mb-3">
              <input
                className={`w-full px-3 py-2 border outline-none rounded-md text-sm ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                type="tel" placeholder={t('phonePlaceholder')} value={phone}
                onChange={(e) => {
                  setChatState(prev => ({ ...prev, phone: e.target.value }));
                  if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
                }}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div className="w-full mb-4">
              <input
                className={`w-full px-3 py-2 border outline-none rounded-md text-sm ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                type="email" placeholder={t('emailPlaceholder')} value={email}
                onChange={(e) => {
                  setChatState(prev => ({ ...prev, email: e.target.value }));
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <button
              onClick={handleContinue}
              className="w-full bg-[#ff21b0] cursor-pointer text-white py-2 rounded-md font-medium hover:bg-[#f18cce] transition"
            >
              {t('continueButton')}
            </button>
          </div>
        ) : (
          <>
            <ChatMessages messages={messages} isAgentTyping={isAgentTyping} />
            <DefaultResponseTemplete
              defaultResponses={defaultResponses}
              onSelect={handleDefaultResponseClick}
            />
            <InputBox
              input={input}
              setInput={setInput}
              sendMessage={() => sendMessage()}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInbox;