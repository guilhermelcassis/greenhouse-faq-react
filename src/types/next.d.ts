// Next.js type augmentations for App Router

declare module 'next/dist/server/web/spec-extension/response' {
  export class NextResponse extends Response {
    static json(body: unknown, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, init?: ResponseInit): NextResponse;
    static rewrite(url: string | URL, init?: ResponseInit): NextResponse;
    static next(init?: ResponseInit): NextResponse;
  }
}

declare module 'next/dist/server/web/spec-extension/request' {
  export interface NextRequest extends Request {
    nextUrl: URL;
    cookies: {
      get(name: string): { name: string; value: string } | undefined;
      getAll(): { name: string; value: string }[];
      set(name: string, value: string, options?: { path?: string, maxAge?: number, domain?: string, secure?: boolean, httpOnly?: boolean }): void;
      delete(name: string): void;
    };
    ip?: string;
    params?: Record<string, string | string[]>;
  }
}

declare module 'next' {
  export interface Metadata {
    title?: string | null;
    description?: string | null;
    applicationName?: string | null;
    authors?: Array<{ name: string; url?: string }> | null;
    generator?: string | null;
    keywords?: string[] | null;
    referrer?: 'no-referrer' | 'origin' | 'no-referrer-when-downgrade' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url' | null;
    themeColor?: string | null;
    colorScheme?: 'normal' | 'light' | 'dark' | 'light dark' | null;
    viewport?: string | null;
    creator?: string | null;
    publisher?: string | null;
    robots?: string | null;
    canonical?: string | null;
    alternates?: { canonical?: string; languages?: Record<string, string>; media?: Record<string, string>; types?: Record<string, string> } | null;
    openGraph?: {
      type?: string;
      title?: string;
      description?: string;
      url?: string;
      siteName?: string;
      images?: Array<{ url: string; alt?: string; width?: number; height?: number }>;
      locale?: string;
      audio?: Array<{ url: string; type?: string }>;
      videos?: Array<{ url: string; type?: string; width?: number; height?: number }>;
    } | null;
    twitter?: {
      card?: 'summary' | 'summary_large_image' | 'app' | 'player';
      site?: string;
      siteId?: string;
      creator?: string;
      creatorId?: string;
      description?: string;
      title?: string;
      images?: Array<{ url: string; alt?: string }>;
    } | null;
    icons?: {
      icon?: string | string[];
      shortcut?: string | string[];
      apple?: string | string[];
      other?: Array<{ rel: string; url: string }>;
    } | null;
    manifest?: string | null;
    other?: Record<string, unknown> | null;
  }

  export interface GetServerSidePropsContext {
    params?: Record<string, string | string[]>;
  }
}

declare global {
  interface DynamicRouteParams {
    params: Record<string, string | string[]>;
  }
  
  interface Response {
    json?: (data: unknown, init?: ResponseInit) => Response;
  }
}

// Augment the types for App Router route handlers
declare module 'next/dist/server/app-render/types' {
  interface AppRouteUserlandModule {
    GET?: (request: Request, context: { params: Record<string, string> }) => Promise<Response> | Response;
    POST?: (request: Request, context: { params: Record<string, string> }) => Promise<Response> | Response;
    PUT?: (request: Request, context: { params: Record<string, string> }) => Promise<Response> | Response;
    DELETE?: (request: Request, context: { params: Record<string, string> }) => Promise<Response> | Response;
    PATCH?: (request: Request, context: { params: Record<string, string> }) => Promise<Response> | Response;
  }
} 