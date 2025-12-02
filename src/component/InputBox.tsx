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
    <div className="w-full px-4 py-3 flex flex-col items-center bg-white border-t border-gray-100">
      {showEmojiPicker && (
        <div className="absolute bottom-20 right-4 z-50">
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}
      <div className="w-full flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !disabled && input.trim() && sendMessage()}
            className="w-full h-[48px] rounded-2xl border-2 border-gray-200 outline-none px-4 py-3 pr-12 bg-gray-50 focus:bg-white focus:border-[#ff21b0] focus:ring-2 focus:ring-[#ff21b0]/20 transition-all text-sm"
            placeholder={t('inputPlaceholder') || "Send us a message..."}
            disabled={disabled}
            maxLength={1000}
          />
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-[#ff21b0] transition-colors p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setShowEmojiPicker(prev => !prev)}
            disabled={disabled}
            title="Add emoji"
          >
            <GrEmoji className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={sendMessage}
          disabled={disabled || !input.trim()}
          className="w-[48px] h-[48px] flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#ff21b0] to-[#c24d99] text-white hover:from-[#e91e9d] hover:to-[#b03d88] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-md"
          title="Send message"
        >
          <FaPaperPlane className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InputBox;