"use client";

import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  LogOut,
  Moon,
  Sun,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Workspace } from "@/lib/types";

export function Sidebar({
  workspaces,
  activeWorkspaceId,
  onWorkspaceSelect,
  onWorkspaceCreate,
  collapsed,
  onToggleCollapse,
}: {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onWorkspaceSelect: (id: string) => void;
  onWorkspaceCreate: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`flex flex-col bg-sidebar-bg rounded-2xl overflow-hidden transition-all duration-300 relative ${
        collapsed ? "w-[60px]" : "w-[240px]"
      }`}
    >
      <div
        className={`flex items-center gap-2.5 px-4 pt-3.5 pb-0 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        {!collapsed && (
          <img src="/logo.svg" alt="祝融" className="w-10 h-10 rounded-lg flex-shrink-0" />
        )}
        {!collapsed && <span className="text-sm font-semibold">祝融 Agent</span>}
        <button
          onClick={onToggleCollapse}
          className={`w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-sidebar-hover hover:text-foreground transition-colors flex-shrink-0 ${
            collapsed ? "" : "ml-auto"
          }`}
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="flex-1 p-3 overflow-y-auto">
        {!collapsed && (
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
            工作区
          </div>
        )}
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => onWorkspaceSelect(ws.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
              collapsed ? "justify-center px-0" : ""
            } ${
              ws.id === activeWorkspaceId
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
            }`}
            title={collapsed ? ws.name : undefined}
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                ws.id === activeWorkspaceId
                  ? "bg-primary shadow-[0_0_8px_rgba(8,145,178,0.5)]"
                  : "bg-muted-foreground"
              }`}
            />
            {!collapsed && <span className="truncate">{ws.name}</span>}
          </button>
        ))}

        <button
          onClick={onWorkspaceCreate}
          className={`w-full flex items-center gap-2 px-3 py-2 mt-2 rounded-lg border border-dashed border-border text-muted-foreground text-sm hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors ${
            collapsed ? "justify-center px-0" : ""
          }`}
          title="新建工作区"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>新建工作区</span>}
        </button>
      </div>

      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-sidebar-hover transition-colors ${
                collapsed ? "justify-center px-0" : ""
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                Z
              </div>
              {!collapsed && (
                <>
                  <span className="text-sm text-muted-foreground">zuohui</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align={collapsed ? "center" : "start"} className="w-48">
            <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
              切换主题
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4" />
              设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <LogOut className="w-4 h-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
