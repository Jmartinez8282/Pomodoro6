export const siteConfig = {
  name: 'GitIshDone',
  tagline: 'Focus, one pomodoro at a time.',
  description:
    'A calm pomodoro timer and task list that helps you stay focused, take real breaks, and see where your time actually goes.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gitishdone.vercel.app',
  author: 'Jose Martinez',
  repository: 'https://github.com/Jmartinez8282/Pomodoro6',
} as const;
