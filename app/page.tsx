"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import { Sidebar, ChatArea, RightBar } from "@/components/layout";
import { nanoid } from "nanoid";
import { authClient } from "@/lib/auth/auth-client";
import { Loader2, Globe, Terminal, FileText, Search } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  description?: string;
}

const mockBuddies = [
  {
    id: "frontend-slides",
    name: "幻灯片设计师",
    avatar: "🎨",
    description: "制作精美的前端技术幻灯片",
  },
  {
    id: "guizang-ppt-skill",
    name: "杂志风 PPT",
    avatar: "📰",
    description: "电子杂志风格的网页 PPT",
  },
  {
    id: "kami-html-slides",
    name: "Kami 幻灯片",
    avatar: "✨",
    description: "交互式 HTML 幻灯片",
  },
];

export default function Home() {
  const [user, setUser] = useState<{ id: string; name?: string; email?: string } | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      role: "user" | "assistant" | "buddy";
      content: string;
      buddyName?: string;
      buddyAvatar?: string;
      isStreaming?: boolean;
      toolStatus?: string;
    }>
  >([]);
  const [buddyRecommendations, setBuddyRecommendations] = useState<
    Array<{ id: string; name: string; avatar: string; description: string }>
  >([]);
  const [products, setProducts] = useState<
    Array<{
      id: string;
      type: "slides" | "document" | "code" | "image";
      name: string;
      status: "draft" | "generating" | "completed" | "error";
      createdAt: Date;
    }>
  >([]);
  const [contextFiles, setContextFiles] = useState<
    Array<{ id: string; name: string; type: "file" | "url" | "text" }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();

  // 检查用户登录状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authClient.getSession();
        if (response && "data" in response && response.data?.user) {
          setUser(response.data.user);
          await loadWorkspaces();
        } else {
          redirect("/login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        redirect("/login");
      } finally {
        setIsLoadingAuth(false);
      }
    };
    checkAuth();
  }, []);

  // 加载 workspace 列表
  const loadWorkspaces = async () => {
    try {
      const response = await fetch("/api/workspaces");
      if (response.ok) {
        const data = await response.json();
        const workspaces = data.workspaces || [];
        setWorkspaces(workspaces);
        // 默认选中第一个工作区
        if (workspaces.length > 0 && !activeWorkspaceId) {
          setActiveWorkspaceId(workspaces[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load workspaces:", error);
    }
  };

  // 创建新 workspace
  const handleCreateWorkspace = async () => {
    const name = prompt("输入工作区名称");
    if (!name) return;

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const data = await response.json();
        const newWorkspace = data.workspace;
        setWorkspaces((prev) => [...prev, newWorkspace]);
        setActiveWorkspaceId(newWorkspace.id);
        setMessages([]);
        setProducts([]);
        setContextFiles([]);
      } else {
        const error = await response.json();
        alert(error.error || "创建失败");
      }
    } catch (error) {
      console.error("Failed to create workspace:", error);
      alert("创建失败");
    }
  };

  // 选择 workspace
  const handleSelectWorkspace = async (id: string) => {
    setActiveWorkspaceId(id);
    setMessages([]);
    setProducts([]);
    setContextFiles([]);
    setConversationId(undefined);

    // 加载该工作区的最近对话
    try {
      const response = await fetch(`/api/chat?workspaceId=${id}`);
      if (response.ok) {
        const data = await response.json();

        if (data.conversations && data.conversations.length > 0) {
          const latestConversation = data.conversations[0];

          // 加载该对话的消息
          const messagesResponse = await fetch(`/api/messages?conversationId=${latestConversation.id}`);
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();

            setMessages(
              messagesData.messages.map((m: { id: string; role: string; content: string }) => ({
                id: m.id,
                role: m.role as "user" | "assistant" | "buddy",
                content: m.content,
              }))
            );
            setConversationId(latestConversation.id);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeWorkspaceId) {
      alert("请先创建或选择一个工作区");
      return;
    }

    const userMessage = {
      id: nanoid(),
      role: "user" as const,
      content,
    };
    setMessages((prev) => [...prev, userMessage]);

    // 检测是否需要推荐数字伙伴
    if (
      content.includes("幻灯片") ||
      content.includes("PPT") ||
      content.includes("ppt") ||
      content.includes("slides") ||
      content.includes("演示")
    ) {
      setBuddyRecommendations(mockBuddies);
      return;
    }

    // 调用后端 API
    setIsLoading(true);
    const assistantMessageId = nanoid();
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: "assistant", content: "", isStreaming: true, toolStatus: "思考中..." },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: content,
          conversationId,
          workspaceId: activeWorkspaceId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event = JSON.parse(line.slice(6));

                // 处理工具调用状态
                if (event.type === "tool_use") {
                  const toolLabels: Record<string, string> = {
                    "mcp__web-search__WebSearch": "正在联网搜索...",
                    "WebSearch": "正在联网搜索...",
                    "WebFetch": "正在抓取网页...",
                    "Bash": "正在执行命令...",
                    "Read": "正在读取文件...",
                  };
                  const label = toolLabels[event.toolName] || `正在使用 ${event.toolName}...`;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, toolStatus: label }
                        : m
                    )
                  );
                }

                // 处理文本增量 - 直接追加
                if (event.type === "text_delta") {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: m.content + event.text, toolStatus: undefined }
                        : m
                    )
                  );
                }

                // 处理思考增量（可选显示）
                if (event.type === "thinking_delta") {
                  console.log("Thinking:", event.thinking);
                }

                // 处理完成
                if (event.type === "complete") {
                  setConversationId(event.conversationId);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, isStreaming: false }
                        : m
                    )
                  );
                }

                // 处理错误
                if (event.type === "error") {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, isStreaming: false, content: `错误: ${event.message}` }
                        : m
                    )
                  );
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, isStreaming: false, content: `请求失败: ${error instanceof Error ? error.message : "未知错误"}` }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBuddy = (buddyId: string) => {
    const buddy = mockBuddies.find((b) => b.id === buddyId);
    if (buddy) {
      setBuddyRecommendations([]);
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "buddy",
          content: `好的，我是${buddy.name}，我来帮你完成这个任务。请告诉我更多细节...`,
          buddyName: buddy.name,
          buddyAvatar: buddy.avatar,
        },
      ]);

      const productId = nanoid();
      setProducts((prev) => [
        ...prev,
        {
          id: productId,
          type: "slides",
          name: "新幻灯片",
          status: "generating",
          createdAt: new Date(),
        },
      ]);
    }
  };

  const handleProductClick = (product: { id: string; name: string }) => {
    alert(`预览产物: ${product.name}`);
  };

  return (
    <main className="h-screen flex p-4 gap-4">
      {/* 侧边栏 */}
      <Sidebar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onWorkspaceSelect={handleSelectWorkspace}
        onWorkspaceCreate={handleCreateWorkspace}
      />

      {/* 对话区域 */}
      <div className="flex-1 rounded-xl border overflow-hidden">
        <ChatArea
          messages={messages}
          buddyRecommendations={buddyRecommendations}
          onSendMessage={handleSendMessage}
          onSelectBuddy={handleSelectBuddy}
          isLoading={isLoading}
        />
      </div>

      {/* 右边栏 */}
      <div className="rounded-xl border overflow-hidden">
        <RightBar
          products={products}
          contextFiles={contextFiles}
          onProductClick={handleProductClick}
        />
      </div>
    </main>
  );
}