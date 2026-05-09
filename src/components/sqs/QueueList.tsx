"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
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
} from "@/components/ui/dialog";

export function QueueList() {
  const { getActiveInstance, region, accountId } = useLocalStackStore();
  const instance = getActiveInstance();
  const url = instance?.url || "http://localhost:4566";

  const [queues, setQueues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState("");

  const fetchQueues = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sqs/queues", {
        headers: { 
          "x-localstack-url": url,
          "x-localstack-region": region,
          "x-localstack-account-id": accountId,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch queues");
      const data = await res.json();
      setQueues(data.queues);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, [url, region, accountId]);

  const handleCreateQueue = async () => {
    if (!newQueueName) return;
    try {
      const res = await fetch("/api/sqs/queues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-localstack-url": url,
          "x-localstack-region": region,
          "x-localstack-account-id": accountId,
        },
        body: JSON.stringify({ queueName: newQueueName }),
      });
      if (res.ok) {
        setIsAddOpen(false);
        setNewQueueName("");
        fetchQueues();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create queue");
      }
    } catch (err) {
      alert("Error creating queue");
    }
  };

  const handleDeleteQueue = async (queueUrl: string) => {
    if (!confirm(`Delete queue?`)) return;
    try {
      const res = await fetch(`/api/sqs/queues?queueUrl=${encodeURIComponent(queueUrl)}`, {
        method: "DELETE",
        headers: { 
          "x-localstack-url": url,
          "x-localstack-region": region,
          "x-localstack-account-id": accountId,
        },
      });
      if (res.ok) {
        fetchQueues();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete queue");
      }
    } catch (err) {
      alert("Error deleting queue");
    }
  };

  const sortedQueues = [...queues].sort((a, b) => {
    return sortOrder === "asc" ? a.localeCompare(b) : b.localeCompare(a);
  });

  if (loading) return <div>Loading queues...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <Input
          type="text"
          placeholder="Search queues..."
          className="w-full max-w-sm"
        />
        <Button onClick={() => setIsAddOpen(true)}>Create Queue</Button>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Queue</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Queue name (e.g. my-queue)"
                value={newQueueName}
                onChange={(e) => setNewQueueName(e.target.value)}
              />
              <Button onClick={handleCreateQueue} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer select-none"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              <div className="flex items-center gap-1">
                Queue URL
                {sortOrder === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedQueues.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                No queues found on this instance.
              </TableCell>
            </TableRow>
          ) : (
            sortedQueues.map((qUrl) => {
              const parts = qUrl.split('/');
              const queueName = parts[parts.length - 1];
              return (
                <TableRow key={qUrl}>
                  <TableCell className="font-medium text-blue-600 hover:underline">
                    <Link href={`/sqs/${queueName}?url=${encodeURIComponent(qUrl)}`}>
                      {qUrl}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" className="text-red-500" onClick={() => handleDeleteQueue(qUrl)}>
                      Delete
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
