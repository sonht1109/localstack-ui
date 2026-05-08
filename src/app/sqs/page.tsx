import { QueueList } from "@/components/sqs/QueueList";

export default function SQSPage() {
  return (
    <div className="flex-1 flex flex-col h-full">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
        <h1 className="text-xl font-semibold text-gray-800">SQS Queues</h1>
      </header>
      <div className="flex-1 overflow-auto p-8">
        <QueueList />
      </div>
    </div>
  );
}
