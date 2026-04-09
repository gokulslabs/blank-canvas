import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { AppLayout } from "@/components/AppLayout";
import { formatCurrency } from "@/lib/currency";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Building } from "lucide-react";
import { FixedAsset } from "@/types/accounting";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

function calcCurrentValue(asset: FixedAsset): number {
  const days = differenceInDays(new Date(), new Date(asset.purchaseDate));
  const years = days / 365;
  const depreciation = asset.purchaseValue * (asset.depreciationRate / 100) * years;
  return Math.max(0, asset.purchaseValue - depreciation);
}

export default function Assets() {
  const { currentOrg, currency, loading } = useApp();
  const orgId = currentOrg?.id;

  const storageKey = `yoho_assets_${orgId}`;
  const [assets, setAssets] = useState<FixedAsset[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); }
    catch { return []; }
  });

  const saveAssets = (a: FixedAsset[]) => {
    setAssets(a);
    localStorage.setItem(storageKey, JSON.stringify(a));
  };

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rate, setRate] = useState("10");
  const [desc, setDesc] = useState("");

  const totals = useMemo(() => {
    const purchase = assets.reduce((s, a) => s + a.purchaseValue, 0);
    const current = assets.reduce((s, a) => s + calcCurrentValue(a), 0);
    return { purchase, current, depreciation: purchase - current };
  }, [assets]);

  const handleAdd = () => {
    if (!name.trim() || !value || Number(value) <= 0) return;
    const asset: FixedAsset = {
      id: crypto.randomUUID(),
      organizationId: orgId || "",
      name: name.trim(),
      purchaseValue: Number(value),
      purchaseDate: date,
      depreciationRate: Number(rate) || 10,
      description: desc.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    saveAssets([...assets, asset]);
    setOpen(false);
    setName(""); setValue(""); setRate("10"); setDesc("");
    toast.success("Asset added");
  };

  const handleDelete = (id: string) => {
    saveAssets(assets.filter((a) => a.id !== id));
    toast.success("Asset removed");
  };

  if (loading) {
    return <AppLayout><div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fixed Assets</h1>
            <p className="text-sm text-muted-foreground mt-1">Track assets and depreciation</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Asset</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Add Fixed Asset</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Asset Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Office Laptop" />
                </div>
                <div className="space-y-2">
                  <Label>Purchase Value</Label>
                  <Input type="number" min="1" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Annual Depreciation Rate (%)</Label>
                  <Input type="number" min="0" max="100" value={rate} onChange={(e) => setRate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Brief description" />
                </div>
                <Button className="w-full" onClick={handleAdd} disabled={!name.trim() || !value}>
                  Add Asset
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground uppercase tracking-wider">Purchase Value</p><p className="text-xl font-bold">{formatCurrency(totals.purchase, currency)}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground uppercase tracking-wider">Current Value</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(totals.current, currency)}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Depreciation</p><p className="text-xl font-bold text-red-500">{formatCurrency(totals.depreciation, currency)}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-0">
            {assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Building className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">No assets registered</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Add your first fixed asset to track depreciation</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Purchase Date</TableHead>
                        <TableHead className="text-right">Purchase Value</TableHead>
                        <TableHead className="text-right">Current Value</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assets.map((a) => {
                        const cv = calcCurrentValue(a);
                        return (
                          <TableRow key={a.id}>
                            <TableCell>
                              <p className="font-medium text-sm">{a.name}</p>
                              {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{new Date(a.purchaseDate).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(a.purchaseValue, currency)}</TableCell>
                            <TableCell className="text-right text-sm font-semibold text-emerald-600">{formatCurrency(cv, currency)}</TableCell>
                            <TableCell><Badge variant="secondary">{a.depreciationRate}%</Badge></TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(a.id)}>
                                <Trash2 className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="md:hidden divide-y divide-border">
                  {assets.map((a) => {
                    const cv = calcCurrentValue(a);
                    return (
                      <div key={a.id} className="p-4">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-sm">{a.name}</span>
                          <span className="font-semibold text-sm text-emerald-600">{formatCurrency(cv, currency)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Purchased: {formatCurrency(a.purchaseValue, currency)}</span>
                          <span>{a.depreciationRate}% / yr</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
