'use client';

import { useRef, useState } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import { Button, toast } from '@/components/ui';
import {
  backupSchema,
  parseSessions,
  parseSettings,
  parseTasks,
} from '@/lib/storage/schemas';
import { useSessionsStore } from '@/store/sessions-store';
import { useSettingsStore } from '@/store/settings-store';
import { useTasksStore } from '@/store/tasks-store';

/**
 * Export, import, and reset.
 *
 * This is the beta's honest answer to "my data only exists on this device". It
 * is also the migration path into accounts later: the same JSON shape is what a
 * server-backed adapter would sync.
 */
export function DataPanel() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleExport = () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: useSettingsStore.getState().settings,
      tasks: useTasksStore.getState().tasks,
      sessions: useSessionsStore.getState().sessions,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gitishdone-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Backup downloaded');
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      // Parsed through the same Zod schema as stored data. An import file is
      // untrusted input — arguably the least trusted input the app takes.
      const parsed = backupSchema.safeParse(JSON.parse(text));

      if (!parsed.success) {
        toast.error('That file could not be read', {
          description: 'It does not look like a GitIshDone backup.',
        });
        return;
      }

      const tasks = parseTasks(parsed.data.tasks);
      const sessions = parseSessions(parsed.data.sessions);

      if (parsed.data.settings !== undefined) {
        useSettingsStore.getState().patch(parseSettings(parsed.data.settings));
      }
      useTasksStore.getState().replaceAll(tasks);
      useSessionsStore.getState().replaceAll(sessions);

      toast.success('Backup restored', {
        description: `${tasks.length} tasks and ${sessions.length} sessions.`,
      });
    } catch {
      toast.error('That file could not be read', { description: 'It is not valid JSON.' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          leadingIcon={<Download className="size-4" aria-hidden />}
          onClick={handleExport}
        >
          Export
        </Button>

        <Button
          variant="outline"
          size="sm"
          leadingIcon={<Upload className="size-4" aria-hidden />}
          onClick={() => fileInput.current?.click()}
        >
          Import
        </Button>

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImport(file);
            event.target.value = '';
          }}
        />

        <Button
          variant={confirmingReset ? 'danger' : 'ghost'}
          size="sm"
          leadingIcon={<RotateCcw className="size-4" aria-hidden />}
          onClick={() => {
            if (!confirmingReset) {
              setConfirmingReset(true);
              return;
            }
            useSettingsStore.getState().reset();
            useTasksStore.getState().replaceAll([]);
            useSessionsStore.getState().clear();
            setConfirmingReset(false);
            toast.success('Everything reset');
          }}
          onBlur={() => setConfirmingReset(false)}
        >
          {confirmingReset ? 'Tap again to erase everything' : 'Reset all data'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Your data lives only in this browser. Export it before clearing site data or switching
        devices.
      </p>
    </div>
  );
}
