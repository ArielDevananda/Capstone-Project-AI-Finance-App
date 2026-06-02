"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/sidebar";
import TopNavbar from "@/components/topnavbar";
import FloatingAI from "@/components/floating_ai";

export default function LayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- ROUTES EXEMPT FROM SIDEBAR & NAVBAR ---
  const publicRoutes = ["/login", "/register", "/forgot-password"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // --- AUTH REDIRECT & THEME RESET EFFECT ---
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // If unauthenticated, force fallback to light theme
        if (theme !== "light") {
          setTheme("light");
        }
        // Redirect unauthenticated access to internal pages
        if (!isPublicRoute) {
          router.push("/login");
        }
      }
    }
  }, [isLoading, isAuthenticated, isPublicRoute, router, theme, setTheme]);

  // --- SHOW LOADING STATE WHILE INITIALIZING ---
  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin">
            <svg
              className="w-12 h-12 text-slate-800 dark:text-slate-100"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <p className="text-slate-600 dark:text-slate-300">Importing security data...</p>
        </div>
      </div>
    );
  }

  // --- HIDE SIDEBAR/NAVBAR FOR PUBLIC ROUTES ---
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // --- TEMPORARY LOADING SCREEN BEFORE UNAUTHENTICATED REDIRECT ---
  if (!isAuthenticated && !isPublicRoute) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
        <div className="text-center space-y-4">
          <p className="text-slate-600 dark:text-slate-300">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN APP LAYOUT FOR AUTHENTICATED USERS ---
  return (
    <>
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
      />

      <div
        className={`flex-1 flex flex-col min-h-screen relative transition-all duration-300 ml-0 ${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <TopNavbar onMobileMenuToggle={() => setIsMobileMenuOpen(true)} />

        <div className="p-4 md:p-8 flex-1 w-full max-w-full overflow-x-hidden">{children}</div>

        {/* Floating AI Button */}
        <FloatingAI />
      </div>
    </>
  );
}
