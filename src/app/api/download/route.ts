import { NextResponse } from 'next/server';
import { downloadFromZeroG } from '@/lib/0gStorage';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rootHash } = body;

    if (!rootHash) {
      return NextResponse.json(
        { error: 'Invalid request: "rootHash" is required in the body.' },
        { status: 400 }
      );
    }

    console.log(`[DOWNLOAD API] Downloading rootHash=${rootHash}`);

    // Call server-side 0G Storage download utility
    const encryptedData = await downloadFromZeroG(rootHash);

    console.log(`[DOWNLOAD API] Success for rootHash=${rootHash}, data length=${encryptedData?.length || 0}`);
    console.log(`[DOWNLOAD API] Data preview: ${encryptedData?.substring(0, 150)}`);

    return NextResponse.json({ encryptedData }, { status: 200 });
  } catch (error: any) {
    console.error('[DOWNLOAD API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during download.' },
      { status: 500 }
    );
  }
}
