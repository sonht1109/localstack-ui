import { MessageList } from "@/components/sqs/MessageList";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";

export default async function QueuePage(props: { params: Promise<{ queue: string }> }) {
  const params = await props.params;
  const queue = params.queue;
  
  return (
    <div className="flex-1 flex flex-col h-full">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shrink-0 gap-4">
        <Link href="/sqs" className="text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-800">
          Queue: {queue}
        </h1>
      </header>
      <div className="flex-1 overflow-auto p-8">
        <Suspense fallback={<div>Loading...</div>}>
          <MessageList />
        </Suspense>
      </div>
    </div>
  );
}
