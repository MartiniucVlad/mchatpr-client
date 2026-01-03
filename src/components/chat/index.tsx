import { useState, useEffect } from 'react';
import { Box, CssBaseline, IconButton} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import { useChatLogic } from './useChatLogic';
import { ChatSidebar } from './ChatSidebar.tsx';
import { ChatWindow } from './ChatWindow';
import { SemanticSearchModal } from './modals/SemanticSearchModal';
import { NewChatModal } from './modals/NewChatModal';
import { AnkiSidebar} from "../ankiNotes/AnkiSidebar.tsx";


const ChatsPage = () => {
  // 1. Load Logic
  const {
    conversations, activeConversationId, messages, currentUser,
    highlightedMessageId, messagesEndRef,
    friendsNoConv, allFriends,
    handleSelectConversation, handleSendMessage, handleJumpToMessage, handleLogout,
    fetchFriendsForNewChat, fetchFriendsForGroup, createGroup, startDM
  } = useChatLogic();

  // 2. Local UI State for Modals
  const [isSemanticOpen, setIsSemanticOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isAnkiOpen, setIsAnkiOpen] = useState(false);

  // 3. Derive current conversation
  const currentConv = conversations.find(c => c.id === activeConversationId);

  // 4. Modal Handlers (Bridge between UI and Data)
  const handleOpenNewChatUI = () => {
    fetchFriendsForNewChat();
    setIsNewChatOpen(true);
  };

  const handleCreateDM = async (friend: string) => {
    const success = await startDM(friend);
    if (success) setIsNewChatOpen(false);
  };

  const handleCreateGroup = async (name: string, members: string[]) => {
    const success = await createGroup(name, members);
    if (success) setIsNewChatOpen(false);
  };

  // Pre-fetch all friends if switching to group mode inside the modal
  // (Usually handled inside the modal, but if the modal asks for data, we have `allFriends` ready)
  useEffect(() => {
     if (isNewChatOpen) fetchFriendsForGroup();
  }, [isNewChatOpen]);

  return (
    <Box sx={{ display: 'flex', height: '100%', bgcolor: '#f0f2f5', overflow: 'hidden' }}>
      <CssBaseline />

      {/* Left Sidebar (Chats) */}
      <ChatSidebar
        conversations={conversations}
        activeId={activeConversationId}
        currentUser={currentUser}
        onSelect={handleSelectConversation}
        onNewChat={handleOpenNewChatUI}
        onLogout={handleLogout}
      />

      {/* Main Chat Area - Uses FlexGrow to fill space between sidebars */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>

        <ChatWindow
          activeId={activeConversationId}
          conversation={currentConv}
          messages={messages}
          currentUser={currentUser}
          highlightedMessageId={highlightedMessageId}
          messagesEndRef={messagesEndRef}
          onSendMessage={handleSendMessage}
          onOpenSemanticSearch={() => setIsSemanticOpen(true)}
        />

        {/* Floating Button to Toggle Anki Sidebar (if you don't have a place in Navbar) */}
        {!isAnkiOpen && (
             <IconButton
                onClick={() => setIsAnkiOpen(true)}
                sx={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    bgcolor: 'white',
                    boxShadow: 2,
                    '&:hover': { bgcolor: '#f5f5f5' }
                }}
            >
                <SchoolIcon color="primary" />
            </IconButton>
        )}
      </Box>

      {/* Right Sidebar (Anki) */}
      <AnkiSidebar
        open={isAnkiOpen}
        onClose={() => setIsAnkiOpen(false)}
        currentUser={currentUser || ""}
      />

      {/* Modals */}
      <SemanticSearchModal
        open={isSemanticOpen}
        onClose={() => setIsSemanticOpen(false)}
        activeConversationId={activeConversationId}
        onJumpToMessage={(t) => {
           setIsSemanticOpen(false);
           handleJumpToMessage(t);
        }}
      />

      <NewChatModal
        open={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        currentUser={currentUser}
        friendsNoConv={friendsNoConv}
        allFriends={allFriends}
        onStartDM={handleCreateDM}
        onCreateGroup={handleCreateGroup}
      />
    </Box>
  );
};

export default ChatsPage;