import { Indexer, ZgFile } from '@0gfoundation/0g-storage-ts-sdk';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import os from 'os';

const evmRpc = process.env.NEXT_PUBLIC_ZG_EVM_RPC || 'https://evmrpc-testnet.0g.ai';
const indexerRpc = process.env.ZG_INDEXER_RPC || 'https://indexer-storage-testnet-turbo.0g.ai';
const privateKey = process.env.ZG_PRIVATE_KEY;

/**
 * Uploads an encrypted text memory blob to 0G Storage.
 * Generates a temporary file locally on the server, calculates its Merkle root,
 * signs/broadcasts the storage transaction using the server's key, and returns the root hash.
 */
export const uploadToZeroG = async (encryptedData: string): Promise<string> => {
  if (!privateKey) {
    throw new Error('ZG_PRIVATE_KEY is not configured in the server environment. Please define it in your .env file.');
  }

  // Create temporary file
  const tempId = Math.random().toString(36).substring(7);
  const tempPath = path.join(os.tmpdir(), `memoryos_upload_${tempId}.txt`);
  await fs.promises.writeFile(tempPath, encryptedData, 'utf8');

  let file: ZgFile | null = null;
  try {
    // Initialize ZgFile from temporary path
    file = await ZgFile.fromFilePath(tempPath);
    
    // Get Merkle root hash of the file
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr !== null || !tree) {
      throw new Error(`Failed to compute Merkle tree: ${treeErr || 'tree is null'}`);
    }
    
    // Check root hash getter (can be a function or a property)
    let rootHash: any = typeof tree.rootHash === 'function' ? tree.rootHash() : (tree.rootHash || (tree as any).root);
    if (typeof rootHash === 'function') {
      rootHash = rootHash();
    }
    if (!rootHash || typeof rootHash !== 'string') {
      throw new Error('Could not retrieve root hash from Merkle tree.');
    }

    // Connect provider, signer and indexer with staticNetwork enabled to prevent timeouts
    const provider = new ethers.JsonRpcProvider(evmRpc, undefined, { staticNetwork: true });
    const signer = new ethers.Wallet(privateKey, provider);
    const indexer = new Indexer(indexerRpc);

    // Upload via indexer
    const [, uploadErr] = await indexer.upload(file, evmRpc, signer as any);
    if (uploadErr !== null) {
      throw new Error(`0G Storage indexer upload failed: ${uploadErr}`);
    }

    return rootHash;
  } finally {
    // Close file stream if active
    if (file && typeof file.close === 'function') {
      try {
        await file.close();
      } catch (e) {
        console.error('Error closing ZgFile:', e);
      }
    }
    // Clean up temporary file
    try {
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
    } catch (e) {
      console.error('Error deleting temporary file:', e);
    }
  }
};

/**
 * Downloads an encrypted memory blob from 0G Storage by its Merkle root hash.
 * Downloads the blob to a temporary local file, reads it, and cleans up.
 */
export const downloadFromZeroG = async (rootHash: string): Promise<string> => {
  const tempId = Math.random().toString(36).substring(7);
  const tempPath = path.join(os.tmpdir(), `memoryos_download_${tempId}.txt`);

  try {
    const indexer = new Indexer(indexerRpc);
    
    // Download segment/file via indexer. Parameters: (rootHash, filePath, withProof)
    const downloadErr = await indexer.download(rootHash, tempPath, true);
    if (downloadErr !== null) {
      throw new Error(`0G Storage download failed: ${downloadErr}`);
    }

    // Read the downloaded file content
    const encryptedData = await fs.promises.readFile(tempPath, 'utf8');
    return encryptedData;
  } finally {
    // Clean up downloaded temp file
    try {
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
    } catch (e) {
      console.error('Error deleting temporary download file:', e);
    }
  }
};
