import { PiRobot } from "react-icons/pi";
import { FaRegWindowMinimize, FaSyncAlt } from "react-icons/fa";
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

interface HeaderProps {
  agentName: string;
  setOpen: (isOpen: boolean) => void;
  onReset: () => void;
  socketConnected?: boolean;
}

const Header = ({ 
  agentName, 
  setOpen, 
  onReset,
  socketConnected = false // 🔧 FIX: Default to false, not true
}: HeaderProps) => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: 'en' | 'es') => {
    i18n.changeLanguage(lng);
  };

  // Show online if socket is connected, regardless of browser online status
  const connectionStatus = socketConnected ? 'online' : 'offline';

  return (
    <div className="w-full min-h-[70px] flex justify-between items-center rounded-t-[20px] px-4 sm:px-5 py-3 sm:py-4 shadow-lg bg-gradient-to-r from-[#ff21b0] via-[#e91e9d] to-[#c24d99]">
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <div className="w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] bg-white rounded-full flex items-center justify-center shadow-lg ring-2 ring-white/30">
            <div className="text-[20px] sm:text-[24px] text-[#ff21b0]">
              <PiRobot />
            </div>
          </div>
          {/* Connection status indicator */}
          <div className={cn(
            "absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-[3px] border-white shadow-sm",
            connectionStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          )} title={connectionStatus === 'online' ? 'Online' : 'Connecting...'} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="text-white font-bold tracking-tight text-sm sm:text-base truncate" title={agentName}>
            {agentName}
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full flex-shrink-0",
              connectionStatus === 'online' ? 'bg-green-300' : 'bg-gray-300'
            )} />
            <div className="text-white/90 text-[10px] sm:text-xs font-medium whitespace-nowrap">
              {connectionStatus === 'online' ? 'Online now' : 'Connecting...'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
        {/* Language change Button */}
        <div className="flex items-center bg-white/20 backdrop-blur-sm px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-white space-x-1.5 sm:space-x-2 border border-white/30">
          <button 
            onClick={() => changeLanguage('es')}
            className={cn(
              "cursor-pointer transition-all px-1 sm:px-1.5 py-0.5 rounded whitespace-nowrap",
              i18n.language === 'es' ? 'bg-white/30 text-white' : 'text-white/70 hover:text-white'
            )}
          >
            ES
          </button>
          <div className="border-r border-white/30 h-3 sm:h-4"></div>
          <button 
            onClick={() => changeLanguage('en')}
            className={cn(
              "cursor-pointer transition-all px-1 sm:px-1.5 py-0.5 rounded whitespace-nowrap",
              i18n.language === 'en' ? 'bg-white/30 text-white' : 'text-white/70 hover:text-white'
            )}
          >
            EN
          </button>
        </div>
      
        <button 
          title={t('startNewConversation')} 
          className="text-white cursor-pointer hover:bg-white/20 transition-all p-1.5 sm:p-2 rounded-lg flex-shrink-0" 
          onClick={onReset}
        >
          <FaSyncAlt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button 
          className="text-white cursor-pointer hover:bg-white/20 transition-all p-1.5 sm:p-2 rounded-lg flex-shrink-0" 
          onClick={() => setOpen(false)}
          title="Minimize"
        >
          <FaRegWindowMinimize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
};

export default Header;