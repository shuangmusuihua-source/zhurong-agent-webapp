"use client";

import React, { useState } from "react";
import type { Product } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Trash2,
  Eye,
  X,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useScrollHide } from "@/hooks/use-scroll-hide";

interface TaskItem {
  id: string;
  buddyName?: string;
  buddyAvatar?: string;
  status: string;
  createdAt: string;
}

export function RightBar({
  tasks = [],
  selectedTaskId,
  onTaskSelect,
  products = [],
  onProductClick,
  onProductDelete,
  collapsed,
  onToggleCollapse,
  previewHtml,
  onClosePreview,
}: {
  tasks?: TaskItem[];
  selectedTaskId?: string | null;
  onTaskSelect?: (taskId: string) => void;
  products?: Product[];
  onProductClick?: (product: { id: string; name: string }) => void;
  onProductDelete?: (productId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  previewHtml?: string | null;
  onClosePreview?: () => void;
}) {
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const scrollRef = useScrollHide();

  if (collapsed) {
    return (
      <div className="w-10 bg-sidebar-bg border-l border-border flex flex-col items-center py-3 gap-2">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md hover:bg-sidebar-hover text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 bg-sidebar-bg border-l border-border flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">详情</span>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md hover:bg-sidebar-hover text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-hide">
        {/* 预览区域 */}
        {previewHtml && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-muted-foreground">预览</h3>
              {onClosePreview && (
                <button
                  onClick={onClosePreview}
                  className="p-1 rounded hover:bg-sidebar-hover text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="rounded-lg border border-border overflow-hidden bg-background">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-48"
                sandbox="allow-scripts"
                title="Preview"
              />
            </div>
            <button
              onClick={() => {
                const win = window.open("", "_blank");
                if (win) {
                  win.document.write(previewHtml);
                  win.document.close();
                }
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              新窗口打开
            </button>
          </div>
        )}

        {/* 任务列表 */}
        {tasks.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground px-2">任务</h3>
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => onTaskSelect?.(task.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-sidebar-hover cursor-pointer ${
                  selectedTaskId === task.id ? "bg-sidebar-hover" : ""
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary flex-shrink-0">
                  {task.buddyAvatar || task.buddyName?.[0] || "T"}
                </div>
                <span className="truncate flex-1 text-left">{task.buddyName || "任务"}</span>
                {task.status === "running" && (
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                )}
                {task.status === "completed" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                )}
                {task.status === "failed" && (
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* 产物列表 */}
        {products.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground px-2">产物</h3>
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-sidebar-hover group"
                onMouseEnter={() => setHoveredProduct(product.id)}
                onMouseLeave={() => setHoveredProduct(null)}
              >
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span
                  className="truncate flex-1 cursor-pointer hover:text-primary"
                  onClick={() => onProductClick?.({ id: product.id, name: product.name })}
                >
                  {product.name}
                </span>
                {hoveredProduct === product.id && (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => onProductClick?.({ id: product.id, name: product.name })}
                      className="p-1 rounded hover:bg-sidebar-hover text-muted-foreground hover:text-foreground"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: product.id, name: product.name })}
                      className="p-1 rounded hover:bg-sidebar-hover text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {product.status === "generating" && (
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{deleteTarget?.name}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  onProductDelete?.(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const MemoizedRightBar = React.memo(RightBar);
