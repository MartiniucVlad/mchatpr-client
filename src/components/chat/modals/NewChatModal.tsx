import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItemButton, ListItemIcon, ListItemText,
  ListItemAvatar, Avatar, Typography, Button,
  Stack, IconButton, TextField, Checkbox, Box
} from '@mui/material';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { stringToColor, getInitials } from '../utils';

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: string;
  friendsNoConv: string[]; // For DMs
  allFriends: string[];    // For Groups
  onStartDM: (friend: string) => void;
  onCreateGroup: (name: string, members: string[]) => void;
}

export const NewChatModal = ({
  open, onClose, friendsNoConv, allFriends, onStartDM, onCreateGroup
}: NewChatModalProps) => {

  // UI State: 'main' (DM list) or 'group' (Create Group Form)
  const [view, setView] = useState<'main' | 'group'>('main');

  // Group Form State
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Reset state when closing
  const handleClose = () => {
    setView('main');
    setGroupName('');
    setSelectedMembers([]);
    onClose();
  };

  const toggleGroupMember = (friend: string) => {
    if (selectedMembers.includes(friend)) {
      setSelectedMembers(prev => prev.filter(f => f !== friend));
    } else {
      setSelectedMembers(prev => [...prev, friend]);
    }
  };

  const handleGroupSubmit = () => {
    if (groupName && selectedMembers.length > 0) {
      onCreateGroup(groupName, selectedMembers);
      handleClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth={view === 'group' ? 'sm' : 'xs'}>

      {/* --- VIEW 1: MAIN (Select Friend or Group) --- */}
      {view === 'main' && (
        <>
          <DialogTitle>New Chat</DialogTitle>
          <DialogContent>
            <List>
              {/* Option to create group */}
              <ListItemButton onClick={() => setView('group')} sx={{ mb: 1 }}>
                <ListItemIcon><GroupAddIcon color="primary" /></ListItemIcon>
                <ListItemText
                  primary="New Group"
                  primaryTypographyProps={{ color: 'primary', fontWeight: 'bold' }}
                />
              </ListItemButton>

              <Typography variant="caption" color="text.secondary" sx={{ ml: 2, mt: 2, display: 'block' }}>
                Start Direct Message
              </Typography>

              {friendsNoConv.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, fontStyle: 'italic' }}>
                  No new friends available.
                </Typography>
              ) : (
                friendsNoConv.map(friend => (
                  <ListItemButton key={friend} onClick={() => onStartDM(friend)}>
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
            <Button onClick={handleClose}>Cancel</Button>
          </DialogActions>
        </>
      )}

      {/* --- VIEW 2: CREATE GROUP --- */}
      {view === 'group' && (
        <>
          <DialogTitle>
            <Stack direction="row" alignItems="center">
              <IconButton edge="start" onClick={() => setView('main')} sx={{ mr: 1 }}>
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
              {allFriends.map((friend) => (
                <ListItemButton key={friend} onClick={() => toggleGroupMember(friend)}>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={selectedMembers.includes(friend)}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemAvatar>
                    <Avatar sx={{ width: 30, height: 30, bgcolor: stringToColor(friend) }}>
                      {getInitials(friend)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={friend} />
                </ListItemButton>
              ))}
              {allFriends.length === 0 && (
                 <Typography sx={{ p: 2, fontStyle: 'italic', color: 'gray' }}>No friends found.</Typography>
              )}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setView('main')}>Back</Button>
            <Button
              onClick={handleGroupSubmit}
              variant="contained"
              disabled={!groupName.trim() || selectedMembers.length === 0}
            >
              Create
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};