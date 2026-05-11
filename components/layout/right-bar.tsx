"use client";

import {
  PanelRightClose,
  PanelRightOpen,
  FileText,
  Link2,
  Monitor,
} from "lucide-react";
import type { Product, ContextFile } from "@/lib/types";

const PRODUCT_ICONS: Record<Product["type"], React.ReactNode> = {
  slides: <Monitor className="w-4 h-4 text-primary" />,
  document: <FileText className="w-4 h-4 text-blue-500" />,
  code: <FileText className="w-4 h-4 text-green-500" />,
  image: <FileText className="w-4 h-4 text-purple-500" />,
};

const STATUS_DOTS: Record<Product["status"], React.ReactNode> = {
  completed: <span className="w-1.5 h-1.5 rounded-full bg-success" />,
  generating: <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />,
  draft: <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />,
  error: <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />,
};

const STATUS_LABELS: Record<Product["status"], string> = {
  completed: "已完成",
  generating: "生成中...",
  draft: "草稿",
  error: "出错",
};

export function RightBar({
  products,
  contextFiles,
  onProductClick,
  collapsed,
  onToggleCollapse,
}: {
  products: Product[];
  contextFiles: ContextFile[];
  onProductClick: (product: { id: string; name: string }) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <div
      className={`flex flex-col bg-sidebar-bg rounded-2xl overflow-hidden transition-all duration-300 ${
        collapsed ? "w-[60px]" : "w-[260px]"
      }`}
    >
      <div className="flex items-center gap-2.5 p-4">
        {!collapsed && <span className="text-sm font-semibold">详情</span>}
        <button
          onClick={onToggleCollapse}
          className={`${collapsed ? "" : "ml-auto"} w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-sidebar-hover hover:text-foreground transition-colors`}
          title={collapsed ? "展开" : "收起"}
        >
          {collapsed ? (
            <PanelRightOpen className="w-4 h-4" />
          ) : (
            <PanelRightClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
            生成产物
          </div>
          {products.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">暂无产物</p>
          ) : (
            products.map((product) => (
              <button
                key={product.id}
                onClick={() => onProductClick(product)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border hover:border-border-light hover:bg-sidebar-hover transition-colors mb-1.5 text-left"
              >
                <div className="w-8 h-8 rounded-md bg-primary/12 flex items-center justify-center flex-shrink-0">
                  {PRODUCT_ICONS[product.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{product.name}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {STATUS_DOTS[product.status]}
                    {STATUS_LABELS[product.status]}
                  </div>
                </div>
              </button>
            ))
          )}

          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2 mt-4">
            上下文文件
          </div>
          {contextFiles.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">暂无文件</p>
          ) : (
            contextFiles.map((file) => (
              <button
                key={file.id}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-muted-foreground hover:bg-sidebar-hover hover:text-foreground transition-colors"
              >
                {file.type === "url" ? (
                  <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span className="truncate">{file.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
