  import { useState, useEffect, useRef } from 'react';
  import { useNavigate } from 'react-router-dom';
  import api, { logout } from '../../services/axiosClient';
  import type {Message, ConversationSummary} from './types';
  import {useAnki} from "../ankiNotes/AnkiContext.tsx";
  import {useWebSocket} from "../../services/WebSocketContext.tsx";


  export const useChatLogic = () => {
    const navigate = useNavigate();
    const currentUser = localStorage.getItem('username') || '';
    const token = localStorage.getItem('access_token');

    const { selectedDeckRef } = useAnki();
    const { sendMessage, subscribe} = useWebSocket();

    // --- DATA STATE ---
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
  
    // --- MODAL DATA STATE ---
    const [friendsNoConv, setFriendsNoConv] = useState<string[]>([]);
    const [allFriends, setAllFriends] = useState<string[]>([]);
  
    // --- UI REFS/STATE ---
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const activeConversationIdRef = useRef<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
  
    // Keep ref in sync for Websocket
    useEffect(() => {
      activeConversationIdRef.current = activeConversationId;
    }, [activeConversationId]);
  
    // 1. API HELPER
    const markConversationAsRead = async (conversationId: string) => {
      try {
        await api.post(`/chat/conversations/${conversationId}/read`);
      } catch (err) {
        console.error("Failed to mark read", err);
      }
    };
  
    const fetchConversations = async () => {
      try {
        const response = await api.get("chat/conversations/list");
        setConversations(response.data);
      } catch (err) {
        console.error("Failed to fetch conversations", err);
      }
    };

    useEffect(() => {
      if (token) fetchConversations();
    }, [token]);

  
    useEffect(() => {
  // Subscribe specifically to chat messages
  const unsubscribe = subscribe("chat_message", (data) => {

    setConversations((prevConv) => {
      const existingIndex = prevConv.findIndex(c => c.id === data.conversation_id);

      if (existingIndex > -1) {
        const updatedConv = {
          ...prevConv[existingIndex],
          // Ensure we handle potentially missing fields if backend structure varies
          last_message_preview: data.content.length <= 30 ? data.content : data.content.slice(0, 30) + "...",
          last_message_at: data.timestamp,
          unread_count: (data.conversation_id !== activeConversationIdRef.current) && data.from !== currentUser
            ? (prevConv[existingIndex].unread_count || 0) + 1
            : prevConv[existingIndex].unread_count || 0
        };
        const others = prevConv.filter(c => c.id !== data.conversation_id);
        return [updatedConv, ...others];
      } else {
        fetchConversations();
        return prevConv;
      }
    });

    if (data.conversation_id === activeConversationIdRef.current) {
      setMessages((prev) => [
        ...prev,
        {
          from: data.from,
          content: data.content,
          timestamp: data.timestamp,
          isMine: data.from === currentUser
        }
      ]);

      if (data.from !== currentUser) {
          markConversationAsRead(data.conversation_id);
      }
    }
  });

  // Cleanup: Unsubscribe when this hook unmounts
  return () => {
    unsubscribe();
  };
}, [subscribe, currentUser]); // Dependencies: subscribe is stable, currentUser might change
  
    // Scroll to bottom on new message
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
  
    // 3. ACTIONS
    const loadChatHistory = async (convId: string) => {
      try {
        const response = await api.get(`/chat/history/${convId}`);
        setMessages(response.data.map((msg: any) => ({
          from: msg.sender,
          content: msg.content,
          timestamp: msg.timestamp,
          isMine: msg.sender === currentUser
        })));
      } catch (err) {
        console.error("Failed to load history", err);
      }
    };
  
    const handleSelectConversation = async (conv: ConversationSummary) => {
      if (activeConversationId === conv.id) return;
      await markConversationAsRead(conv.id);
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
      setActiveConversationId(conv.id);
      setMessages([]);
      loadChatHistory(conv.id);
    };
  
    const handleSendMessage = (content: string) => {
      if (!content.trim() || !activeConversationId) return;

      const selectedDeck = selectedDeckRef.current; // Assuming you have this ref set up

      sendMessage({
        type: "chat_message", // <--- Critical: Tells backend Hub which handler to use
        conversation_id: activeConversationId,
        content: content.trim(),
        deck_name: selectedDeck || null // Map 'selectedDeck' to backend's 'deck_name'
      });
};

  const handleJumpToMessage = (timestamp: string) => {
    const normalizedSearchTs = timestamp.substring(0, 23);
    const elementId = `msg-${normalizedSearchTs}`;
    console.log(elementId);
    const element = document.getElementById(elementId);
    console.log(element);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(normalizedSearchTs);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    } else {
      alert("Message not found in loaded history.");
    }
  };

  // 4. CREATION ACTIONS (Data Fetching Only)
  const fetchFriendsForNewChat = async () => {
    try {
      const res = await api.get("/friends/no-conversation");
      setFriendsNoConv(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchFriendsForGroup = async () => {
    try {
      const res = await api.get("/friends/list");
      setAllFriends(res.data);
    } catch (e) { console.error(e); }
  };

  const createGroup = async (name: string, members: string[]) => {
    try {
      const participants = [...members, currentUser];
      const res = await api.post("chat/conversations/initiate", {
        participants, is_group: true, group_name: name
      });
      await fetchConversations();
      const newId = res.data.conversation_id;
      setActiveConversationId(newId);
      loadChatHistory(newId);
      return true; // Success
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const startDM = async (friendUsername: string) => {
    try {
      const res = await api.post("chat/conversations/initiate", {
        participants: [currentUser, friendUsername], is_group: false
      });
      await fetchConversations();
      setActiveConversationId(res.data.conversation_id);
      loadChatHistory(res.data.conversation_id);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  return {
    currentUser,
    conversations,
    activeConversationId,
    messages,
    highlightedMessageId,
    messagesEndRef,
    friendsNoConv,
    allFriends,
    handleSelectConversation,
    handleSendMessage,
    handleJumpToMessage,
    fetchFriendsForNewChat,
    fetchFriendsForGroup,
    createGroup,
    startDM,
    handleLogout: () => { logout(); navigate('/login'); }
  };
};