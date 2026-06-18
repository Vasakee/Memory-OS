'use client';

import React, { useState } from 'react';
import { useWallet } from './providers/WalletProvider';
import { encryptData } from '@/lib/encryption';
import { addMemoryEntry, MemoryEntry } from '@/lib/memoryStore';
import { X, Plus, Sparkles, FileText, UploadCloud, Link2, Loader2, Tag } from 'lucide-react';

interface AddMemoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type MemoryType = 'text' | 'file' | 'url';

export const AddMemory: React.FC<AddMemoryProps> = ({ isOpen, onClose, onSuccess }) => {
  const { walletAddress, encryptionKey } = useWallet();
  
  const [activeTab, setActiveTab] = useState<MemoryType>('text');
  const [title, setTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Tab 1: Text Note Content
  const [noteContent, setNoteContent] = useState('');

  // Tab 2: File Upload Content
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileSize, setFileSize] = useState<number | null>(null);

  // Tab 3: URL Content
  const [urlInput, setUrlInput] = useState('');
  const [urlDescription, setUrlDescription] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(file.size);
    if (!title) {
      // Auto-set title from file name
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setFileContent(result);
      }
    };
    
    // Read text files directly, otherwise convert to data URL base64
    if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.html') || file.name.endsWith('.css')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file); // Stores binary files as encrypted Base64 data urls
    }
  };

  const resetForm = () => {
    setTitle('');
    setTagsInput('');
    setNoteContent('');
    setFileName('');
    setFileContent('');
    setFileSize(null);
    setUrlInput('');
    setUrlDescription('');
    setErrorMessage('');
    setStatusMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress || !encryptionKey) {
      setErrorMessage('Wallet must be connected and unlocked.');
      return;
    }

    if (!title.trim()) {
      setErrorMessage('Memory title is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      // 1. Prepare raw content string
      let rawContent = '';
      if (activeTab === 'text') {
        if (!noteContent.trim()) throw new Error('Note content cannot be empty.');
        rawContent = JSON.stringify({ type: 'text', text: noteContent });
      } else if (activeTab === 'file') {
        if (!fileContent) throw new Error('Please select a file.');
        rawContent = JSON.stringify({ type: 'file', fileName, size: fileSize, data: fileContent });
      } else if (activeTab === 'url') {
        if (!urlInput.trim()) throw new Error('URL is required.');
        rawContent = JSON.stringify({ type: 'url', url: urlInput, description: urlDescription });
      }

      // 2. Encrypt raw content client-side
      setStatusMessage('Encrypting memory locally with AES-256-GCM...');
      const encryptedData = await encryptData(rawContent, encryptionKey);

      // 3. Upload encrypted payload to 0G storage via server proxy
      setStatusMessage('Uploading encrypted payload to 0G Storage...');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encryptedData }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload memory to decentralized storage.');
      }

      const { rootHash } = data;
      if (!rootHash) {
        throw new Error('Server upload returned empty root hash.');
      }

      // 4. Parse tags
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag !== '');

      // 5. Save metadata entry to localStorage index
      setStatusMessage('Saving memory hash to local index...');
      const newEntry: MemoryEntry = {
        id: Math.random().toString(36).substring(7),
        rootHash,
        title: title.trim(),
        timestamp: Date.now(),
        tags,
        type: activeTab,
        preview: activeTab === 'text' 
          ? noteContent.substring(0, 100) + (noteContent.length > 100 ? '...' : '')
          : activeTab === 'file' 
            ? `File: ${fileName} (${(fileSize ? fileSize / 1024 : 0).toFixed(1)} KB)`
            : `Link: ${urlInput}`,
        walletAddress: walletAddress.toLowerCase(),
      };

      addMemoryEntry(newEntry);

      setStatusMessage('Memory stored successfully!');
      setTimeout(() => {
        onSuccess();
        resetForm();
        onClose();
      }, 500);

    } catch (err: any) {
      console.error('Error adding memory:', err);
      setErrorMessage(err.message || 'Failed to create memory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#02020a]/80 backdrop-blur-md" 
        onClick={!isSubmitting ? onClose : undefined}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-xl bg-[#08081a]/90 border border-violet-500/20 rounded-2xl shadow-2xl p-6 overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-200">
        
        {/* Decorative corner glows */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-6 pb-3 border-b border-violet-500/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-violet-600/20 text-violet-400 rounded-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white tracking-wide">Create New Memory</h3>
          </div>
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors disabled:opacity-30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs rounded-xl font-medium">
            {errorMessage}
          </div>
        )}

        {isSubmitting ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm font-medium text-white">{statusMessage}</p>
              <p className="text-xs text-gray-400">Please confirm any MetaMask prompts if requested.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Memory Type Selection Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-violet-950/25 border border-violet-500/10 rounded-xl">
              <button
                type="button"
                onClick={() => { setActiveTab('text'); setErrorMessage(''); }}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                  activeTab === 'text'
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Note</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('file'); setErrorMessage(''); }}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                  activeTab === 'file'
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>File</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('url'); setErrorMessage(''); }}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                  activeTab === 'url'
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>Link</span>
              </button>
            </div>

            {/* Title Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Memory Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cryptography Presentation Ideas"
                className="w-full px-4 py-2.5 bg-[#0c0c24] border border-violet-500/20 hover:border-violet-500/35 focus:border-cyan-400 rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-colors"
                required
              />
            </div>

            {/* Dynamic Tabs Fields */}
            {activeTab === 'text' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Plaintext Note Content</label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Type anything you want MemoryOS to store securely on-chain..."
                  rows={5}
                  className="w-full px-4 py-3 bg-[#0c0c24] border border-violet-500/20 hover:border-violet-500/35 focus:border-cyan-400 rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-colors resize-none font-sans"
                  required
                />
              </div>
            )}

            {activeTab === 'file' && (
              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Select File</label>
                <div className="relative border border-dashed border-violet-500/20 hover:border-violet-500/40 rounded-xl p-6 bg-[#0c0c24] transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="h-8 w-8 text-violet-400 group-hover:scale-110 transition-transform duration-300" />
                  {fileName ? (
                    <div className="text-center">
                      <p className="text-xs font-semibold text-emerald-400">{fileName}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {(fileSize ? fileSize / 1024 : 0).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-xs font-semibold text-white">Click or drag file to select</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Text, Markdown, JSON or any raw data (max 200KB)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'url' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Memory URL</label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/some-resource"
                    className="w-full px-4 py-2.5 bg-[#0c0c24] border border-violet-500/20 hover:border-violet-500/35 focus:border-cyan-400 rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-colors"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">URL Description/Context</label>
                  <textarea
                    value={urlDescription}
                    onChange={(e) => setUrlDescription(e.target.value)}
                    placeholder="Why are you bookmarking this? Explain the context so MemoryOS AI can reason over it..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-[#0c0c24] border border-violet-500/20 hover:border-violet-500/35 focus:border-cyan-400 rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-colors resize-none"
                  />
                </div>
              </div>
            )}

            {/* Tags Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                <span>Tags (comma-separated)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. personal, ideas, work"
                className="w-full px-4 py-2.5 bg-[#0c0c24] border border-violet-500/20 hover:border-violet-500/35 focus:border-cyan-400 rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-colors"
              />
            </div>

            {/* Action Buttons */}
            <button
              type="submit"
              className="mt-2 w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl text-sm transition-all duration-300 shadow-lg shadow-violet-600/15 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="h-4 w-4" />
              <span>Lock and Upload Memory</span>
            </button>

          </form>
        )}
      </div>
    </div>
  );
};
