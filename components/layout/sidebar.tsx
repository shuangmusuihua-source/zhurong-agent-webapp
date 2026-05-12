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
  Home,
  Trash2,
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
  activeView,
  onWorkspaceSelect,
  onHomeSelect,
  onWorkspaceCreate,
  onWorkspaceDelete,
  collapsed,
  onToggleCollapse,
}: {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeView: "home" | "workspace";
  onWorkspaceSelect: (id: string) => void;
  onHomeSelect: () => void;
  onWorkspaceCreate: () => void;
  onWorkspaceDelete?: (id: string) => void;
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
          <img src="/logo.svg" alt="大象 Agent" className="h-10 flex-shrink-0" />
        )}
        {!collapsed && <span className="text-base font-semibold font-logo tracking-wider text-[#4BBAAD]">大象Agent</span>}
        {!collapsed && <span className="text-base font-semibold font-logo tracking-wider text-[#4BBAAD]">大象Agent</span>}
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
        <button
          onClick={onHomeSelect}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
            collapsed ? "justify-center px-0" : ""
          } ${
            activeView === "home"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
          }`}
          title={collapsed ? "首页" : undefined}
        >
          <Home className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>首页</span>}
        </button>

        {!collapsed && (
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2 mt-3">
            工作区
          </div>
        )}
        {workspaces.map((ws) => (
          <div
            key={ws.id}
            className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 cursor-pointer ${
              ws.id === activeWorkspaceId && activeView === "workspace"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
            }`}
            onClick={() => onWorkspaceSelect(ws.id)}
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                ws.id === activeWorkspaceId && activeView === "workspace"
                  ? "bg-primary shadow-[0_0_8px_rgba(8,145,178,0.5)]"
                  : "bg-muted-foreground"
              }`}
            />
            <span className="truncate flex-1 min-w-0">{ws.name}</span>
            {onWorkspaceDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onWorkspaceDelete(ws.id);
                }}
                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                title="删除工作区"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
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
