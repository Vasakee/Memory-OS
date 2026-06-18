export interface MemoryEntry {
  id: string;
  rootHash: string;
  title: string;
  timestamp: number;
  tags: string[];
  type: 'text' | 'file' | 'url';
  preview?: string;
  walletAddress: string;
}

const STORAGE_KEY = 'memory_os_index';

// Helper to check if window is available
const isBrowser = () => typeof window !== 'undefined';

/**
 * Retrieve all memory metadata entries.
 */
export const getAllMemories = (): MemoryEntry[] => {
  if (!isBrowser()) return [];
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    return rawData ? JSON.parse(rawData) : [];
  } catch (error) {
    console.error('Failed to parse memories from localStorage:', error);
    return [];
  }
};

/**
 * Get memories filtered by connected wallet address.
 */
export const getMemoriesByWallet = (walletAddress: string): MemoryEntry[] => {
  const all = getAllMemories();
  return all.filter((m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase());
};

/**
 * Add a new memory entry to the index.
 */
export const addMemoryEntry = (entry: MemoryEntry): void => {
  if (!isBrowser()) return;
  try {
    const all = getAllMemories();
    // Avoid duplicate IDs
    const filtered = all.filter((m) => m.id !== entry.id);
    filtered.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to save memory to localStorage:', error);
  }
};

/**
 * Delete a memory entry from the index by ID.
 */
export const deleteMemoryEntry = (id: string): void => {
  if (!isBrowser()) return;
  try {
    const all = getAllMemories();
    const filtered = all.filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete memory from localStorage:', error);
  }
};

/**
 * Search/filter memories for a wallet by query (title, tags).
 */
export const searchMemories = (walletAddress: string, query: string): MemoryEntry[] => {
  const userMemories = getMemoriesByWallet(walletAddress);
  if (!query.trim()) return userMemories;
  
  const searchLower = query.toLowerCase();
  return userMemories.filter(
    (m) =>
      m.title.toLowerCase().includes(searchLower) ||
      m.tags.some((tag) => tag.toLowerCase().includes(searchLower))
  );
};
