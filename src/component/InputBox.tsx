import { GrEmoji } from 'react-icons/gr';
import { FaPaperPlane } from 'react-icons/fa';
import { useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { useTranslation } from 'react-i18next';

interface InputBoxProps {
  input: string;
  setInput: (val: string) => void;
  sendMessage: () => void;
  disabled?: boolean;
}

const InputBox = ({ input, setInput, sendMessage, disabled = false }: InputBoxProps) => {
  const { t } = useTranslation();
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
          onKeyDown={e => e.key === 'Enter' && !disabled && input.trim() && sendMessage()}
          className="w-full h-full rounded-[8px] border border-gray-200 outline-none px-3 py-2 pr-[60px] focus:border-[#ff21b0] focus:ring-2 focus:ring-[#ff21b0]/20 transition-all"
          placeholder={t('inputPlaceholder')}
          disabled={disabled}
          maxLength={1000}
        />
        <button
          onClick={sendMessage}
          disabled={disabled || !input.trim()}
          className="absolute right-10 cursor-pointer text-[#ff21b0] hover:text-[#c24d99] transition-all disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:text-gray-400 p-1.5 rounded-full hover:bg-[#ff21b0]/10"
          title="Send message"
        >
          <FaPaperPlane />
        </button>
        <button
          className="absolute right-2 text-gray-500 cursor-pointer hover:text-[#ff21b0] transition-colors p-1.5 rounded-full hover:bg-gray-100"
          onClick={() => setShowEmojiPicker(prev => !prev)}
          disabled={disabled}
          title="Add emoji"
        >
          <GrEmoji />
        </button>
      </div>
    </div>
  );
};

export default InputBox;