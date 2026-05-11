"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { signOut, useSession } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";

interface Workspace {
  id: string;
  name: string;
  isActive?: boolean;
}

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onWorkspaceSelect: (id: string) => void;
  onWorkspaceCreate: () => void;
}

export function Sidebar({
  workspaces,
  activeWorkspaceId,
  onWorkspaceSelect,
  onWorkspaceCreate,
}: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <aside className="w-[240px] h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">祝</span>
          </div>
          <span className="font-semibold text-lg">祝融 Agent</span>
        </div>
      </div>

      {/* 工作区列表 */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="text-xs text-muted-foreground mb-2 px-2">工作区</div>
        <div className="space-y-1">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => onWorkspaceSelect(ws.id)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                ws.id === activeWorkspaceId
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              <span className="truncate">{ws.name}</span>
            </button>
          ))}
        </div>

        {/* 新建工作区 */}
        <button
          onClick={onWorkspaceCreate}
          className="w-full mt-3 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary hover:text-primary transition-colors text-muted-foreground"
        >
          + 新建工作区
        </button>
      </div>

      {/* 用户中心 */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
              {session?.user?.name?.[0] || "U"}
            </div>
            <span className="flex-1 text-left truncate text-sm">
              {session?.user?.name || "用户"}
            </span>
          </button>

          {/* 用户菜单 */}
          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border rounded-lg shadow-lg overflow-hidden">
              <button
                onClick={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
              >
                {theme === "dark" ? "☀️ 亮色模式" : "🌙 暗色模式"}
              </button>
              <button
                onClick={() => signOut()}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted text-destructive"
              >
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
