import { PiRobot } from "react-icons/pi";
import { FaRegWindowMinimize, FaSyncAlt } from "react-icons/fa";
import { useTranslation } from 'react-i18next'; // <-- NEW: Import hook

const Header = ({ 
  agentName, 
  setOpen, 
  onReset 
}: { 
  agentName: string; 
  setOpen: (isOpen: boolean) => void; 
  onReset: () => void;
}) => {
  // <-- NEW: Get translation function (t) and i18n instance -->
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: 'en' | 'es') => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="w-full h-[60px] flex justify-between items-center rounded-t-[16px] p-4 shadow-[0px_2px_4px_0px_#8C52FF40] bg-gradient-to-r from-[#ff21b0] to-[#c24d99]">
      <div className="flex items-center">
        <div className="w-[40px] h-[40px] bg-white rounded-full mr-2 flex items-center justify-center">
          <div className="text-[20px] text-[#ff21b0]">
            <PiRobot />
          </div>
        </div>
        <div className="text-white font-semibold tracking-normal text-center">
          {agentName}
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
          className="text-white cursor-pointer" 
          onClick={onReset}
        >
          <FaSyncAlt />
        </button>

        <button className="text-white pb-2 cursor-pointer" onClick={() => setOpen(false)}>
          <FaRegWindowMinimize />
        </button>
      </div>
    </div>
  );
};

export default Header;