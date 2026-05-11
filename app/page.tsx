"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import { Sidebar, ChatArea, RightBar } from "@/components/layout";
import { nanoid } from "nanoid";
import { authClient } from "@/lib/auth/auth-client";
import type { Workspace, Message, Product, ContextFile } from "@/lib/types";
import { TOOL_LABELS, BUDDY_KEYWORDS } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const mockBuddies = [
  { id: "frontend-slides", name: "幻灯片设计师", avatar: "S", description: "制作精美的前端技术幻灯片" },
  { id: "guizang-ppt-skill", name: "杂志风 PPT", avatar: "M", description: "电子杂志风格的网页 PPT" },
  { id: "kami-html-slides", name: "Kami 幻灯片", avatar: "K", description: "交互式 HTML 幻灯片" },
];

export default function Home() {
  const [user, setUser] = useState<{ id: string; name?: string; email?: string } | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [buddyRecommendations, setBuddyRecommendations] = useState<
    Array<{ id: string; name: string; avatar: string; description: string }>
  >([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contextFiles, setContextFiles] = useState<ContextFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightBarCollapsed, setRightBarCollapsed] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

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

  const loadWorkspaces = async () => {
    try {
      const response = await fetch("/api/workspaces");
      if (response.ok) {
        const data = await response.json();
        const ws = data.workspaces || [];
        setWorkspaces(ws);
        if (ws.length > 0 && !activeWorkspaceId) {
          setActiveWorkspaceId(ws[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load workspaces:", error);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        const newWorkspace = data.workspace;
        setWorkspaces((prev) => [...prev, newWorkspace]);
        setActiveWorkspaceId(newWorkspace.id);
        setMessages([]);
        setProducts([]);
        setContextFiles([]);
        setCreateDialogOpen(false);
        setNewWorkspaceName("");
      } else {
        const error = await response.json();
        alert(error.error || "创建失败");
      }
    } catch (error) {
      console.error("Failed to create workspace:", error);
      alert("创建失败");
    }
  };

  const handleSelectWorkspace = async (id: string) => {
    setActiveWorkspaceId(id);
    setMessages([]);
    setProducts([]);
    setContextFiles([]);
    setConversationId(undefined);

    try {
      const response = await fetch(`/api/chat?workspaceId=${id}`);
      if (response.ok) {
        const data = await response.json();

        if (data.conversations && data.conversations.length > 0) {
          const latestConversation = data.conversations[0];

          const messagesResponse = await fetch(`/api/messages?conversationId=${latestConversation.id}`);
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();

            setMessages(
              messagesData.messages.map((m: { id: string; role: string; content: string }) => ({
                id: m.id,
                role: m.role as Message["role"],
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
      setCreateDialogOpen(true);
      return;
    }

    const userMessage: Message = {
      id: nanoid(),
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMessage]);

    if (BUDDY_KEYWORDS.some((kw) => content.includes(kw))) {
      setBuddyRecommendations(mockBuddies);
      return;
    }

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
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "tool_use") {
                const label = TOOL_LABELS[event.toolName] || `正在使用 ${event.toolName}...`;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId ? { ...m, toolStatus: label } : m
                  )
                );
              }

              if (event.type === "text_delta") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: m.content + event.text, toolStatus: undefined }
                      : m
                  )
                );
              }

              if (event.type === "complete") {
                setConversationId(event.conversationId);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, isStreaming: false, toolStatus: undefined }
                      : m
                  )
                );
              }

              if (event.type === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, isStreaming: false, toolStatus: undefined, content: `错误: ${event.message}` }
                      : m
                  )
                );
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, isStreaming: false, toolStatus: undefined, content: `请求失败: ${error instanceof Error ? error.message : "未知错误"}` }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBuddy = (buddyId: string) => {
    const buddy = mockBuddies.find((b) => b.id === buddyId);
    if (!buddy) return;

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

    setProducts((prev) => [
      ...prev,
      {
        id: nanoid(),
        type: "slides",
        name: "新幻灯片",
        status: "generating",
        createdAt: new Date(),
      },
    ]);
  };

  const handleProductClick = (product: { id: string; name: string }) => {
    alert(`预览产物: ${product.name}`);
  };

  if (isLoadingAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="h-screen flex p-3 gap-3 bg-background">
      <Sidebar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onWorkspaceSelect={handleSelectWorkspace}
        onWorkspaceCreate={() => setCreateDialogOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 min-w-0 min-h-0">
        <ChatArea
          messages={messages}
          buddyRecommendations={buddyRecommendations}
          onSendMessage={handleSendMessage}
          onSelectBuddy={handleSelectBuddy}
          isLoading={isLoading}
        />
      </div>

      <RightBar
        products={products}
        contextFiles={contextFiles}
        onProductClick={handleProductClick}
        collapsed={rightBarCollapsed}
        onToggleCollapse={() => setRightBarCollapsed(!rightBarCollapsed)}
      />

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建工作区</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateWorkspace();
            }}
            placeholder="输入工作区名称"
            className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateWorkspace} disabled={!newWorkspaceName.trim()}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
