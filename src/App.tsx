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
  
  // Debug: Log activeTab changes
  useEffect(() => {
    console.log('[App] Active tab changed to:', activeTab);
    console.log('[App] Tab content should be visible for:', activeTab);
  }, [activeTab]);
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
  /** agentId from URL (optional) or from widget config – used so this agent's workflow runs on new chat */
  const [agentId, setAgentId] = useState<string | null>(() => params.get('agentId') || null);

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
      if (response.data?.data?.agentId) {
        setAgentId(response.data.data.agentId);
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

  // If the chat is closed, show the floating bubble
  if (!open) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <button
          type="button"
          id="chat-bubble"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="h-14 w-14 rounded-full flex items-center justify-center text-white cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent"
          style={{
            background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
            boxShadow: `0 4px 20px ${colors.primary}40, 0 8px 32px rgba(0,0,0,0.12)`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `0 6px 24px ${colors.primary}50, 0 12px 40px rgba(0,0,0,0.15)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `0 4px 20px ${colors.primary}40, 0 8px 32px rgba(0,0,0,0.12)`;
          }}
        >
          <HiChatBubbleLeftRight className="w-7 h-7" />
        </button>
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
    <div 
      className="w-full h-full bg-white flex flex-col overflow-hidden"
      style={{ 
        maxHeight: '100vh', 
        height: '100vh', 
        borderRadius: 'var(--chat-radius-xl, 1.5rem)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)',
      }}
    >
      {/* Universal Header - Fixed for all tabs */}
      <div className="flex-shrink-0 z-50 bg-white border-b border-gray-100/80" style={{ position: 'sticky', top: 0 }}>
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
        className="px-3 pt-2 pb-2 flex-shrink-0"
        style={{
          background: `linear-gradient(to right, ${colors.gradientStart}, ${colors.gradientMiddle}, ${colors.gradientEnd})`,
        }}
      >
        <div className="flex gap-1 p-1 rounded-xl bg-white/10 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setActiveTab('welcome')}
              className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'welcome'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-white/90 hover:text-white hover:bg-white/15'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaHome className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{t('tabs.welcome')}</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'chat'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-white/90 hover:text-white hover:bg-white/15'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <HiChatBubbleLeftRight className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{t('tabs.chat')}</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('help')}
              className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'help'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-white/90 hover:text-white hover:bg-white/15'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaQuestionCircle className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{t('tabs.help')}</span>
              </div>
            </button>
        </div>
      </div>

      {/* Tab Content - Fixed Height Container */}
      <div className="flex-1 relative bg-white" style={{ minHeight: 0, overflow: 'hidden', flex: '1 1 auto' }}>
        {/* Welcome Tab */}
        {activeTab === 'welcome' && (
          <div className="w-full h-full overflow-y-auto chat-scroll p-6 bg-gradient-to-b from-gray-50/60 to-white" style={{ zIndex: 10 }}>
            <div className="max-w-sm mx-auto">
              <div className="text-center mb-8">
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg ring-4 ring-white"
                  style={{
                    background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
                    boxShadow: `0 8px 24px ${colors.primary}30`,
                  }}
                >
                  <HiChatBubbleLeftRight className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {t('welcome.title')} 👋
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {welcomeMessage}
                </p>
              </div>
              
              <div className="space-y-4">
                <div 
                  className="p-5 rounded-2xl border bg-white/80 backdrop-blur-sm"
                  style={{
                    borderColor: `${colors.primary}20`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm" style={{ color: colors.primary }}>
                    {t('welcome.howCanIHelp')}
                  </h3>
                  <ul className="space-y-2.5 text-sm text-gray-600">
                    <li className="flex items-start gap-2"><span className="text-gray-400 mt-0.5">•</span> {t('welcome.features.answerQuestions')}</li>
                    <li className="flex items-start gap-2"><span className="text-gray-400 mt-0.5">•</span> {t('welcome.features.helpRequests')}</li>
                    <li className="flex items-start gap-2"><span className="text-gray-400 mt-0.5">•</span> {t('welcome.features.provideInfo')}</li>
                  </ul>
                </div>
                
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className="w-full text-white py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.99]"
                  style={{
                    background: `linear-gradient(to right, ${colors.gradientStart}, ${colors.gradientEnd})`,
                    boxShadow: `0 4px 14px ${colors.primary}40`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `linear-gradient(to right, ${colors.dark}, ${colors.darker})`;
                    e.currentTarget.style.boxShadow = `0 6px 20px ${colors.primary}50`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `linear-gradient(to right, ${colors.gradientStart}, ${colors.gradientEnd})`;
                    e.currentTarget.style.boxShadow = `0 4px 14px ${colors.primary}40`;
                  }}
                >
                  {t('welcome.startChatting')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="w-full h-full overflow-hidden bg-white" style={{ zIndex: 10 }}>
          <ChatInbox 
            agentName={agentName} 
            businessId={businessId}
            agentId={agentId}
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

        {/* Help Tab */}
        {activeTab === 'help' && (
          <div className="w-full h-full overflow-y-auto chat-scroll p-5 bg-gradient-to-b from-gray-50/60 to-white" style={{ zIndex: 10, minHeight: '100%' }}>
            <div className="max-w-sm mx-auto">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                {t('help.title')}
              </h3>
              
              {loadingFaqs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-transparent" style={{ borderTopColor: colors.primary }} />
                </div>
              ) : faqs.length > 0 ? (
                <div className="space-y-3">
                  {faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <h4 className="font-medium text-gray-900 mb-2 text-sm">
                        {faq.question}
                      </h4>
                      <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <FaQuestionCircle className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{t('help.noFaqs')}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className="text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                    style={{ color: colors.primary, background: `${colors.primary}15` }}
                  >
                    {t('help.startChatInstead')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer - Powered by */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/80 px-4 py-2.5">
        <div className="flex items-center justify-center gap-1">
          <span className="text-xs text-gray-500">{t('footer.poweredBy')}</span>
          <a
            href="https://nuvro.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold hover:opacity-80 transition-opacity"
            style={{ color: colors.primary }}
          >
            Nuvro.ai
          </a>
        </div>
      </div>
    </div>
  );
};

export default App;