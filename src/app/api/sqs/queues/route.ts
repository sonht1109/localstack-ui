import { NextRequest, NextResponse } from "next/server";
import { ListQueuesCommand, CreateQueueCommand, DeleteQueueCommand, PurgeQueueCommand } from "@aws-sdk/client-sqs";
import { getSQSClient } from "@/lib/aws/client";

export async function GET(request: NextRequest) {
  const url = request.headers.get('x-localstack-url') || 'http://localhost:4566';
  const region = request.headers.get('x-localstack-region') || 'ap-southeast-1';
  const accountId = request.headers.get('x-localstack-account-id') || '000000000000';
  const client = getSQSClient(url, region, accountId);

  try {
    const data = await client.send(new ListQueuesCommand({}));
    return NextResponse.json({ queues: data.QueueUrls || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const url = request.headers.get('x-localstack-url') || 'http://localhost:4566';
  const region = request.headers.get('x-localstack-region') || 'ap-southeast-1';
  const accountId = request.headers.get('x-localstack-account-id') || '000000000000';
  const client = getSQSClient(url, region, accountId);

  try {
    const body = await request.json();
    const { queueName } = body;
    if (!queueName) return NextResponse.json({ error: 'Queue name required' }, { status: 400 });

    const data = await client.send(new CreateQueueCommand({ QueueName: queueName }));
    return NextResponse.json({ success: true, queueUrl: data.QueueUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const url = request.headers.get('x-localstack-url') || 'http://localhost:4566';
  const region = request.headers.get('x-localstack-region') || 'ap-southeast-1';
  const accountId = request.headers.get('x-localstack-account-id') || '000000000000';
  const queueUrl = request.nextUrl.searchParams.get('queueUrl');
  if (!queueUrl) return NextResponse.json({ error: 'Queue URL required' }, { status: 400 });

  const client = getSQSClient(url, region, accountId);

  try {
    // LocalStack might use localhost:4566 but the internal QueueUrl might differ slightly.
    // However, sending the full QueueUrl is correct.
    await client.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
