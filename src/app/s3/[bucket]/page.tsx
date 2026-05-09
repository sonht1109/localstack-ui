import { ObjectList } from "@/components/s3/ObjectList";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const runtime = 'edge';

export default async function BucketPage({ params }: { params: Promise<{ bucket: string }> }) {
  const resolvedParams = await params;
  return (
    <div className="flex-1 flex flex-col h-full">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shrink-0 gap-4">
        <Link href="/s3" className="text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-800">
          Bucket: {resolvedParams.bucket}
        </h1>
      </header>
      <div className="flex-1 overflow-auto p-8">
        <ObjectList bucket={resolvedParams.bucket} />
      </div>
    </div>
  );
}
