'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TASK_NOTES_MAX_LENGTH, TASK_TITLE_MAX_LENGTH } from '@/config/defaults';
import { parseTasks } from '@/lib/storage/schemas';
import { createId } from '@/lib/utils/id';
import type { Task, TaskDraft, TaskFilter } from '@/types';
import { createPersistStorage } from './persist-storage';

/** Gap between adjacent `order` values, so an insert between two rows rarely
 *  needs to renumber anything. */
const ORDER_STEP = 1000;

export interface TasksStore {
  tasks: Task[];
  filter: TaskFilter;
  activeTaskId: string | null;
  hydrated: boolean;

  addTask: (draft: TaskDraft) => string;
  updateTask: (id: string, patch: Partial<TaskDraft>) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  /** Move a task one slot up or down. Backs the keyboard reorder path. */
  moveTask: (id: string, direction: 'up' | 'down') => void;
  reorderTask: (id: string, toIndex: number) => void;
  incrementCompletedPomodoros: (id: string) => void;
  setActiveTask: (id: string | null) => void;
  setFilter: (filter: TaskFilter) => void;
  clearCompleted: () => void;
  replaceAll: (tasks: Task[]) => void;
}

const byOrder = (a: Task, b: Task) => a.order - b.order;

/** Trim and cap at the store boundary, not just in the form, so imported JSON
 *  and programmatic writes go through the same limits as a keystroke. */
function sanitizeTitle(value: string): string {
  return value.trim().slice(0, TASK_TITLE_MAX_LENGTH);
}

function sanitizeNotes(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim().slice(0, TASK_NOTES_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : undefined;
}

export const useTasksStore = create<TasksStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      filter: 'all',
      activeTaskId: null,
      hydrated: false,

      addTask: (draft) => {
        const id = createId();
        const now = new Date().toISOString();
        const highestOrder = get().tasks.reduce((max, t) => Math.max(max, t.order), 0);
        const notes = sanitizeNotes(draft.notes);

        const task: Task = {
          id,
          title: sanitizeTitle(draft.title),
          estimatedPomodoros: Math.max(0, Math.min(99, Math.round(draft.estimatedPomodoros))),
          completedPomodoros: 0,
          isCompleted: false,
          order: highestOrder + ORDER_STEP,
          createdAt: now,
          updatedAt: now,
          ...(notes !== undefined && { notes }),
        };

        set((state) => ({
          tasks: [...state.tasks, task],
          // Selecting the first task automatically saves a click on the most
          // common path: open the app, add one thing, start the timer.
          activeTaskId: state.activeTaskId ?? id,
        }));
        return id;
      },

      updateTask: (id, patch) =>
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== id) return task;
            const notes = 'notes' in patch ? sanitizeNotes(patch.notes) : task.notes;
            return {
              ...task,
              ...(patch.title !== undefined && { title: sanitizeTitle(patch.title) }),
              ...(patch.estimatedPomodoros !== undefined && {
                estimatedPomodoros: Math.max(0, Math.min(99, Math.round(patch.estimatedPomodoros))),
              }),
              ...(notes !== undefined ? { notes } : {}),
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      toggleTask: (id) =>
        set((state) => {
          const now = new Date().toISOString();
          return {
            tasks: state.tasks.map((task) =>
              task.id === id
                ? {
                    ...task,
                    isCompleted: !task.isCompleted,
                    updatedAt: now,
                    ...(task.isCompleted ? {} : { completedAt: now }),
                  }
                : task,
            ),
            // A completed task should not stay selected as the timer's target.
            activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
          };
        }),

      removeTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
          activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
        })),

      moveTask: (id, direction) => {
        const ordered = [...get().tasks].sort(byOrder);
        const index = ordered.findIndex((task) => task.id === id);
        if (index === -1) return;
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= ordered.length) return;
        get().reorderTask(id, target);
      },

      reorderTask: (id, toIndex) =>
        set((state) => {
          const ordered = [...state.tasks].sort(byOrder);
          const from = ordered.findIndex((task) => task.id === id);
          if (from === -1) return state;

          const [moved] = ordered.splice(from, 1);
          if (!moved) return state;
          ordered.splice(Math.max(0, Math.min(toIndex, ordered.length)), 0, moved);

          // Renumber from scratch. With a list capped at a few hundred rows the
          // simplicity is worth more than the fractional-index micro-optimisation.
          const now = new Date().toISOString();
          return {
            tasks: ordered.map((task, index) => ({
              ...task,
              order: (index + 1) * ORDER_STEP,
              ...(task.id === id && { updatedAt: now }),
            })),
          };
        }),

      incrementCompletedPomodoros: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  completedPomodoros: task.completedPomodoros + 1,
                  updatedAt: new Date().toISOString(),
                }
              : task,
          ),
        })),

      setActiveTask: (id) => set({ activeTaskId: id }),
      setFilter: (filter) => set({ filter }),

      clearCompleted: () =>
        set((state) => ({ tasks: state.tasks.filter((task) => !task.isCompleted) })),

      replaceAll: (tasks) => set({ tasks: [...tasks].sort(byOrder), activeTaskId: null }),
    }),
    {
      name: 'tasks',
      version: 1,
      storage: createPersistStorage<Pick<TasksStore, 'tasks' | 'activeTaskId'>>('tasks'),
      skipHydration: true,
      partialize: (state) => ({ tasks: state.tasks, activeTaskId: state.activeTaskId }),
      merge: (persisted, current) => {
        const data = persisted as { tasks?: unknown; activeTaskId?: unknown } | undefined;
        const tasks = parseTasks(data?.tasks).sort(byOrder);
        const activeTaskId =
          typeof data?.activeTaskId === 'string' &&
          tasks.some((t) => t.id === data.activeTaskId && !t.isCompleted)
            ? data.activeTaskId
            : null;
        return { ...current, tasks, activeTaskId };
      },
      onRehydrateStorage: () => () => {
        useTasksStore.setState({ hydrated: true });
      },
    },
  ),
);

export const selectVisibleTasks = (state: TasksStore): Task[] => {
  const ordered = [...state.tasks].sort(byOrder);
  if (state.filter === 'active') return ordered.filter((t) => !t.isCompleted);
  if (state.filter === 'completed') return ordered.filter((t) => t.isCompleted);
  return ordered;
};

export const selectActiveTask = (state: TasksStore): Task | null =>
  state.tasks.find((task) => task.id === state.activeTaskId) ?? null;
