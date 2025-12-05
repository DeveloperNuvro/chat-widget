// ChatInbox.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { io, Socket } from 'socket.io-client';
import { z } from 'zod';
import toast from 'react-hot-toast';

import ChatMessages, { Message } from './ChatMessages';
import DefaultResponseTemplate from './DefaultResponseTemplate';
import Header from './Header';
import InputBox from './InputBox';
import { useLocalStorage } from './useLocalStorage';
import { publicApi, baseURL } from '../api/axios';
import { getColorVariations } from '../utils/colorUtils';

// 🔧 FIX: Use the same base URL as the API instance
// This ensures socket.io connects to the same server as the REST API
const getApiBaseUrl = () => {
  // Try baseURL from axios config first
  if (baseURL) {
    console.log('[Chat Widget] Using baseURL from axios config:', baseURL);
    return baseURL;
  }
  // Try environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    console.log('[Chat Widget] Using VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
    return import.meta.env.VITE_API_BASE_URL;
  }
  // Fallback to localhost:7575 (matching widget.js)
  console.log('[Chat Widget] Using fallback URL: http://localhost:7575');
  return 'http://localhost:7575';
};

const API_BASE_URL = getApiBaseUrl();

interface ChatState {
  showChat: boolean;
  name: string;
  phone: string;
  email: string;
  messages: Message[];
  customerId: string | null;
  conversationId: string | null;
  conversationStatus: 'ai_only' | 'live' | 'ticket' | 'closed';
  currentAgentName: string | null;
}

type FormErrors = Partial<Record<'name' | 'phone' | 'email', string>>;


