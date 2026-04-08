import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { useState } from "react";

export function PWAInstallBanner() {
  const { canInstall, promptInstall } = usePWAInstall();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || !user || dismissed) return null;

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Download className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm text-foreground truncate">
          Install Yoho-Books for quick access
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" className="h-8" onClick={promptInstall}>
          Install
        </Button>
        <button onClick={() => setDismissed(true)} className="p-1 rounded hover:bg-accent">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
