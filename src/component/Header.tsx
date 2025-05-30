
import { PiRobot } from "react-icons/pi";
import { FaRegWindowMinimize } from "react-icons/fa";

const Header = ({ agentName, setOpen, isHuman, setIsHuman }: { agentName: string; setOpen: any; isHuman:boolean; setIsHuman:any }) => {
 

  return (
    <div className="w-full h-[60px] flex justify-between items-center rounded-t-[16px] p-4 shadow-[0px_2px_4px_0px_#8C52FF40] bg-gradient-to-r from-[#5D17E9] z-50 to-[#8C52FF]">
      <div className="flex items-center">
        <div className="w-[40px] h-[40px] bg-white rounded-full mr-2 flex items-center justify-center">
          <div className="text-[20px] text-[#8C52FF]">
            <PiRobot />
          </div>
        </div>
        <div className="text-white font-semibold tracking-normal text-center">
          {agentName}
        </div>

        {/* Human Toggle Button */}
        <button
          onClick={() => setIsHuman((prev: boolean) => !prev)}
          className={`ml-4 cursor-pointer px-4 py-1 rounded-full text-sm font-medium transition-all ${
            isHuman ? "bg-white text-[#8C52FF]" : "bg-gray-300 text-gray-700"
          }`}
        >
          Human {isHuman ? "On" : "Off"}
        </button>
      </div>

      <button className="text-white pb-2 cursor-pointer" onClick={() => setOpen(false)}>
        <FaRegWindowMinimize />
      </button>
    </div>
  );
};

export default Header;
