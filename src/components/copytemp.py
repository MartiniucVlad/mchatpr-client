// src/components/ChatsPage.tsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Linkify from 'linkify-react';
import EmojiPicker, {type EmojiClickData } from 'emoji-picker-react';
import api, { logout } from '../services/axiosClient.ts';

// --- MUI Imports ---
import {
  Box,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  TextField,
  IconButton,
  InputAdornment,
  Stack,
  AppBar,
  Toolbar,
  CssBaseline,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  ListItemIcon,
  Tooltip
} from '@mui/material';

// --- MUI Icons ---
import SendIcon from '@mui/icons-material/Send';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ChatIcon from '@mui/icons-material/Chat'; // Icon for New Chat
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// --- Types ---
interface Message {
  from: string;
  content: string;
  timestamp: string;
  isMine: boolean;
}

interface ConversationSummary {
  id: string; // The MongoDB _id
  participants: string[];
  type: 'private' | 'group';
  name: string | null;
  created_at: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

// --- Helper: Color Generator for Avatars ---
const stringToColor = (string: string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
};

const getInitials = (name: string) => (name ? name.slice(0, 2).toUpperCase() : '??');

const ChatsPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');
  const currentUser = localStorage.getItem('username') || '';

  // UI STATE - MAIN
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // UI STATE - NEW CHAT / GROUP MODALS
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isGroupCreateOpen, setIsGroupCreateOpen] = useState(false);

  // Data for Modals
  const [friendsNoConv, setFriendsNoConv] = useState<string[]>([]); // For "New Chat" list
  const [allFriends, setAllFriends] = useState<string[]>([]); // For "New Group" selection

  // Group Creation State
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);


  // REFS
  const socketRef = useRef<WebSocket | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync ref
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);


  // ----------------------------------------------------------------
  // 1. DATA FETCHING (Sidebar List)
  // ----------------------------------------------------------------
  const fetchConversations = async () => {
    try {
        // Updated to fetch conversations instead of raw friends
        const response = await api.get("chat/conversations/list");
        setConversations(response.data);
    } catch (err) {
        console.error("Failed to fetch conversations", err);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchConversations();
  }, [token]);


  // ----------------------------------------------------------------
  // 2. WEBSOCKET LOGIC
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/chat?token=${encodeURIComponent(token)}`);
    socketRef.current = ws;

    // src/components/ChatsPage.tsx -> inside useEffect for WebSocket
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  // 1. Update the Sidebar (Reordering and Preview)
  setConversations((prevConv) => {
    // Find the conversation that received the message
    const existingIndex = prevConv.findIndex(c => c.id === data.conversation_id);

    if (existingIndex > -1) {
      const updatedConv = {
        ...prevConv[existingIndex],
        last_message: data.content,
        last_message_time: data.timestamp,
          unread_count: (data.conversation_id !== activeConversationIdRef.current) && data.from !== currentUser
          ? (prevConv[existingIndex].unread_count || 0) + 1
          : 0

      };

      // Remove it from current position and put at the start [0]
      const others = prevConv.filter(c => c.id !== data.conversation_id);
      return [updatedConv, ...others];
    }
    return prevConv;
  });

  // 2. Update the Chat Window (Existing logic)
  if (data.conversation_id !== activeConversationIdRef.current) return;

  setMessages((prev) => [
    ...prev,
    {
      from: data.from,
      content: data.content,
      timestamp: data.timestamp,
      isMine: data.from === currentUser
    }
  ]);
};

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [token, currentUser]);


  // ----------------------------------------------------------------
  // 3. AUTO SCROLL
  // ----------------------------------------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // ----------------------------------------------------------------
  // 4. ACTION HANDLERS
  // ----------------------------------------------------------------

  // Helper: Determine display name for a conversation
  const getConversationName = (conv: ConversationSummary) => {
    if (conv.type === 'group') return conv.name || 'Group Chat';
    // For private, find the participant that is NOT me
    const other = conv.participants.find(p => p !== currentUser);
    return other || 'Unknown';
  };

  const loadChatHistory = async (convId: string) => {
    try {
        const response = await api.get(`/chat/history/${convId}`);
        const data = response.data;
        setMessages(data.map((msg: any) => ({
            from: msg.sender,
            content: msg.content,
            timestamp: msg.timestamp,
            isMine: msg.sender === currentUser
        })));
    } catch (err) {
        console.error("Failed to load chat history", err);
    }
  };

  const handleSelectConversation = (conv: ConversationSummary) => {
      if(activeConversationId === conv.id) return;

      setConversations(prev => prev.map(c =>
        c.id === conv.id ? { ...c, unread_count: 0 } : c
    ));
      setActiveConversationId(conv.id);
      setMessages([]); // Clear previous
      loadChatHistory(conv.id);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !activeConversationId || !socketRef.current) return;
    const content = inputMessage.trim();

    // Send via WebSocket
    socketRef.current.send(JSON.stringify({
        conversation_id: activeConversationId,
        content: content
    }));

    setInputMessage("");
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setInputMessage(prev => prev + emojiData.emoji);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ----------------------------------------------------------------
  // 5. NEW CHAT & GROUP LOGIC
  // ----------------------------------------------------------------

  // Triggered when clicking "New Chat" icon
  const handleOpenNewChat = async () => {
      try {
          // Fetch friends without conversations
          const resNoConv = await api.get("/friends/no-conversation");
          setFriendsNoConv(resNoConv.data);
          setIsNewChatOpen(true);
      } catch (e) {
          console.error("Failed to fetch new chat list", e);
      }
  };

  // Triggered when clicking "New Group" inside the New Chat dialog
  const handleOpenGroupCreate = async () => {
      try {
          // Fetch ALL friends for selection
          const resAll = await api.get("/friends/list");
          setAllFriends(resAll.data);
          setIsGroupCreateOpen(true);
          // Don't close the previous dialog yet, or replace it?
          // Let's replace it for cleaner UI
          setIsNewChatOpen(false);
      } catch (e) {
          console.error("Failed to fetch friends for group", e);
      }
  };

  const handleCreateGroup = async () => {
      if (!groupName || selectedGroupMembers.length === 0) return;

      try {
          // Add current user to list or backend handles it?
          // Usually backend adds creator, but let's send participants list including us to be safe,
          // or just the friends. Based on your previous snippet, we just send participants list.
          const participants = [...selectedGroupMembers, currentUser];

          const res = await api.post("chat/conversations/initiate", {
              participants: participants,
              is_group: true,
              group_name: groupName
          });

          // 1. Refresh sidebar
          await fetchConversations();
          // 2. Open the new chat
          const newId = res.data.conversation_id;
          // Find the new object to set active (or just set ID and fetch history)
          setActiveConversationId(newId);
          setMessages([]);

          // 3. Close modals
          setIsGroupCreateOpen(false);
          setGroupName('');
          setSelectedGroupMembers([]);
      } catch (e) {
          console.error("Failed to create group", e);
      }
  };

  const handleStartDM = async (friendUsername: string) => {
      try {
          const res = await api.post("chat/conversations/initiate", {
              participants: [currentUser, friendUsername],
              is_group: false
          });

          await fetchConversations();
          setActiveConversationId(res.data.conversation_id);
          setMessages([]);
          loadChatHistory(res.data.conversation_id);

          setIsNewChatOpen(false);
      } catch (e) {
          console.error("Failed to start DM", e);
      }
  };

  const toggleGroupMember = (friend: string) => {
      if (selectedGroupMembers.includes(friend)) {
          setSelectedGroupMembers(prev => prev.filter(f => f !== friend));
      } else {
          setSelectedGroupMembers(prev => [...prev, friend]);
      }
  };


  // ----------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------

  // Find active conversation object for Header details
  const currentConvDetails = conversations.find(c => c.id === activeConversationId);
  const activeName = currentConvDetails ? getConversationName(currentConvDetails) : '';

  return (
    <Box sx={{ display: 'flex', height: '100%', bgcolor: '#f0f2f5' }}>
      <CssBaseline />

      {/* --- LEFT SIDEBAR (Conversation List) --- */}
      <Paper
        elevation={3}
        sx={{
          width: 320,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #e0e0e0',
          zIndex: 2
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, bgcolor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            {/* NEW CHAT BUTTON */}
            <Tooltip title="New Chat">
                <IconButton onClick={handleOpenNewChat} color="primary" sx={{ bgcolor: '#e3f2fd' }}>
                    <ChatIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Typography variant="h6" fontWeight="bold" color="text.primary">Chats</Typography>
          </Stack>
          <IconButton onClick={handleLogout} color="error" size="small">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Search Bar */}
        <Box sx={{ px: 2, pb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search"
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" fontSize="small" />
                </InputAdornment>
              ),
              sx: { borderRadius: 4, bgcolor: '#f1f1f1', '& fieldset': { border: 'none' } }
            }}
          />
        </Box>

        {/* Conversations List */}
        <List sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
{conversations.map((conv) => {
  const displayName = getConversationName(conv);
  const isGroup = conv.type === 'group';

  return (
    <ListItemButton
      key={conv.id}
      selected={activeConversationId === conv.id}
      onClick={() => handleSelectConversation(conv)}
      sx={{
        borderRadius: 2,
        mb: 0.5,
        '&.Mui-selected': { bgcolor: '#3390ec1a', '&:hover': { bgcolor: '#3390ec2b' } }
      }}
    >
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: stringToColor(displayName), fontWeight: 'bold' }}>
          {isGroup ? <GroupAddIcon fontSize="small"/> : getInitials(displayName)}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography fontWeight={activeConversationId === conv.id ? 'bold' : 'medium'} noWrap>
      {displayName}
    </Typography>

    <Stack alignItems="flex-end" spacing={0.5}>
      {conv.last_message_time && (
        <Typography variant="caption" sx={{ color: (conv.unread_count ?? 0) > 0 ? '#3390ec' : 'text.secondary' }}>
          {new Date(conv.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Typography>
      )}

      {/* UNREAD BADGE */}
      {(conv.unread_count ?? 0) > 0 && (
        <Box sx={{
          bgcolor: '#3390ec',
          color: 'white',
          borderRadius: '50%',
          minWidth: 20,
          height: 20,
          px: 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 'bold'
        }}>
          {conv.unread_count}
        </Box>
      )}
    </Stack>
  </Box>
}
        secondary={
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            sx={{ fontSize: 13, display: 'block' }}
          >
            {conv.last_message || (isGroup ? `${conv.participants.length} members` : "No messages yet")}
          </Typography>
        }
      />
    </ListItemButton>
  );
})}
        </List>
      </Paper>

      {/* --- RIGHT AREA (Chat) --- */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {activeConversationId && currentConvDetails ? (
            <>
            {/* Chat Header */}
            <AppBar position="static" color="inherit" elevation={1} sx={{ bgcolor: '#ffffff', px: 2, py: 1 }}>
              <Toolbar disableGutters sx={{ minHeight: '56px !important' }}>
                <Avatar sx={{ bgcolor: stringToColor(activeName), width: 38, height: 38, mr: 2 }}>
                  {currentConvDetails.type === 'group' ? <GroupAddIcon fontSize='small'/> : getInitials(activeName)}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {activeName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {currentConvDetails.type === 'group' ? 'Group Chat' : 'Online'}
                  </Typography>
                </Box>
                <IconButton><SearchIcon /></IconButton>
                <IconButton><MoreVertIcon /></IconButton>
              </Toolbar>
            </AppBar>

            {/* Messages Area */}
            <Box sx={{
                flex: 1,
                p: 2,
                overflowY: 'auto',
                bgcolor: '#8caebf',
                backgroundImage: 'url("https://web.telegram.org/img/bg_0.png")',
                backgroundSize: 'cover',
                display: 'flex',
                flexDirection: 'column'
            }}>
              {messages.map((msg, index) => (
                <Box
                  key={index}
                  sx={{
                    alignSelf: msg.isMine ? 'flex-end' : 'flex-start',
                    maxWidth: '70%',
                    mb: 1,
                    position: 'relative',
                  }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      p: 1.5,
                      pl: 2,
                      pr: 2,
                      borderRadius: 3,
                      borderBottomRightRadius: msg.isMine ? 0 : 3,
                      borderBottomLeftRadius: msg.isMine ? 3 : 0,
                      bgcolor: msg.isMine ? '#effdde' : '#ffffff',
                      minWidth: 100
                    }}
                  >
                     {/* Show sender name in group chats if not mine */}
                    {currentConvDetails.type === 'group' && !msg.isMine && (
                         <Typography variant="caption" sx={{ color: stringToColor(msg.from), fontWeight: 'bold' }}>
                            {msg.from}
                         </Typography>
                    )}

                    <Typography variant="body1" sx={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                       <Linkify
                    options={{
                      target: '_blank',
                      rel: 'noopener noreferrer',
                      className: 'chat-link'}}>
                      {msg.content}
                    </Linkify>
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: msg.isMine ? '#5dbb5e' : 'text.secondary', fontSize: '0.7rem' }}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                    </Box>
                  </Paper>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Box>

            {showEmojiPicker && (
              <Box sx={{ position: 'absolute', bottom: 80, right: 20, zIndex: 10 }}>
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  autoFocusSearch={false}
                  theme="light"
                />
              </Box>
            )}

            {/* Input Area */}
            <Box sx={{ p: 2, bgcolor: '#ffffff' }}>
              <Stack direction="row" spacing={1} alignItems="flex-end">
                <IconButton sx={{ mb: 0.5 }}><AttachFileIcon /></IconButton>

                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Write a message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                      }
                  }}
                  variant="standard"
                  InputProps={{ disableUnderline: true }}
                  sx={{
                    bgcolor: '#f4f4f5',
                    borderRadius: 4,
                    px: 2,
                    py: 1.5
                  }}
                />

                <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    sx={{ mb: 0.5, bgcolor: '#3390ec', color: 'white', '&:hover': { bgcolor: '#297bcc'} }}
                >
                    <SendIcon />
                </IconButton>

                <IconButton sx={{ mb: 0.5 }} color="primary"
                onClick={() => setShowEmojiPicker(prev => !prev)}>
                        <InsertEmoticonIcon />
                </IconButton>
              </Stack>
            </Box>
          </>
        ) : (
          /* Empty State */
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: '#0e1621' }}>
             <Typography variant="h6" sx={{ color: '#ffffff', bgcolor: '#2b5278', px: 3, py: 1, borderRadius: 5 }}>
                Select a chat to start messaging
             </Typography>
          </Box>
        )}
      </Box>

      {/* ---------------------------------------------------------------- */}
      {/* DIALOG 1: NEW CHAT LIST (Group Option + Friends without chat) */}
      {/* ---------------------------------------------------------------- */}
      <Dialog open={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New Chat</DialogTitle>
        <DialogContent>
            <List>
                {/* 1. New Group Button */}
                <ListItemButton onClick={handleOpenGroupCreate} sx={{ mb: 1 }}>
                    <ListItemIcon>
                        <GroupAddIcon color="primary"/>
                    </ListItemIcon>
                    <ListItemText primary="New Group" primaryTypographyProps={{ color: 'primary', fontWeight: 'bold' }} />
                </ListItemButton>

                <Typography variant="caption" color="text.secondary" sx={{ ml: 2, mt: 2 }}>
                    Friends to chat
                </Typography>

                {/* 2. Friends List (No Conversation yet) */}
                {friendsNoConv.length === 0 ? (
                     <Typography variant="body2" color="text.secondary" sx={{ p: 2, fontStyle: 'italic' }}>
                        No new friends to start a chat with.
                     </Typography>
                ) : (
                    friendsNoConv.map(friend => (
                        <ListItemButton key={friend} onClick={() => handleStartDM(friend)}>
                            <ListItemAvatar>
                                <Avatar sx={{ bgcolor: stringToColor(friend) }}>{getInitials(friend)}</Avatar>
                            </ListItemAvatar>
                            <ListItemText primary={friend} />
                        </ListItemButton>
                    ))
                )}
            </List>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setIsNewChatOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* ---------------------------------------------------------------- */}
      {/* DIALOG 2: CREATE GROUP (Name Input + Friend Selector) */}
      {/* ---------------------------------------------------------------- */}
      <Dialog open={isGroupCreateOpen} onClose={() => setIsGroupCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
            <Stack direction="row" alignItems="center">
                <IconButton edge="start" onClick={() => { setIsGroupCreateOpen(false); setIsNewChatOpen(true); }} sx={{ mr: 1 }}>
                    <ArrowBackIcon />
                </IconButton>
                New Group
            </Stack>
        </DialogTitle>
        <DialogContent dividers>
            <Box sx={{ mb: 3, mt: 1 }}>
                <TextField
                    fullWidth
                    label="Group Name"
                    variant="outlined"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                />
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>Select Members:</Typography>
            <List dense sx={{ height: 200, overflowY: 'auto', border: '1px solid #eee', borderRadius: 1 }}>
                {allFriends.map((friend) => {
                    const labelId = `checkbox-list-label-${friend}`;
                    return (
                        <ListItemButton key={friend} onClick={() => toggleGroupMember(friend)}>
                            <ListItemIcon>
                                <Checkbox
                                    edge="start"
                                    checked={selectedGroupMembers.indexOf(friend) !== -1}
                                    tabIndex={-1}
                                    inputProps={{ 'aria-labelledby': labelId }}
                                />
                            </ListItemIcon>
                            <ListItemAvatar>
                                <Avatar sx={{ width: 30, height: 30, bgcolor: stringToColor(friend) }}>
                                    {getInitials(friend)}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText id={labelId} primary={friend} />
                        </ListItemButton>
                    );
                })}
            </List>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setIsGroupCreateOpen(false)}>Cancel</Button>
            <Button
                onClick={handleCreateGroup}
                variant="contained"
                disabled={!groupName.trim() || selectedGroupMembers.length === 0}
            >
                Create
            </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default ChatsPage;