import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Receipt, X } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { useExpenses } from "@/hooks/useExpenses";

interface SearchResult {
  id: string;
  type: "invoice" | "expense";
  title: string;
  subtitle: string;
  amount: number;
}

export function GlobalSearch() {
  const { currentOrg, currency } = useApp();
  const orgId = currentOrg?.id;
  const { data: invoices = [] } = useInvoices(orgId);
  const { data: expenses = [] } = useExpenses(orgId);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const invResults: SearchResult[] = invoices
      .filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q)
      )
      .map((inv) => ({
        id: inv.id,
        type: "invoice" as const,
        title: `${inv.invoiceNumber} — ${inv.customerName}`,
        subtitle: `${inv.status} • ${new Date(inv.createdAt).toLocaleDateString()}`,
        amount: inv.total,
      }));

    const expResults: SearchResult[] = expenses
      .filter(
        (exp) =>
          exp.vendorName.toLowerCase().includes(q) ||
          exp.category.toLowerCase().includes(q) ||
          (exp.description || "").toLowerCase().includes(q)
      )
      .map((exp) => ({
        id: exp.id,
        type: "expense" as const,
        title: `${exp.vendorName} — ${exp.category}`,
        subtitle: new Date(exp.date).toLocaleDateString(),
        amount: exp.amount,
      }));

    return [...invResults, ...expResults].slice(0, 10);
  }, [query, invoices, expenses]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setQuery("");
      setOpen(false);
      navigate(result.type === "invoice" ? "/invoices" : "/expenses");
    },
    [navigate]
  );

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(!!e.target.value.trim());
          }}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder="Search invoices, expenses..."
          className="pl-9 pr-8 h-9"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-lg z-50 max-h-80 overflow-auto">
          {results.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelect(result)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left transition-colors"
            >
              {result.type === "invoice" ? (
                <FileText className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{result.title}</p>
                <p className="text-xs text-muted-foreground">{result.subtitle}</p>
              </div>
              <div className="text-sm font-medium shrink-0">
                {formatCurrency(result.amount, currency)}
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                {result.type}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {open && query.trim() && results.length === 0 && (
        <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
          No results for "{query}"
        </div>
      )}
    </div>
  );
}
