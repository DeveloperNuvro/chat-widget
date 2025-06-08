import React, { useState } from 'react';
import ChatInbox from './component/ChatInbox';

const App: React.FC = () => {
  const [open, setOpen] = useState(false);

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
        {/* <-- MODIFIED: Show a close icon when open for better UX --> */}
        {open ? '✕' : '💬'}
      </div>

      {/* <-- MODIFIED: Chat Widget is now always rendered but visibility is toggled --> */}
      <div
        style={{
          position: 'fixed',
          bottom: 65,
          right: 10,
          zIndex: 9998,
          // Use visibility & opacity to hide/show without unmounting the component
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
          // Note: input and setInput state are now managed inside ChatInbox
        />
      </div>
    </>
  );
};

export default App;