import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Stack,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../services/axiosClient";

const FriendsPage = () => {
  const [friends, setFriends] = useState<string[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch friends
  const loadFriends = async () => {
    const res = await api.get("/friends/list");
    setFriends(res.data);
  };

  useEffect(() => {
    loadFriends();
  }, []);

  // Send friend request
  const handleAddFriend = async () => {
    if (!username.trim()) return;

    setLoading(true);
    try {
      await api.post(`/friends/request/${username}`);
      setUsername("");
      alert("Friend request sent");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error");
    } finally {
      setLoading(false);
    }
  };

  // Unfriend
  const handleUnfriend = async (friend: string) => {
    if (!confirm(`Remove ${friend}?`)) return;

    await api.delete(`/friends/${friend}`);
    setFriends(prev => prev.filter(f => f !== friend));
  };

  return (
    <Box sx={{ p: 3, height: "100%", bgcolor: "#f4f6f8" }}>
      <Paper sx={{ maxWidth: 600, mx: "auto", p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Manage Friends
        </Typography>

        {/* Add Friend */}
        <Stack direction="row" spacing={2} mb={3}>
          <TextField
            fullWidth
            label="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={handleAddFriend}
            disabled={loading}
          >
            Add
          </Button>
        </Stack>

        {/* Friends List */}
        <List>
          {friends.length === 0 && (
            <Typography color="text.secondary">
              You have no friends yet.
            </Typography>
          )}

          {friends.map(friend => (
            <ListItem
              key={friend}
              secondaryAction={
                <IconButton
                  edge="end"
                  color="error"
                  onClick={() => handleUnfriend(friend)}
                >
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText primary={friend} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default FriendsPage;
