import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

export interface MemoryContext {
  title: string;
  content: string;
  timestamp: string;
  tags: string[];
}

/**
 * Calls OpenAI's Chat Completions API with memories as context and user's question.
 * Returns the stream response for token streaming.
 */
export const askOpenAIStream = async (question: string, memories: MemoryContext[]) => {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured in the server environment. Please define it in your .env file.');
  }

  const openai = new OpenAI({ apiKey });

  // Format memories context
  const contextText = memories.length > 0
    ? memories
        .map(
          (m, idx) => `
Memory #${idx + 1}:
Title: ${m.title}
Date: ${m.timestamp}
Tags: ${m.tags.join(', ')}
Content: ${m.content}
---`
        )
        .join('\n')
    : 'No relevant memories were found.';

  const systemInstruction = `You are MemoryOS, a decentralized personal AI memory assistant.
You help the user recall and reason over their stored notes, files, and links.

Below are the decrypted memories retrieved from 0G storage nodes.
Use these memories to answer the user's question.

CRITICAL RULES:
1. ONLY answer using facts explicitly mentioned in the memories context. If the answer cannot be found in the memories, clearly say: "I couldn't find that information in your saved memories."
2. Proactively cite which memories you used to answer the question using the memory title in brackets, e.g. "According to [Meeting Notes June 17], we decided..."
3. Keep your answers concise, clear, and focused.
4. If there are no memories loaded, politely ask the user to add memories first.

Decrypted Memories Context:
${contextText}`;

  // Request streaming response from GPT-4o-mini
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: `User Query: "${question}"` },
    ],
    stream: true,
  });

  return response;
};
