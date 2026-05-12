"use client";

import { ChevronRight, ChevronLeft, FileText, Download, Eye, Loader2, CheckCircle2, XCircle, Clock, Sparkles, Trash2 } from "lucide-react";
import type { Product, ContextFile } from "@/lib/types";

interface TaskItem {
  id: string;
  buddyName?: string;
  buddyAvatar?: string;
  status: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  running: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, label: "执行中", color: "text-primary" },
  pending: { icon: <Clock className="w-3.5 h-3.5" />, label: "等待中", color: "text-muted-foreground" },
  completed: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "已完成", color: "text-green-500" },
  failed: { icon: <XCircle className="w-3.5 h-3.5" />, label: "失败", color: "text-destructive" },
};

export function RightBar({
  tasks = [],
  selectedTaskId,
  onTaskSelect,
  products = [],
  contextFiles = [],
  onProductClick,
  onProductDelete,
  collapsed,
  onToggleCollapse,
}: {
  tasks?: TaskItem[];
  selectedTaskId?: string;
  onTaskSelect?: (taskId: string) => void;
  products?: Product[];
  contextFiles?: ContextFile[];
  onProductClick?: (product: { id: string; name: string }) => void;
  onProductDelete?: (productId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  if (collapsed) {
    return (
      <div className="w-12 flex flex-col items-center py-3 bg-sidebar-bg rounded-2xl">
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-sidebar-hover hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[220px] flex flex-col bg-sidebar-bg rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5">
        <span className="text-sm font-medium text-muted-foreground">详情</span>
        <button
          onClick={onToggleCollapse}
          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-sidebar-hover hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 任务列表 */}
      <div className="px-3 pb-2">
        <p className="text-xs text-muted-foreground mb-2 px-1">任务</p>
        <div className="flex flex-col gap-1">
          {tasks.length === 0 && (
            <p className="text-xs text-muted-foreground px-1 py-2">暂无任务</p>
          )}
          {tasks.map((task) => {
            const statusConfig = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
            const isSelected = task.id === selectedTaskId;
            return (
              <button
                key={task.id}
                onClick={() => onTaskSelect?.(task.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  isSelected
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  task.status === "running"
                    ? "bg-primary/20 text-primary"
                    : task.status === "completed"
                    ? "bg-green-500/10 text-green-600"
                    : "bg-secondary text-muted-foreground"
                }`}>
                  {task.buddyAvatar ?? task.buddyName?.[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{task.buddyName ?? "伙伴"}</div>
                </div>
                <div className={`flex items-center gap-1 text-[10px] flex-shrink-0 ${statusConfig.color}`}>
                  {statusConfig.icon}
                  <span>{statusConfig.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-3 border-t border-border" />

      {/* 产物列表 */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <p className="text-xs text-muted-foreground mb-2 px-1">产物</p>
        {products.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1 py-2">暂无产物</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {products.map((product) => {
              const isGenerating = product.status === "generating";
              return (
                <div
                  key={product.id}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors group ${
                    isGenerating ? "bg-secondary/30" : "bg-secondary/50 hover:bg-secondary"
                  }`}
                >
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{product.name}</p>
                    {isGenerating ? (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        生成中
                      </p>
                    ) : product.type && (
                      <p className="text-[10px] text-muted-foreground">{product.type}</p>
                    )}
                  </div>
                  {!isGenerating && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onProductClick?.(product)}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="预览"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={`/api/products/${product.id}?action=download`}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="下载"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => onProductDelete?.(product.id)}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 上下文文件 */}
      {contextFiles.length > 0 && (
        <>
          <div className="mx-3 border-t border-border" />
          <div className="px-3 py-2">
            <p className="text-xs text-muted-foreground mb-2 px-1">上下文</p>
            <div className="flex flex-col gap-1">
              {contextFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
