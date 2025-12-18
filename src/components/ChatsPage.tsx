// src/components/ChatsPage.tsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// --- Types ---
interface Message {
  from: string;
  content: string;
  timestamp: string;
  isMine: boolean;
}

// --- Icons (Inline SVGs for portability) ---
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
);
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);
const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);
const ChatBubbleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
);

// --- Helper: Generate Initials for Avatars ---
const getInitials = (name: string) => {
  return name.slice(0, 2).toUpperCase();
};

const ChatsPage = () => {
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const currentUser = localStorage.getItem('username');

  // UI STATE
  const [friends, setFriends] = useState<string[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  // REFS
  const socketRef = useRef<WebSocket | null>(null);
  const selectedFriendRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync for socket callback
  useEffect(() => {
    selectedFriendRef.current = selectedFriend;
  }, [selectedFriend]);

  // 1. Fetch friends
  useEffect(() => {
    if (!token) return;
    const fetchFriends = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/friends/list", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          setFriends(await response.json());
        }
      } catch (err) {
        console.error("Failed to fetch friends", err);
      }
    };
    fetchFriends();
  }, [token]);

  // 2. WebSocket connection
  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(
      `ws://127.0.0.1:8000/ws/chat?token=${encodeURIComponent(token)}`
    );

    socketRef.current = ws;

    ws.onopen = () => console.log("Connected to Chat Server");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Filter unrelated conversations
      if (data.from !== selectedFriendRef.current && data.from !== currentUser) {
        return;
      }

      setMessages((prev) => {
        // Prevent duplicate messages if server echoes our own message back 
        // immediately after we optimistically added it.
        // (Simple check based on timestamp/content, or allow duplicate if server architecture requires it)
        return [
          ...prev,
          {
            from: data.from,
            content: data.content,
            timestamp: data.timestamp,
            isMine: data.from === currentUser
          }
        ];
      });
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [token, currentUser]);

  // 3. Scroll to bottom automatically
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Send Message (with Optimistic UI Update)
  const handleSendMessage = () => {
    if (!inputMessage.trim() || !selectedFriend || !socketRef.current) return;

    const content = inputMessage.trim();

    // OPTIMISTIC UPDATE: Add message to UI immediately
    const newMessage: Message = {
        from: currentUser || 'Me',
        content: content,
        timestamp: new Date().toISOString(),
        isMine: true
    };
    setMessages(prev => [...prev, newMessage]);

    // Send to Server
    socketRef.current.send(
      JSON.stringify({
        to: selectedFriend,
        content: content
      })
    );

    setInputMessage("");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
  };

  const loadChatHistory = async (friend: string) => {
    if (!token) return;
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/chat/history/${friend}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) return;
      const data = await response.json();
      setMessages(
        data.map((msg: any) => ({
          from: msg.from,
          content: msg.content,
          timestamp: msg.timestamp,
          isMine: msg.from === currentUser
        }))
      );
    } catch (err) {
      console.error("Failed to load chat history", err);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* --- SIDEBAR --- */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        {/* Sidebar Header */}
        <div className="h-16 px-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                C
             </div>
             <h2 className="text-lg font-bold tracking-tight text-gray-900">Chats</h2>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogoutIcon />
          </button>
        </div>

        {/* Friend List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3 mt-2">
            Direct Messages
          </div>
          
          {friends.map(friend => (
            <div
              key={friend}
              onClick={() => {
                  if (selectedFriend !== friend) {
                    setSelectedFriend(friend);
                    loadChatHistory(friend);
                  }
              }}
              className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                selectedFriend === friend
                  ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200/50"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                  selectedFriend === friend ? "bg-indigo-100 border-indigo-200" : "bg-gray-200 border-white"
              }`}>
                {getInitials(friend)}
              </div>
              
              {/* Name */}
              <div className="flex-1">
                 <div className="font-semibold text-sm">{friend}</div>
                 <div className="text-xs opacity-60 truncate">Click to chat</div>
              </div>
              
              {/* Active Indicator */}
              {selectedFriend === friend && (
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
              )}
            </div>
          ))}
        </div>
        
        {/* Current User Profile Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center gap-3 bg-gray-50/50">
           <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs">
              {currentUser ? getInitials(currentUser) : 'ME'}
           </div>
           <div className="flex-1 overflow-hidden">
               <p className="text-sm font-medium text-gray-900 truncate">{currentUser}</p>
               <p className="text-xs text-green-600 flex items-center gap-1">
                 <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Online
               </p>
           </div>
        </div>
      </div>

      {/* --- CHAT AREA --- */}
      <div className="flex-1 flex flex-col bg-[#F3F4F6] relative">
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                   {getInitials(selectedFriend)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 leading-none">{selectedFriend}</h3>
                  <span className="text-xs text-green-500 font-medium">Active now</span>
                </div>
              </div>
              <div className="flex gap-4 text-gray-400">
                {/* Placeholder header icons */}
                <UserIcon />
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar flex flex-col">
              {messages.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 opacity-50">
                      <ChatBubbleIcon />
                      <p className="mt-2 text-sm">No messages yet. Say hello!</p>
                  </div>
              )}

              {messages.map((msg, idx) => {
                 // Check if previous message was from same sender to group visually
                 const isSequence = idx > 0 && messages[idx - 1].from === msg.from;
                 
                 return (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.isMine ? "items-end" : "items-start"} ${isSequence ? "mt-1" : "mt-4"}`}
                  >
                    <div
                      className={`px-5 py-2.5 max-w-[70%] break-words text-sm shadow-sm ${
                        msg.isMine
                          ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm"
                          : "bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-sm"
                      }`}
                    >
                      <p className="leading-relaxed">{msg.content}</p>
                    </div>
                    <span className={`text-[10px] mt-1 px-1 ${msg.isMine ? 'text-gray-400 mr-1' : 'text-gray-400 ml-1'}`}>
                       {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-5 bg-white border-t border-gray-200">
              <div className="relative flex items-center gap-2 max-w-4xl mx-auto">
                <input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 bg-gray-100 text-gray-900 placeholder-gray-500 border-0 rounded-full px-5 py-3.5 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm"
                  placeholder={`Message ${selectedFriend}...`}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  className={`p-3.5 rounded-full transition-all duration-200 shadow-md flex items-center justify-center ${
                      inputMessage.trim() 
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105" 
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <SendIcon />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                <ChatBubbleIcon />
            </div>
            <h3 className="text-xl font-bold text-gray-700">Welcome to Chat</h3>
            <p className="text-gray-500 mt-2">Select a friend from the sidebar to start messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatsPage;