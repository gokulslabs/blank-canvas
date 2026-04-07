import { AppSidebar } from "@/components/AppSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div className="border-b border-border px-6 py-3 flex items-center">
          <GlobalSearch />
        </div>
        <div className="max-w-6xl mx-auto p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
