import { NextRequest, NextResponse } from "next/server";
import { ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "@/lib/aws/client";

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const url = request.headers.get('x-localstack-url') || 'http://localhost:4566';
  const region = request.headers.get('x-localstack-region') || 'ap-southeast-1';
  const accountId = request.headers.get('x-localstack-account-id') || '000000000000';
  const bucket = request.nextUrl.searchParams.get('bucket');
  if (!bucket) return NextResponse.json({ error: 'Bucket required' }, { status: 400 });

  const client = getS3Client(url, region, accountId);

  try {
    const data = await client.send(new ListObjectsV2Command({ Bucket: bucket }));
    return NextResponse.json({ objects: data.Contents || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const url = request.headers.get('x-localstack-url') || 'http://localhost:4566';
  const region = request.headers.get('x-localstack-region') || 'ap-southeast-1';
  const accountId = request.headers.get('x-localstack-account-id') || '000000000000';
  
  try {
    const formData = await request.formData();
    const bucket = formData.get('bucket') as string;
    const file = formData.get('file') as File;
    const key = formData.get('key') as string;

    if (!bucket || !file) {
      return NextResponse.json({ error: 'Bucket and file required' }, { status: 400 });
    }

    const client = getS3Client(url, region, accountId);
    const buffer = new Uint8Array(await file.arrayBuffer());
    
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key || file.name,
      Body: buffer,
      ContentType: file.type,
    }));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const url = request.headers.get('x-localstack-url') || 'http://localhost:4566';
  const region = request.headers.get('x-localstack-region') || 'ap-southeast-1';
  const accountId = request.headers.get('x-localstack-account-id') || '000000000000';
  const bucket = request.nextUrl.searchParams.get('bucket');
  const key = request.nextUrl.searchParams.get('key');
  
  if (!bucket || !key) return NextResponse.json({ error: 'Bucket and key required' }, { status: 400 });

  const client = getS3Client(url, region, accountId);

  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
