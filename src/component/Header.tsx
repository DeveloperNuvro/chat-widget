import { PiRobot } from "react-icons/pi";
import { FaRegWindowMinimize, FaSyncAlt } from "react-icons/fa";
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
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
  socketConnected = true
}: HeaderProps) => {
  const { t, i18n } = useTranslation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const changeLanguage = (lng: 'en' | 'es') => {
    i18n.changeLanguage(lng);
  };

  const connectionStatus = isOnline && socketConnected ? 'online' : 'offline';

  return (
    <div className="w-full h-[60px] flex justify-between items-center rounded-t-[16px] p-4 shadow-[0px_2px_4px_0px_#8C52FF40] bg-gradient-to-r from-[#ff21b0] to-[#c24d99]">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-[40px] h-[40px] bg-white rounded-full mr-2 flex items-center justify-center shadow-md">
            <div className="text-[20px] text-[#ff21b0]">
              <PiRobot />
            </div>
          </div>
          {/* Connection status indicator */}
          <div className={cn(
            "absolute bottom-0 right-2 w-3 h-3 rounded-full border-2 border-white",
            connectionStatus === 'online' ? 'bg-green-400' : 'bg-gray-400'
          )} title={connectionStatus === 'online' ? 'Online' : 'Offline'} />
        </div>
        <div className="flex flex-col">
          <div className="text-white font-semibold tracking-normal text-sm">
            {agentName}
          </div>
          <div className="text-white/80 text-xs font-normal">
            {connectionStatus === 'online' ? 'Online' : 'Connecting...'}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* <-- MODIFIED: Language change Button --> */}
        <div className="flex items-center bg-white px-2 py-1 rounded-md text-sm font-bold text-[#ff21b0] space-x-2">
          <button 
            onClick={() => changeLanguage('es')}
            className={`cursor-pointer ${i18n.language === 'es' ? 'opacity-100' : 'opacity-50'}`}
          >
            ES
          </button>
          <div className="border-r border-gray-300 h-4"></div>
          <button 
            onClick={() => changeLanguage('en')}
            className={`cursor-pointer ${i18n.language === 'en' ? 'opacity-100' : 'opacity-50'}`}
          >
            EN
          </button>
        </div>
      
        <button 
          title={t('startNewConversation')} 
          className="text-white cursor-pointer hover:opacity-80 transition-opacity p-1.5 rounded-full hover:bg-white/20" 
          onClick={onReset}
        >
          <FaSyncAlt />
        </button>

        <button 
          className="text-white pb-2 cursor-pointer hover:opacity-80 transition-opacity p-1.5 rounded-full hover:bg-white/20" 
          onClick={() => setOpen(false)}
          title="Minimize"
        >
          <FaRegWindowMinimize />
        </button>
      </div>
    </div>
  );
};

export default Header;