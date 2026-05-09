"use client";

import { useEffect, useState, useRef } from "react";
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
  const [error, setError] = useState<string | null>(null);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchObjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/s3/objects?bucket=${encodeURIComponent(bucket)}`, {
        headers: { 
          "x-localstack-url": url,
          "x-localstack-region": region,
          "x-localstack-account-id": accountId,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch objects");
      const data = await res.json();
      setObjects(data.objects);
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
    
    const formData = new FormData();
    formData.append("bucket", bucket);
    formData.append("file", file);
    formData.append("key", file.name);

    try {
      const res = await fetch("/api/s3/objects", {
        method: "POST",
        headers: {
          "x-localstack-url": url,
          "x-localstack-region": region,
          "x-localstack-account-id": accountId,
        },
        body: formData,
      });
      
      if (res.ok) {
        setIsAddOpen(false);
        fetchObjects();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to upload file");
      }
    } catch (err) {
      alert("Error uploading file");
    }
  };

  const handleDownloadObject = async (key: string) => {
    try {
      const res = await fetch(`/api/s3/objects/download?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(key)}`, {
        headers: { 
          "x-localstack-url": url,
          "x-localstack-region": region,
          "x-localstack-account-id": accountId,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to download object");
        return;
      }
      
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = key.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      alert("Error downloading object");
    }
  };

  const handleDeleteObject = async (key: string) => {
    if (!confirm(`Delete object ${key}?`)) return;
    try {
      const res = await fetch(`/api/s3/objects?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: { 
          "x-localstack-url": url,
          "x-localstack-region": region,
          "x-localstack-account-id": accountId,
        },
      });
      if (res.ok) {
        fetchObjects();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete object");
      }
    } catch (err) {
      alert("Error deleting object");
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
              <DialogTitle>Upload File to {bucket}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                type="file"
                ref={fileInputRef}
              />
              <Button onClick={handleUpload} className="w-full">Upload</Button>
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
                <TableCell className="text-gray-500">{obj.Size}</TableCell>
                <TableCell className="text-gray-500">
                  {new Date(obj.LastModified).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" className="text-blue-500" onClick={() => handleDownloadObject(obj.Key)}>
                    Download
                  </Button>
                  <Button variant="ghost" className="text-red-500" onClick={() => handleDeleteObject(obj.Key)}>
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
