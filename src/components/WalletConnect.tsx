'use client';

import React, { useState } from 'react';
import { useWallet } from './providers/WalletProvider';
import { Wallet, LogOut, ChevronDown, Key } from 'lucide-react';

export const WalletConnect: React.FC = () => {
  const { walletAddress, isConnecting, error, connect, disconnect, encryptionKey } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const toggleDropdown = () => setShowDropdown(!showDropdown);

  if (walletAddress && encryptionKey) {
    return (
      <div className="relative">
        <button
          onClick={toggleDropdown}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600/20 to-cyan-500/20 hover:from-violet-600/30 hover:to-cyan-500/30 border border-violet-500/30 text-violet-200 rounded-xl transition-all duration-300 font-medium text-sm shadow-lg shadow-violet-500/5 backdrop-blur-md"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono">{formatAddress(walletAddress)}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-[#0d0d21] border border-violet-500/20 rounded-xl shadow-xl py-1 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-2 border-b border-violet-500/10 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Active Key</span>
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                <Key className="h-3.5 w-3.5" />
                <span>AES-256 Active</span>
              </div>
            </div>
            <button
              onClick={() => {
                disconnect();
                setShowDropdown(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors duration-150"
            >
              <LogOut className="h-4 w-4" />
              <span>Disconnect</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={connect}
        disabled={isConnecting}
        className="relative group overflow-hidden flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-medium text-sm transition-all duration-300 shadow-lg shadow-violet-600/20 hover:shadow-violet-600/35 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
      >
        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shine" />
        <Wallet className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
        <span>{isConnecting ? 'Signing Key...' : 'Connect Wallet'}</span>
      </button>

      {error && (
        <span className="text-xs text-rose-500 max-w-[200px] text-right font-medium animate-pulse">
          {error.includes('MetaMask') ? 'MetaMask required' : error}
        </span>
      )}
    </div>
  );
};
