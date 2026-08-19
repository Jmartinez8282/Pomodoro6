'use client';

import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { Button, IconButton } from '@/components/ui';
import type { TimerStatus } from '@/types';

export interface TimerControlsProps {
  status: TimerStatus;
  onToggle: () => void;
  onReset: () => void;
  onSkip: () => void;
  disabled?: boolean;
}

export function TimerControls({
  status,
  onToggle,
  onReset,
  onSkip,
  disabled = false,
}: TimerControlsProps) {
  const isRunning = status === 'running';
  const isPristine = status === 'idle';

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Reset is hidden rather than disabled on a pristine timer: a permanently
          greyed-out control is noise, and its absence is unambiguous. Space is
          reserved so the primary button never shifts. */}
      <div className="w-12">
        {!isPristine && (
          <IconButton
            label="Reset timer"
            icon={<RotateCcw className="size-5" />}
            onClick={onReset}
            disabled={disabled}
          />
        )}
      </div>

      <Button
        size="xl"
        onClick={onToggle}
        disabled={disabled}
        leadingIcon={
          isRunning ? (
            <Pause className="size-5 fill-current" aria-hidden />
          ) : (
            <Play className="size-5 fill-current" aria-hidden />
          )
        }
        className="min-w-40"
      >
        {isRunning ? 'Pause' : isPristine ? 'Start' : 'Resume'}
      </Button>

      <div className="w-12">
        <IconButton
          label="Skip to next session"
          icon={<SkipForward className="size-5" />}
          onClick={onSkip}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
