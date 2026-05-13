"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import { Sidebar, ChatArea, RightBar, HomePage } from "@/components/layout";
import { nanoid } from "nanoid";
import { authClient } from "@/lib/auth/auth-client";
import type { Workspace, Message, Product, DigitalBuddy, TaskStatus } from "@/lib/types";
import { TOOL_LABELS } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TaskInfo {
  taskId: string;
  buddyName?: string;
  buddyAvatar?: string;
  status: TaskStatus;
  toolStatus?: string;
  agentSessionId?: string;
}

export default function Home() {
  const [user, setUser] = useState<{ id: string; name?: string; email?: string } | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"home" | "workspace">("home");
  const [messages, setMessages] = useState<Message[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightBarCollapsed, setRightBarCollapsed] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [activeTask, setActiveTask] = useState<TaskInfo | undefined>();
  const [workspaceTasks, setWorkspaceTasks] = useState<Array<{ id: string; buddyName?: string; buddyAvatar?: string; status: string; createdAt: string }>>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();
  const [previewProduct, setPreviewProduct] = useState<Product | undefined>();
  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState<string | undefined>();
  const [pendingQuestion, setPendingQuestion] = useState<{
    questions: Array<{
      question: string;
      header: string;
      options: Array<{ label: string; description?: string }>;
      multiSelect?: boolean;
    }>;
  } | undefined>();

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
        setActiveView("workspace");
        setMessages([]);
        setProducts([]);
        setActiveTask(undefined);
        setCreateDialogOpen(false);
        setNewWorkspaceName("");
        setWorkspaceTasks([]);
        setSelectedTaskId(undefined);
      } else {
        const error = await response.json();
        alert(error.error || "创建失败");
      }
    } catch (error) {
      console.error("Failed to create workspace:", error);
      alert("创建失败");
    }
  };

  const handleCreateWorkspaceWithBuddy = async (buddy: DigitalBuddy) => {
    try {
      const wsRes = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${buddy.name}的工作区` }),
      });
      if (!wsRes.ok) throw new Error("创建工作区失败");
      const wsData = await wsRes.json();
      const workspaceId = wsData.workspace.id;

      const taskRes = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, buddyId: buddy.id }),
      });
      if (!taskRes.ok) throw new Error("创建任务失败");
      const taskData = await taskRes.json();

      setWorkspaces((prev) => [wsData.workspace, ...prev]);
      setActiveWorkspaceId(workspaceId);
      setActiveView("workspace");
      setActiveTask({
        taskId: taskData.task.id,
        buddyName: buddy.name,
        buddyAvatar: buddy.name[0],
        status: "pending",
        agentSessionId: undefined,
      });
      setWorkspaceTasks([{
        id: taskData.task.id,
        buddyName: buddy.name,
        buddyAvatar: buddy.name[0],
        status: "pending",
        createdAt: taskData.task.createdAt,
      }]);
      setSelectedTaskId(taskData.task.id);
    } catch (error) {
      console.error("Failed to create workspace with buddy:", error);
    }
  };

  const handleSelectWorkspace = async (id: string) => {
    setActiveWorkspaceId(id);
    setActiveView("workspace");
    setMessages([]);
    setProducts([]);
    setConversationId(undefined);
    setActiveTask(undefined);
    setWorkspaceTasks([]);
    setSelectedTaskId(undefined);

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

      // 加载工作区的任务列表
      const tasksRes = await fetch(`/api/tasks?workspaceId=${id}`);
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        const tasks = tasksData.tasks ?? [];
        setWorkspaceTasks(tasks);

        const activeTaskData = tasks.find(
          (t: { status: string }) => t.status === "running" || t.status === "pending"
        );
        if (activeTaskData) {
          setActiveTask({
            taskId: activeTaskData.id,
            buddyName: activeTaskData.buddyName,
            buddyAvatar: activeTaskData.buddyAvatar ?? activeTaskData.buddyName?.[0],
            status: activeTaskData.status,
            agentSessionId: activeTaskData.agentSessionId,
          });
          setSelectedTaskId(activeTaskData.id);
          // 加载该任务的产物
          loadProducts(activeTaskData.id);
        } else if (tasks.length > 0) {
          // 默认选中第一个任务
          setSelectedTaskId(tasks[0].id);
          loadProducts(tasks[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const handleSendMessage = async (content: string, resumeSessionId?: string, isRetry?: boolean) => {
    if (!activeWorkspaceId) return;

    if (!isRetry) {
      const userMessage: Message = {
        id: nanoid(),
        role: "user",
        content,
      };
      setMessages((prev) => [...prev, userMessage]);
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
          taskId: activeTask?.taskId,
          agentSessionId: resumeSessionId ?? activeTask?.agentSessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const parts = sseBuffer.split("\n\n");
          sseBuffer = parts.pop()!;

          for (const part of parts) {
            for (const line of part.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              try {
                const event = JSON.parse(line.slice(6));

                if (event.type === "task_started") {
                  setActiveTask({
                    taskId: event.taskId,
                    buddyName: event.buddyName,
                    buddyAvatar: event.buddyAvatar ?? event.buddyName?.[0],
                    status: "running",
                    toolStatus: undefined,
                    agentSessionId: event.agentSessionId,
                  });
                  setWorkspaceTasks((prev) => {
                    const exists = prev.some((t) => t.id === event.taskId);
                    if (exists) {
                      return prev.map((t) =>
                        t.id === event.taskId ? { ...t, status: "running" } : t
                      );
                    }
                    return [...prev, {
                      id: event.taskId,
                      buddyName: event.buddyName,
                      buddyAvatar: event.buddyAvatar ?? event.buddyName?.[0],
                      status: "running",
                      createdAt: new Date().toISOString(),
                    }];
                  });
                  setSelectedTaskId(event.taskId);
                }

                if (event.type === "task_completed") {
                  setActiveTask((prev) =>
                    prev ? { ...prev, status: "completed" } : undefined
                  );
                  setWorkspaceTasks((prev) =>
                    prev.map((t) =>
                      t.id === event.taskId ? { ...t, status: "completed" } : t
                    )
                  );
                  setProducts((prev) =>
                    prev.map((p) =>
                      p.taskId === event.taskId && p.status === "generating"
                        ? { ...p, status: "completed" }
                        : p
                    )
                  );
                  setTimeout(() => setActiveTask(undefined), 500);
                }

                if (event.type === "task_failed") {
                  setActiveTask((prev) =>
                    prev ? { ...prev, status: "failed" } : undefined
                  );
                  setWorkspaceTasks((prev) =>
                    prev.map((t) =>
                      t.id === event.taskId ? { ...t, status: "failed" } : t
                    )
                  );
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.isStreaming || m.toolStatus
                        ? { ...m, isStreaming: false, toolStatus: undefined, content: m.content || "任务已停止" }
                        : m
                    )
                  );
                }

                if (event.type === "tool_use") {
                  const label = TOOL_LABELS[event.toolName] || `正在使用 ${event.toolName}...`;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId ? { ...m, toolStatus: label } : m
                    )
                  );
                  setActiveTask((prev) =>
                    prev ? { ...prev, toolStatus: label } : prev
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
                  if (event.agentSessionId) {
                    setActiveTask((prev) =>
                      prev ? { ...prev, agentSessionId: event.agentSessionId } : prev
                    );
                  }
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, isStreaming: false, toolStatus: undefined }
                        : m
                    )
                  );
                }

                if (event.type === "product_created") {
                  setProducts((prev) => [
                    ...prev,
                    {
                      id: event.productId,
                      name: event.name,
                      type: event.productType,
                      taskId: event.taskId,
                      status: event.status ?? "generating",
                    } as Product,
                  ]);
                }

                if (event.type === "ask_user") {
                  setPendingQuestion({ questions: event.questions });
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
                // JSON 解析失败，跳过
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
            ? { ...m, isStreaming: false, toolStatus: undefined, content: `请求失败: ${error instanceof Error ? error.message : "未知错误"}` }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/stop`, { method: "POST" });
      setActiveTask((prev) =>
        prev ? { ...prev, status: "failed" } : undefined
      );
      setIsLoading(false);
      // 清除流式消息的 toolStatus 和 isStreaming
      setMessages((prev) =>
        prev.map((m) =>
          m.isStreaming || m.toolStatus
            ? {
                ...m,
                isStreaming: false,
                toolStatus: undefined,
                content: m.content || "任务已停止",
              }
            : m
        )
      );
    } catch (error) {
      console.error("Stop task error:", error);
    }
  };

  const handleRetryTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/retry`, { method: "POST" });
      if (res.ok) {
        const { task: updatedTask } = await res.json();
        setActiveTask((prev) =>
          prev ? { ...prev, status: "running", toolStatus: undefined, agentSessionId: updatedTask?.agentSessionId } : undefined
        );
        const originalPrompt = messages.find((m) => m.role === "user")?.content ?? "继续执行";
        handleSendMessage(originalPrompt, updatedTask?.agentSessionId, true);
      }
    } catch (error) {
      console.error("Retry task error:", error);
    }
  };

  const handleProductClick = (product: { id: string; name: string }) => {
    setPreviewProduct(product as Product);
  };

  const loadProducts = async (taskId: string) => {
    try {
      const res = await fetch(`/api/products?taskId=${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products ?? []);
      }
    } catch (error) {
      console.error("Failed to load products:", error);
    }
  };

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    loadProducts(taskId);
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, { method: "DELETE" });
      if (res.ok) {
        setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
        if (activeWorkspaceId === workspaceId) {
          setActiveWorkspaceId(null);
          setActiveView("home");
          setMessages([]);
          setProducts([]);
          setActiveTask(undefined);
          setWorkspaceTasks([]);
          setSelectedTaskId(undefined);
        }
      }
    } catch (error) {
      console.error("Delete workspace error:", error);
    }
    setDeleteWorkspaceId(undefined);
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
        activeView={activeView}
        onWorkspaceSelect={handleSelectWorkspace}
        onHomeSelect={() => setActiveView("home")}
        onWorkspaceCreate={() => setCreateDialogOpen(true)}
        onWorkspaceDelete={(id) => setDeleteWorkspaceId(id)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {activeView === "home" ? (
        <HomePage
          onSelectBuddy={handleCreateWorkspaceWithBuddy}
          onTaskClick={(workspaceId) => handleSelectWorkspace(workspaceId)}
        />
      ) : (
        <>
          <ChatArea
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            className="flex-1 min-w-0"
            activeTask={activeTask}
            onStopTask={handleStopTask}
            onRetryTask={handleRetryTask}
            pendingQuestion={pendingQuestion}
            onQuestionAnswered={(answers: string[]) => {
              const answerText = answers.join(", ");
              setPendingQuestion(undefined);
              handleSendMessage(answerText);
            }}
          />
          <RightBar
            tasks={workspaceTasks}
            selectedTaskId={selectedTaskId}
            onTaskSelect={handleTaskSelect}
            products={products}
            onProductClick={handleProductClick}
            onProductDelete={async (productId: string) => {
              try {
                const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
                if (res.ok) {
                  setProducts((prev) => prev.filter((p) => p.id !== productId));
                }
              } catch (error) {
                console.error("Delete product error:", error);
              }
            }}
            collapsed={rightBarCollapsed}
            onToggleCollapse={() => setRightBarCollapsed(!rightBarCollapsed)}
          />
        </>
      )}

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

      <Dialog open={!!previewProduct} onOpenChange={(open) => { if (!open) setPreviewProduct(undefined); }}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-2">
            <DialogTitle>{previewProduct?.name ?? "预览"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-5 pb-5">
            {previewProduct && (
              <iframe
                src={`/api/products/${previewProduct.id}?action=preview`}
                className="w-full h-full rounded-lg border border-border"
                sandbox="allow-scripts"
                title={previewProduct.name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteWorkspaceId} onOpenChange={(open) => { if (!open) setDeleteWorkspaceId(undefined); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除工作区</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定要删除此工作区吗？工作区内的所有任务、对话和产物将被永久删除，此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteWorkspaceId(undefined)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteWorkspaceId && handleDeleteWorkspace(deleteWorkspaceId)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}