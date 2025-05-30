import React, { useState } from 'react';
import ChatInbox from './component/ChatInbox';

const App: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');

  const params = new URLSearchParams(window.location.search);
  const agentName = params.get('agentName') || 'AI Assistant';
  const businessId = params.get('businessId') || '';



  
  return (
    <>
      {/* Chat Bubble */}
      <div
        id="chat-bubble"
        onClick={() => setOpen(prev => !prev)}
        className='fixed bottom-1 right-4 h-[50px] w-[50px] bg-[#8C52FF] rounded-full flex items-center justify-center text-white text-3xl cursor-pointer z-[9999]'
      >
        💬
      </div>

      {/* Chat Widget above bubble */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 65,
            right: 10,
            zIndex: 9998,
          }}
        >
          <ChatInbox
            agentName={agentName}
            businessId={businessId}
            setOpen={setOpen}
            input={input}
            setInput={setInput}
  
          />
        </div>
      )}
    </>
  );
};

export default App;
