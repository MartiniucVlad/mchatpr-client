// src/components/MainLayout.tsx
import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, IconButton, Tooltip, Box,
  Snackbar, Stack, Badge, Menu, MenuItem, ListItemText,
  Divider, Alert
} from '@mui/material';

import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PeopleIcon from '@mui/icons-material/People';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import api, { logout } from '../services/axiosClient';

interface FriendRequest {
  sender: string;
  timestamp: string;
}

const MainLayout = () => {
  const navigate = useNavigate();

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMenuOpen = Boolean(anchorEl);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/friends/requests/incoming');
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch requests');
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRequestAction = async (sender: string, action: 'accept' | 'reject') => {
    try {
      const res = await api.post(`/friends/respond/${sender}`, { action });
      setSuccessMessage(res.data.message);
      setRequests(prev => prev.filter(r => r.sender !== sender));
      if (requests.length === 1) setAnchorEl(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Action failed');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <AppBar position="static" sx={{ bgcolor: '#2b5278' }}>
        <Toolbar variant="dense">
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, fontWeight: 'bold', cursor: 'pointer' }}
            onClick={() => navigate('/chats')}
          >
            mchat-i
          </Typography>

          <Stack direction="row" spacing={1}>
            {/* Notifications */}
            <Tooltip title="Friend Requests">
              <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
                <Badge badgeContent={requests.length} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Manage Friends */}
            <Tooltip title="Manage Friends">
              <IconButton color="inherit" onClick={() => navigate('/friends')}>
                <PeopleIcon />
              </IconButton>
            </Tooltip>

            {/* Logout */}
            <IconButton color="inherit" onClick={() => { logout(); navigate('/login'); }}>
              <LogoutIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Friend Requests Menu */}
      <Menu
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { width: 320 } }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>
          Incoming Requests
        </Typography>
        <Divider />

        {requests.length === 0 ? (
          <MenuItem disabled>No pending requests</MenuItem>
        ) : (
          requests.map(req => (
            <MenuItem key={req.sender} sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <ListItemText
                primary={req.sender}
                secondary={new Date(req.timestamp).toLocaleString()}
              />
              <Stack direction="row" spacing={1}>
                <IconButton size="small" color="success"
                  onClick={() => handleRequestAction(req.sender, 'accept')}>
                  <CheckIcon />
                </IconButton>
                <IconButton size="small" color="error"
                  onClick={() => handleRequestAction(req.sender, 'reject')}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </MenuItem>
          ))
        )}
      </Menu>

      <Box component="main" sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Outlet />
      </Box>

      <Snackbar open={!!successMessage} autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}>
        <Alert severity="success" variant="filled">{successMessage}</Alert>
      </Snackbar>

      <Snackbar open={!!error} autoHideDuration={4000}
        onClose={() => setError(null)}>
        <Alert severity="error" variant="filled">{error}</Alert>
      </Snackbar>
    </Box>
  );
};

export default MainLayout;
