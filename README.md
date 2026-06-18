# MemoryOS

MemoryOS is a decentralized personal AI memory application built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**. 
It allows users to store notes, files, or URLs as client-side encrypted blobs on the **0G decentralized storage network** (not a centralized server), and then perform RAG (Retrieval-Augmented Generation) Q&A over their memories using **Gemini 2.5 Flash** (via a Next.js API Route).

*Pitch: "Your AI that remembers everything, forever, on-chain — no company owns your data."*

---

## Features

- **Decentralized Storage:** Files and notes are stored directly on the 0G Testnet.
- **Client-Side Cryptography:** Memories are encrypted on the client side using an AES-256-GCM key derived from a MetaMask message signature. Your decrypted memories never touch a database or server unencrypted.
- **Zero Centralized Database:** All indexing metadata (root hash, title, tags, timestamp) is kept in the user's browser `localStorage`.
- **RAG-Powered AI Companion:** Ask questions about your memories and receive answers grounded in your data, complete with citations of which memories were used.
- **Total Ownership:** Disconnecting the wallet immediately locks access to all memories because the cryptographic key is removed from memory.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + Framer Motion (premium glassmorphism UI)
- **Decentralized Storage:** `@0glabs/0g-ts-sdk` on 0G testnet
- **Encryption:** Web Crypto API (AES-256-GCM) with signature-derived key seeds via `personal_sign`
- **Wallet Connection:** Web3 Provider (`ethers.js` v6)
- **AI Core:** `@google/generative-ai` (Gemini 2.5 Flash)

---

## Getting Started

### 1. Prerequisites

- **MetaMask** (or another EVM-compatible wallet extension).
- **Node.js** v18+ and `npm`.

### 2. Obtain Free API Keys & Tokens

1. **Gemini API Key:**
   - Go to [Google AI Studio](https://aistudio.google.com/).
   - Click "Get API Key" and generate a free API key.

2. **0G Testnet Tokens:**
   - Go to the [0G Faucet](https://faucet.0g.ai/).
   - Request testnet A0GI tokens for your wallet address.
   - *Note:* In MemoryOS, the server acts as an upload proxy paying storage fees, so you will need to fund the server-side wallet (represented by the `ZG_PRIVATE_KEY` in `.env`) with A0GI tokens to perform writes.

### 3. Setup Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```
Fill in the values in `.env`:
- `GEMINI_API_KEY`: Your Google AI Studio API key.
- `ZG_PRIVATE_KEY`: An EVM private key funded with 0G Testnet tokens (this wallet pays the gas for 0G storage writes).

### 4. Install Dependencies & Run

Install the node packages:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the app!

---

## Cryptographic Flow

1. **Wallet Connection & Key Derivation:**
   - User connects their wallet (MetaMask).
   - The user signs a static string: `"MemoryOS::DeriveEncryptionKey::v1"`.
   - The signature is hashed using SHA-256 to create a 32-byte cryptographic key. This key resides *only* in-memory in React context.
2. **Uploading Memories:**
   - User inputs a Note, File, or URL.
   - The frontend encrypts the payload using AES-256-GCM with the derived key.
   - The encrypted payload (base64) is sent to `/app/api/upload/route.ts`.
   - The server uploads the encrypted bytes to 0G Storage using its private key to pay gas fees.
   - 0G returns a unique **Root Hash**.
   - The frontend saves `{ id, rootHash, title, tags, timestamp, type, walletAddress }` in the browser's `localStorage`.
3. **Retrieval and AI Q&A (RAG):**
   - User types a query: *"What did I decide in the meeting last Tuesday?"*
   - The client fetches matching encrypted memories from 0G by their root hashes via `/api/download`.
   - The client decrypts each memory locally using the derived key.
   - The client passes the decrypted text content along with the query to `/api/ask` as context.
   - The Next.js API route streams back a response from Gemini 2.5 Flash citing the specific memories.
