import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/currency";
import { downloadCSV } from "@/lib/csvExport";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useGeneralLedger } from "@/hooks/useGeneralLedger";
import { ChevronDown, Download } from "lucide-react";

type FilterPreset = "this-month" | "last-month" | "this-year" | "custom";

function getDateRange(preset: FilterPreset): { startDate: string; endDate: string } {
  const now = new Date();
  if (preset === "this-month") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: s.toISOString().split("T")[0], endDate: e.toISOString().split("T")[0] };
  }
  if (preset === "last-month") {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const e = new Date(now.getFullYear(), now.getMonth(), 0);
    return { startDate: s.toISOString().split("T")[0], endDate: e.toISOString().split("T")[0] };
  }
  if (preset === "this-year") {
    const s = new Date(now.getFullYear(), 0, 1);
    return { startDate: s.toISOString().split("T")[0], endDate: now.toISOString().split("T")[0] };
  }
  return { startDate: "", endDate: "" };
}

export default function GeneralLedger() {
  const { currentOrg, currency } = useApp();
  const [preset, setPreset] = useState<FilterPreset>("this-year");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const dateRange = useMemo(() => {
    if (preset === "custom") return { startDate: customStart, endDate: customEnd };
    return getDateRange(preset);
  }, [preset, customStart, customEnd]);

  const { data: groups = [], isLoading } = useGeneralLedger({
    orgId: currentOrg?.id,
    startDate: dateRange.startDate || undefined,
    endDate: dateRange.endDate || undefined,
  });

  const handleExport = () => {
    const headers = ["Account Code", "Account Name", "Date", "Description", "Debit", "Credit", "Balance"];
    const rows: (string | number)[][] = [];
    for (const g of groups) {
      for (const l of g.lines) {
        rows.push([g.accountCode, g.accountName, l.date, l.description, l.debit, l.credit, l.runningBalance]);
      }
    }
    downloadCSV("general-ledger.csv", headers, rows);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">General Ledger</h1>
            <p className="text-sm text-muted-foreground mt-1">All journal entries grouped by account</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={groups.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          {(["this-month", "last-month", "this-year", "custom"] as FilterPreset[]).map((p) => (
            <Button key={p} variant={preset === p ? "default" : "outline"} size="sm" onClick={() => setPreset(p)}>
              {p === "this-month" ? "This Month" : p === "last-month" ? "Last Month" : p === "this-year" ? "This Year" : "Custom"}
            </Button>
          ))}
          {preset === "custom" && (
            <div className="flex gap-2 items-end">
              <div>
                <Label className="text-xs">From</Label>
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9" />
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No journal entries found for this period.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <Collapsible key={group.accountId} defaultOpen>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-xs text-muted-foreground">{group.accountCode}</span>
                          {group.accountName}
                        </span>
                        <span className="font-bold">
                          {formatCurrency(group.balance, currency)}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-28">Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right w-28">Debit</TableHead>
                            <TableHead className="text-right w-28">Credit</TableHead>
                            <TableHead className="text-right w-32">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.lines.map((line, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-muted-foreground text-xs">{line.date}</TableCell>
                              <TableCell className="text-sm">{line.description}</TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {line.debit > 0 ? formatCurrency(line.debit, currency) : "—"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {line.credit > 0 ? formatCurrency(line.credit, currency) : "—"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm font-medium">
                                {formatCurrency(line.runningBalance, currency)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={2} className="font-medium">Total</TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              {formatCurrency(group.totalDebit, currency)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              {formatCurrency(group.totalCredit, currency)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              {formatCurrency(group.balance, currency)}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
