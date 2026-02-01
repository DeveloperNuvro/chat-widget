import { PiRobot } from "react-icons/pi";
import { FaRegWindowMinimize, FaSyncAlt } from "react-icons/fa";
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { getColorVariations } from '../utils/colorUtils';

interface HeaderProps {
  agentName: string;
  setOpen: (isOpen: boolean) => void;
  onReset: () => void;
  socketConnected?: boolean;
  businessLogo?: string | null;
  widgetColor?: string;
}

const Header = ({ 
  agentName, 
  setOpen, 
  onReset,
  socketConnected = false,
  businessLogo = null,
  widgetColor = '#ff21b0'
}: HeaderProps) => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: 'en' | 'es') => {
    i18n.changeLanguage(lng);
  };

  // Show online if socket is connected, regardless of browser online status
  const connectionStatus = socketConnected ? 'online' : 'offline';
  const colors = getColorVariations(widgetColor);

  return (
    <div 
      className="w-full min-h-[64px] flex justify-between items-center px-4 sm:px-5 py-3"
      style={{
        background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientMiddle}, ${colors.gradientEnd})`,
        boxShadow: '0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center shadow-md ring-2 ring-white/40 overflow-hidden">
            {businessLogo ? (
              <>
                <img 
                  src={businessLogo} 
                  alt="Business" 
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }
                  }}
                />
                <div className="logo-fallback hidden absolute inset-0 items-center justify-center bg-gray-100 text-gray-500">
                  <PiRobot className="w-6 h-6" />
                </div>
              </>
            ) : (
              <div className="text-gray-500" style={{ color: colors.primary }}>
                <PiRobot className="w-6 h-6" />
              </div>
            )}
          </div>
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm",
            connectionStatus === 'online' ? 'bg-emerald-500' : 'bg-gray-400'
          )} title={connectionStatus === 'online' ? 'Online' : 'Connecting...'} aria-hidden />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-white font-semibold text-sm sm:text-base truncate" title={agentName}>
            {agentName}
          </span>
          <span className="text-white/85 text-xs font-medium flex items-center gap-1.5 mt-0.5">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full flex-shrink-0",
              connectionStatus === 'online' ? 'bg-emerald-300' : 'bg-white/50'
            )} />
            {connectionStatus === 'online' ? 'Online now' : 'Connecting...'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center bg-white/15 backdrop-blur-sm px-2 py-1.5 rounded-lg border border-white/20 gap-0.5">
          <button 
            type="button"
            onClick={() => changeLanguage('es')}
            className={cn(
              "cursor-pointer transition-all px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap",
              i18n.language === 'es' ? 'bg-white/25 text-white' : 'text-white/80 hover:text-white'
            )}
          >
            ES
          </button>
          <button 
            type="button"
            onClick={() => changeLanguage('en')}
            className={cn(
              "cursor-pointer transition-all px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap",
              i18n.language === 'en' ? 'bg-white/25 text-white' : 'text-white/80 hover:text-white'
            )}
          >
            EN
          </button>
        </div>
        <button 
          type="button"
          title={t('startNewConversation')} 
          className="text-white/90 hover:text-white hover:bg-white/15 transition-all p-2 rounded-lg flex-shrink-0" 
          onClick={onReset}
        >
          <FaSyncAlt className="w-4 h-4" />
        </button>
        <button 
          type="button"
          className="text-white/90 hover:text-white hover:bg-white/15 transition-all p-2 rounded-lg flex-shrink-0" 
          onClick={() => setOpen(false)}
          title="Minimize"
          aria-label="Minimize chat"
        >
          <FaRegWindowMinimize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Header;