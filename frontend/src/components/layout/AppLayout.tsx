import { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-qtrack-dark">
      {/* Header with QTRACK branding */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="text-white hover:bg-white/10" />
            <div className="bg-gradient-qtrack-primary bg-clip-text text-transparent">
              <h1 className="qtrack-title">QTRACK</h1>
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center gap-2 text-sm text-neutral-300">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            System Active
          </div>
        </div>
      </header>

      <div className="flex w-full">
        <AppSidebar />
        <main className="flex-1 p-6 bg-gradient-qtrack-dark min-h-screen">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}