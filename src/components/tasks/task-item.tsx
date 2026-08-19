'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Target, Trash2 } from 'lucide-react';
import { IconButton } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import type { Task } from '@/types';

export interface TaskItemProps {
  task: Task;
  isActive: boolean;
  /** Position in the visible list, for reorder announcements. */
  index: number;
  total: number;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onSetActive: (id: string | null) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
}

export function TaskItem({
  task,
  isActive,
  index,
  total,
  onToggle,
  onRemove,
  onSetActive,
  onMove,
}: TaskItemProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const checkboxId = `task-${task.id}`;

  return (
    <li
      className={cn(
        'group relative flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors',
        'motion-reduce:transition-none',
        isActive ? 'border-accent bg-surface-hover' : 'border-transparent hover:bg-surface-hover',
      )}
    >
      {/* A real checkbox, not a styled div: it comes with the correct role,
          keyboard behaviour, and announced state for free. */}
      <input
        id={checkboxId}
        type="checkbox"
        checked={task.isCompleted}
        onChange={() => onToggle(task.id)}
        className="mt-1 size-4 shrink-0 cursor-pointer accent-[var(--color-accent)]"
      />

      <div className="min-w-0 flex-1">
        <label
          htmlFor={checkboxId}
          className={cn(
            'block cursor-pointer text-sm break-words',
            task.isCompleted
              ? 'text-muted-foreground line-through'
              : 'text-foreground',
          )}
        >
          {task.title}
        </label>

        {task.estimatedPomodoros > 0 || task.completedPomodoros > 0 ? (
          <p className="tabular mt-0.5 text-xs text-muted-foreground">
            {task.completedPomodoros}/{task.estimatedPomodoros || '—'} pomodoros
          </p>
        ) : null}
      </div>

      {/* Controls stay in the DOM at all times and become visible on hover or
          keyboard focus. Hiding them behind hover alone would make the whole
          row unusable by keyboard. */}
      <div
        className={cn(
          'flex shrink-0 items-center gap-0.5',
          'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
          'motion-reduce:transition-none',
          isActive && 'opacity-100',
        )}
      >
        {/* Reorder as buttons, not drag-only. Drag-and-drop is unreachable by
            keyboard and by many assistive technologies (WCAG 2.5.7), so the
            button path is the primary one rather than a fallback. */}
        <IconButton
          size="sm"
          label={`Move "${task.title}" up`}
          icon={<ChevronUp className="size-4" />}
          onClick={() => onMove(task.id, 'up')}
          disabled={index === 0}
        />
        <IconButton
          size="sm"
          label={`Move "${task.title}" down`}
          icon={<ChevronDown className="size-4" />}
          onClick={() => onMove(task.id, 'down')}
          disabled={index === total - 1}
        />

        {!task.isCompleted && (
          <IconButton
            size="sm"
            label={isActive ? `Stop focusing on "${task.title}"` : `Focus on "${task.title}"`}
            icon={<Target className={cn('size-4', isActive && 'text-accent-text')} />}
            onClick={() => onSetActive(isActive ? null : task.id)}
          />
        )}

        <IconButton
          size="sm"
          variant="danger"
          label={
            confirmingDelete
              ? `Confirm delete "${task.title}"`
              : `Delete "${task.title}"`
          }
          icon={<Trash2 className={cn('size-4', confirmingDelete && 'text-danger')} />}
          onClick={() => {
            // Two-step delete rather than a modal: a confirmation dialog for a
            // single todo is heavier than the mistake it prevents, but an
            // instant irreversible delete is worse.
            if (confirmingDelete) onRemove(task.id);
            else setConfirmingDelete(true);
          }}
          onBlur={() => setConfirmingDelete(false)}
        />
      </div>
    </li>
  );
}
