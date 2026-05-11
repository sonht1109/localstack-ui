"use client";

import { useEffect, useState, useRef } from "react";
import { useLocalStackStore } from "@/store/localstack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Trash2, Download, RefreshCw } from "lucide-react";
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
import { formatBytes } from "@/lib/utils";
import { getS3Client } from "@/lib/aws/client";
import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";

interface S3Object {
  Key: string;
  LastModified: string;
  Size: number;
}

export function ObjectList({ bucket }: { bucket: string }) {
  const { getActiveInstance, region, accountId } = useLocalStackStore();
  const instance = getActiveInstance();
  const url = instance?.url || "http://localhost:4566";

  const [objects, setObjects] = useState<S3Object[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const decodedBucket = decodeURIComponent(bucket);

  const fetchObjects = async () => {
    setLoading(true);
    try {
      const client = getS3Client(url, region, accountId);
      const data = await client.send(
        new ListObjectsV2Command({ Bucket: decodedBucket }),
      );
      setObjects((data.Contents as S3Object[]) || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObjects();
  }, [url, bucket, region, accountId]);

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.length) return;
    const file = fileInputRef.current.files[0];

    setUploading(true);
    try {
      const client = getS3Client(url, region, accountId);
      const fileBuffer = await file.arrayBuffer();
      
      await client.send(
        new PutObjectCommand({
          Bucket: decodedBucket,
          Key: file.name,
          Body: new Uint8Array(fileBuffer),
          ContentType: file.type,
        }),
      );

      setIsAddOpen(false);
      fetchObjects();
    } catch (err: any) {
      alert(err.message || "Error uploading file");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadObject = async (key: string) => {
    try {
      const client = getS3Client(url, region, accountId);
      const data = await client.send(
        new GetObjectCommand({ Bucket: decodedBucket, Key: key }),
      );

      if (!data.Body) throw new Error("No body returned");

      const bytes = await data.Body.transformToByteArray();
      const blob = new Blob([bytes], {
        type: data.ContentType || "application/octet-stream",
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = key.split("/").pop() || "download";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || "Error downloading object");
    }
  };

  const handleDeleteObjects = async (keys: string[]) => {
    if (keys.length === 0) return;
    const isBulk = keys.length > 1;
    if (!confirm(`Are you sure you want to delete ${isBulk ? `${keys.length} objects` : `object "${keys[0]}"`}?`)) return;
    
    if (isBulk) setIsBulkDeleting(true);
    else setDeleting(keys);

    try {
      const client = getS3Client(url, region, accountId);
      if (isBulk) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: decodedBucket,
            Delete: {
              Objects: keys.map(Key => ({ Key })),
              Quiet: true,
            },
          })
        );
      } else {
        await client.send(
          new DeleteObjectCommand({ Bucket: decodedBucket, Key: keys[0] }),
        );
      }
      
      setObjects(prev => prev.filter(obj => !keys.includes(obj.Key)));
      setSelectedObjects(prev => prev.filter(key => !keys.includes(key)));
      toast.success(`Deleted ${keys.length} object${isBulk ? "s" : ""}`);
    } catch (err: any) {
      toast.error(err.message || "Error deleting objects");
    } finally {
      if (isBulk) setIsBulkDeleting(false);
      else setDeleting([]);
    }
  };

  const filteredObjects = objects.filter(obj => 
    obj.Key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedObjects.length === filteredObjects.length) {
      setSelectedObjects([]);
    } else {
      setSelectedObjects(filteredObjects.map(obj => obj.Key));
    }
  };

  const toggleSelect = (key: string) => {
    setSelectedObjects(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-gray-500 font-medium">Loading objects...</p>
    </div>
  );
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center gap-4">
        <Input
          type="text"
          placeholder="Search objects..."
          className="w-full max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex gap-2">
          <Button onClick={fetchObjects} variant="outline" size="icon" title="Refresh">
            <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
          </Button>
          {selectedObjects.length > 0 && (
            <Button 
              onClick={() => handleDeleteObjects(selectedObjects)} 
              variant="destructive"
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Selected ({selectedObjects.length})
            </Button>
          )}
          <Button onClick={() => setIsAddOpen(true)}>Upload File</Button>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload File to {decodedBucket}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input type="file" ref={fileInputRef} disabled={uploading} />
              <Button onClick={handleUpload} className="w-full" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload"
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
                checked={filteredObjects.length > 0 && selectedObjects.length === filteredObjects.length}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredObjects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                No objects found.
              </TableCell>
            </TableRow>
          ) : (
            filteredObjects.map((obj) => {
              const isDeleting = deleting.includes(obj.Key);
              return (
                <TableRow key={obj.Key}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedObjects.includes(obj.Key)}
                      onCheckedChange={() => toggleSelect(obj.Key)}
                      aria-label={`Select object ${obj.Key}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium break-all">{obj.Key}</TableCell>
                  <TableCell className="text-gray-500">
                    {formatBytes(obj.Size)}
                  </TableCell>
                  <TableCell className="text-gray-500 whitespace-nowrap">
                    {new Date(obj.LastModified).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-black"
                      onClick={() => handleDownloadObject(obj.Key)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteObjects([obj.Key])}
                      disabled={isDeleting}
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
