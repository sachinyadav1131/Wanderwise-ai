import React from "react";
import SideBar from "./SideBar";
import Header from "./Header";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Fixed Navigation Sidebar (Width: 16rem / 64px) */}
      <SideBar />

      {/* Main Content Area (Offset by Sidebar Width) */}
      <div className="flex flex-col min-h-screen" style={{ marginLeft: "256px" }}>
        {/* Sticky Top Header */}
        <Header />

        {/* Scrollable Page Content */}
        <main className="flex-1 px-6 sm:px-8 md:px-10 pt-10 pb-16 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}