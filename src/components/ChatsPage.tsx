  // src/components/ChatsPage.tsx
  import { useEffect, useState, useRef } from 'react';
  import { useNavigate } from 'react-router-dom';
  import Linkify from 'linkify-react';
  import EmojiPicker, {type EmojiClickData } from 'emoji-picker-react';
  import api, {logout} from '../services/axiosClient.ts'; // Import your new client
  
  
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
    Divider,
    Stack,
    AppBar,
    Toolbar,
    Container,
    CssBaseline
  } from '@mui/material';
  
  // --- MUI Icons ---
  import SendIcon from '@mui/icons-material/Send';
  import LogoutIcon from '@mui/icons-material/Logout';
  import SearchIcon from '@mui/icons-material/Search';
  import AttachFileIcon from '@mui/icons-material/AttachFile';
  import MoreVertIcon from '@mui/icons-material/MoreVert';
  import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
  
  // --- Types ---
  interface Message {
    from: string;
    content: string;
    timestamp: string;
    isMine: boolean;
  }
  
  // --- Helper: Color Generator for Avatars (Telegram style) ---
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
  
  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();
  
  const ChatsPage = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');
    const currentUser = localStorage.getItem('username');
  
    // UI STATE
    const [friends, setFriends] = useState<string[]>([]);
    const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  
  
    // REFS
    const socketRef = useRef<WebSocket | null>(null);
    const selectedFriendRef = useRef<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
  
    // Sync ref
    useEffect(() => {
      selectedFriendRef.current = selectedFriend;
    }, [selectedFriend]);
  
    // 1. Fetch Friends
    useEffect(() => {
      if (!token) return;
      const fetchFriends = async () => {
        try {
          const response = await api.get("/friends/list");
            setFriends(await response.data);
        } catch (err) {
          console.error("Failed to fetch friends", err);
        }
      };
      fetchFriends();
    }, [token]);
  
    // 2. WebSocket
    useEffect(() => {
      if (!token) return;
      const ws = new WebSocket(`ws://127.0.0.1:8000/ws/chat?token=${encodeURIComponent(token)}`);
      socketRef.current = ws;
  
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.from !== selectedFriendRef.current && data.from !== currentUser) return;
  
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
  
    // 3. Auto-scroll
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
  
    // 4. Send Message
    const handleSendMessage = () => {
      if (!inputMessage.trim() || !selectedFriend || !socketRef.current) return;
      const content = inputMessage.trim();
  
      socketRef.current.send(JSON.stringify({ to: selectedFriend, content: content }));
      setInputMessage("");
    };
  
    const handleLogout = () => {
      logout();
    };
  
  
    const handleEmojiClick = (emojiData: EmojiClickData) => {
    setInputMessage(prev => prev + emojiData.emoji);
  };
  
    const loadChatHistory = async (friend: string) => {
      try {
        // 1. Use api.get (Base URL is already set in axiosClient.ts)
        // 2. No manual Authorization header needed (Interceptor handles it)
        const response = await api.get(`/chat/history/${friend}`);
  
        // 3. Data is directly in response.data
        const data = response.data;
  
        setMessages(data.map((msg: any) => ({
          from: msg.from,
          content: msg.content,
          timestamp: msg.timestamp,
          isMine: msg.from === currentUser
        })));
      } catch (err) {
        console.error("Failed to load chat history", err);
      }
    };
  
    return (
      <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f0f2f5' }}>
        <CssBaseline />
  
        {/* --- LEFT SIDEBAR (Contact List) --- */}
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
              <IconButton size="small"><MoreVertIcon /></IconButton>
              <Typography variant="h6" fontWeight="bold" color="text.primary">Friends</Typography>
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
  
          {/* Friends List */}
          <List sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
            {friends.map((friend) => (
              <ListItemButton
                key={friend}
                selected={selectedFriend === friend}
                onClick={() => {
                  if(selectedFriend !== friend) {
                      setSelectedFriend(friend);
                      loadChatHistory(friend);
                  }
                }}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': { bgcolor: '#3390ec1a', '&:hover': { bgcolor: '#3390ec2b' } }
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: stringToColor(friend), fontWeight: 'bold' }}>
                    {getInitials(friend)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography fontWeight={selectedFriend === friend ? 'bold' : 'medium'}>{friend}</Typography>}
                  secondary="Last seen recently"
                  secondaryTypographyProps={{ fontSize: 12, noWrap: true }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
  
        {/* --- RIGHT AREA (Chat) --- */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
  
          {selectedFriend ? (
            <>
              {/* Chat Header */}
              <AppBar position="static" color="inherit" elevation={1} sx={{ bgcolor: '#ffffff', px: 2, py: 1 }}>
                <Toolbar disableGutters sx={{ minHeight: '56px !important' }}>
                  <Avatar sx={{ bgcolor: stringToColor(selectedFriend), width: 38, height: 38, mr: 2 }}>
                    {getInitials(selectedFriend)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {selectedFriend}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Online
                    </Typography>
                  </Box>
                  <IconButton><SearchIcon /></IconButton>
                  <IconButton><MoreVertIcon /></IconButton>
                </Toolbar>
              </AppBar>
  
              {/* Messages Area */}
              {/* Background Pattern Hint: You can add a background image here like Telegram */}
              <Box sx={{
                  flex: 1,
                  p: 2,
                  overflowY: 'auto',
                  bgcolor: '#8caebf', // Similar generic chat background color, or use an image
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
                        bgcolor: msg.isMine ? '#effdde' : '#ffffff', // Telegram Sent vs Received colors
                        minWidth: 100
                      }}
                    >
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
                              {/* Optional: Add checks for read receipt here */}
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
      </Box>
    );
  };
  
  export default ChatsPage;