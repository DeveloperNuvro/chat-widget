import { useState } from 'react';
import ChatMessages from './ChatMessages';
import DefaultResponseTemplete from './DefaultResponseTemplate';
import Header from './Header';
import InputBox from './InputBox';

const ChatInbox = ({
  agentName,
  setOpen,
  messages,
  input,
  setInput,
  sendMessage,
}: {
  agentName: string;
  setOpen: any;
  messages: { text: string; sender: 'user' | 'bot' }[];
  input: string;
  setInput: (val: string) => void;
  sendMessage: () => void;
}) => {
  const [showChat, setShowChat] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleContinue = () => {
    if (name && phone && email) {
      setShowChat(true);
    } else {
      alert('Please fill all fields');
    }
  };

  return (
    <div className="w-[350px] h-[500px] bg-white rounded-[16px] shadow-md flex flex-col overflow-hidden z-[9999]">
      {/* Always show header */}
      <div className="flex-shrink-0">
        <Header agentName={agentName} setOpen={setOpen} />
      </div>

      {/* Scrollable content below header */}
      <div className="flex-grow overflow-y-auto">
        {!showChat ? (
          <div className="flex flex-col justify-center items-center p-6">
            <h3 className="text-lg font-semibold mb-1">Hello There!</h3>
            <p className="text-xs text-gray-500 mb-4 text-center">
              Kindly fill in the form below to continue the conversation.
            </p>

            <input
              className="w-full mb-3 px-3 py-2 border border-gray-300 outline-none rounded-md text-sm"
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="w-full mb-3 px-3 py-2 border border-gray-300 outline-none rounded-md text-sm"
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <input
              className="w-full mb-4 px-3 py-2 border border-gray-300 outline-none rounded-md text-sm"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              onClick={handleContinue}
              disabled={!name || !phone || !email}
              className="w-full bg-[#8C52FF] cursor-pointer text-white disabled:bg-[#DACDF3] py-2 rounded-md font-medium hover:bg-[#7a45dd] transition"
            >
              Continue
            </button>
          </div>
        ) : (
          <>
            <ChatMessages messages={messages} />
            <DefaultResponseTemplete />
            <InputBox input={input} setInput={setInput} sendMessage={sendMessage} />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInbox;
