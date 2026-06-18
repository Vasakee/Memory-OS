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

  const systemInstruction = `You are MemoryOS, a highly intelligent and supportive personal AI companion.
You help the user recall, organize, summarize, and reason over their stored notes, files, and links.

Below is the decrypted memory context retrieved from the user's 0G storage nodes.
Use these memories to answer the user's question in a helpful, friendly, and comprehensive manner.

INSTRUCTIONS:
1. AUTHORITATIVE GROUNDING: Treat the provided Decrypted Memories as your primary source of truth. Read through them carefully to connect details across different files, notes, or links.
2. CONTEXTUAL REASONING: Be robust and conversational. If the memories do not contain the literal answer but have related context, use your logical reasoning to infer, summarize, and provide a helpful response. Do not immediately refuse to answer. You can supplement your answers with general knowledge or explanations of concepts mentioned in the memories, but clearly distinguish what is directly from the user's memories versus general explanations.
3. CITATIONS: When referencing information from a specific memory, proactively cite it using its title in brackets, e.g., "According to [Project Goals], we decided..." or "As noted in your bookmark [Rust Basics]...".
4. HANDLING MISSING DATA: If the query is completely unrelated to the memories, or if there is no matching context at all, politely let the user know that you couldn't find relevant information in their current memories, list what memories are currently present if they might be relevant, and suggest how they could add that information.

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
