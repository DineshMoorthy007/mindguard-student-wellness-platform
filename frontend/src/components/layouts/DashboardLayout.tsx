import React, { useState } from "react";
import Sidebar from "@/components/layouts/Sidebar";
import TopNav from "@/components/layouts/TopNav";

interface DashboardLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ title, subtitle, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground flex">
      {/* Glow effects backdrop */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      
      {/* Desktop Sidebar (hidden on mobile, fixed width on md screens) */}
      <Sidebar className="hidden md:flex md:w-72 shrink-0" />

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer (sliding panel) */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 md:hidden transition-transform duration-300 ease-out transform ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} className="w-full" />
      </div>

      {/* Main Content Area */}
      <main className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <TopNav 
          title={title} 
          subtitle={subtitle} 
          onMenuClick={() => setIsMobileMenuOpen(true)} 
        />
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-5xl animate-in fade-in duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
