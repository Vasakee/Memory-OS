import { BrowserProvider, JsonRpcSigner } from 'ethers';

export interface WalletState {
  address: string;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
}

// ---------------------------------------------------------------------------
// EIP-6963: Modern wallet discovery via events (bypasses window.ethereum proxy)
// ---------------------------------------------------------------------------
interface EIP6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: any;
}

/**
 * Discovers wallets via EIP-6963 events. Returns an array of announced providers.
 * This bypasses any proxy/wrapper (evmAsk.js) on window.ethereum.
 */
const discoverProviders = (): Promise<EIP6963ProviderDetail[]> => {
  return new Promise((resolve) => {
    const providers: EIP6963ProviderDetail[] = [];

    const handler = (event: any) => {
      providers.push(event.detail);
    };

    window.addEventListener('eip6963:announceProvider', handler);
    // Ask all installed wallets to announce themselves
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    // Give wallets 300ms to respond, then resolve
    setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', handler);
      resolve(providers);
    }, 300);
  });
};

/**
 * Gets the raw EVM provider, preferring EIP-6963 MetaMask detection.
 * Falls back to window.ethereum if EIP-6963 yields nothing.
 */
const getEthereum = async (): Promise<any> => {
  if (typeof window === 'undefined') return null;

  // Try EIP-6963 first (modern, proxy-proof)
  try {
    const providers = await discoverProviders();

    // Look for MetaMask specifically
    const metamask = providers.find(
      (p) => p.info.rdns === 'io.metamask' || p.info.name.toLowerCase().includes('metamask')
    );
    if (metamask) return metamask.provider;

    // If any provider was announced, use the first one
    if (providers.length > 0) return providers[0].provider;
  } catch {
    // EIP-6963 not supported, fall through
  }

  // Fallback: window.ethereum with providers array check
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;

  if (Array.isArray(ethereum.providers)) {
    const mm = ethereum.providers.find(
      (p: any) => p.isMetaMask && !p.isTokenPocket && !p.isBraveWallet
    );
    if (mm) return mm;
  }

  return ethereum;
};

/**
 * Checks if MetaMask (or any EVM wallet) is available.
 */
export const isMetaMaskInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).ethereum;
};

/**
 * Requests wallet connection using MetaMask (or first available EVM wallet).
 * Returns the account address, BrowserProvider, and Signer.
 */
export const connectWallet = async (): Promise<WalletState> => {
  const ethereum = await getEthereum();
  if (!ethereum) {
    throw new Error('MetaMask is not installed. Please install MetaMask to use MemoryOS.');
  }

  // Request accounts directly on the resolved provider (bypasses proxy)
  const accounts: string[] = await ethereum.request({
    method: 'eth_requestAccounts',
  });

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts returned. Please unlock MetaMask and try again.');
  }

  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  return {
    address,
    provider,
    signer,
  };
};

/**
 * Prompt the user to sign a deterministic message to derive an encryption key.
 * This signature acts as the high-entropy seed for our AES-256 key.
 */
export const signEncryptionSeed = async (signer: JsonRpcSigner): Promise<string> => {
  const message = 'MemoryOS::DeriveEncryptionKey::v1';
  // Sign message using MetaMask
  const signature = await signer.signMessage(message);
  return signature;
};
