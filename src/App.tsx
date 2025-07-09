import React from 'react';
import ChatInbox from './component/ChatInbox';
import { useLocalStorage } from './component/useLocalStorage'; // <-- 1. IMPORT the custom hook

const App: React.FC = () => {

  const [open, setOpen] = useLocalStorage('chat_widget_open', false);

  const params = new URLSearchParams(window.location.search);
  const agentName = params.get('agentName') || 'AI Assistant';
  const businessId = params.get('businessId') || '';
  
  return (
    <>
      {/* Chat Bubble */}
      <div
        id="chat-bubble"
        onClick={() => setOpen(prev => !prev)}
        className='fixed bottom-1 right-4 h-[50px] w-[50px] bg-[#ff21b0] rounded-full flex items-center justify-center text-white text-3xl cursor-pointer z-[9999]'
      >
        {open ? '✕' : '💬'}
      </div>

      {/* Chat Widget */}
      <div
        style={{
          position: 'fixed',
          bottom: 65,
          right: 10,
          zIndex: 9998,
          visibility: open ? 'visible' : 'hidden',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0)' : 'translateY(20px)',
          transition: 'visibility 0s, opacity 0.3s ease-out, transform 0.3s ease-out',
        }}
      >
        <ChatInbox
          agentName={agentName}
          businessId={businessId}
          setOpen={setOpen}
        />
      </div>
    </>
  );
};

export default App;