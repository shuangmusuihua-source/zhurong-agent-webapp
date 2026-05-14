"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { redirect } from "next/navigation";
import { MemoizedSidebar as Sidebar, ChatArea, MemoizedRightBar as RightBar, HomePage } from "@/components/layout";
import { nanoid } from "nanoid";
import { authClient } from "@/lib/auth/auth-client";
import type { Workspace, Message, Product, DigitalBuddy, TaskStatus } from "@/lib/types";
import { TOOL_LABELS } from "@/lib/types";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useChatStore } from "@/stores/chat-store";
import { useTaskStore, type TaskInfo } from "@/stores/task-store";
import { useHomeStore } from "@/stores/home-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [user, setUser] = useState<{ id: string; name?: string; email?: string } | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [previewProduct, setPreviewProduct] = useState<Product | undefined>();
  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState<string | undefined>();

  // Zustand stores — used for rendering (reading state + passing as props)
  const wsStore = useWorkspaceStore();
  const chatStore = useChatStore();
  const taskStore = useTaskStore();

  const handleHomeSelect = useCallback(() => useWorkspaceStore.getState().setActiveView("home"), []);
  const handleWorkspaceCreateDialog = useCallback(() => setCreateDialogOpen(true), []);
  const handleWorkspaceDeleteDialog = useCallback((id: string) => setDeleteWorkspaceId(id), []);

  // Refs for SSE streaming and question accumulation
  const accumulatedAnswersRef = useRef<Record<string, string>>({});
  const totalQuestionsRef = useRef(0);
  const pendingDeltasRef = useRef<Map<string, string>>(new Map());
  const streamingRafRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const stoppedByUserRef = useRef(false);

  const handleStopGenerate = useCallback(() => {
    stoppedByUserRef.current = true;
    // 流式阶段：只 cancel reader（触发服务端 cancel() 回调 → abort agent）
    // 请求阶段：abort fetch（fetch 还没返回时）
    if (readerRef.current) {
      try { readerRef.current.cancel(); } catch {}
      readerRef.current = null;
    } else if (abortControllerRef.current) {
      try { abortControllerRef.current.abort(); } catch {}
      abortControllerRef.current = null;
    }
    const chat = useChatStore.getState();
    const task = useTaskStore.getState();
    chat.setIsLoading(false);
    chat.updateMessages((prev) =>
      prev.map((m) => m.isStreaming ? { ...m, isStreaming: false, toolStatus: undefined, content: m.content || "已停止生成" } : m)
    );
    if (task.activeTask?.taskId) {
      fetch(`/api/tasks/${task.activeTask.taskId}/stop`, { method: "POST" }).catch(() => {});
      task.updateActiveTask((prev) => prev ? { ...prev, status: "failed" } : undefined);
    }
  }, []);

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

  useEffect(() => {
    return () => cancelAnimationFrame(streamingRafRef.current);
  }, []);

  const loadWorkspaces = async () => {
    try {
      const response = await fetch("/api/workspaces");
      if (response.ok) {
        const data = await response.json();
        const ws = data.workspaces || [];
        const store = useWorkspaceStore.getState();
        store.setWorkspaces(ws);
        if (ws.length > 0 && !store.activeWorkspaceId) {
          store.setActiveWorkspaceId(ws[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load workspaces:", error);
    }
  };

  const handleCreateWorkspace = useCallback(async () => {
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
        const ws = useWorkspaceStore.getState();
        const chat = useChatStore.getState();
        const task = useTaskStore.getState();
        ws.addWorkspace(newWorkspace);
        useHomeStore.getState().invalidate();
        ws.setActiveWorkspaceId(newWorkspace.id);
        ws.setActiveView("workspace");
        chat.setMessages([]);
        chat.setProducts([]);
        chat.setConversationId(undefined);
        task.setActiveTask(undefined);
        task.setWorkspaceTasks([]);
        task.setSelectedTaskId(undefined);
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
  }, [newWorkspaceName]);

  const handleCreateWorkspaceWithBuddy = useCallback(async (buddy: DigitalBuddy) => {
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

      const ws = useWorkspaceStore.getState();
      const task = useTaskStore.getState();
      ws.addWorkspace(wsData.workspace);
      useHomeStore.getState().invalidate();
      ws.setActiveWorkspaceId(workspaceId);
      ws.setActiveView("workspace");
      task.setActiveTask({
        taskId: taskData.task.id,
        buddyName: buddy.name,
        buddyAvatar: buddy.name[0],
        status: "pending",
        agentSessionId: undefined,
      });
      task.setWorkspaceTasks([{
        id: taskData.task.id,
        buddyName: buddy.name,
        buddyAvatar: buddy.name[0],
        status: "pending",
        createdAt: taskData.task.createdAt,
      }]);
      task.setSelectedTaskId(taskData.task.id);
    } catch (error) {
      console.error("Failed to create workspace with buddy:", error);
    }
  }, []);

  const loadProducts = useCallback(async (workspaceId: string) => {
    try {
      const res = await fetch(`/api/products?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        useChatStore.getState().setProducts(data.products ?? []);
      }
    } catch (error) {
      console.error("Failed to load products:", error);
    }
  }, []);

  const handleSelectWorkspace = useCallback(async (id: string) => {
    const ws = useWorkspaceStore.getState();
    const chat = useChatStore.getState();
    const task = useTaskStore.getState();
    ws.setActiveWorkspaceId(id);
    ws.setActiveView("workspace");
    chat.setMessages([]);
    chat.setProducts([]);
    chat.setConversationId(undefined);
    chat.setIsLoading(false);
    task.setActiveTask(undefined);
    task.setWorkspaceTasks([]);
    task.setSelectedTaskId(undefined);

    try {
      const response = await fetch(`/api/chat?workspaceId=${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.conversations && data.conversations.length > 0) {
          const latestConversation = data.conversations[0];
          const messagesResponse = await fetch(`/api/messages?conversationId=${latestConversation.id}`);
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            useChatStore.getState().setMessages(
              messagesData.messages.map((m: { id: string; role: string; content: string }) => ({
                id: m.id,
                role: m.role as Message["role"],
                content: m.content,
              }))
            );
            useChatStore.getState().setConversationId(latestConversation.id);
          }
        }
      }

      const tasksRes = await fetch(`/api/tasks?workspaceId=${id}`);
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        const tasks = tasksData.tasks ?? [];
        const taskS = useTaskStore.getState();
        taskS.setWorkspaceTasks(tasks);

        const activeTaskData = tasks.find(
          (t: { status: string }) => t.status === "running" || t.status === "pending"
        );
        if (activeTaskData) {
          taskS.setActiveTask({
            taskId: activeTaskData.id,
            buddyName: activeTaskData.buddyName,
            buddyAvatar: activeTaskData.buddyAvatar ?? activeTaskData.buddyName?.[0],
            status: activeTaskData.status,
            agentSessionId: activeTaskData.agentSessionId,
          });
          taskS.setSelectedTaskId(activeTaskData.id);
          loadProducts(id);
          if (activeTaskData.status === "running") {
            connectToTaskStream(activeTaskData.id);
          }
        } else if (tasks.length > 0) {
          taskS.setSelectedTaskId(tasks[0].id);
          loadProducts(id);
        }
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  }, []);

  // Shared SSE event handler
  const handleSseEvent = useCallback((event: any, assistantMessageId: string) => {
    const chat = useChatStore.getState();
    const task = useTaskStore.getState();

    if (event.type === "task_started") {
      task.setActiveTask({
        taskId: event.taskId,
        buddyName: event.buddyName,
        buddyAvatar: event.buddyAvatar ?? event.buddyName?.[0],
        status: "running",
        toolStatus: undefined,
        agentSessionId: event.agentSessionId,
      });
      task.updateWorkspaceTasks((prev) => {
        const exists = prev.some((t) => t.id === event.taskId);
        if (exists) {
          return prev.map((t) => t.id === event.taskId ? { ...t, status: "running" } : t);
        }
        return [...prev, {
          id: event.taskId,
          buddyName: event.buddyName,
          buddyAvatar: event.buddyAvatar ?? event.buddyName?.[0],
          status: "running",
          createdAt: new Date().toISOString(),
        }];
      });
      task.setSelectedTaskId(event.taskId);
    }

    if (event.type === "task_completed") {
      task.updateActiveTask((prev) => prev ? { ...prev, status: "completed" } : undefined);
      task.updateWorkspaceTasks((prev) => prev.map((t) => t.id === event.taskId ? { ...t, status: "completed" } : t));
      chat.updateProducts((prev) => prev.map((p) => p.taskId === event.taskId && p.status === "generating" ? { ...p, status: "completed" } : p));
      setTimeout(() => useTaskStore.getState().setActiveTask(undefined), 500);
    }

    if (event.type === "task_failed") {
      task.updateActiveTask((prev) => prev ? { ...prev, status: "failed" } : undefined);
      task.updateWorkspaceTasks((prev) => prev.map((t) => t.id === event.taskId ? { ...t, status: "failed" } : t));
      chat.updateMessages((prev) => prev.map((m) => m.isStreaming || m.toolStatus ? { ...m, isStreaming: false, toolStatus: undefined, content: m.content || "任务已停止" } : m));
    }

    if (event.type === "tool_use") {
      const label = TOOL_LABELS[event.toolName] || `正在使用 ${event.toolName}...`;
      chat.updateMessages((prev) => prev.map((m) => m.id === assistantMessageId ? { ...m, toolStatus: label } : m));
      task.updateActiveTask((prev) => prev ? { ...prev, toolStatus: label } : prev);
    }

    if (event.type === "text_delta") {
      pendingDeltasRef.current.set(
        assistantMessageId,
        (pendingDeltasRef.current.get(assistantMessageId) ?? "") + event.text
      );
      if (!streamingRafRef.current) {
        streamingRafRef.current = requestAnimationFrame(() => {
          const deltas = new Map(pendingDeltasRef.current);
          pendingDeltasRef.current.clear();
          streamingRafRef.current = 0;
          deltas.forEach((deltaText, msgId) => {
            useChatStore.getState().updateMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: m.content + deltaText, toolStatus: undefined } : m));
          });
        });
      }
    }

    if (event.type === "complete") {
      cancelAnimationFrame(streamingRafRef.current);
      streamingRafRef.current = 0;
      abortControllerRef.current = null;
      readerRef.current = null;
      const remainingDeltas = new Map(pendingDeltasRef.current);
      pendingDeltasRef.current.clear();
      remainingDeltas.forEach((deltaText, msgId) => {
        useChatStore.getState().updateMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: m.content + deltaText } : m));
      });
      useChatStore.getState().setConversationId(event.conversationId);
      if (event.agentSessionId) {
        useTaskStore.getState().updateActiveTask((prev) => prev ? { ...prev, agentSessionId: event.agentSessionId } : prev);
      }
      useChatStore.getState().updateMessages((prev) => prev.map((m) => m.id === assistantMessageId ? { ...m, isStreaming: false, toolStatus: undefined } : m));
      return "done";
    }

    if (event.type === "product_created") {
      chat.updateProducts((prev) => [...prev, {
        id: event.productId,
        name: event.name,
        type: event.productType,
        taskId: event.taskId,
        status: event.status ?? "generating",
      } as Product]);
    }

    if (event.type === "ask_user") {
      accumulatedAnswersRef.current = {};
      totalQuestionsRef.current = event.questions?.length ?? 0;
      chat.setPendingQuestion({ questions: event.questions });
    }

    if (event.type === "error") {
      chat.updateMessages((prev) => prev.map((m) => m.id === assistantMessageId ? { ...m, isStreaming: false, toolStatus: undefined, content: `错误: ${event.message}` } : m));
    }

    return "continue";
  }, []);

  const connectToTaskStream = useCallback(async (taskId: string) => {
    const chat = useChatStore.getState();
    chat.setIsLoading(true);
    let isSseDone = false;
    const assistantMessageId = nanoid();
    chat.updateMessages((prev) => [...prev, { id: assistantMessageId, role: "assistant", content: "", isStreaming: true, toolStatus: "思考中..." }]);

    try {
      const response = await fetch(`/api/tasks/${taskId}/stream`);
      if (!response.ok) {
        useTaskStore.getState().updateActiveTask((prev) => prev ? { ...prev, status: "failed" } : undefined);
        useChatStore.getState().updateMessages((prev) => prev.map((m) => m.id === assistantMessageId ? { ...m, isStreaming: false, toolStatus: undefined, content: "任务连接已断开，请点击重试" } : m));
        useChatStore.getState().setIsLoading(false);
        return;
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
                if (event.type === "reconnect_snapshot") {
                  useChatStore.getState().updateMessages((prev) => prev.map((m) => m.id === assistantMessageId ? { ...m, content: event.fullText || "", toolStatus: event.toolStatus, isStreaming: true } : m));
                  if (event.products?.length > 0) {
                    useChatStore.getState().updateProducts((prev) => {
                      const existingIds = new Set(prev.map((p) => p.id));
                      const newProducts = event.products.filter((p: any) => !existingIds.has(p.id)).map((p: any) => ({ id: p.id, name: p.name, type: p.type, taskId, status: "completed" as const }));
                      return [...prev, ...newProducts];
                    });
                  }
                  continue;
                }
                const result = handleSseEvent(event, assistantMessageId);
                if (result === "done") isSseDone = true;
              } catch {}
            }
          }
        }
      }
    } catch (error) {
      console.error("Stream reconnect error:", error);
      useChatStore.getState().updateMessages((prev) => prev.map((m) => m.id === assistantMessageId ? { ...m, isStreaming: false, toolStatus: undefined, content: `重连失败: ${error instanceof Error ? error.message : "未知错误"}` } : m));
    } finally {
      if (isSseDone) useChatStore.getState().setIsLoading(false);
    }
  }, [handleSseEvent]);

  const handleSendMessage = useCallback(async (content: string, resumeSessionId?: string, isRetry?: boolean) => {
    const ws = useWorkspaceStore.getState();
    const chat = useChatStore.getState();
    const task = useTaskStore.getState();

    if (!ws.activeWorkspaceId) return;
    stoppedByUserRef.current = false;
    if (!isRetry) {
      chat.updateMessages((prev) => [...prev, { id: nanoid(), role: "user", content }]);
    }
    chat.setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const assistantMessageId = nanoid();
    let isSseDone = false;
    chat.updateMessages((prev) => [...prev, { id: assistantMessageId, role: "assistant", content: "", isStreaming: true, toolStatus: "思考中..." }]);

    let taskId = task.activeTask?.taskId;
    let buddyId: string | undefined;
    let agentSessionId = resumeSessionId ?? task.activeTask?.agentSessionId;

    if (!taskId && !isRetry) {
      try {
        const intentRes = await fetch("/api/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content }),
        });
        if (intentRes.ok) {
          const intentData = await intentRes.json();
          if (intentData.needsBuddy && intentData.buddyIds?.length > 0) {
            buddyId = intentData.buddyIds[0];
            const taskRes = await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ workspaceId: ws.activeWorkspaceId, buddyId }),
            });
            if (taskRes.ok) {
              const taskData = await taskRes.json();
              const newTaskId = taskData.task.id;
              const buddyRes = await fetch("/api/buddies");
              let buddyName: string | undefined;
              let buddyAvatar: string | undefined;
              if (buddyRes.ok) {
                const buddiesData = await buddyRes.json();
                const buddy = (buddiesData.buddies ?? []).find((b: DigitalBuddy) => b.id === buddyId);
                buddyName = buddy?.name;
                buddyAvatar = buddy?.avatar ?? buddy?.name?.[0];
              }
              taskId = newTaskId;
              const taskS = useTaskStore.getState();
              taskS.setActiveTask({ taskId: newTaskId, buddyName, buddyAvatar, status: "pending", agentSessionId: undefined });
              taskS.updateWorkspaceTasks((prev) => [...prev, { id: newTaskId, buddyName, buddyAvatar, status: "pending", createdAt: new Date().toISOString() }]);
              taskS.setSelectedTaskId(newTaskId);
            }
          }
        }
      } catch (error) {
        if (stoppedByUserRef.current) return;
        console.error("Intent recognition failed:", error);
      }
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: content, conversationId: useChatStore.getState().conversationId, workspaceId: ws.activeWorkspaceId, taskId, buddyId, agentSessionId }),
        signal: abortController.signal,
      });
      if (!response.ok) {
        if (stoppedByUserRef.current) return;
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
                const result = handleSseEvent(event, assistantMessageId);
                if (result === "done") isSseDone = true;
              } catch {}
            }
          }
        }
      }
    } catch (error) {
      if (stoppedByUserRef.current) return;
      console.error("Chat error:", error);
      useChatStore.getState().updateMessages((prev) => prev.map((m) => m.id === assistantMessageId ? { ...m, isStreaming: false, toolStatus: undefined, content: `请求失败: ${error instanceof Error ? error.message : "未知错误"}` } : m));
    } finally {
      abortControllerRef.current = null;
      readerRef.current = null;
      if (isSseDone) useChatStore.getState().setIsLoading(false);
    }
  }, [handleSseEvent]);

  const handleStopTask = useCallback(async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/stop`, { method: "POST" });
      useTaskStore.getState().updateActiveTask((prev) => prev ? { ...prev, status: "failed" } : undefined);
      useChatStore.getState().setIsLoading(false);
      useChatStore.getState().updateMessages((prev) => prev.map((m) => m.isStreaming || m.toolStatus ? { ...m, isStreaming: false, toolStatus: undefined, content: m.content || "任务已停止" } : m));
    } catch (error) {
      console.error("Stop task error:", error);
    }
  }, []);

  const handleRetryTask = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/retry`, { method: "POST" });
      if (res.ok) {
        const { task: updatedTask } = await res.json();
        useTaskStore.getState().updateActiveTask((prev) => prev ? { ...prev, status: "pending", toolStatus: undefined, agentSessionId: updatedTask?.agentSessionId } : undefined);
        const originalPrompt = useChatStore.getState().messages.find((m) => m.role === "user")?.content ?? "继续执行";
        handleSendMessage(originalPrompt, updatedTask?.agentSessionId, true);
      }
    } catch (error) {
      console.error("Retry task error:", error);
    }
  }, [handleSendMessage]);

  const handleProductClick = useCallback((product: { id: string; name: string }) => {
    setPreviewProduct(product as Product);
  }, []);

  const handleTaskSelect = useCallback((taskId: string) => {
    useTaskStore.getState().setSelectedTaskId(taskId);
    const wsId = useWorkspaceStore.getState().activeWorkspaceId;
    if (wsId) loadProducts(wsId);
  }, [loadProducts]);

  const handleDeleteWorkspace = useCallback(async (workspaceId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, { method: "DELETE" });
      if (res.ok) {
        const ws = useWorkspaceStore.getState();
        const chat = useChatStore.getState();
        const task = useTaskStore.getState();
        ws.removeWorkspace(workspaceId);
        useHomeStore.getState().invalidate();
        if (ws.activeWorkspaceId === workspaceId) {
          ws.setActiveWorkspaceId(null);
          ws.setActiveView("home");
          chat.setMessages([]);
          chat.setProducts([]);
          task.setActiveTask(undefined);
          task.setWorkspaceTasks([]);
          task.setSelectedTaskId(undefined);
        }
      }
    } catch (error) {
      console.error("Delete workspace error:", error);
    }
    setDeleteWorkspaceId(undefined);
  }, []);

  const handleProductDelete = useCallback(async (productId: string) => {
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (res.ok) {
        useChatStore.getState().updateProducts((prev) => prev.filter((p) => p.id !== productId));
      }
    } catch (error) {
      console.error("Delete product error:", error);
    }
  }, []);

  const handleQuestionAnswered = useCallback((questionIndex: number, answers: string[]) => {
    const task = useTaskStore.getState();
    const chat = useChatStore.getState();
    if (!task.activeTask?.taskId) return;
    const q = chat.pendingQuestion?.questions[questionIndex];
    if (q) {
      accumulatedAnswersRef.current[q.question] = answers.join(", ");
    }
    chat.updateMessages((prev) => [...prev, { id: nanoid(), role: "user", content: answers.join(", ") }]);
    const totalQuestions = totalQuestionsRef.current;
    const answeredCount = Object.keys(accumulatedAnswersRef.current).length;
    if (answeredCount < totalQuestions) {
      useChatStore.getState().updatePendingQuestion((prev) => {
        if (!prev) return undefined;
        const remaining = prev.questions.filter((_, i: number) => i !== questionIndex);
        return remaining.length > 0 ? { ...prev, questions: remaining } : undefined;
      });
      return;
    }
    const allAnswers = { ...accumulatedAnswersRef.current };
    accumulatedAnswersRef.current = {};
    useChatStore.getState().setPendingQuestion(undefined);
    fetch(`/api/tasks/${useTaskStore.getState().activeTask!.taskId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: allAnswers, conversationId: useChatStore.getState().conversationId }),
    }).catch((error) => console.error("Answer injection failed:", error));
  }, []);

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
        workspaces={wsStore.workspaces}
        activeWorkspaceId={wsStore.activeWorkspaceId}
        activeView={wsStore.activeView}
        onWorkspaceSelect={handleSelectWorkspace}
        onHomeSelect={handleHomeSelect}
        onWorkspaceCreate={handleWorkspaceCreateDialog}
        onWorkspaceDelete={handleWorkspaceDeleteDialog}
        collapsed={wsStore.sidebarCollapsed}
        onToggleCollapse={wsStore.toggleSidebar}
      />

      {wsStore.activeView === "home" ? (
        <HomePage
          onSelectBuddy={handleCreateWorkspaceWithBuddy}
          onTaskClick={handleSelectWorkspace}
        />
      ) : (
        <>
          <ChatArea
            messages={chatStore.messages}
            onSendMessage={handleSendMessage}
            isLoading={chatStore.isLoading}
            className="flex-1 min-w-0"
            activeTask={taskStore.activeTask}
            onStopTask={handleStopTask}
            onRetryTask={handleRetryTask}
            onStopGenerate={handleStopGenerate}
            pendingQuestion={chatStore.pendingQuestion}
            onQuestionAnswered={handleQuestionAnswered}
          />
          <RightBar
            tasks={taskStore.workspaceTasks}
            selectedTaskId={taskStore.selectedTaskId}
            onTaskSelect={handleTaskSelect}
            products={chatStore.products}
            onProductClick={handleProductClick}
            onProductDelete={handleProductDelete}
            collapsed={chatStore.rightBarCollapsed}
            onToggleCollapse={chatStore.toggleRightBar}
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
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateWorkspace(); }}
            placeholder="输入工作区名称"
            className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>取消</Button>
            <Button onClick={handleCreateWorkspace} disabled={!newWorkspaceName.trim()}>创建</Button>
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
            定要删除此工作区吗？工作区内的所有任务、对话和产物将被永久删除，此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteWorkspaceId(undefined)}>取消</Button>
            <Button variant="destructive" onClick={() => deleteWorkspaceId && handleDeleteWorkspace(deleteWorkspaceId)}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
