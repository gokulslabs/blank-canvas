import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { Account } from "@/types/accounting";
import { accountRepo } from "@/repositories/accountRepo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ACCOUNT_TYPES: Account["type"][] = ["asset", "liability", "equity", "revenue", "expense"];

const TYPE_COLORS: Record<Account["type"], string> = {
  asset: "default",
  liability: "destructive",
  equity: "secondary",
  revenue: "default",
  expense: "secondary",
};

function AccountForm({
  initial,
  onSubmit,
  submitting,
  submitLabel,
}: {
  initial?: { code: string; name: string; type: Account["type"]; description: string };
  onSubmit: (data: { id: string; code: string; name: string; type: Account["type"]; description: string }) => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const [code, setCode] = useState(initial?.code || "");
  const [name, setName] = useState(initial?.name || "");
  const [type, setType] = useState<Account["type"]>(initial?.type || "asset");
  const [description, setDescription] = useState(initial?.description || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || submitting) return;
    onSubmit({
      id: `acc-${code.trim()}`,
      code: code.trim(),
      name: name.trim(),
      type,
      description: description.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Account Code</Label>
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 1300" required disabled={!!initial} />
      </div>
      <div>
        <Label>Account Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Inventory" required />
      </div>
      <div>
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as Account["type"])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ACCOUNT_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Description</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

export default function ChartOfAccounts() {
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountRepo.findAll(),
  });

  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);

  const createMutation = useMutation({
    mutationFn: async (data: { id: string; code: string; name: string; type: Account["type"]; description: string }) => {
      const { error } = await supabase.from("accounts").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account created");
      setCreateOpen(false);
    },
    onError: (err) => toast.error("Failed: " + (err as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; code: string; name: string; type: Account["type"]; description: string }) => {
      const { error } = await supabase
        .from("accounts")
        .update({ name: data.name, type: data.type, description: data.description })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account updated");
      setEditAccount(null);
    },
    onError: (err) => toast.error("Failed: " + (err as Error).message),
  });

  const sorted = [...accounts].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Chart of Accounts</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your accounts</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> New Account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Account</DialogTitle></DialogHeader>
              <AccountForm
                onSubmit={(d) => createMutation.mutate(d)}
                submitting={createMutation.isPending}
                submitLabel="Create Account"
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-mono text-sm">{acc.code}</TableCell>
                      <TableCell className="font-medium">{acc.name}</TableCell>
                      <TableCell>
                        <Badge variant={TYPE_COLORS[acc.type] as any} className="capitalize">{acc.type}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{acc.description}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setEditAccount(acc)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editAccount} onOpenChange={(open) => { if (!open) setEditAccount(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
            {editAccount && (
              <AccountForm
                initial={{
                  code: editAccount.code,
                  name: editAccount.name,
                  type: editAccount.type,
                  description: editAccount.description,
                }}
                onSubmit={(d) => updateMutation.mutate({ ...d, id: editAccount.id })}
                submitting={updateMutation.isPending}
                submitLabel="Save Changes"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
