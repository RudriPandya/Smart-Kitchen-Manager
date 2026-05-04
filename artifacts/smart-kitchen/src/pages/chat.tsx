import { useState, useRef, useEffect } from "react";
import { useListAnthropicConversations, useCreateAnthropicConversation, useGetAnthropicConversation, getGetAnthropicConversationQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChefHat, User, Send, PlusCircle, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Chat() {
  const queryClient = useQueryClient();
  const { data: conversations, isLoading: loadingConvos } = useListAnthropicConversations();
  const createConvo = useCreateAnthropicConversation();
  
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Set initial active conversation
  useEffect(() => {
    if (conversations?.length && !activeId) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const { data: activeConvo, isLoading: loadingMessages } = useGetAnthropicConversation(activeId as number, {
    query: { enabled: !!activeId, queryKey: getGetAnthropicConversationQueryKey(activeId as number) }
  });

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConvo?.messages, streamingResponse]);

  const handleNewChat = () => {
    createConvo.mutate({ data: { title: "New Conversation" } }, {
      onSuccess: (data) => {
        setActiveId(data.id);
        queryClient.invalidateQueries({ queryKey: ["/api/anthropic/conversations"] });
      }
    });
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !activeId || isStreaming) return;

    const userMessage = input.trim();
    setInput("");
    setIsStreaming(true);
    setStreamingResponse("");

    // Optimistically add user message to cache
    queryClient.setQueryData(getGetAnthropicConversationQueryKey(activeId), (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: [...old.messages, { id: Date.now(), role: "user", content: userMessage, createdAt: new Date().toISOString() }]
      };
    });

    try {
      const res = await fetch(`/api/anthropic/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage })
      });

      if (!res.ok) throw new Error("Failed to send message");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullResponse += data.content;
                  setStreamingResponse(fullResponse);
                }
              } catch (e) { }
            }
          }
        }
      }
      
      // Invalidate to get the saved messages
      queryClient.invalidateQueries({ queryKey: getGetAnthropicConversationQueryKey(activeId) });
    } catch (error) {
      console.error(error);
    } finally {
      setIsStreaming(false);
      setStreamingResponse("");
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6 animate-in fade-in duration-500">
      {/* Sidebar for conversations */}
      <Card className="w-full md:w-72 flex-shrink-0 flex flex-col h-1/3 md:h-full">
        <CardHeader className="pb-4">
          <Button onClick={handleNewChat} className="w-full gap-2" disabled={createConvo.isPending}>
            <PlusCircle className="w-4 h-4" /> New Chat
          </Button>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="p-2 pt-0 space-y-1">
            {conversations?.map((conv) => (
              <Button
                key={conv.id}
                variant={activeId === conv.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start text-left font-normal truncate",
                  activeId === conv.id ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                )}
                onClick={() => setActiveId(conv.id)}
              >
                <MessageSquare className="w-4 h-4 mr-2 opacity-50 shrink-0" />
                <span className="truncate">{conv.title}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col h-2/3 md:h-full overflow-hidden border shadow-sm">
        <CardHeader className="py-3 px-6 border-b bg-card z-10 shadow-sm">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ChefHat className="w-5 h-5 text-primary" />
            AI Sous-Chef
          </CardTitle>
        </CardHeader>
        
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          {!activeId ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select or start a conversation
            </div>
          ) : loadingMessages ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
            </div>
          ) : activeConvo?.messages?.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                <ChefHat className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">Hello, Chef!</h3>
              <p className="text-muted-foreground">
                I'm your AI kitchen assistant. Ask me for recipe ideas, cooking techniques, or how to substitute ingredients you're missing.
              </p>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {activeConvo?.messages.map((msg, i) => (
                <div 
                  key={msg.id || i} 
                  className={cn(
                    "flex gap-4 max-w-[85%]",
                    msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                    msg.role === "user" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                  )}>
                    {msg.role === "user" ? <User className="w-4 h-4" /> : <ChefHat className="w-4 h-4" />}
                  </div>
                  <div className={cn(
                    "px-4 py-3 rounded-2xl",
                    msg.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-tr-sm" 
                      : "bg-muted text-foreground rounded-tl-sm prose prose-sm dark:prose-invert"
                  )}>
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  </div>
                </div>
              ))}
              
              {isStreaming && streamingResponse && (
                <div className="flex gap-4 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 bg-primary text-primary-foreground">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-muted text-foreground rounded-tl-sm prose prose-sm dark:prose-invert">
                    <div className="whitespace-pre-wrap leading-relaxed">{streamingResponse}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <CardFooter className="p-4 border-t bg-card">
          <form onSubmit={handleSend} className="flex w-full gap-2">
            <Input
              placeholder="Ask for cooking advice or recipes..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!activeId || isStreaming}
              className="flex-1 bg-background"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || !activeId || isStreaming}>
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
