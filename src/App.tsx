import React, { useState } from 'react';
import ChatInbox from './component/ChatInbox';

const App: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'bot' }[]>([]);
  const [input, setInput] = useState('');

  const params = new URLSearchParams(window.location.search);
  const agentName = params.get('agentName') || 'AI Assistant';

  const sendMessage = () => {
    if (!input.trim()) return;
  
    const userMessage = { text: input, sender: 'user' as const };
    const botMessage = {
      text: "Hey! Of course, I’d be happy to help.\nWhat do you need? 😊",
      sender: 'bot' as const,
    };
  
    setMessages(prev => [...prev, userMessage, botMessage]);
    setInput('');
  };
  
  return (
    <>
      {/* Chat Bubble */}
      <div
        id="chat-bubble"
        onClick={() => setOpen(prev => !prev)}
        className='fixed bottom-4 right-4 w-12 h-12 bg-[#8C52FF] rounded-full flex items-center justify-center text-white text-3xl cursor-pointer z-[9999]'
      >
        💬
      </div>

      {/* Chat Widget above bubble */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 90,
            right: 20,
            zIndex: 9998,
          }}
        >
          <ChatInbox
            agentName={agentName}
            setOpen={setOpen}
            messages={messages}
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
          />
        </div>
      )}
    </>
  );
};

export default App;
