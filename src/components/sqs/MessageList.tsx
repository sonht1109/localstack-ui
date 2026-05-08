"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLocalStackStore } from "@/store/localstack";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Wand2 } from "lucide-react";
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

  const { getActiveInstance, region, userId } = useLocalStackStore();
  const instance = getActiveInstance();
  const url = instance?.url || "http://localhost:4566";

  const [messages, setMessages] = useState<SQSMessage[]>([]);
  const [loading, setLoading] = useState(false);
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
      const res = await fetch(`/api/sqs/messages?queueUrl=${encodeURIComponent(queueUrl)}`, {
        headers: { 
          "x-localstack-url": url,
          "x-localstack-region": region,
          "x-localstack-user-id": userId,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data.messages);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [url, queueUrl, region, userId]);

  const handleSendMessage = async () => {
    if (!queueUrl || !newMessageBody) return;
    try {
      const res = await fetch("/api/sqs/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-localstack-url": url,
          "x-localstack-region": region,
          "x-localstack-user-id": userId,
        },
        body: JSON.stringify({ queueUrl, messageBody: newMessageBody }),
      });
      
      if (res.ok) {
        setIsAddOpen(false);
        setNewMessageBody("");
        fetchMessages();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send message");
      }
    } catch (err) {
      alert("Error sending message");
    }
  };

  const handlePurgeQueue = async () => {
    if (!queueUrl || !confirm("Are you sure you want to purge all messages in this queue?")) return;
    try {
      const res = await fetch(`/api/sqs/messages?queueUrl=${encodeURIComponent(queueUrl)}`, {
        method: "DELETE",
        headers: { 
          "x-localstack-url": url,
          "x-localstack-region": region,
          "x-localstack-user-id": userId,
        },
      });
      if (res.ok) {
        fetchMessages();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to purge queue");
      }
    } catch (err) {
      alert("Error purging queue");
    }
  };

  if (!queueUrl) return <div>Invalid queue URL.</div>;

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={fetchMessages} variant="outline" disabled={loading}>
            {loading ? "Polling..." : "Receive Messages"}
          </Button>
          <Button onClick={handlePurgeQueue} variant="destructive">
            Purge Queue
          </Button>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>Send Message</Button>
        
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
              <div className="space-y-1">
                <Textarea
                  className={cn(
                    "min-h-[150px] font-mono text-xs",
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
              <Button onClick={handleSendMessage} className="w-full" disabled={!!jsonError}>
                Send
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Message ID</TableHead>
            <TableHead>Body</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                No messages received.
              </TableCell>
            </TableRow>
          ) : (
            messages.map((msg) => (
              <TableRow key={msg.MessageId}>
                <TableCell className="font-medium text-xs break-all w-[250px]">
                  {msg.MessageId}
                </TableCell>
                <TableCell className="text-sm font-mono whitespace-pre-wrap break-all">
                  {msg.Body}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
