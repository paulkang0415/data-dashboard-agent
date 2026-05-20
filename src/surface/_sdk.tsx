// Runtime implementation of `@agenthub/surface-sdk` (architecture §8.2 / §12.2).
//
// The ambient types/agenthub-surface-sdk.d.ts only declares the shape; this is
// the actual code bundled into the Surface. It speaks the §12.2 postMessage
// envelope to the AgentHub Host (the iframe parent):
//
//   Surface → Host : { kind:'request',  id, method, params }
//   Host → Surface : { kind:'response', id, ok, result|error }
//   Host → Surface : { kind:'event',    type, payload }
//
// esbuild aliases the bare `@agenthub/surface-sdk` specifier to this file.
import { useRef, useSyncExternalStore } from "react";

type Pending = { resolve: (v: any) => void; reject: (e: any) => void };

// Shallow equality for useSelector memoisation. Prevents the well-known
// `useSyncExternalStore` infinite-render trap when a selector returns a fresh
// reference each call (e.g. `state.datasets ?? []` produces a new array
// every read) — without this React bails with error #185 "Maximum update
// depth exceeded" and the Surface comes up as a black screen.
function shallowEq(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
    return true;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as Record<string, unknown>);
  const kb = Object.keys(b as Record<string, unknown>);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!Object.is((a as any)[k], (b as any)[k])) return false;
  }
  return true;
}

const pending = new Map<string, Pending>();
const eventSubs = new Map<string, Set<(payload: unknown) => void>>();
let seq = 0;

// Local mirror of Session State. state_mode=agenthub-managed → the Surface
// only reads; the Host pushes `state.changed` events on every Run apply.
let stateCache: Record<string, unknown> = {};
const stateListeners = new Set<() => void>();

function notifyState() {
  for (const l of stateListeners) l();
}

function request<T = any>(method: string, params: unknown = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = "s" + ++seq;
    pending.set(id, { resolve, reject });
    parent.postMessage({ kind: "request", id, method, params }, "*");
  });
}

async function refreshState() {
  try {
    const r = await request<{ state: Record<string, unknown> }>("state.read");
    stateCache = r?.state ?? {};
    notifyState();
  } catch {
    /* keep last good cache */
  }
}

let installed = false;
function install() {
  if (installed) return;
  installed = true;

  window.addEventListener("message", (e: MessageEvent) => {
    const msg = e.data;
    if (!msg || typeof msg !== "object") return;

    if (msg.kind === "response" && typeof msg.id === "string") {
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.ok) p.resolve(msg.result);
      else p.reject(msg.error);
      return;
    }

    if (msg.kind === "event" && typeof msg.type === "string") {
      if (msg.type === "state.changed") void refreshState();
      const subs = eventSubs.get(msg.type);
      if (subs) for (const h of subs) h(msg.payload);
    }
  });

  void refreshState();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : "");
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export interface SurfaceFileRef {
  id: string;
  name: string;
  mime?: string;
  size?: number;
}

export interface AgentHubSurface {
  run(req: { input: unknown }): Promise<{ run_id: string }>;
  state: {
    useSelector<T>(selector: (state: unknown) => T): T;
    emit(patches: unknown[]): Promise<{ ok: true }>;
  };
  events: {
    subscribe(type: string, handler: (payload: unknown) => void): () => void;
  };
  files: {
    upload(file: File): Promise<{ file_id: string }>;
    list(): Promise<SurfaceFileRef[]>;
    get(id: string): Promise<{ url: string; meta: SurfaceFileRef }>;
  };
  artifacts: {
    list(): Promise<Array<{ id: string; type: string; title: string }>>;
  };
  chrome: {
    requestSystemChip(text: string): Promise<{ ok: true }>;
  };
}

const hub: AgentHubSurface = {
  run: (req) => request("run", { input: req.input }),

  state: {
    useSelector<T>(selector: (state: unknown) => T): T {
      // Memoise the snapshot so a selector like `s.datasets ?? []` returns
      // a stable reference once the underlying state stops changing. Without
      // this `useSyncExternalStore` sees a new value every render and tears
      // (React #185, observed as a black Surface screen).
      const last = useRef<{ has: boolean; value: T }>({ has: false, value: undefined as unknown as T });
      const snapshot = (): T => {
        const next = selector(stateCache);
        if (last.current.has && shallowEq(last.current.value, next)) {
          return last.current.value;
        }
        last.current = { has: true, value: next };
        return next;
      };
      return useSyncExternalStore(
        (cb) => {
          stateListeners.add(cb);
          return () => stateListeners.delete(cb);
        },
        snapshot,
        snapshot,
      );
    },
    emit: (patches) => request("state.emit", { patches }),
  },

  events: {
    subscribe(type, handler) {
      let set = eventSubs.get(type);
      if (!set) {
        set = new Set();
        eventSubs.set(type, set);
      }
      set.add(handler);
      return () => set!.delete(handler);
    },
  },

  files: {
    async upload(file) {
      const content_b64 = await fileToBase64(file);
      return request("files.upload", {
        filename: file.name,
        content_type: file.type || "application/octet-stream",
        content_b64,
      });
    },
    list: () => request("files.list").then((r: any) => r?.files ?? r ?? []),
    get: (id) => request("files.get", { id }),
  },

  artifacts: {
    list: () =>
      request("artifacts.list").then((r: any) => r?.artifacts ?? r ?? []),
  },

  chrome: {
    requestSystemChip: (text) => request("chrome.requestSystemChip", { text }),
  },
};

export function useAgentHub(): AgentHubSurface {
  install();
  return hub;
}
