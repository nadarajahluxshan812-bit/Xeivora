import { Suspense } from "react";

import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { requireViewer } from "@/lib/auth";

export default async function ChatPage() {
  const viewer = await requireViewer("/chat");

  return (
    <Suspense fallback={null}>
      <ChatWorkspace viewer={viewer} />
    </Suspense>
  );
}
