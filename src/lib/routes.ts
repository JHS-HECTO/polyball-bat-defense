export const ROUTES = {
  home: '/',
  qa: '/qa',
} as const;

export type RouteKey = keyof typeof ROUTES;
