"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListQueuesCommand, CreateQueueCommand, DeleteQueueCommand } from "@aws-sdk/client-sqs";
import { Loader2, ArrowDown, ArrowUp } from "lucide-react";
import { getSQSClient } from "@/lib/aws/client";
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
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState("");

  const fetchQueues = async () => {
    setLoading(true);
    try {
      const client = getSQSClient(url, region, accountId);
      const data = await client.send(new ListQueuesCommand({}));
      setQueues(data.QueueUrls || []);
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
    setCreating(true);
    try {
      const client = getSQSClient(url, region, accountId);
      await client.send(new CreateQueueCommand({ QueueName: newQueueName }));
      setIsAddOpen(false);
      setNewQueueName("");
      fetchQueues();
    } catch (err: any) {
      alert(err.message || "Error creating queue");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteQueue = async (queueUrl: string) => {
    if (!confirm(`Delete queue?`)) return;
    try {
      const client = getSQSClient(url, region, accountId);
      await client.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
      fetchQueues();
    } catch (err: any) {
      alert(err.message || "Error deleting queue");
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
                disabled={creating}
              />
              <Button onClick={handleCreateQueue} className="w-full" disabled={creating}>
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
                  <TableCell className="font-medium text-black hover:underline">
                    <Link href={`/sqs/${queueName}?url=${encodeURIComponent(qUrl)}`}>
                      {qUrl}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" onClick={() => handleDeleteQueue(qUrl)}>
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
