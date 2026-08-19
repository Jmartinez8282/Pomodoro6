/**
 * The design system's public API.
 *
 * Everything in this folder is app-agnostic: primitives take props and emit
 * callbacks, and an ESLint boundary rule (see eslint.config.mjs) forbids them
 * from importing the store, feature components, or app services. That rule is
 * what keeps "reusable component library" a fact rather than an aspiration —
 * and what would let this folder be extracted into its own package unchanged.
 */
export { Button, buttonVariants, type ButtonProps } from './button';
export { IconButton, type IconButtonProps } from './icon-button';
export { Card, CardHeader, CardTitle, CardDescription, type CardProps } from './card';
export { Dialog, DialogTrigger, DialogClose, type DialogProps } from './dialog';
export { ProgressRing, type ProgressRingProps } from './progress-ring';
export { Slider, type SliderProps } from './slider';
export { Switch, type SwitchProps } from './switch';
export { Select, type SelectProps, type SelectOption } from './select';
export { Tabs, TabsContent, type TabsProps, type TabItem } from './tabs';
export { EmptyState, type EmptyStateProps, type EmptyStateAction } from './empty-state';
export { Skeleton, type SkeletonProps } from './skeleton';
export { VisuallyHidden } from './visually-hidden';
export { Kbd } from './kbd';
export { Toaster, toast } from './toast';
