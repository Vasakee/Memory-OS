'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from './providers/WalletProvider';
import { decryptData } from '@/lib/encryption';
import { MemoryEntry } from '@/lib/memoryStore';
import { Calendar, Tag, HardDrive, Key, Loader2, Link2, Download, FileText, Globe } from 'lucide-react';

interface MemoryCardProps {
  memory: MemoryEntry;
}

interface DecryptedContent {
  type: 'text' | 'file' | 'url';
  text?: string;
  fileName?: string;
  size?: number;
  data?: string;
  url?: string;
  description?: string;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory }) => {
  const { encryptionKey } = useWallet();
  const [decrypted, setDecrypted] = useState<DecryptedContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndDecrypt = async () => {
      if (!encryptionKey) {
        setError('Wallet encryption key is missing.');
        return;
      }

      setIsLoading(true);
      setError(null);
      setDecrypted(null);

      try {
        // 1. Fetch encrypted blob from 0G storage via server route
        const response = await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rootHash: memory.rootHash }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to download from 0G Storage.');
        }

        const { encryptedData } = data;
        if (!encryptedData) {
          throw new Error('Retrieved payload is empty.');
        }

        // 2. Decrypt blob locally in browser using derived CryptoKey
        const decryptedPlaintext = await decryptData(encryptedData, encryptionKey);
        
        // 3. Parse JSON decrypted payload
        const parsed = JSON.parse(decryptedPlaintext) as DecryptedContent;
        setDecrypted(parsed);
      } catch (err: any) {
        console.error('Decryption failed:', err);
        setError(err.message || 'Failed to download or decrypt memory payload.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndDecrypt();
  }, [memory.rootHash, encryptionKey]);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const downloadDecryptedFile = () => {
    if (!decrypted || decrypted.type !== 'file' || !decrypted.data) return;
    
    // Create temporary download element
    const element = document.createElement('a');
    element.setAttribute('href', decrypted.data);
    element.setAttribute('download', decrypted.fileName || 'file');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex flex-col h-full bg-[#08081c]/40 border border-violet-500/10 rounded-2xl p-6 backdrop-blur-lg relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Background glow effects */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col gap-2 pb-4 border-b border-violet-500/10 mb-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-white tracking-wide">{memory.title}</h2>
          <span className="bg-violet-950/40 text-violet-300 text-[10px] uppercase px-2 py-0.5 rounded border border-violet-500/10">
            {memory.type}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(memory.timestamp)}</span>
          </span>
          <span className="flex items-center gap-1">
            <HardDrive className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-mono text-[10px]">
              0G Root: {memory.rootHash.substring(0, 10)}...{memory.rootHash.substring(memory.rootHash.length - 8)}
            </span>
          </span>
        </div>

        {memory.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {memory.tags.map((tag, idx) => (
              <span
                key={idx}
                className="flex items-center gap-1 bg-violet-950/30 text-violet-200 px-2 py-0.5 rounded-md text-[10px] border border-violet-500/5"
              >
                <Tag className="h-2.5 w-2.5 opacity-60" />
                <span>{tag}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="flex-1 flex flex-col justify-start">
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-white flex items-center gap-1.5 justify-center">
                <HardDrive className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span>Downloading chunk from 0G Nodes...</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">Decrypting locally with your connected keys</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-sm font-semibold text-rose-400">Decryption Failed</p>
            <p className="text-xs text-gray-400 mt-2 max-w-sm leading-relaxed">{error}</p>
          </div>
        )}

        {!isLoading && !error && decrypted && (
          <div className="flex-1 flex flex-col animate-in fade-in duration-200">
            {decrypted.type === 'text' && (
              <div className="bg-[#04040c]/40 border border-violet-500/5 rounded-xl p-4 flex-1 overflow-y-auto max-h-[350px]">
                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {decrypted.text}
                </p>
              </div>
            )}

            {decrypted.type === 'file' && (
              <div className="flex flex-col gap-4 items-center justify-center py-12 bg-[#04040c]/30 border border-violet-500/5 rounded-xl">
                <div className="p-4 bg-cyan-600/10 text-cyan-400 rounded-full">
                  <FileText className="h-10 w-10" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">{decrypted.fileName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Size: {(decrypted.size ? decrypted.size / 1024 : 0).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={downloadDecryptedFile}
                  className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-cyan-600/10 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Decrypt & Download File</span>
                </button>
              </div>
            )}

            {decrypted.type === 'url' && (
              <div className="flex flex-col gap-4 bg-[#04040c]/30 border border-violet-500/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Globe className="h-5 w-5" />
                  <span className="text-sm font-semibold">Indexed Link</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Destination</span>
                  <a
                    href={decrypted.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline font-mono break-all inline-flex items-center gap-1"
                  >
                    <span>{decrypted.url}</span>
                    <Link2 className="h-3 w-3" />
                  </a>
                </div>
                {decrypted.description && (
                  <div className="flex flex-col gap-1 border-t border-violet-500/5 pt-3">
                    <span className="text-xs text-gray-500">Decrypted Context</span>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {decrypted.description}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Storage Node Verification Badge */}
            <div className="mt-6 flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
              <Key className="h-4 w-4 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">Secure Decryption Proof</span>
                <span className="text-[9px] text-gray-400">
                  This chunk was fetched from 0G nodes and decrypted client-side. No server has seen the unencrypted data.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
