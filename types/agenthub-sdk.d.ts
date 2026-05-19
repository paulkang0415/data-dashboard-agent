/**
 * Ambient type stubs for `@agenthub/sdk` (Agent Function Runtime, server side).
 *
 * The real implementation is provided by the AgentHub build/runtime — see
 * architecture spec §8.1 / §8.3 / §9. These declarations model only the v1
 * surface used by this agent so the repo type-checks without the package.
 */
declare module "@agenthub/sdk" {
  // ── LLM Gateway (§9) ──
  export type LlmRole = "system" | "user" | "assistant";

  export interface LlmTextPart { type: "text"; text: string }
  export interface LlmImagePart { type: "image"; file_id: string }
  export type LlmContent = string | Array<LlmTextPart | LlmImagePart>;

  export interface LlmMessage {
    role: LlmRole;
    content: LlmContent;
  }

  export interface JsonSchemaFormat {
    type: "json_schema";
    schema: Record<string, unknown>;
  }

  export interface LlmRequest {
    model: string; // alias declared in agenthub.yaml `llm.aliases`
    messages: LlmMessage[];
    response_format?: JsonSchemaFormat;
    tools?: Array<{
      name: string;
      description?: string;
      input_schema: Record<string, unknown>;
    }>;
  }

  export interface LlmResponse {
    /** Parsed structured output when `response_format` was supplied. */
    output: unknown;
    /** Raw text for plain generations. */
    text?: string;
    stop_reason?: "stop" | "tool_use" | "length" | string;
    tool_calls?: Array<{ id: string; name: string; input: unknown }>;
  }

  // ── Files / Artifacts ──
  export interface FileRef {
    id: string;
    name: string;
    mime?: string;
    size?: number;
  }

  export interface ArtifactRef {
    id: string;
    type: string;
    title: string;
  }

  // ── Session State patches (RFC 6902 subset, §13.2) ──
  export type SurfacePatch =
    | { op: "replace"; path: string; value: unknown }
    | { op: "add"; path: string; value: unknown }
    | { op: "remove"; path: string };

  // ── Standard error envelope (§10.4) ──
  export type ErrorCode =
    | "permission_denied"
    | "concurrent_run_limit"
    | "agent_timeout"
    | "agent_oom"
    | "agent_threw"
    | "llm_rate_limited"
    | "llm_provider_error"
    | "llm_safety_blocked"
    | "llm_invalid_response"
    | "external_api_denied"
    | "external_api_error"
    | "state_size_exceeded"
    | "state_schema_violation"
    | "cancelled_by_user"
    | "bad_input";

  export interface AgentError {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  }

  // ── Run context (§8.1) ──
  export interface AgentRunContext {
    /** Run input. Shape is agent-defined; narrow before use. */
    input: unknown;
    session_id: string;
    /** Aborts when the user cancels the Run (§10.6). */
    signal: AbortSignal;

    state: {
      read(): Promise<unknown>;
    };

    llm: {
      generate(req: LlmRequest): Promise<LlmResponse>;
      stream(req: LlmRequest): AsyncIterable<{ delta: string }>;
    };

    files: {
      get(id: string): Promise<FileRef>;
      /** UTF-8 text contents of a session file. */
      read(id: string): Promise<string>;
      list(): Promise<FileRef[]>;
    };

    artifacts: {
      create(a: { type: string; title: string; data: unknown }): Promise<ArtifactRef>;
    };

    secrets: {
      get(name: string): Promise<string>;
    };

    events: {
      emit(e: { type: string; data?: unknown; content?: string }): void;
    };

    notify(n: {
      session_id: string;
      kind: string;
      title: string;
      preview?: string;
    }): Promise<void>;
  }

  export type RunResult =
    | {
        message?: string;
        surface_patches?: SurfacePatch[];
        artifacts?: ArtifactRef[];
      }
    | { error: AgentError };
}
