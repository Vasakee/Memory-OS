/**
 * Utility library for client-side AES-256-GCM encryption and decryption.
 * Uses the native Web Crypto API so no third-party package is required.
 */

// Helper to convert Uint8Array to Base64
const bufferToBase64 = (buf: Uint8Array): string => {
  let binary = '';
  const len = buf.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return typeof window !== 'undefined' ? btoa(binary) : Buffer.from(buf).toString('base64');
};

// Helper to convert Base64 to Uint8Array
const base64ToBuffer = (base64: string): Uint8Array => {
  if (typeof window !== 'undefined') {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } else {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
};

/**
 * Derives a CryptoKey from a user signature using SHA-256 hashing.
 */
export const deriveKeyFromSignature = async (signature: string): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const signatureBytes = encoder.encode(signature);
  
  // Hash signature using SHA-256 to get a 32-byte key seed
  const hashBuffer = await crypto.subtle.digest('SHA-256', signatureBytes);
  
  // Import hash as a CryptoKey for AES-GCM
  return await crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM', length: 256 },
    false, // key is not exportable
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypts plaintext string using AES-256-GCM with a derived CryptoKey.
 * Returns a JSON string containing the base64-encoded initialization vector (iv) and ciphertext.
 */
export const encryptData = async (plaintext: string, key: CryptoKey): Promise<string> => {
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);
  
  // Generate 12-byte random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt plaintext
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    plaintextBytes as any
  );
  
  const ciphertextBytes = new Uint8Array(ciphertextBuffer);
  
  // Return combined JSON representation
  return JSON.stringify({
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertextBytes),
  });
};

/**
 * Decrypts a JSON encrypted payload using AES-256-GCM with a derived CryptoKey.
 */
export const decryptData = async (encryptedJson: string, key: CryptoKey): Promise<string> => {
  const { iv: ivBase64, ciphertext: ciphertextBase64 } = JSON.parse(encryptedJson);
  
  const iv = base64ToBuffer(ivBase64);
  const ciphertext = base64ToBuffer(ciphertextBase64);
  
  // Decrypt ciphertext
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    ciphertext as any
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
};
