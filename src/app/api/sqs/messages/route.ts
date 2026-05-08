import { NextRequest, NextResponse } from "next/server";
import { SendMessageCommand, ReceiveMessageCommand, PurgeQueueCommand } from "@aws-sdk/client-sqs";
import { getSQSClient } from "@/lib/aws/client";

export async function GET(request: NextRequest) {
  const url = request.headers.get('x-localstack-url') || 'http://localhost:4566';
  const region = request.headers.get('x-localstack-region') || 'ap-southeast-1';
  const queueUrl = request.nextUrl.searchParams.get('queueUrl');
  if (!queueUrl) return NextResponse.json({ error: 'Queue URL required' }, { status: 400 });

  const client = getSQSClient(url, region);

  try {
    // Receive messages but don't delete them immediately, so they return to queue for true testing.
    // We set VisibilityTimeout to a small number so they aren't hidden forever.
    const data = await client.send(new ReceiveMessageCommand({ 
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      VisibilityTimeout: 10, 
    }));
    return NextResponse.json({ messages: data.Messages || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const url = request.headers.get('x-localstack-url') || 'http://localhost:4566';
  const region = request.headers.get('x-localstack-region') || 'ap-southeast-1';
  const client = getSQSClient(url, region);

  try {
    const body = await request.json();
    const { queueUrl, messageBody } = body;
    if (!queueUrl || !messageBody) {
      return NextResponse.json({ error: 'Queue URL and messageBody required' }, { status: 400 });
    }

    await client.send(new SendMessageCommand({ 
      QueueUrl: queueUrl,
      MessageBody: typeof messageBody === 'string' ? messageBody : JSON.stringify(messageBody)
    }));
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // We use DELETE on /api/sqs/messages to Purge the queue
  const url = request.headers.get('x-localstack-url') || 'http://localhost:4566';
  const region = request.headers.get('x-localstack-region') || 'ap-southeast-1';
  const queueUrl = request.nextUrl.searchParams.get('queueUrl');
  if (!queueUrl) return NextResponse.json({ error: 'Queue URL required' }, { status: 400 });

  const client = getSQSClient(url, region);

  try {
    await client.send(new PurgeQueueCommand({ QueueUrl: queueUrl }));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
