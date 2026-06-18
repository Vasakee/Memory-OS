import { askOpenAIStream } from '@/lib/openai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, memories } = body;

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: "question" is required.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Call server-side streaming OpenAI RAG helper
    const openaiStream = await askOpenAIStream(question, memories || []);

    // Create a ReadableStream to stream the OpenAI response tokens back to the frontend
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of openaiStream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (streamError) {
          console.error('Error during token streaming:', streamError);
          controller.error(streamError);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in /api/ask:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error during OpenAI processing.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
