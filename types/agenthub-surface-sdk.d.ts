/**
 * Ambient type stubs for `@agenthub/surface-sdk` (Surface iframe, browser).
 *
 * Provided by the AgentHub runtime — see architecture spec §8.2. Non-trusted:
 * every call crosses postMessage to the Host. These declarations model only
 * the v1 surface used by this agent's UI.
 */
declare module "@agenthub/surface-sdk" {
  export interface SurfaceFileRef {
    id: string;
    name: string;
    mime?: string;
    size?: number;
  }

  export interface AgentHubSurface {
    /** Trigger a Run; resolves when the Host has accepted it. */
    run(req: { input: unknown }): Promise<{ run_id: string }>;

    state: {
      /** Subscribe to a slice of Session State (React hook). */
      useSelector<T>(selector: (state: unknown) => T): T;
      /** Only valid when manifest `surface.state_mode = surface-emit`. */
      emit(patches: unknown[]): Promise<{ ok: true }>;
    };

    events: {
      subscribe(
        type: string,
        handler: (payload: unknown) => void,
      ): () => void;
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
      /** Records a system chip in the chat (UX §5.2). */
      requestSystemChip(text: string): Promise<{ ok: true }>;
    };
  }

  export function useAgentHub(): AgentHubSurface;
}
