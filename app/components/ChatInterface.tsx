"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Send, 
  Bot, 
  User, 
  MapPin, 
  Lightbulb, 
  Plus, 
  Trash2,
  MessageSquare,
  Rocket,
  ArrowRight,
  Star,
  History,
  Home
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SearchResult {
  builderId: string;
  name: string;
  role: string;
  score: number;
  matchReason: string;
  skills: string[];
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  results?: SearchResult[];
}

interface ChatSession {
  id: string;
  sessionId: string;
  createdAt: string;
  lastQuery?: string;
  messageCount: number;
  isActive: boolean;
}

export function ChatInterface() {
  const { isSignedIn, user } = useUser();
  const userId = user?.id || null;
  const searchParams = useSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isCurrentSessionActive, setIsCurrentSessionActive] = useState(true);
  const [selectOpen, setSelectOpen] = useState(false);
  const hasHandledInitialQueryRef = useRef(false);
  const isCreatingSessionRef = useRef(false);
  const isDeletingSessionRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to get accurate scrollHeight
      textarea.style.height = "auto";
      // Calculate new height with minimum height
      const minHeight = 44; // Minimum height for mobile touch targets
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 200;
      const newHeight = Math.max(scrollHeight, minHeight);
      const finalHeight = Math.min(newHeight, maxHeight);
      textarea.style.height = `${finalHeight}px`;
      
      // Only enable scrolling if content exceeds max height
      if (scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  }, []);

  // Define callbacks first before useEffect hooks that use them
  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch("/api/search/chat/sessions");
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  }, []);

  const createNewSession = useCallback(async (preserveMessages = false) => {
    // Prevent multiple simultaneous session creations
    if (isCreatingSessionRef.current) {
      return null;
    }
    
    isCreatingSessionRef.current = true;
    try {
      const response = await fetch("/api/search/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentSessionId(data.sessionId);
        // Only clear messages if not preserving them (e.g., when creating from initial query)
        if (!preserveMessages) {
          setMessages([]);
        }
        setIsCurrentSessionActive(true); // New session is always active
        await loadSessions();
        return data.sessionId;
      }
    } catch (error) {
      console.error("Failed to create session:", error);
    } finally {
      isCreatingSessionRef.current = false;
    }
    return null;
  }, [loadSessions]);

  const handleInitialQuery = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    // Prevent multiple calls
    if (isCreatingSessionRef.current) {
      return;
    }
    
    // Add user message IMMEDIATELY to show it right away
    const userMessage: ChatMessage = {
      role: "user",
      content: query,
    };
    setMessages([userMessage]);
    
    setIsLoading(true);
    
    // Create new session in the background, preserving the user message we just set
    const sessionId = await createNewSession(true);
    if (!sessionId) {
      setIsLoading(false);
      toast.error("Failed to create session", {
        description: "Please try again",
      });
      return;
    }

    try {
      const response = await fetch("/api/search/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          conversationHistory: [],
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          const errorData = await response.json();
          toast.error("Rate Limit Exceeded", {
            description: errorData.message || "Please try again later.",
          });
          return;
        }
        throw new Error("Search failed");
      }

      const data = await response.json();

      // Debug logging
      console.log("API Response:", { 
        hasResults: !!data.results, 
        resultsLength: data.results?.length || 0,
        results: data.results?.slice(0, 2) // Log first 2 results for debugging
      });

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.response || data.message || "Here are the search results:",
        results: Array.isArray(data.results) ? data.results : [],
      };
      setMessages([userMessage, assistantMessage]);

      // Session is already created and set, just reload sessions list to refresh
      await loadSessions();
    } catch (error) {
      toast.error("Search Error", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }, [createNewSession, loadSessions]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [userId, loadSessions]);

  // Handle initial query from URL
  useEffect(() => {
    const query = searchParams.get("q");
    if (query && !hasHandledInitialQueryRef.current) {
      hasHandledInitialQueryRef.current = true; // Set ref immediately to prevent duplicate calls
      // Clear the query parameter from URL first to prevent re-triggering
      router.replace("/search", { scroll: false });
      // Send the query immediately - message will appear right away
      // Use the function directly without depending on it in the dependency array
      handleInitialQuery(query).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]); // Removed handleInitialQuery from dependencies to prevent re-triggers

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize textarea height on mount
  useEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

  // Focus input on mount
  useEffect(() => {
    if (!isLoading && messages.length === 0) {
      textareaRef.current?.focus();
    }
  }, [isLoading, messages.length]);

  const loadSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/search/chat/sessions/${sessionId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load session: ${response.status}`);
      }
      
        const data = await response.json();
        setMessages(data.messages || []);
        setCurrentSessionId(sessionId);
      setIsCurrentSessionActive(data.isActive ?? true);
      
      // Scroll to bottom after messages are rendered to show latest messages
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error("Failed to load session:", error);
      toast.error("Failed to load conversation", {
        description: error instanceof Error ? error.message : "Could not load the conversation history.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (sessionId: string, e?: React.MouseEvent | React.PointerEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Keep the select open while deleting
    const wasOpen = selectOpen;
    setSelectOpen(true);
    
    try {
      const response = await fetch(`/api/search/chat/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Session deleted");
        await loadSessions();
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null);
          setMessages([]);
          setIsCurrentSessionActive(true);
        }
        // Close select after deletion
        setTimeout(() => {
          setSelectOpen(false);
          isDeletingSessionRef.current = false;
        }, 100);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error("Failed to delete session", {
          description: errorData.error || "An error occurred",
        });
        setSelectOpen(wasOpen);
        isDeletingSessionRef.current = false;
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error("Failed to delete session", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
      setSelectOpen(wasOpen);
      isDeletingSessionRef.current = false;
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = textareaRef.current?.value?.trim() || "";
    if (!query || isLoading) return;

    // Create session if needed
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createNewSession();
      if (!sessionId) {
        toast.error("Failed to create session");
        return;
      }
    }

    setIsLoading(true);

    // Add user message
    const userMessage: ChatMessage = {
      role: "user",
      content: query,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Clear input
    if (textareaRef.current) {
      textareaRef.current.value = "";
      adjustTextareaHeight();
    }

    try {
      const response = await fetch("/api/search/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          const errorData = await response.json();
          toast.error("Rate Limit Exceeded", {
            description: errorData.message || "Please try again later.",
          });
          return;
        }
        throw new Error("Search failed");
      }

      const data = await response.json();

      // Debug logging
      console.log("API Response:", { 
        hasResults: !!data.results, 
        resultsLength: data.results?.length || 0,
        results: data.results?.slice(0, 2) // Log first 2 results for debugging
      });

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.response || data.message || "Here are the search results:",
        results: Array.isArray(data.results) ? data.results : [],
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update session
      if (data.sessionId) {
        setCurrentSessionId(data.sessionId);
        setIsCurrentSessionActive(true); // New session is always active
        await loadSessions();
      }
    } catch (error) {
      toast.error("Search Error", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentSession = sessions.find(s => s.sessionId === currentSessionId);
  const activeSessions = sessions.filter(s => s.isActive);
  const inactiveSessions = sessions.filter(s => !s.isActive);

  return (
    <div data-chat-interface className="fixed inset-0 flex flex-col bg-background overflow-hidden" style={{ height: '100dvh' }}>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative min-h-0">
        {/* Header */}
        <div className="h-14 sm:h-16 md:h-20 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-3 sm:px-4 md:px-6 shrink-0 z-10">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <Link 
              href="/"
              className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 group cursor-pointer"
            >
              <span className="text-xl sm:text-2xl md:text-3xl font-extrabold gradient-text group-hover:opacity-80 transition-opacity cursor-pointer">
                Quantum
              </span>
            </Link>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Home Button */}
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="size-8 sm:size-9 shrink-0"
              title="Go to home"
            >
              <Link href="/">
                <Home className="size-4 sm:size-5" />
              </Link>
            </Button>
            {/* Session Selector */}
            {sessions.length > 0 && (
              <Select
                value={currentSessionId || undefined}
                open={selectOpen}
                onOpenChange={(open) => {
                  // Don't close if we're deleting
                  if (isDeletingSessionRef.current && !open) {
                    return;
                  }
                  setSelectOpen(open);
                }}
                onValueChange={(value) => {
                  // Prevent value change if we're deleting a session
                  if (isDeletingSessionRef.current) {
                    return;
                  }
                  setSelectOpen(false);
                  if (value === "new") {
                    createNewSession();
                  } else {
                    loadSession(value);
                  }
                }}
              >
                <SelectTrigger className="w-[140px] sm:w-[180px] md:w-[240px] h-9 sm:h-10 text-xs sm:text-sm">
                  <History className="size-3 sm:size-4 mr-1.5 sm:mr-2 shrink-0" />
                  <SelectValue placeholder="Select conversation">
                    {currentSession 
                      ? (currentSession.lastQuery ? 
                          (currentSession.lastQuery.length > 15 
                            ? currentSession.lastQuery.substring(0, 15) + '...' 
                            : currentSession.lastQuery)
                          : `Chat ${new Date(currentSession.createdAt).toLocaleDateString()}`)
                      : "Select conversation"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent 
                  className="max-h-[300px] overflow-y-auto max-w-[calc(100vw-1rem)] sm:max-w-none"
                  sideOffset={4}
                  alignOffset={0}
                >
                  <SelectItem value="new">
                    <div className="flex items-center gap-2">
                      <Plus className="size-4" />
                      <span>New Chat</span>
                    </div>
                  </SelectItem>
                  {activeSessions.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Active</SelectLabel>
                      {activeSessions.map((session) => (
                        <SelectItem 
                          key={session.sessionId} 
                          value={session.sessionId}
                          className="group/item"
                          onPointerDown={(e) => {
                            // Check if the click target is the delete button or its children
                            const target = e.target as HTMLElement;
                            const deleteButton = target.closest('button[aria-label="Delete session"]');
                            if (deleteButton) {
                              e.preventDefault();
                              (e.nativeEvent as PointerEvent).stopImmediatePropagation();
                              e.stopPropagation();
                              return false;
                            }
                          }}
                        >
                          <div className="flex items-center justify-between w-full gap-2 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="truncate">{session.lastQuery || "New Chat"}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <button
                              onPointerDown={(e) => {
                                e.preventDefault();
                                (e.nativeEvent as PointerEvent).stopImmediatePropagation();
                                e.stopPropagation();
                                // Set deleting flag immediately
                                isDeletingSessionRef.current = true;
                                // Call delete immediately
                                deleteSession(session.sessionId, e);
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                (e.nativeEvent as MouseEvent).stopImmediatePropagation();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                (e.nativeEvent as MouseEvent).stopImmediatePropagation();
                                e.stopPropagation();
                              }}
                              className="opacity-100 p-1 hover:bg-destructive/10 active:bg-destructive/20 rounded shrink-0 pointer-events-auto z-10 relative"
                              aria-label="Delete session"
                              type="button"
                            >
                              <Trash2 className="size-3.5 text-destructive pointer-events-none" />
                            </button>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {inactiveSessions.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>History</SelectLabel>
                      {inactiveSessions.map((session) => (
                        <SelectItem 
                          key={session.sessionId} 
                          value={session.sessionId}
                          className="group/item"
                          onPointerDown={(e) => {
                            // Check if the click target is the delete button or its children
                            const target = e.target as HTMLElement;
                            const deleteButton = target.closest('button[aria-label="Delete session"]');
                            if (deleteButton) {
                              e.preventDefault();
                              (e.nativeEvent as PointerEvent).stopImmediatePropagation();
                              e.stopPropagation();
                              return false;
                            }
                          }}
                        >
                          <div className="flex items-center justify-between w-full gap-2 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="truncate">{session.lastQuery || "New Chat"}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <button
                              onPointerDown={(e) => {
                                e.preventDefault();
                                (e.nativeEvent as PointerEvent).stopImmediatePropagation();
                                e.stopPropagation();
                                // Set deleting flag immediately
                                isDeletingSessionRef.current = true;
                                // Call delete immediately
                                deleteSession(session.sessionId, e);
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                (e.nativeEvent as MouseEvent).stopImmediatePropagation();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                (e.nativeEvent as MouseEvent).stopImmediatePropagation();
                                e.stopPropagation();
                              }}
                              className="opacity-100 p-1 hover:bg-destructive/10 active:bg-destructive/20 rounded shrink-0 pointer-events-auto z-10 relative"
                              aria-label="Delete session"
                              type="button"
                            >
                              <Trash2 className="size-3.5 text-destructive pointer-events-none" />
                            </button>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            )}
            
            {/* New Chat Button */}
            <Button
              onClick={() => createNewSession()}
              variant="default"
              size="sm"
              className="gap-1.5 sm:gap-2 h-9 sm:h-10 px-2 sm:px-3"
            >
              <Plus className="size-3.5 sm:size-4" />
              <span className="hidden sm:inline">New Chat</span>
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full px-3 sm:px-4 md:px-6">
              <div className="text-center max-w-2xl w-full py-8 sm:py-12">
                <div className="inline-flex items-center justify-center size-12 sm:size-16 rounded-2xl bg-primary/10 mb-4 sm:mb-6">
                  <Rocket className="size-6 sm:size-8 text-primary" />
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3 tracking-tight px-4">
                  Find your perfect teammate
                </h2>
                <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base md:text-lg leading-relaxed max-w-lg mx-auto px-4">
                  Describe what you're looking for and I'll help you find the right match using AI-powered search.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
                  {[
                    "React developer with design skills",
                    "Full-stack engineer for fintech",
                    "ML engineer with startup experience"
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (textareaRef.current) {
                          textareaRef.current.value = example;
                          adjustTextareaHeight();
                          setTimeout(() => handleSend(), 100);
                        }
                      }}
                      className="text-left p-2.5 sm:p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-xs sm:text-sm text-muted-foreground hover:text-foreground"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 md:space-y-8">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-2 sm:gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <Avatar className="size-7 sm:size-8 md:size-9 shrink-0 border-2 border-primary/10">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                        <Bot className="size-3.5 sm:size-4 md:size-5 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {message.role === "user" && (
                    <Avatar className="size-7 sm:size-8 md:size-9 shrink-0 border-2 border-primary/20 order-2">
                      <AvatarFallback className="bg-primary/10">
                        <User className="size-3.5 sm:size-4 md:size-5 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={cn(
                      "flex flex-col gap-1.5 sm:gap-2 max-w-[calc(100%-3.5rem)] sm:max-w-[calc(100%-4rem)] md:max-w-[75%]",
                      message.role === "user" ? "items-end order-1" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-3 sm:px-4 md:px-5 py-2 sm:py-3 md:py-3.5 whitespace-pre-wrap shadow-sm transition-all",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      <p className="text-xs sm:text-sm md:text-base leading-relaxed">{message.content}</p>
                    </div>

                    {/* Show results if available */}
                    {message.role === "assistant" && (
                      <>
                        {message.results && message.results.length > 0 ? (
                          <div className="w-full space-y-3 sm:space-y-4 mt-1">
                            {message.results.map((result, idx) => (
                            <Card
                              key={result.builderId}
                              className="border-2 hover:border-primary/30 transition-all duration-200 hover:shadow-lg group overflow-hidden"
                            >
                              <CardContent className="p-3 sm:p-4 md:p-5">
                                <div className="flex items-start gap-3 sm:gap-4">
                                  <Avatar className="size-12 sm:size-14 md:size-16 border-2 border-primary/20 shrink-0 group-hover:border-primary/40 transition-colors">
                                    <AvatarImage
                                      src={result.avatarUrl || undefined}
                                      alt={result.name}
                                    />
                                    <AvatarFallback className="text-base sm:text-lg md:text-xl bg-gradient-to-br from-primary/20 to-primary/10 font-semibold">
                                      {result.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                                          <h3 className="font-semibold text-sm sm:text-base md:text-lg truncate">
                                          {result.name}
                                        </h3>
                                          <Star className="size-3.5 sm:size-4 text-primary fill-primary shrink-0" />
                                        </div>
                                        <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-1">
                                          {result.role}
                                        </p>
                                        {result.location && (
                                          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs md:text-sm text-muted-foreground">
                                            <MapPin className="size-3 sm:size-3.5 shrink-0" />
                                            <span className="truncate">{result.location}</span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right shrink-0 bg-primary/5 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-primary/10">
                                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary">
                                          {Math.round(result.score * 100)}%
                                        </div>
                                        <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                                          Match
                                        </div>
                                      </div>
                                    </div>

                                    {result.bio && (
                                      <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-3 sm:mb-4 line-clamp-2 leading-relaxed">
                                        {result.bio}
                                      </p>
                                    )}

                                    <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-3 sm:p-4 mb-3 sm:mb-4 border border-primary/10">
                                      <p className="mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm font-semibold text-foreground">
                                        <Lightbulb className="size-3 sm:size-4 text-primary shrink-0" />
                                        Why this match:
                                      </p>
                                      <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground leading-relaxed">
                                        {result.matchReason}
                                      </p>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                                      {result.skills.slice(0, 6).map((skill, i) => (
                                        <Badge
                                          key={i}
                                          variant="secondary"
                                          className="text-[10px] sm:text-xs md:text-sm px-2 sm:px-2.5 py-0.5 sm:py-1 font-medium"
                                        >
                                          {skill}
                                        </Badge>
                                      ))}
                                    </div>

                                    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                                      <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none text-xs sm:text-sm">
                                        <Link href={`/profiles/${result.builderId}`} className="flex items-center justify-center gap-1.5 sm:gap-2">
                                          View Profile
                                          <ArrowRight className="size-3 sm:size-3.5" />
                                        </Link>
                                      </Button>
                                      {isSignedIn && (
                                        <Button size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                                          Contact
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3 md:gap-4 justify-start animate-in fade-in slide-in-from-bottom-2">
                  <Avatar className="size-8 md:size-9 shrink-0 border-2 border-primary/10">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                      <Bot className="size-4 md:size-5 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2 items-start">
                    <div className="rounded-2xl bg-muted px-4 md:px-5 py-3 md:py-3.5 rounded-bl-md shadow-sm">
                      <div className="flex gap-2">
                        <div className="size-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="size-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="size-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t bg-card/50 backdrop-blur-sm shrink-0 z-10 overflow-hidden">
          <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-2.5 sm:py-4 md:py-5">
            {!isCurrentSessionActive && currentSessionId && (
              <div className="mb-2 sm:mb-3 p-2 sm:p-3 rounded-lg bg-muted/50 border border-muted flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                <History className="size-3.5 sm:size-4 shrink-0" />
                <span className="leading-tight break-words flex-1 min-w-0">This conversation is read-only. Start a new chat to continue.</span>
              </div>
            )}
            <form onSubmit={handleSend} className="flex gap-1.5 sm:gap-2 md:gap-3 items-end w-full">
              <div className="flex-1 relative min-w-0 max-w-full">
                <textarea
                  ref={textareaRef}
                  onInput={adjustTextareaHeight}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    !isCurrentSessionActive && currentSessionId
                      ? "This conversation is read-only..."
                      : "Ask me anything about finding teammates..."
                  }
                  className={cn(
                    "w-full resize-none rounded-xl border-2 bg-background py-2.5 sm:py-3 md:py-3.5 px-2.5 sm:px-4 md:px-5 text-xs sm:text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 focus:border-primary/50 max-h-[200px] placeholder:text-muted-foreground/60",
                    "overflow-x-hidden overflow-y-hidden scrollbar-hide",
                    "box-border",
                    (!isCurrentSessionActive && currentSessionId) && "opacity-60 cursor-not-allowed"
                  )}
                  rows={1}
                  disabled={isLoading || (!isCurrentSessionActive && currentSessionId !== null)}
                  style={{ 
                    wordWrap: 'break-word', 
                    overflowWrap: 'break-word',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    minHeight: '44px',
                    height: '44px'
                  }}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !textareaRef.current?.value?.trim() || (!isCurrentSessionActive && currentSessionId !== null)}
                size="icon"
                className="shrink-0 size-9 sm:size-11 md:size-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed mb-0"
              >
                <Send className="size-3.5 sm:size-4 md:size-5" />
              </Button>
            </form>
            {isCurrentSessionActive && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2 text-center sm:text-left break-words px-0.5">
                Press Enter to send, Shift+Enter for new line
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

