"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
              <textarea
                className="w-full min-h-[150px] p-2 border rounded-md"
                placeholder="Enter message body (JSON or Text)"
                value={newMessageBody}
                onChange={(e) => setNewMessageBody(e.target.value)}
              />
              <Button onClick={handleSendMessage} className="w-full">Send</Button>
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
