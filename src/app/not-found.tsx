import Link from 'next/link';
import { Button } from '@/components/ui';

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">404</p>
      <h1 className="text-2xl font-semibold text-foreground">This page does not exist</h1>
      <p className="text-sm text-muted-foreground">
        The link may be out of date, or the page may have moved.
      </p>
      <Button asChild className="mt-2">
        <Link href="/">Back to the timer</Link>
      </Button>
    </main>
  );
}
