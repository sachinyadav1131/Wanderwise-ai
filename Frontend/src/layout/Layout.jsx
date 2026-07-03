import React, { useState } from "react";
import SideBar from "./SideBar";
import Header from "./Header";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Fixed Navigation Sidebar with open/close state */}
      <SideBar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area (Offset by Sidebar Width on Desktop) */}
      <div className="flex flex-col min-h-screen main-content-layout">
        {/* Sticky Top Header with toggle handler */}
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Scrollable Page Content */}
        <main className="flex-1 px-6 sm:px-8 md:px-10 pt-10 pb-16 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}