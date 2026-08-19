'use client';

import { useMemo } from 'react';
import { ListChecks } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  SegmentedControl,
  Skeleton,
  type SegmentedOption,
} from '@/components/ui';
import { useHydrated } from '@/hooks/use-hydrated';
import { selectVisibleTasks, useTasksStore } from '@/store/tasks-store';
import type { TaskFilter } from '@/types';
import { TaskComposer } from './task-composer';
import { TaskItem } from './task-item';

const filters: SegmentedOption<TaskFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Done' },
];

export function TaskList() {
  const hydrated = useHydrated();

  // Subscribe to the raw values and derive here, rather than passing a
  // sorting/filtering selector to the store. A selector that builds a new array
  // fails Zustand's Object.is check on every render and loops forever — the
  // subtlest way to break a store-driven list.
  const allTasks = useTasksStore((state) => state.tasks);
  const totalCount = allTasks.length;
  const filter = useTasksStore((state) => state.filter);
  const activeTaskId = useTasksStore((state) => state.activeTaskId);

  const addTask = useTasksStore((state) => state.addTask);
  const toggleTask = useTasksStore((state) => state.toggleTask);
  const removeTask = useTasksStore((state) => state.removeTask);
  const moveTask = useTasksStore((state) => state.moveTask);
  const setActiveTask = useTasksStore((state) => state.setActiveTask);
  const setFilter = useTasksStore((state) => state.setFilter);

  const tasks = useMemo(() => selectVisibleTasks(allTasks, filter), [allTasks, filter]);

  const remaining = useMemo(() => allTasks.filter((task) => !task.isCompleted).length, [allTasks]);

  const emptyState = useMemo(() => {
    // Three genuinely different situations. Collapsing them into one "No tasks"
    // message would tell a first-time user nothing and would look broken to
    // someone who has simply filtered everything out.
    if (totalCount === 0) {
      return {
        title: 'No tasks yet',
        description: 'Add what you want to work on, then start a focus session.',
      };
    }
    if (filter === 'active') {
      return {
        title: 'Nothing left to do',
        description: 'Every task is complete. Worth a long break.',
      };
    }
    return {
      title: 'Nothing completed yet',
      description: 'Finish a task and it will show up here.',
    };
  }, [totalCount, filter]);

  if (!hydrated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" loadingLabel="Loading tasks" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
        <p className="text-sm text-muted-foreground">
          {remaining} {remaining === 1 ? 'task' : 'tasks'} left
        </p>
      </CardHeader>

      <div className="space-y-4">
        <TaskComposer
          onAdd={(title, estimatedPomodoros) => addTask({ title, estimatedPomodoros })}
        />

        {totalCount > 0 ? (
          <SegmentedControl
            label="Filter tasks"
            value={filter}
            onValueChange={setFilter}
            options={filters}
          />
        ) : null}

        {tasks.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="size-6" />}
            title={emptyState.title}
            description={emptyState.description}
            size="sm"
          />
        ) : (
          <ul className="-mx-1 space-y-0.5">
            {tasks.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                index={index}
                total={tasks.length}
                isActive={task.id === activeTaskId}
                onToggle={toggleTask}
                onRemove={removeTask}
                onSetActive={setActiveTask}
                onMove={moveTask}
              />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
