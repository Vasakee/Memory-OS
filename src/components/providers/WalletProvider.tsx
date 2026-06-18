'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { connectWallet, isMetaMaskInstalled, signEncryptionSeed } from '@/lib/wallet';
import { deriveKeyFromSignature } from '@/lib/encryption';

interface WalletContextType {
  walletAddress: string | null;
  encryptionKey: CryptoKey | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check if wallet was connected in this session (e.g. from sessionStorage)
  useEffect(() => {
    const savedAddress = sessionStorage.getItem('memory_os_connected_addr');
    if (savedAddress && isMetaMaskInstalled()) {
      // Prompt user to connect and re-verify key
      // We don't automatically trigger signature on load to prevent spamming the user,
      // but they will see they are disconnected until they re-authenticate.
      sessionStorage.removeItem('memory_os_connected_addr');
    }
  }, []);

  const connect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      if (!isMetaMaskInstalled()) {
        throw new Error('MetaMask is not installed. Please install the MetaMask browser extension.');
      }

      // 1. Connect wallet
      const walletState = await connectWallet();
      if (!walletState.signer) {
        throw new Error('Could not retrieve wallet signer.');
      }

      // 2. Request signature seed for encryption key
      const signature = await signEncryptionSeed(walletState.signer);

      // 3. Derive AES CryptoKey from signature
      const key = await deriveKeyFromSignature(signature);

      setWalletAddress(walletState.address);
      setEncryptionKey(key);
      sessionStorage.setItem('memory_os_connected_addr', walletState.address);
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      setError(err.message || 'Failed to connect wallet.');
      setWalletAddress(null);
      setEncryptionKey(null);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setWalletAddress(null);
    setEncryptionKey(null);
    setError(null);
    sessionStorage.removeItem('memory_os_connected_addr');
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        encryptionKey,
        isConnecting,
        error,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
