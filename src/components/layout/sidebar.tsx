"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, MessageSquare, Settings, Plus, Trash2, Edit2, Check, X, ChevronsUpDown } from "lucide-react";
import { useLocalStackStore, LocalStackInstance } from "@/store/localstack";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

function InstanceItem({ inst, instancesCount, onRemove, onUpdate }: { inst: LocalStackInstance, instancesCount: number, onRemove: (id: string) => void, onUpdate: (id: string, updates: any) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(inst.name);
  const [editUrl, setEditUrl] = useState(inst.url);

  const handleSave = () => {
    if (editName && editUrl) {
      onUpdate(inst.id, { name: editName, url: editUrl });
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 text-sm p-2 bg-gray-50 rounded border border-blue-200">
        <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-xs" placeholder="Name" />
        <Input value={editUrl} onChange={e => setEditUrl(e.target.value)} className="h-7 text-xs" placeholder="URL" />
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:text-green-800" onClick={handleSave}>
            <Check className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-gray-700" onClick={() => setIsEditing(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
      <div className="flex flex-col truncate pr-2">
        <span className="font-medium truncate">{inst.name}</span>
        <span className="text-xs text-gray-500 truncate">{inst.url}</span>
      </div>
      <div className="flex shrink-0">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-500 hover:text-blue-700" onClick={() => setIsEditing(true)}>
          <Edit2 className="h-4 w-4" />
        </Button>
        {instancesCount > 1 && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => onRemove(inst.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

const AWS_REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "af-south-1", "ap-east-1", "ap-south-1", "ap-northeast-1",
  "ap-northeast-2", "ap-northeast-3", "ap-southeast-1", "ap-southeast-2",
  "ap-southeast-3", "ca-central-1", "eu-central-1", "eu-west-1",
  "eu-west-2", "eu-west-3", "eu-north-1", "eu-south-1",
  "me-south-1", "sa-east-1"
];

export function Sidebar() {
  const pathname = usePathname();
  const { 
    instances, 
    activeInstanceId, 
    setActiveInstance, 
    addInstance, 
    removeInstance, 
    updateInstance,
    region,
    accountId,
    setRegion,
    setAccountId
  } = useLocalStackStore();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("http://");
  const [isRegionOpen, setIsRegionOpen] = useState(false);

  const handleAddInstance = () => {
    if (newName && newUrl) {
      addInstance({ name: newName, url: newUrl });
      setIsAddModalOpen(false);
      setNewName("");
      setNewUrl("http://");
    }
  };

  const navLinks = [
    { href: "/s3", label: "S3 Storage", icon: Database },
    { href: "/sqs", label: "SQS Queues", icon: MessageSquare },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <span className="font-bold text-xl text-blue-600 flex items-center gap-2">
          <Database className="h-6 w-6" />
          LocalStack UI
        </span>
      </div>

      <div className="p-4 border-b border-gray-200">
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
            Active Instance
          </label>
          <Select
            value={activeInstanceId || ""}
            onValueChange={(val) => { if (val) setActiveInstance(val) }}
          >
            <SelectTrigger className="w-full bg-gray-50 text-sm">
              <SelectValue placeholder="Select instance">
                {(val: string | null) => val ? instances.find(i => i.id === val)?.name : "Select instance"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {instances.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add Instance
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add LocalStack Instance</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    placeholder="e.g. Remote Dev"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Endpoint URL</label>
                  <Input
                    placeholder="http://localhost:4566"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddInstance} className="w-full">
                  Add Instance
                </Button>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Manage Instances</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {instances.map(inst => (
                    <InstanceItem 
                      key={inst.id} 
                      inst={inst} 
                      instancesCount={instances.length}
                      onRemove={removeInstance} 
                      onUpdate={updateInstance} 
                    />
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-4 space-y-3 border-t pt-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Region
            </label>
            <Popover open={isRegionOpen} onOpenChange={setIsRegionOpen}>
              <PopoverTrigger render={<Button variant="outline" className="w-full justify-between h-8 px-3 text-sm font-normal" />}>
                {region || "Select region..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-[230px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search region..." className="h-8 text-sm" />
                  <CommandList>
                    <CommandEmpty>No region found.</CommandEmpty>
                    <CommandGroup>
                      {AWS_REGIONS.map((r) => (
                        <CommandItem
                          key={r}
                          value={r}
                          onSelect={(currentValue) => {
                            setRegion(currentValue);
                            setIsRegionOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              region === r ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {r}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Account ID
            </label>
            <Input 
              value={accountId} 
              onChange={e => setAccountId(e.target.value)} 
              className="h-8 text-sm" 
              placeholder="000000000000"
            />
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <link.icon
                className={`mr-3 h-5 w-5 ${
                  isActive ? "text-blue-500" : "text-gray-400"
                }`}
              />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}