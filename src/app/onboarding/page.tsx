'use client';

import {useChat} from '@ai-sdk/react';
import {DefaultChatTransport} from 'ai';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';

import {FormType} from '@/app/api/onboarding/schema';
import {honoClient} from '@/lib/hono-client';
import {
  BoatInfoForm,
  GoalsForm,
  JourneyPlanForm,
  SailingExperienceForm,
  TimelineForm,
  OnboardingFormProps,
} from '@/components/onboarding/forms';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {Loader} from '@/components/ai-elements/loader';
import {Button} from '@/components/ui/button';
import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import {Anchor} from 'lucide-react';

const FORM_COMPONENTS: Record<FormType, React.FC<OnboardingFormProps<any>>> = {
  boat_info: BoatInfoForm,
  sailing_experience: SailingExperienceForm,
  journey_plan: JourneyPlanForm,
  timeline: TimelineForm,
  goals_priorities: GoalsForm,
};

const ASSISTANT_NAME = 'First Mate';

const FORM_SUMMARIES: Record<FormType, { title: string; fields: Array<{ name: string; label: string }> }> = {
  boat_info: {
    title: 'Boat details',
    fields: [
      {name: 'boatType', label: 'Boat type'},
      {name: 'boatLength', label: 'Length (ft)'},
      {name: 'boatName', label: 'Name'},
    ],
  },
  sailing_experience: {
    title: 'Experience snapshot',
    fields: [
      {name: 'experienceLevel', label: 'Experience level'},
      {name: 'certifications', label: 'Certifications'},
      {name: 'mechanicalSkills', label: 'Mechanical skills'},
      {name: 'longestPassage', label: 'Longest passage'},
    ],
  },
  journey_plan: {
    title: 'Journey plan',
    fields: [
      {name: 'journeyType', label: 'Journey type'},
      {name: 'primaryDestination', label: 'Primary destination'},
      {name: 'journeyDuration', label: 'Duration'},
    ],
  },
  timeline: {
    title: 'Timeline & readiness',
    fields: [
      {name: 'departureDate', label: 'Departure date'},
      {name: 'preparationTimeline', label: 'Prep window'},
      {name: 'currentPreparationStatus', label: 'Status'},
    ],
  },
  goals_priorities: {
    title: 'Goals & priorities',
    fields: [
      {name: 'primaryGoals', label: 'Primary goals'},
    ],
  },
};

const GREETING_TEXT =
  "Hi there! I'm " +
  ASSISTANT_NAME +
  ", and I'm thrilled to be your sailing preparation companion. I'll be with you every step of the way—from planning your journey to helping you stay on track as you prepare. Together, we'll make sure you're ready for the adventure ahead!";

const GREETING_SUBTEXT =
  "Let's start by getting to know you and your boat. This will only take a few minutes, and I'll be right here with you throughout. Ready to begin?";

type TypewriterTextProps = {
  text: string;
  className?: string;
  onComplete?: () => void;
};

const TypewriterText = ({ text, className, onComplete }: TypewriterTextProps) => {
  const [visibleChars, setVisibleChars] = useState(0);

  // Reset when text or start flag changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleChars(0);
  }, [text]);

  useEffect(() => {
    if (visibleChars >= text.length) {
      if (onComplete) {
        onComplete();
      }
      return;
    }

    const id = typeof window !== 'undefined'
      ? window.setInterval(() => {
          setVisibleChars((prev) => Math.min(prev + 2, text.length));
        }, 20)
      : null;

    return () => {
      if (id !== null) {
        window.clearInterval(id);
      }
    };
  }, [visibleChars, text.length, onComplete]);

  return (
    <p className={className} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, visibleChars)}</span>
    </p>
  );
};

