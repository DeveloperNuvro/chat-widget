import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ChatMessages from './ChatMessages';
import DefaultResponseTemplete from './DefaultResponseTemplate';
import Header from './Header';
import InputBox from './InputBox';
import { io, Socket } from 'socket.io-client';
import { debounce } from 'lodash';
import axios from 'axios';

const socket: Socket = io('https://nuvro-dtao9.ondigitalocean.app', {
  transports: ['websocket'],
  withCredentials: true,
});


const ChatInbox = ({
  agentName,
  setOpen,
  businessId
}: {
  agentName: string;
  businessId: string;
  setOpen: (isOpen: boolean) => void;
}) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'bot' }[]>([]);
  const [isWaitingBotReply, setIsWaitingBotReply] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isHuman, setIsHuman] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [defaultResponses, setDefaultResponses] = useState<
    { question: string; answer: string }[]
  >([]);

  // <-- FIXED: Restored function logic -->
  const resetChat = () => {
    setShowChat(false);
    setName('');
    setPhone('');
    setEmail('');
    setMessages([]);
    setIsWaitingBotReply(false);
    setCustomerId(null);
    setIsHuman(false);
    setInput('');
    setDefaultResponses([]);
    if (businessId) {
      socket.emit('joinBusiness', businessId);
    }
  };

  // <-- FIXED: Restored function logic -->
  const emitTyping = debounce(() => {
    if (customerId && businessId) {
      socket.emit("typing", { customerId, businessId, source: 'customer' });
    }
  }, 500);

  // <-- FIXED: Restored function logic -->
  const handleContinue = () => {
    if (name && phone && email) {
      setShowChat(true);
    } else {
      alert('Please fill all fields');
    }
  };

  // <-- FIXED: Restored hook logic -->
  useEffect(() => {
    if (businessId && agentName && showChat) {
      axios
        .get(`https://nuvro-dtao9.ondigitalocean.app/api/v1/business/${businessId}/${agentName}/default-responses`)
        .then(response => {
          const faqs = response.data.data.defaultFAQResponses;
          setDefaultResponses(faqs);
        })
        .catch(err => {
          console.log('Error fetching default responses:', err);
        });
    }
  }, [showChat, businessId, agentName]);

  // <-- FIXED: Restored function logic -->
  const handleDefaultResponseClick = (question: string, answer: string) => {
    setMessages((prev) => [...prev, { text: question, sender: 'user' }]);
    setMessages((prev) => [...prev, { text: answer, sender: 'bot' }]);
  };

  // <-- FIXED: Restored hook logic -->
  useEffect(() => {
    if (businessId) {
      socket.emit('joinBusiness', businessId);
    }

    socket.on("initCustomer", (data: { customerId: string }) => {
      if (!customerId) {
        setCustomerId(data.customerId);
        socket.emit("joinCustomerRoom", data.customerId);
      }
    });

    socket.on('newMessage', (data: { sender: string; message: string; customerId: string }) => {
      if (data.customerId !== customerId) return;

      if (data.sender === 'agent') {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          const isSame = last?.text === data.message && last?.sender === 'bot';
          if (isSame) return prev;
          const newMessages = [...prev];
          if (!isHuman && isWaitingBotReply && newMessages[newMessages.length - 1]?.text === 'typing...') {
            newMessages.pop();
          }
          newMessages.push({ text: data.message, sender: 'bot' });
          return newMessages;
        });
        setIsWaitingBotReply(false);
      }
    });

    socket.on("typing", ({ customerId: incomingId, source }) => {
      if (incomingId !== customerId || source !== "humanAgent") return;
      setIsAgentTyping(true);
      setTimeout(() => {
        setIsAgentTyping(false);
      }, 3000);
    });

    return () => {
      socket.off('newMessage');
      socket.off('initCustomer');
      socket.off('typing');
    };
  }, [businessId, customerId, isWaitingBotReply, isHuman]);

  // <-- FIXED: Restored function logic -->
  const sendMessage = () => {
    if (!input.trim()) return;

    const userMessage = { text: input, sender: 'user' as const };
    setMessages(prev => [...prev, userMessage]);

    if (!isHuman) {
      setMessages(prev => [...prev, { text: 'typing...', sender: 'bot' }]);
      setIsWaitingBotReply(true);
    }

    socket.emit('userMessage', {
      name,
      email,
      phone,
      businessId,
      isAgent: !isHuman,
      agentName: !isHuman ? agentName : 'Human',
      message: input,
    });

    setInput('');
  };

  return (
    <div className="w-[360px] h-[530px] bg-white rounded-[16px] shadow-md flex flex-col overflow-hidden z-[9999]">
      <div className="flex-shrink-0">
        <Header 
          agentName={agentName} 
          setOpen={setOpen} 
          isHuman={isHuman} 
          setIsHuman={setIsHuman} 
          onReset={resetChat}
        />
      </div>
      <div className="flex-grow overflow-y-auto">
        {!showChat ? (
          <div className="flex flex-col justify-center items-center p-6">
            <h3 className="text-lg font-bold mb-1">{t('greeting')}</h3>
            <p className="text-xs text-gray-500 mb-10 text-center">
              {t('formInstruction')}
            </p>
            <input
              className="w-full mb-3 px-3 py-2 border border-gray-300 outline-none rounded-md text-sm"
              type="text"
              placeholder={t('namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="w-full mb-3 px-3 py-2 border border-gray-300 outline-none rounded-md text-sm"
              type="tel"
              placeholder={t('phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              className="w-full mb-4 px-3 py-2 border border-gray-300 outline-none rounded-md text-sm"
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              onClick={handleContinue}
              disabled={!name || !phone || !email}
              className="w-full bg-[#8C52FF] cursor-pointer text-white disabled:bg-[#DACDF3] py-2 rounded-md font-medium hover:bg-[#7a45dd] transition"
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
              setInput={(val) => {
                setInput(val);
                if (isHuman) emitTyping();
              }}
              sendMessage={sendMessage}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInbox;