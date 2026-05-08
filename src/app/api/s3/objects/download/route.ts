import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "@/lib/aws/client";

export async function GET(request: NextRequest) {
  const url = request.headers.get('x-localstack-url') || 'http://localhost:4566';
  const region = request.headers.get('x-localstack-region') || 'ap-southeast-1';
  const bucket = request.nextUrl.searchParams.get('bucket');
  const key = request.nextUrl.searchParams.get('key');
  
  if (!bucket || !key) return NextResponse.json({ error: 'Bucket and key required' }, { status: 400 });

  const client = getS3Client(url, region);

  try {
    const data = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const stream = data.Body?.transformToWebStream();
    
    return new NextResponse(stream, {
      headers: {
        'Content-Type': data.ContentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${key.split('/').pop()}"`,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