export default function OnboardingPage() {
  const router = useRouter();
  const [collectedData, setCollectedData] = useState<Record<string, any>>({});
  const [currentFormType, setCurrentFormType] = useState<FormType | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isOnboardingFailed, setIsOnboardingFailed] = useState(false);
  const [isGreetingDone, setIsGreetingDone] = useState(false);
  const [isGreetingSubtextDone, setIsGreetingSubtextDone] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  const collectedDataRef = useRef(collectedData);
  useEffect(() => {
    collectedDataRef.current = collectedData;
  }, [collectedData]);

  const {messages, sendMessage, status, error, /*stop*/} = useChat({
    transport: new DefaultChatTransport({
      api: '/api/onboarding',
    }),
  });

  /**
   * Marks the user as onboarded by sending their collected onboarding form data
   * to the server. If successful, marks the onboarding as complete and redirects
   * the user to the dashboard. Handles and displays errors if the process fails.
   *
   * @param formValues - The values collected from all onboarding forms.
   */
  const markAsOnboarded = useCallback(
    async (formValues: Record<string, any>) => {
      try {
        setOnboardingError(null);
        setIsOnboardingFailed(false);
        const response = await honoClient.api.user.onboarded.$post({
          json: {formsData: formValues},
        });

        if (!response.ok) {
          throw new Error('Failed to update onboarding status');
        }

        setIsOnboardingComplete(true);
        setTimeout(() => router.push('/dashboard'), 1000);
      } catch (err) {
        console.error('Error marking as onboarded:', err);
        setOnboardingError('Unable to finish onboarding right now. Please try again.');
        setIsOnboardingFailed(true);
        setCurrentFormType(null); // Stop showing forms
      }
    },
    [router],
  );

  // Parse messages to get form type and completion status
  useEffect(() => {
    if (isOnboardingComplete || isOnboardingFailed) {
      return;
    }

    // Check all assistant messages, starting from the most recent
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (i == messages.length-1) console.log(message);
      if (message && message.role === 'assistant') {
        // Extract text from message parts
        const textParts = message.parts?.filter((part: any) => part.type === 'text') || [];
        const fullText = textParts.map((part: any) => part.text).join('');

        // Try to parse JSON from anywhere in the message (not just the end)
        // Look for JSON objects that contain either "formType" or "action" (for completion)
        let jsonMatch = fullText.match(/\{[\s\S]*"(?:formType|action)"[\s\S]*\}/);

        // If no match found, try checking the last line (common pattern for AI responses)
        if (!jsonMatch) {
          const lines = fullText.split('\n');
          const lastLine = lines[lines.length - 1]?.trim();
          if (lastLine && lastLine.startsWith('{') && lastLine.endsWith('}')) {
            jsonMatch = [lastLine];
          }
        }

        if (i == messages.length-1) console.log(jsonMatch);
        if (jsonMatch) {
          try {
            const jsonData = JSON.parse(jsonMatch[0]);
            console.log(jsonData);
            if (jsonData.action === 'showForm' && jsonData.formType) {
              console.log('Setting form type:', jsonData.formType);
              setCurrentFormType(jsonData.formType as FormType);
              return; // Found a form type, stop searching
            } else if (jsonData.action === 'complete') {
              markAsOnboarded(collectedDataRef.current);
              return;
            }
          } catch (e) {
            console.error('Failed to parse assistant metadata:', e);
            setOnboardingError('We could not understand the assistant response. Please retry your last submission.');
            return;
          }
        }
      }
    }
  }, [messages, markAsOnboarded, isOnboardingComplete, isOnboardingFailed]);

  const FormComponent = currentFormType ? FORM_COMPONENTS[currentFormType] : null;

  /**
   * Handles the submission of a form by updating the collected data and sending
   * the form data to the AI. This triggers the assistant to process the form data
   * and respond with the next form type or completion message.
   *
   * @param type - The type of form being submitted.
   * @param values - The values collected from the form.
   */
  const handleFormSubmit = (type: FormType) => (values: Record<string, any>) => {
    // Stop processing if onboarding has failed
    if (isOnboardingFailed) {
      return;
    }

    const updatedData = {...collectedData, ...values};
    setCollectedData(updatedData);
    // Don't clear form type immediately - let the AI response set the next one
    // This prevents flickering and ensures smooth transition

    // Send form data as a message to the AI
    const formSummary = Object.entries(values)
      .map(([key, value]) => {
        const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);
        return `${key}: ${formattedValue}`;
      })
      .join('\n');

    sendMessage({
      text: `I've completed the ${FORM_SUMMARIES[type].title} form:\n${formSummary}`,
    });
  };

  // Removed manual scroll handling - Conversation component handles this

  const handleGetStarted = () => {
    sendMessage({text: "Let's get started!"});
  };

  const renderMessage = (message: any, index: number) => {
    // Check if this message contains form submission data
    // We'll look for messages that start with "I've completed the"
    const isFormSubmission = message.parts?.some(
      (part: any) => part.type === 'text' && part.text.includes("I've completed the"),
    );

    if (isFormSubmission) {
      // Extract form type from message text
      const text = message.parts?.find((p: any) => p.type === 'text')?.text || '';
      const formTypeMatch = Object.keys(FORM_SUMMARIES).find((type) =>
        text.includes(FORM_SUMMARIES[type as FormType].title),
      );

      if (formTypeMatch) {
        const meta = FORM_SUMMARIES[formTypeMatch as FormType];
        const formData = collectedData;
        const formatValue = (value: any) => {
          if (Array.isArray(value)) {
            return value.length ? value.join(', ') : 'Not provided';
          }
          return value && value !== '' ? String(value) : 'Not provided';
        };

        return (
          <Message key={message.id || index} from="user">
            <MessageContent>
              <MessageResponse>{text.split('\n')[0]}</MessageResponse>
              <div className="mt-3 rounded-2xl border bg-muted/20 p-4">
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {meta.title}
                </div>
                <div className="space-y-1 text-sm">
                  {meta.fields.map((field) => (
                    <div className="flex justify-between gap-3" key={field.name}>
                      <span className="text-muted-foreground">{field.label}</span>
                      <span className="font-medium text-right">
                        {formatValue(formData[field.name])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </MessageContent>
          </Message>
        );
      }
    }

    // Regular message rendering
    const textParts = message.parts?.filter((part: any) => part.type === 'text') || [];
    let messageText = textParts.map((part: any) => part.text).join('');

    // Remove JSON metadata from displayed message (keep it for parsing but don't show it)
    messageText = messageText.replace(/\{[\s\S]*"formType"[\s\S]*\}/g, '').replace(/\{[\s\S]*"action"[\s\S]*"complete"[\s\S]*\}/g, '').trim();

    // For assistant messages, include avatar
    if (message.role === 'assistant') {
      return (
        <div key={message.id || index} className="flex items-start gap-3 w-full">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Anchor className="size-4" />
            </AvatarFallback>
          </Avatar>
          <Message from={message.role} className="flex-1">
            <MessageContent>
              {messageText && <MessageResponse>{messageText}</MessageResponse>}
            </MessageContent>
          </Message>
        </div>
      );
    }

    return (
      <Message key={message.id || index} from={message.role}>
        <MessageContent>
          {messageText && <MessageResponse>{messageText}</MessageResponse>}
        </MessageContent>
      </Message>
    );
  };

  return (
    <div className="fixed inset-0 flex w-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto max-w-4xl px-4 py-6">
          <div className="mb-6 space-y-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Anchor className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight">Welcome to Knot Ready!</h1>
              <TypewriterText
                text={GREETING_TEXT}
                className="text-lg text-muted-foreground"
                onComplete={() => setIsGreetingDone(true)}
              />
              {isGreetingDone && (
                <TypewriterText
                  text={GREETING_SUBTEXT}
                  className="text-muted-foreground"
                  onComplete={() => setIsGreetingSubtextDone(true)}
                />
              )}
            </div>
            {messages.length === 0 && isGreetingDone && isGreetingSubtextDone && (
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="mt-4"
              >
                Let&apos;s get started
              </Button>
            )}
          </div>
          {messages.map((message, index) => renderMessage(message, index))}

          {FormComponent && !isOnboardingComplete && !isOnboardingFailed && currentFormType && status === 'ready' && (
            <div className="mt-4">
              <FormComponent
                key={currentFormType}
                initialValues={collectedData}
                onSubmit={handleFormSubmit(currentFormType)}
              />
            </div>
          )}

          {(status === 'submitted' || status === 'streaming') && !isOnboardingComplete && !isOnboardingFailed && (
            <div className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
              <Loader size={16} />
              <span>First Mate is charting your next step…</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 w-full">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Anchor className="size-4" />
                </AvatarFallback>
              </Avatar>
              <Message from="assistant" className="flex-1">
                <MessageContent>
                  <div className="text-base text-destructive">
                    Something went wrong. Please try again.
                  </div>
                </MessageContent>
              </Message>
            </div>
          )}

          {onboardingError && (
            <div className="flex items-start gap-3 w-full">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Anchor className="size-4" />
                </AvatarFallback>
              </Avatar>
              <Message from="assistant" className="flex-1">
                <MessageContent>
                  <div className="space-y-2 text-base text-destructive">
                    <p>{onboardingError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsOnboardingFailed(false);
                        setOnboardingError(null);
                        markAsOnboarded(collectedDataRef.current);
                      }}
                    >
                      Try again
                    </Button>
                  </div>
                </MessageContent>
              </Message>
            </div>
          )}

          {isOnboardingComplete && (
            <div className="flex items-start gap-3 w-full">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Anchor className="size-4" />
                </AvatarFallback>
              </Avatar>
              <Message from="assistant" className="flex-1">
                <MessageContent>
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-base text-green-700">
                    All set! Redirecting you to the dashboard.
                  </div>
                </MessageContent>
              </Message>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton/>
      </Conversation>
    </div>
  );
}
