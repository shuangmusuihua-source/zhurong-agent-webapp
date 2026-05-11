"use client";

interface Product {
  id: string;
  type: "slides" | "document" | "code" | "image";
  name: string;
  status: "draft" | "generating" | "completed" | "error";
  preview?: string;
  createdAt: Date;
}

interface ContextFile {
  id: string;
  name: string;
  type: "file" | "url" | "text";
}

interface RightBarProps {
  products: Product[];
  contextFiles: ContextFile[];
  onProductClick: (product: Product) => void;
  onFileClick?: (file: ContextFile) => void;
}

const typeIcons: Record<string, string> = {
  slides: "📊",
  document: "📄",
  code: "💻",
  image: "🖼️",
};

const statusColors: Record<string, string> = {
  draft: "text-muted-foreground",
  generating: "text-primary",
  completed: "text-green-500",
  error: "text-destructive",
};

export function RightBar({
  products,
  contextFiles,
  onProductClick,
  onFileClick,
}: RightBarProps) {
  return (
    <aside className="w-[280px] h-full flex flex-col bg-rightbar border-l border-rightbar-border">
      {/* 生成产物 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-xs text-muted-foreground mb-3">生成产物</div>
        {products.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            暂无产物
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => onProductClick(product)}
                className="w-full text-left p-3 rounded-lg border hover:border-primary hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{typeIcons[product.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className={`text-xs ${statusColors[product.status]}`}>
                      {product.status === "generating" && "生成中..."}
                      {product.status === "completed" && "已完成"}
                      {product.status === "draft" && "草稿"}
                      {product.status === "error" && "生成失败"}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 上下文文件 */}
        <div className="mt-6">
          <div className="text-xs text-muted-foreground mb-3">上下文文件</div>
          {contextFiles.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              暂无文件
            </div>
          ) : (
            <div className="space-y-1">
              {contextFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => onFileClick?.(file)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm truncate"
                >
                  📎 {file.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
