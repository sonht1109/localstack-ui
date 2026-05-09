import { NextRequest, NextResponse } from "next/server";
import { ListBucketsCommand, CreateBucketCommand, DeleteBucketCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "@/lib/aws/client";

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const url = request.headers.get('x-localstack-url') || 'http://localhost:4566';
  const region = request.headers.get('x-localstack-region') || 'ap-southeast-1';
  const accountId = request.headers.get('x-localstack-account-id') || '000000000000';
  const client = getS3Client(url, region, accountId);

  try {
    const data = await client.send(new ListBucketsCommand({}));
    return NextResponse.json({ buckets: data.Buckets || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const url = request.headers.get('x-localstack-url') || 'http://localhost:4566';
  const region = request.headers.get('x-localstack-region') || 'ap-southeast-1';
  const accountId = request.headers.get('x-localstack-account-id') || '000000000000';
  const client = getS3Client(url, region, accountId);

  try {
    const body = await request.json();
    const { bucket } = body;
    if (!bucket) return NextResponse.json({ error: 'Bucket name required' }, { status: 400 });

    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    return NextResponse.json({ success: true, bucket });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const url = request.headers.get('x-localstack-url') || 'http://localhost:4566';
  const region = request.headers.get('x-localstack-region') || 'ap-southeast-1';
  const accountId = request.headers.get('x-localstack-account-id') || '000000000000';
  const bucket = request.nextUrl.searchParams.get('bucket');
  if (!bucket) return NextResponse.json({ error: 'Bucket name required' }, { status: 400 });

  const client = getS3Client(url, region, accountId);

  try {
    await client.send(new DeleteBucketCommand({ Bucket: bucket }));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
