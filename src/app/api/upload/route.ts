import { NextResponse } from 'next/server';
import { uploadToZeroG } from '@/lib/0gStorage';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { encryptedData } = body;

    if (!encryptedData) {
      return NextResponse.json(
        { error: 'Invalid request: "encryptedData" is required in the body.' },
        { status: 400 }
      );
    }

    // Call server-side 0G Storage upload utility
    const rootHash = await uploadToZeroG(encryptedData);

    return NextResponse.json({ rootHash }, { status: 200 });
  } catch (error: any) {
    console.error('Error in /api/upload:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during upload.' },
      { status: 500 }
    );
  }
}
