'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Anchor, X, CopyIcon, RefreshCcwIcon, ArrowDown, Loader2, ArrowRight, ExternalLink, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Streamdown } from 'streamdown';
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom';
import { DomainSelector, TaskDomain } from '@/components/task-chat/domain-selector';
import { cn } from '@/lib/utils';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputHeader,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputTools,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputSpeechButton,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input';

const ASSISTANT_NAME = 'First Mate';

interface TaskChatProps {
  onClose: () => void;
  onTaskAdded?: (task: any) => void;
  fullPage?: boolean; // If true, render as full page instead of modal
}

export function TaskChat({ onClose, onTaskAdded, fullPage = false }: TaskChatProps) {
  const [showDomainSelector, setShowDomainSelector] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<TaskDomain | null>(null);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { messages, sendMessage, status, error, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/tasks',
    }),
  });

  // Parse messages for task additions from tool calls
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      // Check for tool calls in the message parts
      const toolCalls = (lastMessage.parts || []).filter(
        (part: any) => part.type === 'tool-call'
      ) as unknown as Array<{ type: 'tool-call'; toolCallId: string; toolName: string }>;

      for (const toolCall of toolCalls) {
        if (toolCall.toolName === 'createTask') {
          // Get the tool result for this tool call
          const toolResults = (lastMessage.parts || []).filter(
            (part: any) => part.type === 'tool-result' && part.toolCallId === toolCall.toolCallId
          ) as unknown as Array<{ type: 'tool-result'; toolCallId: string; result: any }>;

          for (const result of toolResults) {
            // Tool now saves directly to database, so we just need to notify the parent
            if (result.result?.success && result.result?.task && onTaskAdded) {
              // Pass the task data so parent can refresh the list
              onTaskAdded(result.result.task);
              // Reset domain selection after task is created (but keep chat visible)
              setSelectedDomain(null);
              setShowDomainSelector(false);
              // Don't reset domainSelected - keep chat visible
            }
          }
        }
      }

      // Also check for tool results directly (some formats include them differently)
      const toolResults = (lastMessage.parts || []).filter(
        (part: any) => part.type === 'tool-result'
      ) as unknown as Array<{ type: 'tool-result'; result: any }>;
      for (const result of toolResults) {
        // Tool now saves directly to database, so we just need to notify the parent
        if (result.result?.success && result.result?.task && onTaskAdded) {
          // Pass the task data so parent can refresh the list
          onTaskAdded(result.result.task);
          // Reset domain selection after task is created
          setSelectedDomain(null);
          setShowDomainSelector(false);
        }
      }
    }
  }, [messages, onTaskAdded]);

  // Track if domain has been selected
  const [domainSelected, setDomainSelected] = useState(false);

  // Parse messages for domain selection JSON
  useEffect(() => {
    if (messages.length === 0) return;

    // Check if user has already selected a domain in any message
    const userMessages = messages.filter((msg: any) => msg.role === 'user');
    const hasSelectedDomain = userMessages.some((msg: any) => {
      const textParts = msg.parts?.filter((part: any) => part.type === 'text') || [];
      const messageText = textParts.map((part: any) => part.text).join('');
      return messageText.includes("I've selected the") && messageText.includes("domain");
    });

    // If domain is already selected, hide selector and show chat
    if (hasSelectedDomain || selectedDomain) {
      setShowDomainSelector(false);
      setDomainSelected(true);
      return;
    }

    // Only show domain selector if no domain has been selected yet
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      const textParts = lastMessage.parts?.filter((part: any) => part.type === 'text') || [];
      const messageText = textParts.map((part: any) => part.text).join('');

      // Look for JSON at the end of the message
      const jsonMatch = messageText.match(/\{[\s\S]*"action"[\s\S]*"showDomainSelector"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const jsonData = JSON.parse(jsonMatch[0]);
          if (jsonData.action === 'showDomainSelector') {
            setShowDomainSelector(true);
            setDomainSelected(false);
            setIsWaitingForResponse(false); // Stop loading when domain selector appears
            return;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      // If we got any assistant response, stop the loading
      if (lastMessage && lastMessage.role === 'assistant') {
        setIsWaitingForResponse(false);
      }
    }
  }, [messages, selectedDomain]);

  const handleDomainSelect = (domain: TaskDomain) => {
    setSelectedDomain(domain);
    setShowDomainSelector(false);
    setDomainSelected(true);
    // Send message to AI with selected domain
    sendMessage({
      text: `I've selected the ${domain} domain.`
    });
  };

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text?.trim());
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    // Regular message
    sendMessage({ text: message.text?.trim() || '', files: message.files });
  };

  const renderMessage = (message: any, index: number) => {
    if (message.role === 'assistant') {
      const textParts = message.parts?.filter((part: any) => part.type === 'text') || [];
      let messageText = textParts.map((part: any) => part.text).join('');

      // Remove JSON metadata from displayed message (keep it for parsing but don't show it)
      messageText = messageText.replace(/\{[\s\S]*"action"[\s\S]*"showDomainSelector"[\s\S]*\}/g, '').trim();

      return (
        <div key={message.id || index} className={cn("group flex items-start gap-4 w-full py-4 hover:bg-muted/20 transition-colors", fullPage ? "px-0" : "px-6")}>
          <Avatar className="size-8 shrink-0 mt-0.5 ring-2 ring-primary/10">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-2 border-primary/20 shadow-sm">
              <Anchor className="size-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 text-foreground">
              <Streamdown>{messageText}</Streamdown>
            </div>
            {index === messages.length - 1 && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-muted"
                        onClick={() => regenerate()}
                      >
                        <RefreshCcwIcon className="size-3.5" />
                        <span className="sr-only">Retry</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Retry</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-muted"
                        onClick={() => {
                          if (messageText) navigator.clipboard.writeText(messageText);
                        }}
                      >
                        <CopyIcon className="size-3.5" />
                        <span className="sr-only">Copy</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>
      );
    }

    // User message
    const textParts = message.parts?.filter((part: any) => part.type === 'text') || [];
    const messageText = textParts.map((part: any) => part.text).join('');

    return (
      <div key={message.id || index} className={cn("flex items-start gap-4 w-full py-4 hover:bg-muted/20 transition-colors", fullPage ? "px-0" : "px-6")}>
        <div className="flex-1 min-w-0 ml-auto max-w-[85%]">
          <div className="rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm shadow-sm border border-primary/20">
            {messageText}
          </div>
        </div>
      </div>
    );
  };

  // Calculate progress based on chat state
  const getProgress = () => {
    if (!domainSelected) return 0;
    if (messages.length === 0) return 10;
    // Progress increases as conversation continues
    const messageCount = messages.filter((msg: any) => {
      const textParts = msg.parts?.filter((part: any) => part.type === 'text') || [];
      const messageText = textParts.map((part: any) => part.text).join('');
      return !messageText.includes("showDomainSelector") &&
             !(msg.role === 'user' && messageText.includes("I want to create a task") && !messageText.includes("I've selected the"));
    }).length;
    return Math.min(10 + (messageCount * 15), 90);
  };

  const progress = getProgress();
  const isProcessing = status === 'submitted' || status === 'streaming';

  const containerClass = fullPage
    ? "h-full bg-background flex flex-col overflow-hidden"
    : "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm";

  const contentClass = fullPage
    ? "flex-1 flex flex-col w-full h-full overflow-hidden"
    : "relative w-full max-w-4xl h-[85vh] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden";

  return (
    <div className={containerClass}>
      <div className={contentClass}>
        {/* Header - only show in modal mode */}
        {!fullPage && (
          <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar className="size-8 ring-2 ring-primary/10">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-2 border-primary/20 shadow-sm">
                  <Anchor className="size-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-base font-semibold tracking-tight">{ASSISTANT_NAME}</h2>
                <p className="text-xs text-muted-foreground">Task Generation Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Progress Indicator */}
              {domainSelected && (
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 rounded-full shadow-sm"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground min-w-[3.5rem]">
                    {isProcessing ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      `${Math.round(progress)}%`
                    )}
                  </span>
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Messages */}
        <StickToBottom
          className={fullPage ? "flex-1 overflow-y-auto min-h-0 pb-[220px]" : "flex-1 overflow-y-auto pb-[220px]"}
          initial="smooth"
          resize="smooth"
          role="log"
        >
          <StickToBottom.Content className={fullPage ? "flex flex-col items-center w-full" : "flex flex-col"}>
            <div className={fullPage ? "w-full max-w-3xl flex flex-col" : "w-full flex flex-col"}>
            {!domainSelected && !showDomainSelector && (
              <div className={cn("flex-1 flex items-center justify-center py-12", fullPage ? "px-0 w-full" : "px-6")}>
                {isWaitingForResponse && messages.filter((m: any) => m.role === 'assistant').length === 0 ? (
                  // Loading indicator
                  <div className="text-center space-y-4 max-w-lg">
                    <div className="inline-flex items-center justify-center size-16 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 mb-2">
                      <Avatar className="size-10">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                          <Loader2 className="size-5 animate-spin" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold tracking-tight">
                        {ASSISTANT_NAME} is thinking...
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Preparing to help you create a task
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-1 pt-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  // Welcome screen - only show when no messages at all
                  <div className="text-center space-y-6 max-w-lg">
                    <div className="space-y-3">
                      <div className="inline-flex items-center justify-center size-16 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 mb-2">
                        <Avatar className="size-10">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                            <Anchor className="size-5" />
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <h3 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Hi! I&apos;m {ASSISTANT_NAME}.
                      </h3>
                      <p className="text-base text-muted-foreground leading-relaxed">
                        Let&apos;s create a new task together! I&apos;ll guide you through selecting a domain and crafting the perfect task for your sailing journey.
                      </p>
                    </div>
                    <div className="pt-4">
                      <Button
                        onClick={() => {
                          setIsWaitingForResponse(true);
                          sendMessage({ text: 'Hi, I want to create a task.' });
                        }}
                        size="lg"
                        disabled={isWaitingForResponse}
                        className="w-full sm:w-auto px-8 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
                      >
                        {isWaitingForResponse ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            Start Creating Task
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Only show messages after domain is selected */}
            {domainSelected && messages.map((message, index) => {
              // Filter out messages before domain selection
              const messageTextParts = message.parts?.filter((part: any) => part.type === 'text') || [];
              const messageText = messageTextParts.map((part: any) => part.text).join('');

              // Skip messages that are part of domain selection flow
              if (message.role === 'user' && messageText.includes("I want to create a task") && !messageText.includes("I've selected the")) {
                return null;
              }
              if (message.role === 'assistant' && messageText.includes("showDomainSelector")) {
                return null;
              }

              return renderMessage(message, index);
            })}

            {showDomainSelector && (
              <div className={cn("flex items-start gap-4 w-full py-6", fullPage ? "px-0" : "px-6")}>
                <Avatar className="size-8 shrink-0 mt-0.5 ring-2 ring-primary/10">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-2 border-primary/20 shadow-sm">
                    <Anchor className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <DomainSelector
                    onSelect={handleDomainSelect}
                    isSubmitting={status === 'submitted' || status === 'streaming'}
                  />
                </div>
              </div>
            )}

            {domainSelected && (status === 'submitted' || status === 'streaming') && (
              <div className={cn("flex items-start gap-4 w-full py-4", fullPage ? "px-0" : "px-6")}>
                <Avatar className="size-8 shrink-0 mt-0.5 ring-2 ring-primary/10">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-2 border-primary/20 shadow-sm">
                    <Anchor className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/50 px-4 py-2 rounded-lg border border-border/50">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span>{ASSISTANT_NAME} is thinking…</span>
                </div>
              </div>
            )}

            {domainSelected && error && (
              <div className={cn("flex items-start gap-4 w-full py-4", fullPage ? "px-0" : "px-6")}>
                <Avatar className="size-8 shrink-0 mt-0.5 ring-2 ring-destructive/10">
                  <AvatarFallback className="bg-destructive/10 text-destructive border-2 border-destructive/20">
                    <Anchor className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg border border-destructive/20">
                  Something went wrong. Please try again.
                </div>
              </div>
            )}
            </div>
          </StickToBottom.Content>
          <ScrollToBottomButton />
        </StickToBottom>

        {/* Input - only show after domain is selected */}
        {domainSelected && !showDomainSelector && (
          <div className={cn(
            "fixed bottom-0 left-0 right-0 z-50",
            fullPage ? "" : "pointer-events-none"
          )}>
            <div className="mx-auto max-w-3xl px-4 pb-6 pt-4 pointer-events-auto">
              <div className="bg-background border border-border rounded-2xl shadow-2xl">
                <PromptInput onSubmit={handleSubmit} multiple>
                  <PromptInputHeader>
                    <PromptInputAttachments>
                      {(attachment) => <PromptInputAttachment data={attachment} />}
                    </PromptInputAttachments>
                  </PromptInputHeader>
                  <PromptInputBody>
                    <PromptInputTextarea
                      ref={textareaRef}
                      placeholder="Message First Mate..."
                    />
                  </PromptInputBody>
                  <PromptInputFooter>
                    <PromptInputTools>
                      <PromptInputActionMenu>
                        <PromptInputActionMenuTrigger />
                        <PromptInputActionMenuContent>
                          <PromptInputActionAddAttachments />
                        </PromptInputActionMenuContent>
                      </PromptInputActionMenu>
                      <PromptInputSpeechButton
                        textareaRef={textareaRef}
                      />
                    </PromptInputTools>
                    <PromptInputSubmit status={status} />
                  </PromptInputFooter>
                </PromptInput>
              </div>
              {/* Disclaimer text like ChatGPT */}
              <div className="mt-3 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-foreground">
                    First Mate can make mistakes. Check {' '}
                    <Link
                      href="/about"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                    >
                      important info
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScrollToBottomButton() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  if (isAtBottom) return null;

  return (
    <Button
      className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-lg"
      onClick={handleScrollToBottom}
      size="icon"
      variant="outline"
    >
      <ArrowDown className="h-4 w-4" />
    </Button>
  );
}

