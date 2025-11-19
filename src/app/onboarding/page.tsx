'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { FormType } from '@/app/api/onboarding/schema';
import {
  BoatInfoForm,
  ConcernsForm,
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
import { Loader } from '@/components/ai-elements/loader';
import { Button } from '@/components/ui/button';

const FORM_COMPONENTS: Record<FormType, React.FC<OnboardingFormProps<any>>> = {
  boat_info: BoatInfoForm,
  sailing_experience: SailingExperienceForm,
  journey_plan: JourneyPlanForm,
  timeline: TimelineForm,
  goals_priorities: GoalsForm,
  concerns_challenges: ConcernsForm,
};

const FORM_SUMMARIES: Record<FormType, { title: string; fields: Array<{ name: string; label: string }> }> = {
  boat_info: {
    title: 'Boat details',
    fields: [
      { name: 'boatType', label: 'Boat type' },
      { name: 'boatLength', label: 'Length (ft)' },
      { name: 'boatName', label: 'Name' },
    ],
  },
  sailing_experience: {
    title: 'Experience snapshot',
    fields: [
      { name: 'experienceLevel', label: 'Experience level' },
      { name: 'certifications', label: 'Certifications' },
      { name: 'mechanicalSkills', label: 'Mechanical skills' },
      { name: 'longestPassage', label: 'Longest passage' },
    ],
  },
  journey_plan: {
    title: 'Journey plan',
    fields: [
      { name: 'journeyType', label: 'Journey type' },
      { name: 'primaryDestination', label: 'Primary destination' },
      { name: 'journeyDuration', label: 'Duration' },
    ],
  },
  timeline: {
    title: 'Timeline & readiness',
    fields: [
      { name: 'departureDate', label: 'Departure date' },
      { name: 'preparationTimeline', label: 'Prep window' },
      { name: 'currentPreparationStatus', label: 'Status' },
    ],
  },
  goals_priorities: {
    title: 'Goals & priorities',
    fields: [
      { name: 'primaryGoals', label: 'Primary goals' },
      { name: 'biggestChallenge', label: 'Biggest challenge' },
    ],
  },
  concerns_challenges: {
    title: 'Concerns',
    fields: [
      { name: 'mainConcerns', label: 'Top concerns' },
      { name: 'additionalConcerns', label: 'Extra notes' },
    ],
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [collectedData, setCollectedData] = useState<Record<string, any>>({});
  const [currentFormType, setCurrentFormType] = useState<FormType | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/onboarding',
    }),
  });

  // Parse messages for form type and completion status
  useEffect(() => {
    // Check all assistant messages, starting from the most recent
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message && message.role === 'assistant') {
        // Extract text from message parts
        const textParts = message.parts?.filter((part: any) => part.type === 'text') || [];
        const fullText = textParts.map((part: any) => part.text).join('');

        // Try to parse JSON from anywhere in the message (not just the end)
        // Look for JSON objects in the text
        const jsonMatch = fullText.match(/\{[\s\S]*"formType"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const metadata = JSON.parse(jsonMatch[0]);
            if (metadata.action === 'showForm' && metadata.formType) {
              console.log('Setting form type:', metadata.formType);
              setCurrentFormType(metadata.formType as FormType);
              return; // Found a form type, stop searching
            } else if (metadata.action === 'complete') {
              setIsComplete(true);
              markAsOnboarded();
              return;
            }
          } catch (e) {
            // Try parsing from the last line as fallback
            const lines = fullText.split('\n');
            const lastLine = lines[lines.length - 1]?.trim();
            if (lastLine && lastLine.startsWith('{') && lastLine.endsWith('}')) {
              try {
                const metadata = JSON.parse(lastLine);
                if (metadata.action === 'showForm' && metadata.formType) {
                  console.log('Setting form type (from last line):', metadata.formType);
                  setCurrentFormType(metadata.formType as FormType);
                  return;
                } else if (metadata.action === 'complete') {
                  setIsComplete(true);
                  markAsOnboarded();
                  return;
                }
              } catch (e2) {
                // Not valid JSON, continue
              }
            }
          }
        }
      }
    }
  }, [messages]);

  const markAsOnboarded = async () => {
    try {
      const response = await fetch('/api/users/onboarded', {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        setTimeout(() => router.push('/dashboard'), 1500);
      }
    } catch (err) {
      console.error('Error marking as onboarded:', err);
    }
  };

  const FormComponent = currentFormType ? FORM_COMPONENTS[currentFormType] : null;

  const handleFormSubmit = (type: FormType) => (values: Record<string, any>) => {
    const updatedData = { ...collectedData, ...values };
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
    sendMessage({ text: "Let's get started!" });
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
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight">Welcome to Knot Ready!</h1>
              <p className="text-lg text-muted-foreground">
                I'm here to help you prepare for your sailing adventure. Let's gather some information about you and your boat to create a personalized preparation plan.
              </p>
              <p className="text-muted-foreground">
                This will only take a few minutes. Ready to begin?
              </p>
            </div>
            {messages.length === 0 && (
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="mt-4"
              >
                Let's get started
              </Button>
            )}
          </div>
          {messages.map((message, index) => renderMessage(message, index))}

          {FormComponent && !isComplete && currentFormType && (
            <div className="mt-4">
              <FormComponent
                key={currentFormType}
                initialValues={collectedData}
                onSubmit={handleFormSubmit(currentFormType)}
                isSubmitting={status === 'submitted' || status === 'streaming'}
              />
            </div>
          )}

          {(status === 'submitted' || status === 'streaming') && (
            <Message from="assistant">
              <MessageContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader size={16} />
                  <span className="text-sm">Assistant is thinking…</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => stop()}
                >
                  Stop
                </Button>
              </MessageContent>
            </Message>
          )}

          {error && (
            <Message from="assistant">
              <MessageContent>
                <div className="text-sm text-destructive">
                  Something went wrong. Please try again.
                </div>
              </MessageContent>
            </Message>
          )}

          {isComplete && (
            <Message from="assistant">
              <MessageContent>
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  All set! Redirecting you to the dashboard.
                </div>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  );
}
