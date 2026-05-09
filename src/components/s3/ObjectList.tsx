"use client";

import { useEffect, useState, useRef } from "react";
import { useLocalStackStore } from "@/store/localstack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
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
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";

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
  const [error, setError] = useState<string | null>(null);

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

  const handleDeleteObject = async (key: string) => {
    if (!confirm(`Delete object ${key}?`)) return;
    try {
      const client = getS3Client(url, region, accountId);
      await client.send(
        new DeleteObjectCommand({ Bucket: decodedBucket, Key: key }),
      );
      fetchObjects();
    } catch (err: any) {
      alert(err.message || "Error deleting object");
    }
  };

  if (loading) return <div>Loading objects...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <Input
          type="text"
          placeholder="Search objects..."
          className="w-full max-w-sm"
        />
        <Button onClick={() => setIsAddOpen(true)}>Upload File</Button>
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
            <TableHead>Key</TableHead>
            <TableHead>Size (Bytes)</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {objects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                No objects found in this bucket.
              </TableCell>
            </TableRow>
          ) : (
            objects.map((obj) => (
              <TableRow key={obj.Key}>
                <TableCell className="font-medium">{obj.Key}</TableCell>
                <TableCell className="text-gray-500">
                  {formatBytes(obj.Size)}
                </TableCell>
                <TableCell className="text-gray-500">
                  {new Date(obj.LastModified).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    className="text-black"
                    onClick={() => handleDownloadObject(obj.Key)}
                  >
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteObject(obj.Key)}
                  >
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
