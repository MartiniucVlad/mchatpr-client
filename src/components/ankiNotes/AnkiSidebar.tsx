import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  IconButton,
  Divider,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getDeckNames, getActiveDeckNotes } from './AnkiService'; // Ensure path is correct
import api from '../../services/axiosClient'; // Your axios instance
import { useAnki} from "./AnkiContext.tsx";

const DRAWER_WIDTH = 320;

// Define the shape of a Note based on your Python Pydantic model
interface AnkiNote {
  id: string;
  front: string;
  back: string;
  mod: number;
  is_reviewed: boolean; // The server now sends this!
}

interface AnkiSidebarProps {
  open: boolean;
  onClose: () => void;
  currentUser: string;
  // NEW: Pass the latest Anki-related WS message here
  lastAnkiEvent?: any;
}

export const AnkiSidebar: React.FC<AnkiSidebarProps> = ({
  open,
  onClose,
  currentUser,
  lastAnkiEvent
}) => {
  const { selectedDeck, setSelectedDeck } = useAnki();
  const [decks, setDecks] = useState<string[]>([]);
  const [notes, setNotes] = useState<AnkiNote[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Load Deck List on Mount
  useEffect(() => {
    if (open) {
      loadDecks();
    }
  }, [open]);

  // 2. Listen for Real-Time WebSocket Updates
  useEffect(() => {
    if (!lastAnkiEvent) return;

    // Case A: Full Sync (e.g. user refreshed page, server sent stored state)
    if (lastAnkiEvent.type === 'anki_sync_state') {
        if (lastAnkiEvent.deck_name === selectedDeck) {
            setNotes(lastAnkiEvent.notes);
        }
    }

    // Case B: Single Word Update (User used a word correctly in chat)
    // Assuming backend sends: { type: "learning_update", note_id: "123", ... }
    if (lastAnkiEvent.type === 'learning_update') {
         setNotes(prevNotes =>
            prevNotes.map(note =>
                // Mark specific note as reviewed if IDs match
                // (or match by content if your backend sends content)
                note.id === lastAnkiEvent.note_id
                    ? { ...note, is_reviewed: true }
                    : note
            )
         );
    }
  }, [lastAnkiEvent, selectedDeck]);


  const loadDecks = async () => {
    const deckList = await getDeckNames();
    setDecks(deckList);
  };

  // 3. Handle Deck Selection & Sync with Backend
  const handleDeckChange = async (event: any) => {
    const deckName = event.target.value;
    setSelectedDeck(deckName);

    if (!deckName) {
      setNotes([]);
      return;
    }

    setLoading(true);

    try {
      // A. Get Due Cards from Local Anki
      const ankiRawNotes = await getActiveDeckNotes(deckName);
      console.log(ankiRawNotes)

      // B. Format for Backend (Matches AnkiDeckNotes model)
      const formattedNotes = ankiRawNotes.map((n: any) => ({
        id: String(n.noteId),
        // Simple regex to clean HTML from Anki cards
        front: n.fields['Front']?.value.replace(/<[^>]*>?/gm, '') || "Unknown",
        back: n.fields['Back']?.value.replace(/<[^>]*>?/gm, '') || "",
        mod: n.mod,
        is_reviewed: false // Default, server will correct this if session exists
      }));

      // C. Send to Backend to Persist/Merge
      // The response contains the definitive state (including ticks!)
      const response = await api.post('/anki/active-deck-persistence', {
        deck_name: deckName,
        notes: formattedNotes
      });

      // D. Update UI with the Server's "Truth"
      setNotes(response.data.notes);

    } catch (error) {
      console.error("Error syncing deck:", error);
      // Optional: Show error snackbar here
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      variant="persistent"
      sx={{
        width: open ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          top: 64,
          height: 'calc(100% - 64px)'
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Anki Learning</Typography>
        <Box>
            <IconButton
                onClick={() => handleDeckChange({ target: { value: selectedDeck } })}
                size="small"
                disabled={loading || !selectedDeck}
            >
                <RefreshIcon />
            </IconButton>
            <IconButton onClick={onClose}>
                <CloseIcon />
            </IconButton>
        </Box>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Active Deck</InputLabel>
          <Select
            value={selectedDeck}
            label="Active Deck"
            onChange={handleDeckChange}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {decks.map((deck) => (
              <MenuItem key={deck} value={deck}>
                {deck}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && selectedDeck && (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {notes.length === 0 ? (
            <Typography variant="body2" sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
              No cards due for this deck.
            </Typography>
          ) : (
            notes.map((note) => (
                <ListItem key={note.id} disablePadding>
                    <ListItemIcon>
                    <Checkbox
                        edge="start"
                        checked={note.is_reviewed}
                        disableRipple
                        inputProps={{ 'aria-labelledby': `checkbox-${note.id}` }}
                        // Read-only: User ticks boxes by chatting, not clicking
                        sx={{ cursor: 'default' }}
                    />
                    </ListItemIcon>
                    <ListItemText
                        id={`checkbox-${note.id}`}
                        primary={note.front}
                        secondary={note.is_reviewed ? "Done!" : null}
                        sx={{
                            textDecoration: note.is_reviewed ? 'line-through' : 'none',
                            color: note.is_reviewed ? 'text.secondary' : 'text.primary'
                        }}
                    />
                </ListItem>
            ))
          )}
        </List>
      )}

      {!selectedDeck && !loading && (
          <Box sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}>
              <Typography variant="body2">Select a deck to begin.</Typography>
          </Box>
      )}
    </Drawer>
  );
};