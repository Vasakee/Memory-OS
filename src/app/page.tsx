'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useWallet } from '@/components/providers/WalletProvider';
import { WalletConnect } from '@/components/WalletConnect';
import { MemoryList } from '@/components/MemoryList';
import { MemoryCard } from '@/components/MemoryCard';
import { AddMemory } from '@/components/AddMemory';
import { AskMemory } from '@/components/AskMemory';
import { MemoryEntry } from '@/lib/memoryStore';
import { Plus, Brain, Sparkles, HardDrive, Lock, ShieldCheck, Cpu, Database, MessageSquare, LayoutList } from 'lucide-react';

type MobileTab = 'memories' | 'detail' | 'ask';

export default function Home() {
  const { walletAddress, encryptionKey } = useWallet();
  const [selectedMemory, setSelectedMemory] = useState<MemoryEntry | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mobileTab, setMobileTab] = useState<MobileTab>('memories');

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
    setSelectedMemory(null);
  };

  const handleMemorySelect = (memory: MemoryEntry) => {
    setSelectedMemory(memory);
    setMobileTab('detail');
  };

  return (
    <main className="h-screen flex flex-col bg-[#02020a] relative overflow-hidden select-none">
      
      {/* Absolute Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Header bar */}
      <header className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6 bg-[#04040d]/60 border-b border-violet-500/10 backdrop-blur-md z-40">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="h-8 w-8 md:h-9 md:w-9 rounded-xl overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/20 border border-violet-500/10 flex-shrink-0">
            <Image src="/logo.png" alt="MemoryOS Logo" width={36} height={36} className="object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs md:text-sm font-bold text-white tracking-wider flex items-center gap-1.5 font-heading">
              <span>MemoryOS</span>
              <span className="hidden sm:inline bg-cyan-500/10 text-cyan-400 text-[9px] uppercase px-1.5 py-0.5 rounded border border-cyan-500/15 tracking-widest font-bold">
                0G storage
              </span>
            </span>
            <span className="text-[9px] md:text-[10px] text-gray-500 hidden sm:block">Decentralized Personal AI Memory</span>
          </div>
        </div>

        {/* Connection Widget */}
        <div className="flex items-center gap-2 md:gap-4">
          {walletAddress && encryptionKey && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="md:hidden flex items-center gap-1 px-2.5 py-1.5 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/20 text-violet-300 rounded-lg text-[11px] font-semibold transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          <WalletConnect />
        </div>
      </header>

      {/* ===== DESKTOP LAYOUT (lg+) ===== */}
      <div className="flex-1 hidden lg:flex overflow-hidden p-4 gap-4 z-10">
        
        {/* Left Sidebar: Memory List */}
        <div className="w-80 flex flex-col gap-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 font-heading">
              Stored Memories
            </h3>
            {walletAddress && encryptionKey && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/20 text-violet-300 rounded-lg text-xs font-semibold transition-all hover:scale-105 active:scale-100"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Memory</span>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <MemoryList
              refreshTrigger={refreshTrigger}
              onSelectMemory={handleMemorySelect}
              selectedMemoryId={selectedMemory ? selectedMemory.id : null}
              onRefresh={handleRefresh}
            />
          </div>
        </div>

        {/* Center Main Card: Memory Detail OR Welcome Hub */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedMemory ? (
            <div className="flex-1 overflow-hidden">
              <MemoryCard memory={selectedMemory} />
            </div>
          ) : (
            <WelcomeHub walletAddress={walletAddress} />
          )}
        </div>

        {/* Right Sidebar: AI Companion Chat */}
        {walletAddress && encryptionKey && (
          <div className="w-96 flex flex-col gap-3 flex-shrink-0 animate-in slide-in-from-right-4 duration-300">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 font-heading">
              AI Query Engine
            </h3>
            <div className="flex-1 overflow-hidden">
              <AskMemory />
            </div>
          </div>
        )}
      </div>

      {/* ===== MOBILE / TABLET LAYOUT (< lg) ===== */}
      <div className="flex-1 flex flex-col overflow-hidden lg:hidden z-10">
        
        {/* Mobile Content Area */}
        <div className="flex-1 overflow-hidden p-3 md:p-4">
          {!walletAddress || !encryptionKey ? (
            <WelcomeHub walletAddress={walletAddress} />
          ) : (
            <>
              {mobileTab === 'memories' && (
                <div className="h-full flex flex-col gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 font-heading">
                      Stored Memories
                    </h3>
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/20 text-violet-300 rounded-lg text-xs font-semibold transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <MemoryList
                      refreshTrigger={refreshTrigger}
                      onSelectMemory={handleMemorySelect}
                      selectedMemoryId={selectedMemory ? selectedMemory.id : null}
                      onRefresh={handleRefresh}
                    />
                  </div>
                </div>
              )}
              {mobileTab === 'detail' && (
                <div className="h-full flex flex-col gap-3 animate-in fade-in duration-200">
                  {selectedMemory ? (
                    <div className="flex-1 overflow-hidden">
                      <MemoryCard memory={selectedMemory} />
                    </div>
                  ) : (
                    <WelcomeHub walletAddress={walletAddress} />
                  )}
                </div>
              )}
              {mobileTab === 'ask' && (
                <div className="h-full flex flex-col gap-3 animate-in fade-in duration-200">
                  <div className="flex-1 overflow-hidden">
                    <AskMemory />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile Bottom Tab Bar */}
        {walletAddress && encryptionKey && (
          <div className="h-14 flex items-center justify-around bg-[#04040d]/80 border-t border-violet-500/10 backdrop-blur-md z-40 flex-shrink-0">
            <button
              onClick={() => setMobileTab('memories')}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-all ${
                mobileTab === 'memories' ? 'text-violet-400' : 'text-gray-500'
              }`}
            >
              <LayoutList className="h-5 w-5" />
              <span className="text-[9px] font-semibold uppercase tracking-wider">Memories</span>
            </button>
            <button
              onClick={() => setMobileTab('detail')}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-all ${
                mobileTab === 'detail' ? 'text-cyan-400' : 'text-gray-500'
              }`}
            >
              <Database className="h-5 w-5" />
              <span className="text-[9px] font-semibold uppercase tracking-wider">Detail</span>
            </button>
            <button
              onClick={() => setMobileTab('ask')}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-all ${
                mobileTab === 'ask' ? 'text-emerald-400' : 'text-gray-500'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-[9px] font-semibold uppercase tracking-wider">Ask AI</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Memory Modal Overlay */}
      <AddMemory
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleRefresh}
      />

    </main>
  );
}

/* ========== Welcome Hub Sub-Component ========== */
function WelcomeHub({ walletAddress }: { walletAddress: string | null }) {
  return (
    <div className="flex-1 bg-[#08081c]/25 border border-violet-500/10 rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md flex flex-col items-center gap-5 md:gap-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="p-3 md:p-4 bg-gradient-to-r from-violet-600/20 to-cyan-500/20 border border-violet-500/20 text-violet-400 rounded-2xl shadow-xl shadow-violet-500/5">
          <Brain className="h-8 w-8 md:h-10 md:w-10 animate-pulse" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide font-heading">
            Own Your Personal AI Memory
          </h1>
          <p className="text-[11px] md:text-xs text-gray-400 leading-relaxed">
            MemoryOS encrypts your notes, files, and URLs client-side. The encrypted payloads are saved permanently on 0G Storage Nodes. Only your wallet private key can unlock them.
          </p>
        </div>

        {/* Feature highlights grid */}
        <div className="grid grid-cols-2 gap-2 md:gap-3 w-full mt-2 text-left">
          <div className="p-3 md:p-3.5 bg-[#08081c]/55 border border-violet-500/10 rounded-xl flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-violet-400">
              <Lock className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-xs font-semibold">Client Encryption</span>
            </div>
            <p className="text-[9px] md:text-[10px] text-gray-500 leading-relaxed">
              AES-256 keys derived locally in-memory. Zero server access to plaintext.
            </p>
          </div>
          <div className="p-3 md:p-3.5 bg-[#08081c]/55 border border-violet-500/10 rounded-xl flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <HardDrive className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-xs font-semibold">0G Testnet Storage</span>
            </div>
            <p className="text-[9px] md:text-[10px] text-gray-500 leading-relaxed">
              Decentralized, immutable node networks retain your encrypted logs.
            </p>
          </div>
          <div className="p-3 md:p-3.5 bg-[#08081c]/55 border border-violet-500/10 rounded-xl flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-xs font-semibold">Full Sovereignty</span>
            </div>
            <p className="text-[9px] md:text-[10px] text-gray-500 leading-relaxed">
              Disconnecting MetaMask completely locks access instantly.
            </p>
          </div>
          <div className="p-3 md:p-3.5 bg-[#08081c]/55 border border-violet-500/10 rounded-xl flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-indigo-400">
              <Cpu className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-xs font-semibold">OpenAI RAG</span>
            </div>
            <p className="text-[9px] md:text-[10px] text-gray-500 leading-relaxed">
              Streamed Q&A grounded only in your own decrypted memories.
            </p>
          </div>
        </div>

        {!walletAddress && (
          <div className="mt-3 md:mt-4 flex items-center gap-2 p-3 bg-violet-600/10 border border-violet-500/20 rounded-xl">
            <Sparkles className="h-4 w-4 text-violet-400 flex-shrink-0" />
            <span className="text-[11px] md:text-xs font-semibold text-violet-300">
              Connect your MetaMask wallet above to get started.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
