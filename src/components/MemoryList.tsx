'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from './providers/WalletProvider';
import { getMemoriesByWallet, deleteMemoryEntry, MemoryEntry } from '@/lib/memoryStore';
import { Search, Trash2, Calendar, FileText, UploadCloud, Link2, Lock, Inbox, Tag } from 'lucide-react';

interface MemoryListProps {
  refreshTrigger: number;
  onSelectMemory: (memory: MemoryEntry) => void;
  selectedMemoryId: string | null;
  onRefresh: () => void;
}

export const MemoryList: React.FC<MemoryListProps> = ({
  refreshTrigger,
  onSelectMemory,
  selectedMemoryId,
  onRefresh,
}) => {
  const { walletAddress, encryptionKey } = useWallet();
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch user memories from localStorage whenever wallet state or refreshTrigger changes
  useEffect(() => {
    if (walletAddress) {
      const userMemories = getMemoriesByWallet(walletAddress);
      setMemories(userMemories.sort((a, b) => b.timestamp - a.timestamp));
    } else {
      setMemories([]);
    }
  }, [walletAddress, refreshTrigger]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this memory? It will remove it from your local index index list.')) {
      deleteMemoryEntry(id);
      onRefresh();
    }
  };

  const getRelativeTime = (timestamp: number) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diff = timestamp - Date.now();
    const diffMins = Math.round(diff / (1000 * 60));
    const diffHours = Math.round(diff / (1000 * 60 * 60));
    const diffDays = Math.round(diff / (1000 * 60 * 60 * 24));

    if (Math.abs(diffMins) < 60) {
      return rtf.format(diffMins, 'minute');
    } else if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, 'hour');
    } else {
      return rtf.format(diffDays, 'day');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <FileText className="h-4 w-4 text-violet-400" />;
      case 'file':
        return <UploadCloud className="h-4 w-4 text-cyan-400" />;
      case 'url':
        return <Link2 className="h-4 w-4 text-emerald-400" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  // Filter memories list based on title and tags search
  const filteredMemories = memories.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 1. Unconnected / Locked UI State
  if (!walletAddress || !encryptionKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#070716]/40 border border-violet-500/10 rounded-2xl backdrop-blur-md">
        <div className="p-4 bg-violet-600/10 border border-violet-500/20 text-violet-400 rounded-full mb-4 animate-pulse">
          <Lock className="h-8 w-8" />
        </div>
        <h4 className="text-sm font-semibold text-white mb-2">Decentralized Memories Locked</h4>
        <p className="text-xs text-gray-400 leading-relaxed max-w-[220px]">
          Connect your Web3 wallet to derive your AES encryption key and load your private memories from 0G.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050511]/30 border border-violet-500/10 rounded-2xl overflow-hidden backdrop-blur-md">
      
      {/* Search Input Header */}
      <div className="p-4 border-b border-violet-500/10 flex flex-col gap-3">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories or tags..."
            className="w-full pl-9 pr-4 py-2 bg-[#08081f] border border-violet-500/10 hover:border-violet-500/25 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-gray-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Memories List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
        {filteredMemories.length > 0 ? (
          filteredMemories.map((memory) => {
            const isSelected = selectedMemoryId === memory.id;
            return (
              <div
                key={memory.id}
                onClick={() => onSelectMemory(memory)}
                className={`group relative flex flex-col gap-2 p-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border-violet-500 shadow-md shadow-violet-600/5'
                    : 'bg-[#08081a]/55 border-violet-500/10 hover:border-violet-500/30 hover:bg-[#08081e]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      isSelected ? 'bg-violet-600/30' : 'bg-violet-950/20'
                    }`}>
                      {getIcon(memory.type)}
                    </div>
                    <span className="text-xs font-semibold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                      {memory.title}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, memory.id)}
                    className="p-1 text-gray-500 hover:text-rose-400 rounded hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {memory.preview && (
                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                    {memory.preview}
                  </p>
                )}

                <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-violet-500/5 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{getRelativeTime(memory.timestamp)}</span>
                  </span>

                  {/* Tags render limit 2 */}
                  {memory.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3 opacity-60" />
                      <div className="flex gap-1 max-w-[80px] overflow-hidden truncate">
                        {memory.tags.slice(0, 2).map((t, idx) => (
                          <span key={idx} className="bg-violet-950/40 text-violet-300 px-1 py-0.5 rounded text-[8px]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox className="h-8 w-8 text-gray-600 mb-2" />
            <p className="text-xs text-gray-500">
              {searchQuery ? 'No matching memories found' : 'No memories saved yet'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
