import { GrEmoji } from 'react-icons/gr';
import { FaPaperPlane } from 'react-icons/fa';
import { useState } from 'react';
import EmojiPicker from 'emoji-picker-react';

const InputBox = ({
  input,
  setInput,
  sendMessage,
}: {
  input: string;
  setInput: (val: string) => void;
  sendMessage: () => void;
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEmojiClick = (emojiData: any) => {
    setInput(input + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="w-[350px] px-3 flex flex-col items-center mb-5 z-50">
      {showEmojiPicker && (
        <div>
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}
      <div className="w-full h-[40px] flex items-center relative">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          className="w-full h-full rounded-[8px] border-t-[1px] border-[#E6E6E6] outline-none px-3 py-2 pr-[60px]"
          placeholder="Type a message..."
        />

        {/* Send Button */}
        <button
          onClick={sendMessage}
          className="absolute right-10 cursor-pointer text-[#8C52FF] hover:text-[#703ccf] transition"
        >
          <FaPaperPlane />
        </button>

        {/* Emoji Picker Toggle */}
        <button
          className="absolute right-2 text-gray-500 cursor-pointer"
          onClick={() => setShowEmojiPicker(prev => !prev)}
        >
          <GrEmoji />
        </button>
      </div>
    </div>
  );
};

export default InputBox;
