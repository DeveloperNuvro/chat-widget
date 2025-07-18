// ChatInbox.tsx (for the WIDGET)

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { z } from 'zod';
import toast from 'react-hot-toast';

import ChatMessages from './ChatMessages';
import DefaultResponseTemplete from './DefaultResponseTemplate';
import Header from './Header';
import InputBox from './InputBox';
import { useLocalStorage } from './useLocalStorage';

const API_BASE_URL = 'https://nuvro-dtao9.ondigitalocean.app';
const socket: Socket = io(API_BASE_URL, {
  transports: ['websocket'],
  withCredentials: true,
});

interface Message {
  text: string;
  sender: 'user' | 'bot'; // 'bot' will now represent both AI and Human agents
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
  const { showChat, name, phone, email, messages, customerId } = chatState;

  const [input, setInput] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [defaultResponses, setDefaultResponses] = useState<{ question: string; answer: string }[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formSchema = z.object({
    name: z.string().min(1, { message: t('error.nameRequired') }),
    phone: z.string().regex(/^(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/, {
      message: t('error.invalidPhone'),
    }),
    email: z.string().email({ message: t('error.invalidEmail') }),
  });

  const customerIdRef = useRef(customerId);
  useEffect(() => {
    customerIdRef.current = customerId;
  }, [customerId]);


  useEffect(() => {
    if (!customerId) {
      return;
    }
    socket.emit("joinCustomerRoom", customerId);

    const handleNewMessage = (data: { sender: 'user' | 'agent'; message: string; customerId?: string }) => {

      if (data.customerId !== customerId) return;
      console.log("New message received:", data);

      if (data.sender === 'agent') {
        setIsAgentTyping(false);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

        setChatState(prev => {
          const messagesWithoutLoader = prev.messages.filter(m => m.type !== 'loader');
          const agentMessage: Message = { text: data.message, sender: 'bot' };
          return { ...prev, messages: [...messagesWithoutLoader, agentMessage] };
        });
      }

    };

    const handleTyping = () => {
      setIsAgentTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
     
      typingTimerRef.current = setTimeout(() => setIsAgentTyping(false), 4000); 
    };

    socket.on('newMessage', handleNewMessage);
    socket.on("typing", handleTyping);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('typing', handleTyping);
    };
  }, [customerId, setChatState]);


  useEffect(() => {
    if (customerId) {
      socket.emit("joinCustomerRoom", customerId);
      console.log(`Socket emitted joinCustomerRoom for: ${customerId}`);
    }
  }, [customerId]);

  const startChatSession = async () => {
    const result = formSchema.safeParse({ name, phone, email });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        phone: fieldErrors.phone?.[0],
        email: fieldErrors.email?.[0],
      });
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/messages/create-chat-session`, {
        name, email, phone, businessId,
      });

      const newCustomerId = response.data.data.customerId;
      setErrors({});
      setChatState(prev => ({ ...prev, customerId: newCustomerId, showChat: true }));
    } catch (error) {
      toast.error("Could not start chat session.");
      console.error("Error starting chat session:", error);
    }
  };

  // --- sendMessage FUNCTION (MODIFIED FOR OPTIMISTIC UI) ---
  const sendMessage = async (messageToSend?: string) => {
    const text = (messageToSend || input).trim();
    if (!text || !businessId || !customerId) return;

    // Optimistically add the user's message AND the loader instantly
    const userMessage: Message = { text, sender: 'user' };
    const botLoaderMessage: Message = { text: '', sender: 'bot', type: 'loader' };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage, botLoaderMessage],
    }));
    setInput(''); // Clear the input box immediately

    try {
      // The API call now just triggers the backend process.
      // We don't need to wait for its response to update the UI anymore.
      await axios.post(`${API_BASE_URL}/api/v1/messages/send`, {
        message: text,
        businessId,
        customerId,
        agentName,
      });
    } catch (error) {
      toast.error('Failed to send message.');
      // If the API call fails, remove the user message and the loader to rollback
      setChatState(prev => ({
        ...prev,
        messages: prev.messages.filter(m => m !== userMessage && m !== botLoaderMessage),
      }));
      setInput(text); // Put the text back in the input box
    }
  };

  // No changes needed for resetChat, handleDefaultResponseClick, or the form part of the component
  const resetChat = () => {
    localStorage.removeItem(localStorageKey);
    setChatState(initialChatState);
    setInput('');
    setDefaultResponses([]);
    setErrors({});
    setOpen(false);
  };

  const handleDefaultResponseClick = (question: string, answer: string) => {
    const userMessage: Message = { text: question, sender: 'user', type: 'text' };
    const botMessage: Message = { text: answer, sender: 'bot', type: 'text' };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage, botMessage]
    }));
  };

  useEffect(() => {
    if (businessId && agentName && showChat) {
      axios.get(`${API_BASE_URL}/api/v1/business/${businessId}/${agentName}/default-responses`)
        .then(response => setDefaultResponses(response.data?.data?.defaultFAQResponses || []))
        .catch(err => console.error('Error fetching default responses:', err));
    }
  }, [showChat, businessId, agentName]);


  return (
    <div className="w-full h-full bg-white rounded-[16px] shadow-md flex flex-col overflow-hidden">
      <div className="flex-shrink-0">
        <Header agentName={agentName} setOpen={setOpen} onReset={resetChat} />
      </div>
      <div className="flex-grow overflow-y-auto">
        {!showChat ? (
          <div className="flex flex-col justify-center items-center p-6 h-full">
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
              onClick={startChatSession}
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
              onSelect={(q, a) => handleDefaultResponseClick(q, a)}
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