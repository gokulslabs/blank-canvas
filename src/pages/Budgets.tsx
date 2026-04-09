import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { AppLayout } from "@/components/AppLayout";
import { formatCurrency } from "@/lib/currency";
import { useExpenses } from "@/hooks/useExpenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { Budget } from "@/types/accounting";
import { toast } from "sonner";

const CATEGORIES = [
  "Office Supplies", "Travel", "Utilities", "Marketing", "Software", "Rent", "Salaries", "Other",
];

export default function Budgets() {
  const { currentOrg, currency, loading } = useApp();
  const orgId = currentOrg?.id;
  const { data: expenses = [], isLoading } = useExpenses(orgId);

  // In-memory budgets (localStorage-backed for now)
  const storageKey = `yoho_budgets_${orgId}`;
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch { return []; }
  });

  const saveBudgets = (b: Budget[]) => {
    setBudgets(b);
    localStorage.setItem(storageKey, JSON.stringify(b));
  };

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");

  // Calculate current month spend by category
  const currentMonthSpend = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const map = new Map<string, number>();
    expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .forEach((e) => {
        map.set(e.category, (map.get(e.category) || 0) + e.amount);
      });
    return map;
  }, [expenses]);

  const handleAdd = () => {
    if (!category || !limit || Number(limit) <= 0) return;
    if (budgets.some((b) => b.category === category)) {
      toast.error("Budget for this category already exists");
      return;
    }
    const budget: Budget = {
      id: crypto.randomUUID(),
      organizationId: orgId || "",
      category,
      monthlyLimit: Number(limit),
      createdAt: new Date().toISOString(),
    };
    saveBudgets([...budgets, budget]);
    setOpen(false);
    setCategory("");
    setLimit("");
    toast.success("Budget added");
  };

  const handleDelete = (id: string) => {
    saveBudgets(budgets.filter((b) => b.id !== id));
    toast.success("Budget removed");
  };

  if (loading || isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  const usedCategories = new Set(budgets.map((b) => b.category));
  const availableCategories = CATEGORIES.filter((c) => !usedCategories.has(c));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
            <p className="text-sm text-muted-foreground mt-1">Set monthly spending limits by category</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Budget</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Set Budget</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Monthly Limit</Label>
                  <Input
                    type="number"
                    min="1"
                    step="100"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    placeholder="e.g. 50000"
                  />
                </div>
                <Button className="w-full" onClick={handleAdd} disabled={!category || !limit}>
                  Save Budget
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {budgets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <p className="font-medium text-muted-foreground">No budgets set</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Add a budget to track spending against limits</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((budget) => {
              const spent = currentMonthSpend.get(budget.category) || 0;
              const pct = Math.min(100, Math.round((spent / budget.monthlyLimit) * 100));
              const exceeded = spent > budget.monthlyLimit;
              return (
                <Card key={budget.id} className={exceeded ? "border-destructive/50" : ""}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{budget.category}</Badge>
                        {exceeded ? (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(budget.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Spent</span>
                        <span className={`font-semibold ${exceeded ? "text-destructive" : ""}`}>
                          {formatCurrency(spent, currency)} / {formatCurrency(budget.monthlyLimit, currency)}
                        </span>
                      </div>
                      <Progress value={pct} className={`h-2 ${exceeded ? "[&>div]:bg-destructive" : ""}`} />
                    </div>
                    {exceeded && (
                      <p className="text-xs text-destructive font-medium">
                        ⚠ Over budget by {formatCurrency(spent - budget.monthlyLimit, currency)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