const ChatInbox = ({
  agentName: initialAgentName,
  setOpen,
  businessId,
  hideHeader = false,
  onSocketStatusChange,
  onAgentNameChange,
  onResetChatReady,
  businessLogo = null,
  widgetColor = '#ff21b0',
}: {
  agentName: string;
  businessId: string;
  setOpen: (isOpen: boolean) => void;
  hideHeader?: boolean;
  onSocketStatusChange?: (status: boolean) => void;
  onAgentNameChange?: (name: string) => void;
  onResetChatReady?: (resetFn: () => void) => void;
  businessLogo?: string | null;
  widgetColor?: string;
}) => {
  const { t } = useTranslation();
  const localStorageKey = `chat_state_${businessId}`;
  
  // Generate color variations from widgetColor
  const colors = getColorVariations(widgetColor);

  const getInitialState = (): ChatState => ({
    showChat: false,
    name: '',
    phone: '',
    email: '',
    messages: [],
    customerId: null,
    conversationId: null,
    conversationStatus: 'ai_only',
    currentAgentName: initialAgentName,
  });

  const [chatState, setChatState] = useLocalStorage<ChatState>(localStorageKey, getInitialState());
  const { showChat, name, phone, email, messages, customerId, conversationId, conversationStatus, currentAgentName } = chatState;

  const [input, setInput] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false); // This is ONLY for human agents
  const [socket, setSocket] = useState<Socket | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [defaultResponses, setDefaultResponses] = useState<{ question: string; answer: string }[]>([]);
  
  const [headerAgentName, setHeaderAgentName] = useState<string>(initialAgentName?.toString() ?? currentAgentName?.toString() ?? '');

  // Notify parent of initial agent name
  useEffect(() => {
    if (onAgentNameChange && headerAgentName) {
      onAgentNameChange(headerAgentName);
    }
  }, []); // Only on mount

  // Message polling fallback mechanism
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<Date | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const pollingIntervalRef = useRef<number | null>(null);
  const lastMessageTimestampRef = useRef<Date | null>(null);
  const socketConnectedRef = useRef(false);

  const customerIdRef = useRef(customerId);
  useEffect(() => { customerIdRef.current = customerId; }, [customerId]);
  
  // Sync refs with state
  useEffect(() => { lastMessageTimestampRef.current = lastMessageTimestamp; }, [lastMessageTimestamp]);
  useEffect(() => { socketConnectedRef.current = socketConnected; }, [socketConnected]);

  const formSchema = z.object({
    name: z.string().min(1, { message: t('error.nameRequired') }),
    phone: z.string().min(10, { message: t('error.invalidPhone') }),
    email: z.string().email({ message: t('error.invalidEmail') }),
  });

  const resetChat = useCallback(() => {
    localStorage.removeItem(localStorageKey);
    setChatState(getInitialState());
    setInput('');
    setDefaultResponses([]);
    setErrors({});
  }, [localStorageKey, setChatState]);

  // Expose resetChat to parent
  useEffect(() => {
    if (onResetChatReady) {
      onResetChatReady(resetChat);
    }
  }, [onResetChatReady, resetChat]);

  useEffect(() => {
    if (conversationStatus === 'closed') {
      const closeTimer = setTimeout(() => {
        setOpen(false);
        setTimeout(() => { resetChat(); }, 500); 
      }, 3000);
      return () => clearTimeout(closeTimer);
    }
  }, [conversationStatus, setOpen, resetChat]);

  // Initial message fetch when conversation starts
  useEffect(() => {
    if (customerId && conversationId && messages.length === 0) {
      publicApi.get(`/api/v1/customer/widget/messages/${customerId}`)
        .then(res => {
          if (res.data?.data?.data && Array.isArray(res.data.data.data)) {
            const formattedMessages: Message[] = res.data.data.data.map((msg: any) => ({
              text: msg.message,
              sender: msg.sender === 'customer' ? 'user' : (msg.sender === 'system' ? 'system' : 'bot'),
              type: 'text',
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            })).reverse();
            
            // Set last message timestamp for polling
            if (formattedMessages.length > 0) {
              const lastMsg = formattedMessages[formattedMessages.length - 1];
              if (lastMsg.timestamp) {
                setLastMessageTimestamp(lastMsg.timestamp);
              }
            }
            
            setChatState(prev => ({ ...prev, messages: formattedMessages, showChat: true }));
          }
        })
        .catch(() => resetChat());
    }
  }, [customerId, conversationId, messages.length, setChatState, resetChat]);

  // API polling fallback function to fetch new messages
  const fetchNewMessages = useCallback(async () => {
    if (!customerId) {
      return;
    }

    try {
      const timestampParam = lastMessageTimestampRef.current 
        ? `&since=${lastMessageTimestampRef.current.toISOString()}`
        : '';
      
      const response = await publicApi.get(
        `/api/v1/customer/widget/messages/${customerId}?limit=50${timestampParam}`
      );

      if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
        const newMessages: Message[] = response.data.data.data
          .map((msg: any) => ({
            text: msg.message,
            sender: msg.sender === 'customer' ? 'user' : (msg.sender === 'system' ? 'system' : 'bot'),
            type: 'text',
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            _id: msg._id, // Use message ID to prevent duplicates
          }))
          .filter((msg: any) => {
            // Filter out messages we already have
            return !messages.some((existingMsg: any) => {
              // Check by ID first
              if (existingMsg._id && msg._id && existingMsg._id === msg._id) {
                return true;
              }
              
              // Check by text and timestamp
              if (existingMsg.text === msg.text) {
                const existingTimestamp = existingMsg.timestamp instanceof Date 
                  ? existingMsg.timestamp 
                  : (typeof existingMsg.timestamp === 'string' ? new Date(existingMsg.timestamp) : null);
                const msgTimestamp = msg.timestamp instanceof Date 
                  ? msg.timestamp 
                  : (typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : null);
                
                if (existingTimestamp && msgTimestamp && 
                    !isNaN(existingTimestamp.getTime()) && !isNaN(msgTimestamp.getTime())) {
                  return existingTimestamp.getTime() === msgTimestamp.getTime();
                }
              }
              
              return false;
            });
          })
          .filter((msg: any) => {
            // Only include messages newer than lastMessageTimestamp
            if (!lastMessageTimestampRef.current || !msg.timestamp) return true;
            
            const msgTimestamp = msg.timestamp instanceof Date 
              ? msg.timestamp 
              : (typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : null);
            
            if (!msgTimestamp || isNaN(msgTimestamp.getTime())) return true;
            
            return msgTimestamp > lastMessageTimestampRef.current;
          });

        if (newMessages.length > 0) {
          // Update last message timestamp
          const latestTimestamp = newMessages.reduce((latest, msg) => {
            const msgTime = (msg as any).timestamp;
            return msgTime && (!latest || msgTime > latest) ? msgTime : latest;
          }, null as Date | null);

          if (latestTimestamp) {
            setLastMessageTimestamp(latestTimestamp);
          }

          // Add new messages to state
          setChatState(prev => {
            const existingIds = new Set(prev.messages.map((m: any) => m._id).filter(Boolean));
            const existingTexts = new Set(prev.messages.map((m: any) => m.text).filter(Boolean));
            
            // Filter out duplicates by ID or by text (for optimistic messages without IDs)
            const uniqueNewMessages = newMessages.filter((msg: any) => {
              // Skip if ID already exists
              if (msg._id && existingIds.has(msg._id)) return false;
              
              // Skip if text matches and it's a recent message (within last 5 seconds) - likely the same optimistic message
              if (msg.text && existingTexts.has(msg.text)) {
                const existingMsg = prev.messages.find((m: any) => m.text === msg.text);
                if (existingMsg && existingMsg.timestamp) {
                  const timeDiff = Math.abs(
                    (msg.timestamp instanceof Date ? msg.timestamp.getTime() : new Date(msg.timestamp).getTime()) -
                    (existingMsg.timestamp instanceof Date ? existingMsg.timestamp.getTime() : new Date(existingMsg.timestamp).getTime())
                  );
                  // If messages are within 5 seconds of each other with same text, consider it duplicate
                  if (timeDiff < 5000) return false;
                }
              }
              
              return true;
            });
            
            if (uniqueNewMessages.length === 0) return prev;
            
            // Update optimistic messages with real IDs if they match
            const updatedMessages = prev.messages.map((m: any) => {
              if (m._id && m._id.startsWith('temp-')) {
                // Find matching message by text and timestamp
                const matchingMsg = uniqueNewMessages.find((newMsg: any) => 
                  newMsg.text === m.text && 
                  Math.abs(
                    (newMsg.timestamp instanceof Date ? newMsg.timestamp.getTime() : new Date(newMsg.timestamp).getTime()) -
                    (m.timestamp instanceof Date ? m.timestamp.getTime() : new Date(m.timestamp).getTime())
                  ) < 5000
                );
                if (matchingMsg && matchingMsg._id) {
                  return { ...m, _id: matchingMsg._id };
                }
              }
              return m;
            });
            
            // Remove loader if we got a real message
            const messagesWithoutLoader = updatedMessages.filter(m => m.type !== 'loader');
            
            // Filter out messages that were updated (to avoid duplicates)
            const finalNewMessages = uniqueNewMessages.filter((newMsg: any) => {
              return !updatedMessages.some((m: any) => 
                m._id === newMsg._id || 
                (m.text === newMsg.text && m._id && m._id.startsWith('temp-') && Math.abs(
                  (newMsg.timestamp instanceof Date ? newMsg.timestamp.getTime() : new Date(newMsg.timestamp).getTime()) -
                  (m.timestamp instanceof Date ? m.timestamp.getTime() : new Date(m.timestamp).getTime())
                ) < 5000)
              );
            });
            
            return {
              ...prev,
              messages: [...messagesWithoutLoader, ...finalNewMessages],
            };
          });
        }
      }
    } catch (error) {
      console.error('[Chat Widget] Error fetching new messages via API:', error);
      // Don't throw - just log, we'll retry on next poll
    }
  }, [customerId, messages, setChatState]);

  // Start/stop polling based on socket connection status
  useEffect(() => {
    if (!customerId || !showChat) {
      // Clear polling if no customer or chat not shown
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Always poll as backup, but adjust frequency based on socket connection
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (!socketConnected) {
      // Socket is disconnected - poll aggressively every 3 seconds
      pollingIntervalRef.current = setInterval(() => {
        fetchNewMessages();
      }, 3000);
    } else {
      // Socket is connected - poll slowly every 10 seconds as backup
      pollingIntervalRef.current = setInterval(() => {
        fetchNewMessages();
      }, 10000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [customerId, showChat, socketConnected, fetchNewMessages]);

  // 🔧 FIX: Connect socket immediately when widget opens, not just when customerId exists
  useEffect(() => {
    console.log('[Chat Widget] ========== SOCKET INITIALIZATION ==========');
    console.log('[Chat Widget] API_BASE_URL:', API_BASE_URL);
    console.log('[Chat Widget] baseURL from axios:', baseURL);
    console.log('[Chat Widget] VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
    
    // 🔧 FIX: Use a ref to track if this is a real unmount or just Strict Mode remount
    let isMounted = true;
    let connectionTimeout: ReturnType<typeof setTimeout> | null = null;
    
    // 🔧 FIX: Track when socket was created to detect Strict Mode disconnects
    const socketCreatedAt = Date.now();
    const STRICT_MODE_WINDOW = 2000; // 2 seconds - if disconnect happens within this, likely Strict Mode
    
    const newSocket = io(API_BASE_URL, { 
      transports: ['websocket', 'polling'], // 🔧 FIX: Add polling as fallback
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000, // 🔧 FIX: Increase timeout
      autoConnect: true, // 🔧 FIX: Explicitly enable auto-connect
    });
    
    console.log('[Chat Widget] Socket instance created:', newSocket.id || 'no ID yet');
    console.log('[Chat Widget] Socket connected state:', newSocket.connected);
    
    setSocket(newSocket);
    
    // 🔧 FIX: Check if socket is already connected (can happen with fast connections)
    if (newSocket.connected) {
      console.log('[Chat Widget] ✅ Socket already connected immediately');
      if (isMounted) {
        setSocketConnected(true);
      }
      if (customerIdRef.current) {
        console.log('[Chat Widget] Joining customer room (immediate):', customerIdRef.current);
        newSocket.emit('joinCustomerRoom', customerIdRef.current);
      }
    } else {
      console.log('[Chat Widget] ⏳ Socket not connected yet, waiting for connect event...');
    }
    
    // Socket connection handlers
    newSocket.on('connect', () => {
      if (!isMounted) {
        console.log('[Chat Widget] ⚠️ Component unmounted, ignoring connect event');
        return;
      }
      console.log('[Chat Widget] ✅✅✅ Socket connected successfully! ID:', newSocket.id);
      console.log('[Chat Widget] Setting socketConnected to TRUE');
      setSocketConnected(true);
      // Join customer room if customerId is already available
      if (customerIdRef.current) {
        console.log('[Chat Widget] Joining customer room:', customerIdRef.current);
        newSocket.emit('joinCustomerRoom', customerIdRef.current);
      }
    });
    
    newSocket.on('disconnect', (reason) => {
      const timeSinceCreation = Date.now() - socketCreatedAt;
      console.log('[Chat Widget] ❌ Socket disconnected. Reason:', reason);
      console.log('[Chat Widget] Time since creation:', timeSinceCreation, 'ms');
      
      // 🔧 FIX: If disconnect happens very quickly after creation AND it's "io server disconnect",
      // it's likely Strict Mode cleanup - ignore it
      if (isMounted && reason === 'io server disconnect' && timeSinceCreation < STRICT_MODE_WINDOW) {
        console.log('[Chat Widget] ⚠️ Server disconnect during mount window - likely Strict Mode, ignoring');
        // Don't update state, let it reconnect
        return;
      }
      
      // Real disconnect - update state
      if (isMounted) {
        console.log('[Chat Widget] Setting socketConnected to FALSE (real disconnect)');
        setSocketConnected(false);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Chat Widget] ❌❌❌ Socket connection error:', error);
      console.error('[Chat Widget] Error message:', error.message);
      console.error('[Chat Widget] Error type:', (error as any).type);
      console.error('[Chat Widget] Connection URL:', API_BASE_URL);
      if (isMounted) {
        console.error('[Chat Widget] Setting socketConnected to FALSE');
        setSocketConnected(false);
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('[Chat Widget] 🔄 Socket reconnected after', attemptNumber, 'attempts');
      if (isMounted) {
        setSocketConnected(true);
        if (customerIdRef.current) {
          newSocket.emit('joinCustomerRoom', customerIdRef.current);
        }
      }
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('[Chat Widget] ❌ Socket reconnection error:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('[Chat Widget] ❌ Socket reconnection failed after all attempts');
      if (isMounted) {
        setSocketConnected(false);
      }
    });
    
    // 🔧 FIX: Delay cleanup to allow connection to establish (handles Strict Mode)
    // Only disconnect if component is actually unmounting (not just remounting)
    return () => { 
      const timeSinceCreation = Date.now() - socketCreatedAt;
      console.log('[Chat Widget] Cleanup function called - marking as unmounted');
      console.log('[Chat Widget] Time since socket creation:', timeSinceCreation, 'ms');
      
      isMounted = false;
      
      // Clear any pending timeouts
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      
      // 🔧 FIX: If cleanup happens very quickly after creation, it's likely Strict Mode
      // Don't disconnect - let the socket stay connected for the remount
      if (timeSinceCreation < STRICT_MODE_WINDOW) {
        console.log('[Chat Widget] ⚠️ Cleanup within Strict Mode window - NOT disconnecting socket');
        console.log('[Chat Widget] Socket will remain connected for remount');
        // Just remove event listeners to prevent memory leaks
        newSocket.removeAllListeners();
        return;
      }
      
      // Real unmount - disconnect the socket
      if (newSocket.connected) {
        console.log('[Chat Widget] Socket is connected, disconnecting (real unmount)...');
        newSocket.disconnect();
      } else {
        console.log('[Chat Widget] Socket not connected, skipping disconnect');
      }
    };
  }, []); // 🔧 FIX: Connect immediately on mount, not dependent on customerId

  // 🔧 FIX: Join customer room when customerId becomes available
  useEffect(() => {
    if (socket && socket.connected && customerId) {
      console.log('[Chat Widget] Joining customer room (customerId available):', customerId);
      socket.emit('joinCustomerRoom', customerId);
    } else {
      if (socket && !socket.connected) {
        console.log('[Chat Widget] ⚠️ Socket exists but not connected, cannot join room');
      }
      if (!customerId) {
        console.log('[Chat Widget] ⚠️ customerId not available yet');
      }
    }
  }, [socket, customerId]);
  
  // 🔧 FIX: Debug socketConnected state changes
  useEffect(() => {
    console.log('[Chat Widget] 🔄 socketConnected state changed to:', socketConnected);
    console.log('[Chat Widget] Socket instance:', socket ? (socket.connected ? 'connected' : 'disconnected') : 'null');
    // Notify parent of socket status change
    if (onSocketStatusChange) {
      onSocketStatusChange(socketConnected);
    }
  }, [socketConnected, socket, onSocketStatusChange]);


  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: any) => {
      if (payload.sender === 'customer') { return; }
      
      if (payload.sender === 'agent' && payload.agentName) {
        setHeaderAgentName(payload.agentName);
        // Notify parent of agent name change
        if (onAgentNameChange) {
          onAgentNameChange(payload.agentName);
        }
      }
      
      const senderType: Message['sender'] = payload.sender === 'system' ? 'system' : 'bot';
      // Get timestamp from payload (could be timestamp, createdAt, or current time)
      const messageTimestamp = payload.timestamp 
        ? new Date(payload.timestamp) 
        : (payload.createdAt ? new Date(payload.createdAt) : new Date());
      const newMessage: Message = { 
        text: payload.message, 
        sender: senderType, 
        type: 'text',
        timestamp: messageTimestamp,
        _id: payload._id || payload.id, // Store message ID to prevent duplicates
      };

      // Update last message timestamp
      setLastMessageTimestamp(messageTimestamp);

      setChatState(prev => {
        // Check if message already exists (prevent duplicates from API polling)
        const messageExists = prev.messages.some((m: any) => {
          // Check by ID first (most reliable)
          if (m._id && newMessage._id && m._id === newMessage._id) {
            return true;
          }
          
          // Check by text and timestamp
          if (m.text === newMessage.text) {
            const mTimestamp = m.timestamp instanceof Date 
              ? m.timestamp 
              : (typeof m.timestamp === 'string' ? new Date(m.timestamp) : null);
            const newTimestamp = messageTimestamp instanceof Date 
              ? messageTimestamp 
              : (typeof messageTimestamp === 'string' ? new Date(messageTimestamp) : null);
            
            if (mTimestamp && newTimestamp && !isNaN(mTimestamp.getTime()) && !isNaN(newTimestamp.getTime())) {
              return mTimestamp.getTime() === newTimestamp.getTime();
            }
          }
          
          return false;
        });

        if (messageExists) {
          return prev; // Don't add duplicate
        }

        // This correctly replaces the AI loader with the AI's response
        const messagesWithoutLoader = prev.messages.filter(m => m.type !== 'loader');
        return { ...prev, messages: [...messagesWithoutLoader, newMessage] };
      });
    };

    const handleConversationUpdate = (payload: { status: 'live' | 'closed' | 'ticket'; agentName?: string }) => {
      if(payload.status === 'live' && payload.agentName) {
        toast.success(`You are now connected with ${payload.agentName}`);
      }
      
      const newAgentName = payload.agentName || initialAgentName;
      setHeaderAgentName(newAgentName);
      // Notify parent of agent name change
      if (onAgentNameChange) {
        onAgentNameChange(newAgentName);
      }

      setChatState(prev => ({
        ...prev,
        // This correctly removes any lingering AI loader when a human takes over
        messages: prev.messages.filter(m => m.type !== 'loader'),
        conversationStatus: payload.status,
        currentAgentName: payload.agentName || prev.currentAgentName,
      }));
    };
    
    // This handler is ONLY for the HUMAN agent's typing indicator
    const handleAgentTyping = () => {
      if (conversationStatus === 'live') {
        setIsAgentTyping(true);
      }
    };
    
    // This handler is ONLY for the HUMAN agent's typing indicator
    const handleAgentStoppedTyping = () => {
      setIsAgentTyping(false);
    };

    const handleConversationClosed = (payload: { conversationId: string; closedBy: 'system' | 'agent' }) => {
      console.log(`Conversation closed by ${payload.closedBy}.`);
      setChatState(prev => ({ ...prev, conversationStatus: 'closed' }));
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('conversationUpdated', handleConversationUpdate);
    socket.on('agentTyping', handleAgentTyping);
    socket.on('agentStoppedTyping', handleAgentStoppedTyping);
    socket.on('conversationClosedBySystem', handleConversationClosed);
    socket.on('conversationClosedByAgent', handleConversationClosed);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('conversationUpdated', handleConversationUpdate);
      socket.off('agentTyping', handleAgentTyping);
      socket.off('agentStoppedTyping', handleAgentStoppedTyping);
      socket.off('conversationClosedBySystem', handleConversationClosed);
      socket.off('conversationClosedByAgent', handleConversationClosed);
    };
  }, [socket, setChatState, initialAgentName, conversationStatus]); // Important: conversationStatus is a dependency
  
  const startChatSession = async () => {
    const result = formSchema.safeParse({ name, phone, email });
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors as FormErrors);
      return;
    }
    
    // 🔧 FIX: Validate businessId is present
    if (!businessId || businessId.trim() === '') {
      toast.error('Business ID is missing. Please refresh the page.');
      console.error('[Chat Widget] businessId is missing:', businessId);
      return;
    }
    
    try {
      // 🔧 FIX: Only include customerId if it's a valid non-empty string
      const requestBody: any = {
        name, 
        email, 
        phone, 
        businessId: businessId.trim(),
      };
      
      if (customerId && customerId.trim() !== '') {
        requestBody.customerId = customerId.trim();
      }
      
      console.log('[Chat Widget] Creating chat session with:', { ...requestBody, email: requestBody.email }); // Log without sensitive data
      
      const response = await publicApi.post(`/api/v1/messages/create-chat-session`, requestBody);
      const { customerId: newCustomerId, conversationId: newConversationId } = response.data.data;
      setErrors({});
      setChatState(prev => ({ ...prev, customerId: newCustomerId, conversationId: newConversationId, showChat: true }));
    } catch (error: any) {
      console.error('[Chat Widget] Error creating chat session:', error);
      const errorMessage = error?.response?.data?.message || error?.message || "Could not start chat session.";
      toast.error(errorMessage);
      
      // 🔧 FIX: Show validation errors if available
      if (error?.response?.data?.data) {
        setErrors(error.response.data.data as FormErrors);
      }
    }
  };

  const sendMessage = async (messageToSend?: string) => {
    const text = (messageToSend || input).trim();
    if (!text || !businessId || !customerId) return;

    const messageTimestamp = new Date();
    // Create a temporary ID for the optimistic message to help with duplicate prevention
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const userMessage: Message = { 
      text, 
      sender: 'user', 
      type: 'text',
      timestamp: messageTimestamp,
      _id: tempId, // Temporary ID for duplicate prevention
    };
    let finalMessages: Message[] = [...messages, userMessage];
    
    // Update last message timestamp for user messages too
    setLastMessageTimestamp(messageTimestamp);
    
    // CRITICAL: Show the AI thinking loader ONLY when the conversation is in 'ai_only' mode.
    // When a human agent is connected (status is 'live' or 'ticket'), this block is skipped,
    // and no loader is displayed for user messages.
    if (conversationStatus === 'ai_only') {
      finalMessages.push({ text: '', sender: 'bot', type: 'loader' });
    }
      
    setChatState(prev => ({ ...prev, messages: finalMessages }));
    setInput('');

    try {
      const response = await publicApi.post(`/api/v1/messages/send`, {
        message: text,
        businessId,
        customerId,
        agentName: initialAgentName,
      });
      
      // If the response includes the message ID, update the optimistic message
      if (response.data?.data?._id) {
        setChatState(prev => ({
          ...prev,
          messages: prev.messages.map((m: any) => 
            m._id === tempId ? { ...m, _id: response.data.data._id } : m
          )
        }));
      }
    } catch (error) {
      toast.error('Failed to send message.');
      setChatState(prev => ({ 
        ...prev, 
        messages: prev.messages.filter(m => m.type !== 'loader' && m._id !== tempId) 
      }));
      setInput(text);
    }
  };
  
  const handleDefaultResponseClick = (question: string, answer: string) => {
    // Add question and answer directly to messages without sending to server
    const userMessage: Message = { text: question, sender: 'user', type: 'text' };
    const botMessage: Message = { text: answer, sender: 'bot', type: 'text' };
    setChatState(prev => ({ 
      ...prev, 
      messages: [...prev.messages, userMessage, botMessage] 
    }));
  };
  
  useEffect(() => {
    if (businessId && initialAgentName && showChat) {
      publicApi.get(`/api/v1/business/${businessId}/${initialAgentName}/default-responses`)
        .then(response => setDefaultResponses(response.data?.data?.defaultFAQResponses || []))
        .catch(err => console.error('Error fetching default responses:', err));
    }
  }, [showChat, businessId, initialAgentName]);

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
      {/* Fixed Header - Always at top (unless hidden) */}
      {!hideHeader && (
        <div className="flex-shrink-0">
          <Header 
            agentName={headerAgentName} 
            setOpen={setOpen} 
            onReset={resetChat}
            socketConnected={socketConnected}
          />
        </div>
      )}
      {/* Scrollable Content Area - Fixed Height */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {!showChat ? (
          <div className="flex flex-col justify-center items-center p-6 min-h-full bg-white">
            {/* Form Section */}
            <div className="w-full space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('namePlaceholder') || 'Your Name'}
                </label>
                <input 
                  className={`w-full h-[48px] px-4 border-2 outline-none rounded-xl text-sm transition-all bg-white ${
                    errors.name 
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                      : 'border-gray-200 focus:border-[#ff21b0] focus:ring-2 focus:ring-[#ff21b0]/20'
                  }`} 
                  type="text" 
                  placeholder={t('namePlaceholder') || 'Enter your name'} 
                  value={name} 
                  onChange={(e) => setChatState(prev => ({ ...prev, name: e.target.value }))}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1.5">{errors.name}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('phonePlaceholder') || 'Phone Number'}
                </label>
                <input 
                  className={`w-full h-[48px] px-4 border-2 outline-none rounded-xl text-sm transition-all bg-white ${
                    errors.phone 
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                      : 'border-gray-200 focus:border-[#ff21b0] focus:ring-2 focus:ring-[#ff21b0]/20'
                  }`} 
                  type="tel" 
                  placeholder={t('phonePlaceholder') || 'Enter your phone'} 
                  value={phone} 
                  onChange={(e) => setChatState(prev => ({ ...prev, phone: e.target.value }))}
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1.5">{errors.phone}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('emailPlaceholder') || 'Email Address'}
                </label>
                <input 
                  className={`w-full h-[48px] px-4 border-2 outline-none rounded-xl text-sm transition-all bg-white ${
                    errors.email 
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                      : 'border-gray-200 focus:border-[#ff21b0] focus:ring-2 focus:ring-[#ff21b0]/20'
                  }`} 
                  type="email" 
                  placeholder={t('emailPlaceholder') || 'Enter your email'} 
                  value={email} 
                  onChange={(e) => setChatState(prev => ({ ...prev, email: e.target.value }))}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email}</p>}
              </div>
              
              <button 
                onClick={startChatSession} 
                className="w-full h-[48px] text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl mt-6"
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
                {t('continueButton') || 'Continue'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col flex-1 min-h-0 relative bg-white">
            <div className="flex-1 overflow-y-auto min-h-0 bg-white">
              <ChatMessages messages={messages} isAgentTyping={isAgentTyping} agentName={headerAgentName} businessLogo={businessLogo} widgetColor={widgetColor} />
            </div>
            <div className="flex-shrink-0 bg-white border-t border-gray-100 relative z-20">
              {defaultResponses.length > 0 && (
                <DefaultResponseTemplate
                  defaultResponses={defaultResponses}
                  onSelect={handleDefaultResponseClick}
                />
              )}
              <InputBox
                input={input}
                setInput={setInput}
                sendMessage={() => sendMessage()}
                disabled={conversationStatus === 'closed'}
                widgetColor={widgetColor}
              />
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInbox;