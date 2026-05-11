"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ReceiveMessageCommand, SendMessageCommand, PurgeQueueCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { getSQSClient } from "@/lib/aws/client";
import { useLocalStackStore } from "@/store/localstack";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Wand2, Loader2, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
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

interface SQSMessage {
  MessageId: string;
  Body: string;
  ReceiptHandle: string;
}

export function MessageList() {
  const searchParams = useSearchParams();
  const queueUrl = searchParams.get("url");

  const { getActiveInstance, region, accountId } = useLocalStackStore();
  const instance = getActiveInstance();
  const url = instance?.url || "http://localhost:4566";

  const [messages, setMessages] = useState<SQSMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newMessageBody, setNewMessageBody] = useState("");
  const [messageMode, setMessageMode] = useState<"text" | "json">("text");

  const jsonError = useMemo(() => {
    if (messageMode !== "json" || !newMessageBody) return null;
    try {
      JSON.parse(newMessageBody);
      return null;
    } catch (err: any) {
      return err.message;
    }
  }, [messageMode, newMessageBody]);

  const handleBeautifyJson = () => {
    try {
      const json = JSON.parse(newMessageBody);
      setNewMessageBody(JSON.stringify(json, null, 2));
      toast.success("JSON beautified");
    } catch (err) {
      toast.error("Invalid JSON format");
    }
  };

  const fetchMessages = async () => {
    if (!queueUrl) return;
    setLoading(true);
    try {
      const client = getSQSClient(url, region, accountId);
      const data = await client.send(new ReceiveMessageCommand({ 
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        VisibilityTimeout: 10, 
      }));
      setMessages((data.Messages as SQSMessage[]) || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [url, queueUrl, region, accountId]);

  const handleSendMessage = async () => {
    if (!queueUrl || !newMessageBody) return;
    setSending(true);
    try {
      const client = getSQSClient(url, region, accountId);
      await client.send(new SendMessageCommand({ 
        QueueUrl: queueUrl,
        MessageBody: newMessageBody
      }));
      setIsAddOpen(false);
      setNewMessageBody("");
      fetchMessages();
      toast.success("Message sent successfully");
    } catch (err: any) {
      alert(err.message || "Error sending message");
    } finally {
      setSending(false);
    }
  };

  const handlePurgeQueue = async () => {
    if (!queueUrl || !confirm("Are you sure you want to purge all messages in this queue?")) return;
    setLoading(true);
    try {
      const client = getSQSClient(url, region, accountId);
      await client.send(new PurgeQueueCommand({ QueueUrl: queueUrl }));
      fetchMessages();
      toast.success("Queue purged successfully");
    } catch (err: any) {
      toast.error(err.message || "Error purging queue");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessages = async (receiptHandles: string[]) => {
    if (!queueUrl || receiptHandles.length === 0) return;
    
    const isBulk = receiptHandles.length > 1;
    if (isBulk) setIsBulkDeleting(true);
    else setDeleting(receiptHandles);

    try {
      const client = getSQSClient(url, region, accountId);
      await Promise.all(
        receiptHandles.map((handle) =>
          client.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: handle }))
        )
      );
      
      setMessages(prev => prev.filter(m => !receiptHandles.includes(m.ReceiptHandle)));
      setSelectedMessages(prev => prev.filter(h => !receiptHandles.includes(h)));
      toast.success(`Deleted ${receiptHandles.length} message${isBulk ? "s" : ""}`);
    } catch (err: any) {
      toast.error(err.message || "Error deleting messages");
    } finally {
      if (isBulk) setIsBulkDeleting(false);
      else setDeleting([]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedMessages.length === messages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(messages.map(m => m.ReceiptHandle));
    }
  };

  const toggleSelect = (receiptHandle: string) => {
    setSelectedMessages(prev =>
      prev.includes(receiptHandle)
        ? prev.filter(h => h !== receiptHandle)
        : [...prev, receiptHandle]
    );
  };

  if (!queueUrl) return <div>Invalid queue URL.</div>;

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center gap-4">
        <div className="flex gap-2">
          {selectedMessages.length > 0 && (
            <Button 
              onClick={() => handleDeleteMessages(selectedMessages)} 
              variant="destructive"
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Selected ({selectedMessages.length})
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchMessages} variant="outline" size="icon" title="Refresh">
            <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
          </Button>
          <Button onClick={fetchMessages} variant="outline" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? "Polling..." : "Receive Messages"}
          </Button>
          <Button onClick={handlePurgeQueue} variant="destructive" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Purge Queue
          </Button>
          <Button onClick={() => setIsAddOpen(true)}>Send Message</Button>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setMessageMode("text")}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-all",
                      messageMode === "text"
                        ? "bg-white shadow-sm text-gray-900"
                        : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    Text
                  </button>
                  <button
                    onClick={() => setMessageMode("json")}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-all",
                      messageMode === "json"
                        ? "bg-white shadow-sm text-gray-900"
                        : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    JSON
                  </button>
                </div>
                {messageMode === "json" && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleBeautifyJson}
                    className="h-7 text-xs"
                    disabled={!newMessageBody}
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    Beautify
                  </Button>
                )}
              </div>
              <div className="space-y-1 w-full overflow-hidden">
                <Textarea
                  className={cn(
                    "min-h-[150px] font-mono text-xs w-full",
                    jsonError && "border-destructive focus-visible:ring-destructive/20"
                  )}
                  placeholder={messageMode === "json" ? '{ "key": "value" }' : "Enter message body..."}
                  value={newMessageBody}
                  onChange={(e) => setNewMessageBody(e.target.value)}
                  aria-invalid={!!jsonError}
                />
                {jsonError && (
                  <p className="text-[10px] text-destructive font-medium">
                    Invalid JSON: {jsonError}
                  </p>
                )}
              </div>
              <Button onClick={handleSendMessage} className="w-full" disabled={!!jsonError || sending}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send"
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
                checked={messages.length > 0 && selectedMessages.length === messages.length}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Message ID</TableHead>
            <TableHead>Body</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                No messages received.
              </TableCell>
            </TableRow>
          ) : (
            messages.map((msg) => (
              <TableRow key={msg.MessageId}>
                <TableCell>
                  <Checkbox 
                    checked={selectedMessages.includes(msg.ReceiptHandle)}
                    onCheckedChange={() => toggleSelect(msg.ReceiptHandle)}
                    aria-label={`Select message ${msg.MessageId}`}
                  />
                </TableCell>
                <TableCell className="font-medium text-xs break-all w-[250px]">
                  {msg.MessageId}
                </TableCell>
                <TableCell className="text-sm font-mono whitespace-pre-wrap break-all">
                  {msg.Body}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteMessages([msg.ReceiptHandle])}
                    disabled={deleting.includes(msg.ReceiptHandle)}
                  >
                    {deleting.includes(msg.ReceiptHandle) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Delete"
                    )}
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
