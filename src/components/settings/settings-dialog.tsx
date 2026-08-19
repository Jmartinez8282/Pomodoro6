'use client';

import { useRef } from 'react';
import { Dialog, Select, Slider, Switch } from '@/components/ui';
import { ACCENT_IDS, ACCENT_LABELS, SETTINGS_LIMITS } from '@/config/defaults';
import { getAudioEngine } from '@/lib/audio/audio-engine';
import { useSettingsStore } from '@/store/settings-store';
import { useTimerStore } from '@/store/timer-store';
import type { AccentId, AlarmSoundId, AmbientSoundId } from '@/types';
import { DataPanel } from './data-panel';

export interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const alarmOptions: { value: AlarmSoundId; label: string }[] = [
  { value: 'chime', label: 'Chime' },
  { value: 'bell', label: 'Bell' },
  { value: 'marimba', label: 'Marimba' },
  { value: 'none', label: 'Silent' },
];

const ambientOptions: { value: AmbientSoundId; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'rain', label: 'Rain' },
  { value: 'brownNoise', label: 'Brown noise' },
  { value: 'cafe', label: 'Café hum' },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const settings = useSettingsStore((state) => state.settings);
  const setSetting = useSettingsStore((state) => state.set);
  const dispatch = useTimerStore((state) => state.dispatch);
  const firstFieldRef = useRef<HTMLElement | null>(null);

  /**
   * Every settings write tells the engine. The engine decides what to do with
   * it — a running timer is left strictly alone, an idle one re-seeds. That
   * decision lives in one place rather than being re-derived at each call site.
   */
  const update = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    setSetting(key, value);
    dispatch({ type: 'SETTINGS_CHANGED' });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      description="Durations, sound, and appearance. Changes apply to your next session."
      size="md"
      initialFocusRef={firstFieldRef}
    >
      <div className="space-y-8">
        <Section title="Timer">
          <Slider
            label="Focus"
            value={settings.focusMinutes}
            onValueChange={(value) => update('focusMinutes', value)}
            min={SETTINGS_LIMITS.focusMinutes.min}
            max={SETTINGS_LIMITS.focusMinutes.max}
            formatValue={(value) => `${value} min`}
          />
          <Slider
            label="Short break"
            value={settings.shortBreakMinutes}
            onValueChange={(value) => update('shortBreakMinutes', value)}
            min={SETTINGS_LIMITS.shortBreakMinutes.min}
            max={SETTINGS_LIMITS.shortBreakMinutes.max}
            formatValue={(value) => `${value} min`}
          />
          <Slider
            label="Long break"
            value={settings.longBreakMinutes}
            onValueChange={(value) => update('longBreakMinutes', value)}
            min={SETTINGS_LIMITS.longBreakMinutes.min}
            max={SETTINGS_LIMITS.longBreakMinutes.max}
            formatValue={(value) => `${value} min`}
          />
          <Slider
            label="Long break after"
            value={settings.longBreakInterval}
            onValueChange={(value) => update('longBreakInterval', value)}
            min={SETTINGS_LIMITS.longBreakInterval.min}
            max={SETTINGS_LIMITS.longBreakInterval.max}
            formatValue={(value) => `${value} sessions`}
          />
          <Slider
            label="Daily goal"
            value={settings.dailyGoalMinutes}
            onValueChange={(value) => update('dailyGoalMinutes', value)}
            min={SETTINGS_LIMITS.dailyGoalMinutes.min}
            max={SETTINGS_LIMITS.dailyGoalMinutes.max}
            step={15}
            formatValue={(value) => `${Math.floor(value / 60)}h ${value % 60}m`}
          />
        </Section>

        <Section title="Behaviour">
          <Switch
            label="Auto-start breaks"
            description="Begin the break as soon as a focus session ends."
            checked={settings.autoStartBreaks}
            onCheckedChange={(value) => update('autoStartBreaks', value)}
          />
          <Switch
            label="Auto-start focus"
            description="Begin the next focus session as soon as a break ends."
            checked={settings.autoStartFocus}
            onCheckedChange={(value) => update('autoStartFocus', value)}
          />
          <Switch
            label="Show countdown in tab title"
            checked={settings.showSecondsInTitle}
            onCheckedChange={(value) => update('showSecondsInTitle', value)}
          />
          <Switch
            label="Keyboard shortcuts"
            description="Single-key accelerators like Space and R. Turn off if they conflict with your screen reader."
            checked={settings.shortcutsEnabled}
            onCheckedChange={(value) => update('shortcutsEnabled', value)}
          />
        </Section>

        <Section title="Sound">
          <Select
            label="Alarm"
            value={settings.alarmSound}
            onValueChange={(value) => {
              update('alarmSound', value);
              // Preview immediately — choosing a sound you cannot hear is a
              // guess, and the click that opened the menu already unlocked audio.
              if (value !== 'none') {
                void getAudioEngine()
                  .unlock()
                  .then(() => {
                    getAudioEngine().playAlarm(value, settings.alarmVolume);
                  });
              }
            }}
            options={alarmOptions}
          />
          <Slider
            label="Alarm volume"
            value={Math.round(settings.alarmVolume * 100)}
            onValueChange={(value) => update('alarmVolume', value / 100)}
            onValueCommit={(value) => {
              void getAudioEngine()
                .unlock()
                .then(() => {
                  getAudioEngine().playAlarm(settings.alarmSound, value / 100);
                });
            }}
            min={0}
            max={100}
            step={5}
            formatValue={(value) => `${value}%`}
            disabled={settings.alarmSound === 'none'}
          />
          <Select
            label="Ambient sound"
            value={settings.ambientSound}
            onValueChange={(value) => {
              void getAudioEngine().unlock();
              update('ambientSound', value);
            }}
            options={ambientOptions}
          />
          <Slider
            label="Ambient volume"
            value={Math.round(settings.ambientVolume * 100)}
            onValueChange={(value) => update('ambientVolume', value / 100)}
            min={0}
            max={100}
            step={5}
            formatValue={(value) => `${value}%`}
            disabled={settings.ambientSound === 'none'}
          />
          <Switch
            label="Ambient during focus only"
            description="Silence during breaks, so the change of state is audible."
            checked={settings.ambientOnlyDuringFocus}
            onCheckedChange={(value) => update('ambientOnlyDuringFocus', value)}
          />
        </Section>

        <Section title="Appearance">
          <div className="space-y-2">
            <span className="block text-sm font-medium text-foreground">Accent</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Accent colour">
              {ACCENT_IDS.map((accent) => (
                <AccentSwatch
                  key={accent}
                  accent={accent}
                  selected={settings.accent === accent}
                  onSelect={() => update('accent', accent)}
                />
              ))}
            </div>
          </div>

          <Select
            label="Motion"
            value={settings.reducedMotion}
            onValueChange={(value) => update('reducedMotion', value)}
            options={[
              { value: 'system', label: 'Match system setting' },
              { value: 'reduce', label: 'Reduce motion' },
              { value: 'allow', label: 'Allow motion' },
            ]}
          />
        </Section>

        <Section title="Your data">
          <DataPanel />
        </Section>
      </div>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function AccentSwatch({
  accent,
  selected,
  onSelect,
}: {
  accent: AccentId;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={ACCENT_LABELS[accent]}
      onClick={onSelect}
      data-accent={accent}
      className={[
        'size-9 rounded-full border-2 transition-transform',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100',
        selected ? 'border-foreground' : 'border-transparent',
      ].join(' ')}
    >
      {/* The swatch paints itself from the accent tokens, so adding a palette
          means adding CSS variables and an id — never a colour in a component. */}
      <span className="block size-full rounded-full bg-[var(--accent-focus)]" />
    </button>
  );
}
