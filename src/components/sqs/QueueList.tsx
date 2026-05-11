"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListQueuesCommand, CreateQueueCommand, DeleteQueueCommand } from "@aws-sdk/client-sqs";
import { Loader2, ArrowDown, ArrowUp, Trash2, RefreshCw } from "lucide-react";
import { getSQSClient } from "@/lib/aws/client";
import { useLocalStackStore } from "@/store/localstack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

export function QueueList() {
  const { getActiveInstance, region, accountId } = useLocalStackStore();
  const instance = getActiveInstance();
  const url = instance?.url || "http://localhost:4566";

  const [queues, setQueues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedQueues, setSelectedQueues] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");
  
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

  const handleDeleteQueue = async (queueUrls: string[]) => {
    if (queueUrls.length === 0) return;
    const isBulk = queueUrls.length > 1;
    if (!confirm(`Are you sure you want to delete ${isBulk ? `${queueUrls.length} queues` : "this queue"}?`)) return;
    
    if (isBulk) setIsBulkDeleting(true);
    else setDeleting(queueUrls);

    try {
      const client = getSQSClient(url, region, accountId);
      await Promise.all(
        queueUrls.map((qUrl) => client.send(new DeleteQueueCommand({ QueueUrl: qUrl })))
      );
      setQueues(prev => prev.filter(q => !queueUrls.includes(q)));
      setSelectedQueues(prev => prev.filter(q => !queueUrls.includes(q)));
      toast.success(`Deleted ${queueUrls.length} queue${isBulk ? "s" : ""}`);
    } catch (err: any) {
      toast.error(err.message || "Error deleting queue");
    } finally {
      if (isBulk) setIsBulkDeleting(false);
      else setDeleting([]);
    }
  };

  const filteredQueues = queues.filter(q => q.toLowerCase().includes(searchQuery.toLowerCase()));

  const sortedQueues = [...filteredQueues].sort((a, b) => {
    return sortOrder === "asc" ? a.localeCompare(b) : b.localeCompare(a);
  });

  const toggleSelectAll = () => {
    if (selectedQueues.length === sortedQueues.length) {
      setSelectedQueues([]);
    } else {
      setSelectedQueues(sortedQueues);
    }
  };

  const toggleSelect = (queueUrl: string) => {
    setSelectedQueues(prev =>
      prev.includes(queueUrl)
        ? prev.filter(q => q !== queueUrl)
        : [...prev, queueUrl]
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-gray-500 font-medium">Loading queues...</p>
    </div>
  );
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center gap-4">
        <Input
          type="text"
          placeholder="Search queues..."
          className="w-full max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex gap-2">
          <Button onClick={fetchQueues} variant="outline" size="icon" title="Refresh">
            <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
          </Button>
          {selectedQueues.length > 0 && (
            <Button 
              onClick={() => handleDeleteQueue(selectedQueues)} 
              variant="destructive"
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Selected ({selectedQueues.length})
            </Button>
          )}
          <Button onClick={() => setIsAddOpen(true)}>Create Queue</Button>
        </div>
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
            <TableHead className="w-[40px]">
              <Checkbox 
                checked={sortedQueues.length > 0 && selectedQueues.length === sortedQueues.length}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
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
              <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                No queues found on this instance.
              </TableCell>
            </TableRow>
          ) : (
            sortedQueues.map((qUrl) => {
              const parts = qUrl.split('/');
              const queueName = parts[parts.length - 1];
              const isDeleting = deleting.includes(qUrl);
              return (
                <TableRow key={qUrl}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedQueues.includes(qUrl)}
                      onCheckedChange={() => toggleSelect(qUrl)}
                      aria-label={`Select queue ${queueName}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-black hover:underline">
                    <Link href={`/sqs/${queueName}?url=${encodeURIComponent(qUrl)}`}>
                      {qUrl}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="destructive" 
                      onClick={() => handleDeleteQueue([qUrl])}
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
