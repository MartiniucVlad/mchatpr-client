// src/services/ankiService.ts
import axios from 'axios';

const ANKI_URL = 'http://localhost:8765';

export const invoke = async (action: string, params: any = {}) => {
  try {
    const response = await axios.post(ANKI_URL, {
      action,
      version: 6,
      params,
    });

    const result = response.data;

    if (Object.keys(result).length !== 2) {
      throw new Error('response has an unexpected number of fields');
    }
    if (!Object.prototype.hasOwnProperty.call(result, 'error')) {
      throw new Error('response is missing required error field');
    }
    if (!Object.prototype.hasOwnProperty.call(result, 'result')) {
      throw new Error('response is missing required result field');
    }
    if (result.error) {
      throw new Error(result.error);
    }

    return result.result;
  } catch (error) {
    console.error(`AnkiConnect Error (${action}):`, error);
    return null;
  }
};

// 1. Get list of all deck names
export const getDeckNames = async () => {
  return await invoke('deckNames') || [];
};

// 2. Get Due + Rated cards for a specific deck
// We fetch IDs first, then details (notesInfo)
export const getActiveDeckNotes = async (deckName: string) => {
  // Query: Cards in this deck that are either Due OR Rated today (reviewed)
  const query = `("deck:${deckName}" (is:due OR rated:1))`;
  
  const noteIds = await invoke('findNotes', { query });
  
  if (!noteIds || noteIds.length === 0) return [];

  // Get content for these notes
  const notesInfo = await invoke('notesInfo', { notes: noteIds });
  return notesInfo;
};