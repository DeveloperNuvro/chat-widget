// App.tsx - Widget with 3 Tabs: Welcome, Chat/Inbox, Help/FAQ

import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ChatInbox from './component/ChatInbox';
import Header from './component/Header';
import { useLocalStorage } from './component/useLocalStorage';
import { FaHome, FaQuestionCircle } from 'react-icons/fa';
import { HiChatBubbleLeftRight } from 'react-icons/hi2';
import { publicApi, widgetApi } from './api/axios';
import { getColorVariations } from './utils/colorUtils';

type TabType = 'welcome' | 'chat' | 'help';

interface FAQ {
  question: string;
  answer: string;
}

const App: React.FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useLocalStorage('chat_widget_open', false);
  const [activeTab, setActiveTab] = useState<TabType>('welcome');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string>('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [headerAgentName, setHeaderAgentName] = useState<string>('');
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [widgetColor, setWidgetColor] = useState<string>('#ff21b0'); // Default pink color
  const resetChatRef = useRef<(() => void) | null>(null);

  const params = new URLSearchParams(window.location.search);
  const agentName = params.get('agentName') || 'AI Assistant';
  const businessId = params.get('businessId') || '';
  const apiKey = params.get('apiKey') || '';
  const domainUrl = params.get('domainUrl') || '';

  // Initialize header agent name
  useEffect(() => {
    setHeaderAgentName(agentName);
  }, [agentName]);

  useEffect(() => {
    const message = { type: 'resize-widget', isOpen: open };
    window.parent.postMessage(message, '*');
  }, [open]);

  // Set welcome message
  useEffect(() => {
    if (agentName) {
      setWelcomeMessage(t('welcome.message', { agentName }) || `Hello! I'm ${agentName}, your AI assistant. How can I help you today?`);
    }
  }, [agentName, t]);

  // Fetch business logo when widget loads
  useEffect(() => {
    if (apiKey && domainUrl && agentName) {
      fetchBusinessLogo();
    }
  }, [apiKey, domainUrl, agentName]);

  // Fetch FAQs when Help tab is active
  useEffect(() => {
    if (businessId && agentName && activeTab === 'help' && faqs.length === 0) {
      fetchFAQs();
    }
  }, [businessId, agentName, activeTab]);

  const fetchBusinessLogo = async () => {
    if (!apiKey || !domainUrl || !agentName) return;
    
    try {
      // Widget API doesn't need credentials - it's a public endpoint
      const response = await widgetApi.get(`/api/v1/widget/chat-widget`, {
        params: {
          apiKey,
          domainUrl,
          agentName,
        },
      });
      console.log('[Widget] Business logo response:', response.data?.data);
      if (response.data?.data?.businessLogo) {
        console.log('[Widget] Setting business logo:', response.data.data.businessLogo);
        setBusinessLogo(response.data.data.businessLogo);
      } else {
        console.log('[Widget] No business logo in response');
      }
      if (response.data?.data?.widgetColor) {
        console.log('[Widget] Setting widget color:', response.data.data.widgetColor);
        setWidgetColor(response.data.data.widgetColor);
      }
    } catch (error: any) {
      console.error('[Widget] Failed to fetch business logo:', error);
      // Silently fail - widget will use default icon
    }
  };

  const fetchFAQs = async () => {
    if (!businessId || !agentName) return;
    
    setLoadingFaqs(true);
    try {
      const response = await publicApi.get(`/api/v1/business/${businessId}/${encodeURIComponent(agentName)}/default-responses`);
      if (response.data?.data?.defaultFAQResponses) {
        setFaqs(response.data.data.defaultFAQResponses);
      }
    } catch (error: any) {
      console.error('Failed to fetch FAQs:', error);
      setFaqs([]);
    } finally {
      setLoadingFaqs(false);
    }
  };

  const colors = getColorVariations(widgetColor);

  // If the chat is closed, show the bubble
  if (!open) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div
          id="chat-bubble"
          onClick={() => setOpen(true)}
          style={{ backgroundColor: colors.primary }}
          className='h-[50px] w-[50px] rounded-full flex items-center justify-center text-white text-3xl cursor-pointer shadow-lg hover:scale-110 transition-transform'
        >
          💬
        </div>
      </div>
    );
  }

  // Reset chat function
  const handleResetChat = () => {
    if (resetChatRef.current) {
      resetChatRef.current();
    }
  };

  // If chat is open, show widget with tabs
  return (
    <div className="w-full h-full bg-white rounded-[20px] shadow-2xl flex flex-col overflow-hidden">
      {/* Universal Header */}
      <div className="flex-shrink-0">
        <Header 
          agentName={headerAgentName || agentName} 
          setOpen={setOpen} 
          onReset={handleResetChat}
          socketConnected={socketConnected}
          businessLogo={businessLogo}
          widgetColor={widgetColor}
        />
      </div>

      {/* Tab Navigation */}
      <div 
        className="px-4 pt-2 pb-2 flex-shrink-0"
        style={{
          background: `linear-gradient(to right, ${colors.gradientStart}, ${colors.gradientMiddle}, ${colors.gradientEnd})`
        }}
      >
        <div className="flex gap-2 border-b border-white/20">
            <button
              onClick={() => setActiveTab('welcome')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-t-lg transition ${
                activeTab === 'welcome'
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <FaHome className="w-4 h-4" />
                <span className="hidden sm:inline">{t('tabs.welcome')}</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-t-lg transition ${
                activeTab === 'chat'
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <HiChatBubbleLeftRight className="w-4 h-4" />
                <span className="hidden sm:inline">{t('tabs.chat')}</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('help')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-t-lg transition ${
                activeTab === 'help'
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <FaQuestionCircle className="w-4 h-4" />
                <span className="hidden sm:inline">{t('tabs.help')}</span>
              </div>
            </button>
        </div>
      </div>

      {/* Tab Content - Fixed Height Container */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        {activeTab === 'welcome' && (
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            <div className="text-center mb-6">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                style={{
                  background: `linear-gradient(to bottom right, ${colors.gradientStart}, ${colors.gradientEnd})`
                }}
              >
                <HiChatBubbleLeftRight className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {t('welcome.title')} 👋
              </h2>
              <p className="text-gray-600">
                {welcomeMessage}
              </p>
            </div>
            
            <div className="space-y-3">
              <div 
                className="p-4 rounded-lg border"
                style={{
                  background: `linear-gradient(to bottom right, ${colors.primary}10, ${colors.gradientEnd}10)`,
                  borderColor: `${colors.primary}33`
                }}
              >
                <h3 className="font-semibold mb-2" style={{ color: colors.primary }}>
                  {t('welcome.howCanIHelp')}
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• {t('welcome.features.answerQuestions')}</li>
                  <li>• {t('welcome.features.helpRequests')}</li>
                  <li>• {t('welcome.features.provideInfo')}</li>
                  <li>• {t('welcome.features.assistSupport')}</li>
                </ul>
              </div>
              
              <button
                onClick={() => setActiveTab('chat')}
                className="w-full text-white py-3 rounded-lg font-semibold transition shadow-lg"
                style={{
                  background: `linear-gradient(to right, ${colors.gradientStart}, ${colors.gradientEnd})`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `linear-gradient(to right, ${colors.dark}, ${colors.darker})`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `linear-gradient(to right, ${colors.gradientStart}, ${colors.gradientEnd})`;
                }}
              >
                {t('welcome.startChatting')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex-1 overflow-hidden bg-white">
            <ChatInbox 
              agentName={agentName} 
              businessId={businessId} 
              setOpen={setOpen}
              hideHeader={true}
              onSocketStatusChange={setSocketConnected}
              onAgentNameChange={setHeaderAgentName}
              onResetChatReady={(resetFn) => { resetChatRef.current = resetFn; }}
              businessLogo={businessLogo}
              widgetColor={widgetColor}
            />
          </div>
        )}

        {activeTab === 'help' && (
          <div className="flex-1 overflow-y-auto p-4 bg-white">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {t('help.title')}
            </h3>
            
            {loadingFaqs ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }}></div>
              </div>
            ) : faqs.length > 0 ? (
              <div className="space-y-3">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <h4 className="font-semibold text-gray-800 mb-2">
                      {faq.question}
                    </h4>
                    <p className="text-sm text-gray-600 whitespace-pre-line">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FaQuestionCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('help.noFaqs')}</p>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="mt-4 hover:underline"
                  style={{ color: colors.primary }}
                >
                  {t('help.startChatInstead')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;