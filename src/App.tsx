// App.tsx - Robust Flexbox Version

import React, { useEffect } from 'react';
import ChatInbox from './component/ChatInbox';
import { useLocalStorage } from './component/useLocalStorage';

const App: React.FC = () => {
  const [open, setOpen] = useLocalStorage('chat_widget_open', false);

  const params = new URLSearchParams(window.location.search);
  const agentName = params.get('agentName') || 'AI Assistant';
  const businessId = params.get('businessId') || '';

  useEffect(() => {
    const message = { type: 'resize-widget', isOpen: open };
    window.parent.postMessage(message, '*');
  }, [open]);

  // If the chat is open, show the full inbox.
  // If it's closed, show a container that centers the bubble.
  if (open) {
    return (
        <ChatInbox
            agentName={agentName}
            businessId={businessId}
            setOpen={setOpen}
        />
    );
  }

  // This is the "closed" state view.
  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* Chat Bubble */}
      <div
        id="chat-bubble"
        onClick={() => setOpen(true)}
        className='h-[50px] w-[50px] bg-[#ff21b0] rounded-full flex items-center justify-center text-white text-3xl cursor-pointer'
      >
       '💬'
      </div>
    </div>
  );
};

export default App;