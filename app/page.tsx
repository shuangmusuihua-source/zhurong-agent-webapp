import { auth } from "@/lib/auth/auth-server";
import { redirect } from "next/navigation";
import { ChatContainer } from "@/components/chat/chat-container";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await import("next/headers").then((m) => m.headers()) });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="h-screen flex flex-col">
      <ChatContainer />
    </div>
  );
}
