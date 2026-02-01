import { GrEmoji } from 'react-icons/gr';
import { FaPaperPlane } from 'react-icons/fa';
import { useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { useTranslation } from 'react-i18next';
import { getColorVariations } from '../utils/colorUtils';

interface InputBoxProps {
  input: string;
  setInput: (val: string) => void;
  sendMessage: () => void;
  disabled?: boolean;
  widgetColor?: string;
}

const InputBox = ({ input, setInput, sendMessage, disabled = false, widgetColor = '#ff21b0' }: InputBoxProps) => {
  const colors = getColorVariations(widgetColor);
  const { t } = useTranslation();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEmojiClick = (emojiData: any) => {
    setInput(input + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="w-full px-4 py-3 flex flex-col items-center bg-white border-t border-gray-100/80 shadow-[0_-2px 10px rgba(0,0,0,0.03)]">
      {showEmojiPicker && (
        <div className="absolute bottom-full right-4 mb-2 z-50 rounded-xl overflow-hidden shadow-lg border border-gray-100">
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}
      <div className="w-full flex items-center gap-2.5">
        <div className="flex-1 relative min-w-0">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && !disabled && input.trim() && sendMessage()}
            className="w-full h-12 rounded-xl border border-gray-200 outline-none px-4 py-3 pr-12 bg-gray-50/80 focus:bg-white transition-all duration-200 text-sm placeholder:text-gray-400 focus:border-gray-300 focus:ring-2 focus:ring-offset-0"
            style={{
              ['--tw-ring-color' as string]: `${colors.primary}40`,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.primary;
              e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.primary}25`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '';
              e.currentTarget.style.boxShadow = '';
            }}
            placeholder={t('inputPlaceholder') || "Type a message..."}
            disabled={disabled}
            maxLength={1000}
            aria-label="Message input"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors p-2 rounded-lg hover:bg-gray-100/80 disabled:opacity-50"
            onMouseEnter={(e) => { e.currentTarget.style.color = colors.primary; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
            onClick={() => setShowEmojiPicker(prev => !prev)}
            disabled={disabled}
            title="Add emoji"
            aria-label="Add emoji"
          >
            <GrEmoji className="w-5 h-5" />
          </button>
        </div>
        <button
          type="button"
          onClick={sendMessage}
          disabled={disabled || !input.trim()}
          className="w-12 h-12 flex items-center justify-center rounded-xl text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-md hover:shadow-lg disabled:shadow-none active:scale-95"
          style={{
            background: input.trim() && !disabled
              ? `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`
              : 'linear-gradient(135deg, #94a3b8, #64748b)',
            boxShadow: input.trim() && !disabled ? `0 4px 12px ${colors.primary}35` : undefined,
          }}
          onMouseEnter={(e) => {
            if (!disabled && input.trim()) {
              e.currentTarget.style.background = `linear-gradient(135deg, ${colors.dark}, ${colors.darker})`;
              e.currentTarget.style.boxShadow = `0 6px 16px ${colors.primary}45`;
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled && input.trim()) {
              e.currentTarget.style.background = `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`;
              e.currentTarget.style.boxShadow = `0 4px 12px ${colors.primary}35`;
            }
          }}
          title="Send message"
          aria-label="Send message"
        >
          <FaPaperPlane className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InputBox;