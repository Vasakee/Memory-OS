'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from './providers/WalletProvider';
import { getMemoriesByWallet } from '@/lib/memoryStore';
import { decryptData } from '@/lib/encryption';
import { Send, Sparkles, Loader2, Key, HardDrive, CornerDownLeft, Brain, User, AlertCircle } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citedRootHashes?: string[];
}

export const AskMemory: React.FC = () => {
  const { walletAddress, encryptionKey } = useWallet();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  if (!walletAddress || !encryptionKey) {
    return null; // Don't show Q&A if wallet is disconnected
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userQuestion = query;
    setQuery('');
    setMessages((prev) => [...prev, { role: 'user', content: userQuestion }]);
    setIsLoading(true);
    
    try {
      // 1. Gather all local metadata entries
      setStatusText('Retrieving memory list...');
      const localEntries = getMemoriesByWallet(walletAddress);
      console.log('[RAG] Found', localEntries.length, 'local memory entries for wallet', walletAddress);
      console.log('[RAG] Entries:', localEntries.map(e => ({ id: e.id, title: e.title, rootHash: e.rootHash })));
      
      if (localEntries.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "You don't have any memories saved yet. Please add a note, file, or link first so I can search them!",
          },
        ]);
        setIsLoading(false);
        return;
      }

      // 2. Fetch and decrypt memory contexts locally
      setStatusText(`Downloading and decrypting ${localEntries.length} memories...`);
      const decryptedContexts: Array<{ title: string; content: string; timestamp: string; tags: string[] }> = [];
      const successfulRootHashes: string[] = [];

      await Promise.all(
        localEntries.map(async (entry) => {
          try {
            console.log(`[RAG] Downloading memory "${entry.title}" rootHash=${entry.rootHash}`);
            const res = await fetch('/api/download', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rootHash: entry.rootHash }),
            });

            if (!res.ok) {
              const errBody = await res.text();
              console.error(`[RAG] Download FAILED for "${entry.title}": status=${res.status}`, errBody);
              return;
            }

            const downloadResult = await res.json();
            const { encryptedData } = downloadResult;
            if (!encryptedData) {
              console.error(`[RAG] Download returned empty encryptedData for "${entry.title}"`, downloadResult);
              return;
            }
            console.log(`[RAG] Downloaded "${entry.title}" — encrypted payload length: ${encryptedData.length}`);

            const decryptedPlaintext = await decryptData(encryptedData, encryptionKey);
            console.log(`[RAG] Decrypted "${entry.title}" — plaintext length: ${decryptedPlaintext.length}`);
            console.log(`[RAG] Decrypted content preview:`, decryptedPlaintext.substring(0, 200));
            const parsed = JSON.parse(decryptedPlaintext);

            let contentString = '';
            if (parsed.type === 'text') {
              contentString = parsed.text || '';
            } else if (parsed.type === 'file') {
              contentString = `[Uploaded File: ${parsed.fileName}]\nContent:\n${parsed.data || ''}`;
            } else if (parsed.type === 'url') {
              contentString = `[Indexed URL: ${parsed.url}]\nContext/Description: ${parsed.description || ''}`;
            }

            console.log(`[RAG] Final content for "${entry.title}":`, contentString.substring(0, 200));
            decryptedContexts.push({
              title: entry.title,
              content: contentString,
              timestamp: new Date(entry.timestamp).toISOString(),
              tags: entry.tags,
            });
            successfulRootHashes.push(entry.rootHash);
          } catch (e) {
            console.error(`[RAG] Failed to download/decrypt memory "${entry.title}":`, e);
          }
        })
      );

      console.log(`[RAG] Successfully decrypted ${decryptedContexts.length} / ${localEntries.length} memories`);
      console.log('[RAG] Decrypted contexts being sent to AI:', JSON.stringify(decryptedContexts, null, 2));

      if (decryptedContexts.length === 0) {
        console.error('[RAG] ZERO memories could be downloaded/decrypted!');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'I failed to retrieve or decrypt any of your memories from 0G nodes. Please check your network and make sure the stored memories are valid.',
          },
        ]);
        setIsLoading(false);
        return;
      }

      // 3. Initiate Streaming request to Gemini RAG API
      setStatusText('Prompting AI companion...');
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userQuestion,
          memories: decryptedContexts,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Failed to call AI companion.');
      }

      // 4. Stream tokens in real-time
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response stream not readable.');
      }

      // Create a temporary blank message for the streaming response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          citedRootHashes: successfulRootHashes,
        },
      ]);

      const decoder = new TextDecoder();
      let done = false;
      let streamedResponse = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          streamedResponse += chunk;
          // Update the last message in state
          setMessages((prev) => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = streamedResponse;
            }
            return updated;
          });
        }
      }

    } catch (error: any) {
      console.error('Q&A RAG failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${error.message || 'An unexpected error occurred during processing.'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050511]/30 border border-violet-500/10 rounded-2xl overflow-hidden backdrop-blur-md">
      
      {/* Top Header */}
      <div className="px-4 py-3 bg-[#08081f]/40 border-b border-violet-500/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4.5 w-4.5 text-cyan-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <span>Ask MemoryOS Companion</span>
            <span className="inline-flex items-center gap-0.5 bg-violet-600/20 text-violet-300 text-[8px] px-1 py-0.5 rounded font-mono">
              <Key className="h-2 w-2" />
              <span>AES-256 decrypted</span>
            </span>
          </span>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="p-3 bg-violet-600/10 rounded-full mb-3 text-violet-400">
              <Brain className="h-8 w-8 animate-pulse" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">Interactive RAG Memory Engine</h4>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              Ask questions about your notes, files, or bookmarked links. Your private data is downloaded and decrypted locally, then reasoned over to answer you.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 max-w-[85%] ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Profile Icon */}
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                  : 'bg-gradient-to-r from-cyan-600/20 to-violet-600/20 border border-violet-500/20 text-cyan-400'
              }`}>
                {msg.role === 'user' ? <User className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
              </div>

              {/* Message Bubble */}
              <div className="flex flex-col gap-1.5">
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white rounded-tr-none'
                    : 'bg-[#08081e] border border-violet-500/10 text-gray-200 rounded-tl-none'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content || (isLoading && idx === messages.length - 1 ? '...' : '')}</p>
                </div>
                
                {/* Security and citation markers */}
                {msg.role === 'assistant' && msg.citedRootHashes && msg.citedRootHashes.length > 0 && (
                  <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono pl-1">
                    <HardDrive className="h-3 w-3" />
                    <span>RAG: Grounded in {msg.citedRootHashes.length} decrypted storage hash{msg.citedRootHashes.length > 1 ? 'es' : ''}</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* Loader Status */}
        {isLoading && statusText && (
          <div className="flex items-center gap-2 pl-3 text-[10px] text-gray-400 italic">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
            <span>{statusText}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Footer */}
      <form onSubmit={handleSubmit} className="p-3 bg-[#08081f]/40 border-t border-violet-500/10 flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about your stored memories..."
          className="flex-1 px-4 py-2.5 bg-[#050514] border border-violet-500/15 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-gray-500 outline-none transition-colors"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="p-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-violet-600/30 disabled:to-indigo-600/30 text-white rounded-xl transition-all shadow-md duration-300 disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>

    </div>
  );
};
