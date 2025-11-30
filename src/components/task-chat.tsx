'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandList, CommandGroup, CommandItem, CommandEmpty } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Anchor, X, CopyIcon, RefreshCcwIcon, ArrowDown, Loader2 } from 'lucide-react';
import { Streamdown } from 'streamdown';
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom';
import { cn } from '@/lib/utils';
import { DomainSelector, TaskDomain } from '@/components/task-chat/domain-selector';

const ASSISTANT_NAME = 'First Mate';

const DOMAIN_COMMANDS = {
  '/boat': 'Boat Maintenance',
  '/maintenance': 'Boat Maintenance',
  '/skill': 'Skill Building',
  '/weather': 'Weather Routing',
  '/safety': 'Safety Systems',
  '/budget': 'Budget Management',
  '/passage': 'Passage Planning',
  '/timeline': 'Timeline Management',
  '/help': 'Show available commands',
} as const;

const QUICK_COMMANDS = [
  { command: '/boat', description: 'Create a Boat Maintenance task' },
  { command: '/skill', description: 'Create a Skill Building task' },
  { command: '/weather', description: 'Create a Weather Routing task' },
  { command: '/safety', description: 'Create a Safety Systems task' },
  { command: '/budget', description: 'Create a Budget Management task' },
  { command: '/passage', description: 'Create a Passage Planning task' },
  { command: '/timeline', description: 'Create a Timeline Management task' },
];

interface TaskChatProps {
  onClose: () => void;
  onTaskAdded?: (task: any) => void;
}

