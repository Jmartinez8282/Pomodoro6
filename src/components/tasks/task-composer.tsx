'use client';

import { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { TASK_TITLE_MAX_LENGTH } from '@/config/defaults';
import { cn } from '@/lib/utils/cn';

export interface TaskComposerProps {
  onAdd: (title: string, estimatedPomodoros: number) => void;
}

export function TaskComposer({ onAdd }: TaskComposerProps) {
  const [title, setTitle] = useState('');
  const [estimate, setEstimate] = useState(1);
  const titleId = useId();
  const estimateId = useId();

  const trimmed = title.trim();
  const canSubmit = trimmed.length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onAdd(trimmed, estimate);
    setTitle('');
    setEstimate(1);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex items-end gap-2"
    >
      <div className="min-w-0 flex-1">
        <label htmlFor={titleId} className="sr-only">
          Task name
        </label>
        <input
          id={titleId}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={TASK_TITLE_MAX_LENGTH}
          placeholder="What are you working on?"
          className={cn(
            'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm',
            'text-foreground placeholder:text-muted-foreground',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          )}
        />
      </div>

      <div className="w-16 shrink-0">
        <label htmlFor={estimateId} className="sr-only">
          Estimated pomodoros
        </label>
        <input
          id={estimateId}
          type="number"
          min={0}
          max={99}
          value={estimate}
          onChange={(event) => setEstimate(Number(event.target.value))}
          aria-label="Estimated pomodoros"
          className={cn(
            'tabular h-10 w-full rounded-lg border border-border bg-surface px-2 text-center text-sm',
            'text-foreground',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          )}
        />
      </div>

      <Button
        type="submit"
        size="md"
        disabled={!canSubmit}
        leadingIcon={<Plus className="size-4" aria-hidden />}
        className="shrink-0"
      >
        <span className="sr-only sm:not-sr-only">Add</span>
      </Button>
    </form>
  );
}
