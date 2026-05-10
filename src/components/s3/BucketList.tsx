"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListBucketsCommand, CreateBucketCommand, DeleteBucketCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "@/lib/aws/client";
import { useLocalStackStore } from "@/store/localstack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newBucketName, setNewBucketName] = useState("");

  const fetchBuckets = async () => {
    setLoading(true);
    try {
      const client = getS3Client(url, region, accountId);
      const data = await client.send(new ListBucketsCommand({}));
      setBuckets((data.Buckets as Bucket[]) || []);
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
    setCreating(true);
    try {
      const client = getS3Client(url, region, accountId);
      await client.send(new CreateBucketCommand({ Bucket: newBucketName }));
      setIsAddOpen(false);
      setNewBucketName("");
      fetchBuckets();
    } catch (err: any) {
      alert(err.message || "Error creating bucket");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBuckets = async (bucketNames: string[]) => {
    if (bucketNames.length === 0) return;
    const isBulk = bucketNames.length > 1;
    if (!confirm(`Are you sure you want to delete ${isBulk ? `${bucketNames.length} buckets` : `bucket "${bucketNames[0]}"`}?`)) return;
    
    if (isBulk) setIsBulkDeleting(true);
    else setDeleting(bucketNames);

    try {
      const client = getS3Client(url, region, accountId);
      await Promise.all(
        bucketNames.map((name) => client.send(new DeleteBucketCommand({ Bucket: name })))
      );
      setBuckets(prev => prev.filter(b => !bucketNames.includes(b.Name)));
      setSelectedBuckets(prev => prev.filter(name => !bucketNames.includes(name)));
      toast.success(`Deleted ${bucketNames.length} bucket${isBulk ? "s" : ""}`);
    } catch (err: any) {
      toast.error(err.message || "Error deleting bucket");
    } finally {
      if (isBulk) setIsBulkDeleting(false);
      else setDeleting([]);
    }
  };

  const filteredBuckets = buckets.filter(b => 
    b.Name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedBuckets.length === filteredBuckets.length) {
      setSelectedBuckets([]);
    } else {
      setSelectedBuckets(filteredBuckets.map(b => b.Name));
    }
  };

  const toggleSelect = (name: string) => {
    setSelectedBuckets(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-gray-500 font-medium">Loading buckets...</p>
    </div>
  );
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center gap-4">
        <Input
          type="text"
          placeholder="Search buckets..."
          className="w-full max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex gap-2">
          {selectedBuckets.length > 0 && (
            <Button 
              onClick={() => handleDeleteBuckets(selectedBuckets)} 
              variant="destructive"
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Selected ({selectedBuckets.length})
            </Button>
          )}
          <Button onClick={() => setIsAddOpen(true)}>Create Bucket</Button>
        </div>
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
                disabled={creating}
              />
              <Button onClick={handleCreateBucket} className="w-full" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox 
                checked={filteredBuckets.length > 0 && selectedBuckets.length === filteredBuckets.length}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Bucket Name</TableHead>
            <TableHead>Creation Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredBuckets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                No buckets found.
              </TableCell>
            </TableRow>
          ) : (
            filteredBuckets.map((bucket) => {
              const isDeleting = deleting.includes(bucket.Name);
              return (
                <TableRow key={bucket.Name}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedBuckets.includes(bucket.Name)}
                      onCheckedChange={() => toggleSelect(bucket.Name)}
                      aria-label={`Select bucket ${bucket.Name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-black hover:underline">
                    <Link href={`/s3/${bucket.Name}`}>{bucket.Name}</Link>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {new Date(bucket.CreationDate).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="destructive" 
                      onClick={() => handleDeleteBuckets([bucket.Name])}
                      disabled={isDeleting}
                      size="sm"
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
