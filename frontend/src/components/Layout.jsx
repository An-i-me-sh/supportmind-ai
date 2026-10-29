import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Layout({ children, pageTitle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "admin";

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
      html.classList.remove("light");
    } else {
      html.classList.add("light");
      html.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const menuItems = [
    ...(isAdmin ? [{ label: "Dashboard", icon: "dashboard", path: "/" }] : []),
    { label: "AI Chat", icon: "forum", path: "/chat" },
    ...(isAdmin ? [{ label: "Documents", icon: "description", path: "/documents" }] : []),
    { label: "Support Tickets", icon: "confirmation_number", path: "/tickets" },
  ];

  return (
    <div className="min-h-screen bg-background text-on-background flex">
      {/* Sidebar navigation */}
      <aside className="fixed left-0 top-0 h-screen w-[280px] bg-surface dark:bg-inverse-surface border-r border-outline-variant dark:border-outline flex flex-col py-lg gap-sm z-50">
        <div className="px-lg mb-xl">
          <h1 className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed">SupportMind AI</h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant opacity-70">Enterprise Intelligence</p>
        </div>

        <nav className="flex-1 flex flex-col gap-xs px-sm">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-md px-md py-sm rounded-lg transition-colors cursor-pointer active:scale-95 duration-200 ${
                  isActive
                    ? "text-primary dark:text-primary-fixed font-bold bg-primary-container/10 dark:bg-primary-container/20 border-l-4 border-primary"
                    : "text-on-surface-variant dark:text-outline-variant hover:bg-surface-container-highest dark:hover:bg-surface-variant/10"
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-label-md text-label-md">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-md mt-auto pt-lg">
          <div className="bg-surface-container-low dark:bg-surface-variant/5 rounded-xl p-md border border-outline-variant/30">
            <div className="flex justify-between items-center mb-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Storage Status</span>
              <span className="font-label-sm text-label-sm text-primary font-bold">Active</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-primary-container w-[100%]"></div>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">Connected to Local Embeddings</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 pl-[280px] min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="h-[72px] border-b border-outline-variant dark:border-outline flex items-center justify-between px-2xl bg-surface/50 dark:bg-inverse-surface/50 backdrop-blur-md sticky top-0 z-40">
          <h2 className="font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface font-semibold capitalize">
            {pageTitle || "SupportMind AI"}
          </h2>

          <div className="flex items-center gap-xl">
            {/* Theme toggle track */}
            <button
              onClick={toggleTheme}
              id="theme-toggle"
              className="w-14 h-8 bg-surface-container-high dark:bg-surface-variant rounded-full p-1 relative flex items-center transition-colors outline-none cursor-pointer"
            >
              <div
                id="theme-thumb"
                className="w-6 h-6 bg-primary dark:bg-primary-fixed-dim rounded-full flex items-center justify-center transition-all duration-300 transform"
                style={{
                  transform: theme === "dark" ? "translateX(24px) rotate(180deg)" : "translateX(0px) rotate(0deg)",
                }}
              >
                <span id="theme-icon" className="material-symbols-outlined text-[16px] text-on-primary dark:text-on-primary-fixed">
                  {theme === "dark" ? "dark_mode" : "light_mode"}
                </span>
              </div>
            </button>

            {/* Profile actions */}
            <div className="flex items-center gap-md border-l border-outline-variant dark:border-outline pl-xl">
              <div className="text-right">
                <p className="font-label-md text-label-md font-bold text-on-surface dark:text-inverse-on-surface">
                  {user.full_name || "Enterprise User"}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant capitalize">
                  {user.role || "User"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-full bg-error-container/10 hover:bg-error-container/20 text-error flex items-center justify-center transition-colors cursor-pointer"
                title="Log Out"
              >
                <span className="material-symbols-outlined">logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic page container */}
        <main className="flex-1 p-2xl">
          {children}
        </main>
      </div>
    </div>
  );
}
