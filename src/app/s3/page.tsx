import { BucketList } from "@/components/s3/BucketList";

export default function S3Page() {
  return (
    <div className="flex-1 flex flex-col h-full">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
        <h1 className="text-xl font-semibold text-gray-800">S3 Buckets</h1>
      </header>
      <div className="flex-1 overflow-auto p-8">
        <BucketList />
      </div>
    </div>
  );
}