export function TaskChat({ onClose, onTaskAdded }: TaskChatProps) {
  const [showCommands, setShowCommands] = useState(false);
  const [showDomainSelector, setShowDomainSelector] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<TaskDomain | null>(null);
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
            return;
          }
        } catch (e) {
          // Ignore parse errors
        }
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

  const handleCommandSelect = (command: string, clearText?: () => void) => {
    clearText?.();
    setShowCommands(false);
    
    if (command === '/help') {
      sendMessage({ text: 'Show me available commands for creating tasks' });
      return;
    }

    // For task creation commands, trigger domain selection
    const domain = DOMAIN_COMMANDS[command as keyof typeof DOMAIN_COMMANDS];
    if (domain && domain !== 'Show available commands') {
      // Show domain selector (which will be handled by the AI prompt)
      sendMessage({ 
        text: `I want to create a task.` 
      });
    }
  };

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text?.trim());
    const hasAttachments = Boolean(message.files?.length);
    
    if (!(hasText || hasAttachments)) {
      return;
    }

    // Handle command if it's typed directly
    const trimmedInput = message.text?.trim() || '';
    if (trimmedInput.startsWith('/')) {
      const command = trimmedInput.split(/\s/)[0] as keyof typeof DOMAIN_COMMANDS;
      if (command in DOMAIN_COMMANDS) {
        if (command === '/help') {
          sendMessage({ text: 'Show me available commands for creating tasks' });
          return;
        } else {
          // For task creation commands, trigger domain selection
          sendMessage({ 
            text: `I want to create a task.` 
          });
          setShowCommands(false);
          return;
        }
      }
    }

    // Regular message
    sendMessage({ text: trimmedInput, files: message.files });
    setShowCommands(false);
  };

  const renderMessage = (message: any, index: number) => {
    if (message.role === 'assistant') {
      const textParts = message.parts?.filter((part: any) => part.type === 'text') || [];
      let messageText = textParts.map((part: any) => part.text).join('');

      // Remove JSON metadata from displayed message (keep it for parsing but don't show it)
      messageText = messageText.replace(/\{[\s\S]*"action"[\s\S]*"showDomainSelector"[\s\S]*\}/g, '').trim();

      return (
        <div key={message.id || index} className="group flex items-start gap-4 w-full py-4 px-6 hover:bg-muted/30 transition-colors">
          <Avatar className="size-7 shrink-0 mt-0.5">
            <AvatarFallback className="bg-primary text-primary-foreground border border-border">
              <Anchor className="size-3.5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <Streamdown>{messageText}</Streamdown>
            </div>
            {index === messages.length - 1 && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
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
                        className="h-7 w-7"
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
      <div key={message.id || index} className="flex items-start gap-4 w-full py-4 px-6 hover:bg-muted/30 transition-colors">
        <div className="flex-1 min-w-0 ml-auto max-w-[85%]">
          <div className="rounded-lg bg-muted px-4 py-2.5 text-sm">
            {messageText}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl h-[85vh] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-primary-foreground border border-border">
                <Anchor className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-base">{ASSISTANT_NAME}</h2>
              <p className="text-xs text-muted-foreground">Task Generation Assistant</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <StickToBottom
          className="flex-1 overflow-y-auto"
          initial="smooth"
          resize="smooth"
          role="log"
        >
          <StickToBottom.Content className="flex flex-col">
            {!domainSelected && messages.length === 0 && !showDomainSelector && (
              <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="text-center space-y-2 max-w-md">
                  <p className="text-lg font-medium">Hi! I&apos;m {ASSISTANT_NAME}.</p>
                  <p className="text-sm text-muted-foreground">
                    Let&apos;s create a new task! First, I&apos;ll help you select a domain.
                  </p>
                </div>
              </div>
            )}
            
            {!domainSelected && messages.length === 0 && !showDomainSelector && (
              <div className="px-6 pb-4">
                <Button
                  onClick={() => {
                    sendMessage({ text: 'Hi, I want to create a task.' });
                  }}
                  className="w-full"
                >
                  Start Creating Task
                </Button>
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
              <div className="flex items-start gap-4 w-full py-4 px-6">
                <Avatar className="size-7 shrink-0 mt-0.5">
                  <AvatarFallback className="bg-primary text-primary-foreground border border-border">
                    <Anchor className="size-3.5" />
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
              <div className="flex items-start gap-4 w-full py-4 px-6">
                <Avatar className="size-7 shrink-0 mt-0.5">
                  <AvatarFallback className="bg-primary text-primary-foreground border border-border">
                    <Anchor className="size-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  <span>{ASSISTANT_NAME} is thinking…</span>
                </div>
              </div>
            )}

            {domainSelected && error && (
              <div className="flex items-start gap-4 w-full py-4 px-6">
                <Avatar className="size-7 shrink-0 mt-0.5">
                  <AvatarFallback className="bg-primary text-primary-foreground border border-border">
                    <Anchor className="size-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm text-destructive">
                  Something went wrong. Please try again.
                </div>
              </div>
            )}
          </StickToBottom.Content>
          <ScrollToBottomButton />
        </StickToBottom>

        {/* Input - only show after domain is selected */}
        {domainSelected && !showDomainSelector && (
          <div className="border-t bg-background relative">
            <TaskChatInput
              onSubmit={handleSubmit}
              status={status}
              showCommands={showCommands}
              setShowCommands={setShowCommands}
              handleCommandSelect={handleCommandSelect}
            />
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

type PromptInputMessage = {
  text: string;
  files?: any[];
};

function TaskChatInput({
  onSubmit,
  status,
  showCommands,
  setShowCommands,
  handleCommandSelect,
}: {
  onSubmit: (message: PromptInputMessage) => void;
  status: string;
  showCommands: boolean;
  setShowCommands: (show: boolean) => void;
  handleCommandSelect: (command: string, clearText?: () => void) => void;
}) {
  const [text, setText] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Expose clearText function to parent via handleCommandSelect callback
  const clearText = () => setText('');

  // Watch for input changes to show/hide commands
  useEffect(() => {
    // Show commands when typing '/' or when input starts with '/'
    if (text === '/' || text.startsWith('/')) {
      setShowCommands(true);
    } else if (!text.startsWith('/') && text.length === 0) {
      // Only close if input is empty and doesn't start with '/'
      setShowCommands(false);
    }
    // Don't auto-close if user is typing after '/' - let them interact with the popover
  }, [text, setShowCommands]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleCommandClick = (command: string) => {
    handleCommandSelect(command, clearText);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDisabled) return;

    onSubmit({ text: text.trim() });
    setText('');
    setShowCommands(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    } else if (e.key === 'Escape') {
      setShowCommands(false);
      setText('');
    }
  };

  const isDisabled = !text.trim() || status === 'submitted' || status === 'streaming';
  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <div className="relative">
      <Popover open={showCommands} onOpenChange={(open) => {
        if (!open) {
          setShowCommands(false);
        }
      }}>
        <form ref={formRef} onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-end px-4 py-3">
            <PopoverAnchor asChild className="flex-1 min-w-0">
              <Textarea
                ref={textareaRef}
                placeholder="Describe the task you want to add... (Type '/' for quick commands)"
                onKeyDown={handleKeyDown}
                onBlur={(e) => {
                  // Only close if the new focus target is not the popover
                  const relatedTarget = e.relatedTarget as HTMLElement;
                  if (!relatedTarget || !relatedTarget.closest('[data-slot="popover-content"]')) {
                    // Delay hiding commands to allow clicking on them
                    setTimeout(() => {
                      // Double check that we're still blurred and not focused on popover
                      if (document.activeElement !== textareaRef.current && 
                          !document.activeElement?.closest('[data-slot="popover-content"]')) {
                        setShowCommands(false);
                      }
                    }, 200);
                  }
                }}
                onFocus={() => {
                  if (text === '/' || text.startsWith('/')) {
                    setShowCommands(true);
                  }
                }}
                value={text}
                onChange={(e) => setText(e.currentTarget.value)}
                className="min-h-[52px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:outline-none text-base py-3 pr-12 shadow-none"
                disabled={isLoading}
              />
            </PopoverAnchor>
            <Button
              type="submit"
              disabled={isDisabled}
              size="icon"
              className="absolute right-3 bottom-3 h-8 w-8 rounded-lg shrink-0 z-10"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Anchor className="h-4 w-4" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </form>
        <PopoverContent 
          className="w-[400px] p-0" 
          align="start"
          side="top"
          sideOffset={8}
          onInteractOutside={(e) => {
            // Prevent closing when clicking on the popover itself
            const target = e.target as HTMLElement;
            if (target.closest('[data-slot="popover-content"]')) {
              e.preventDefault();
            }
          }}
        >
          <Command>
            <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 pt-2">
              Quick Commands
            </div>
            <CommandList>
              <CommandGroup>
                {QUICK_COMMANDS.map((cmd) => (
                  <CommandItem
                    key={cmd.command}
                    onSelect={() => handleCommandClick(cmd.command)}
                  >
                    <div>
                      <span className="font-mono text-primary">{cmd.command}</span>
                      <span className="text-muted-foreground ml-2">{cmd.description}</span>
                    </div>
                  </CommandItem>
                ))}
                <CommandItem
                  onSelect={() => handleCommandClick('/help')}
                >
                  <div>
                    <span className="font-mono text-primary">/help</span>
                    <span className="text-muted-foreground ml-2">Show all commands</span>
                  </div>
                </CommandItem>
              </CommandGroup>
              <CommandEmpty>
                No commands found.
              </CommandEmpty>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
