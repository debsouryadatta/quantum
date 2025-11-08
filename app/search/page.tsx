"use client";

import { Suspense } from "react";
import { ChatInterface } from "../components/ChatInterface";

function ChatInterfaceWrapper() {
  return <ChatInterface />;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <ChatInterfaceWrapper />
    </Suspense>
  );
}
