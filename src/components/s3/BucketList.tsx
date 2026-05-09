"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocalStackStore } from "@/store/localstack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Bucket {
  Name: string;
  CreationDate: string;
}

export function BucketList() {
  const { getActiveInstance, region, accountId } = useLocalStackStore();
  const instance = getActiveInstance();
  const url = instance?.url || "http://localhost:4566";

  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newBucketName, setNewBucketName] = useState("");

  const fetchBuckets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/s3/buckets", {
        headers: { 
          "x-localstack-url": url,
          "x-localstack-region": region,
          "x-localstack-account-id": accountId,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch buckets");
      const data = await res.json();
      setBuckets(data.buckets);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuckets();
  }, [url, region, accountId]);

  const handleCreateBucket = async () => {
    if (!newBucketName) return;
    try {
      const res = await fetch("/api/s3/buckets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-localstack-url": url,
          "x-localstack-region": region,
          "x-localstack-account-id": accountId,
        },
        body: JSON.stringify({ bucket: newBucketName }),
      });
      if (res.ok) {
        setIsAddOpen(false);
        setNewBucketName("");
        fetchBuckets();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create bucket");
      }
    } catch (err) {
      alert("Error creating bucket");
    }
  };

  const handleDeleteBucket = async (bucketName: string) => {
    if (!confirm(`Delete bucket ${bucketName}?`)) return;
    try {
      const res = await fetch(`/api/s3/buckets?bucket=${encodeURIComponent(bucketName)}`, {
        method: "DELETE",
        headers: { 
          "x-localstack-url": url,
          "x-localstack-region": region,
          "x-localstack-account-id": accountId,
        },
      });
      if (res.ok) {
        fetchBuckets();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete bucket");
      }
    } catch (err) {
      alert("Error deleting bucket");
    }
  };

  if (loading) return <div>Loading buckets...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <Input
          type="text"
          placeholder="Search buckets..."
          className="w-full max-w-sm"
        />
        <Button onClick={() => setIsAddOpen(true)}>Create Bucket</Button>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Bucket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Bucket name (e.g. my-app-assets)"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value)}
              />
              <Button onClick={handleCreateBucket} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bucket Name</TableHead>
            <TableHead>Creation Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {buckets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                No buckets found on this instance.
              </TableCell>
            </TableRow>
          ) : (
            buckets.map((bucket) => (
              <TableRow key={bucket.Name}>
                <TableCell className="font-medium text-blue-600 hover:underline">
                  <Link href={`/s3/${bucket.Name}`}>{bucket.Name}</Link>
                </TableCell>
                <TableCell className="text-gray-500">
                  {new Date(bucket.CreationDate).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" className="text-red-500" onClick={() => handleDeleteBucket(bucket.Name)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
