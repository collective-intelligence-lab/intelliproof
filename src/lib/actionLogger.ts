import { supabase } from "./supabaseClient";

export type UIAction = {
    t: number; // epoch ms
    userId?: string;
    type: string;
    payload?: unknown;
};

export type ApiCall = {
    tStart: number;
    tEnd: number;
    userId?: string;
    endpoint: string;
    method: string;
    graphId?: string;
    nodeId?: string;
    status: number;
    ok: boolean;
    request?: unknown;
    response?: unknown;
    error?: string;
    meta?: Record<string, unknown>;
};

const uiActions: UIAction[] = [];
const apiCalls: ApiCall[] = [];

export function logAction(type: string, payload?: unknown, userId?: string) {
    uiActions.push({ t: Date.now(), type, payload, userId });
}

export function getActionLog(): UIAction[] {
    return uiActions.slice();
}

export function getApiLog(): ApiCall[] {
    return apiCalls.slice();
}

function textPreview(obj: unknown, limit = 16 * 1024): string {
    try {
        const s = typeof obj === "string" ? obj : JSON.stringify(obj);
        return s.length > limit ? s.slice(0, limit) + "…" : s;
    } catch {
        return "[unserializable]";
    }
}

function toJsonbValue(value: unknown) {
    if (value === undefined || value === null) return null;
    // If it's already a string, attempt JSON parse; otherwise store as plain string preview
    const asString = typeof value === "string" ? value : textPreview(value);
    try {
        return JSON.parse(asString);
    } catch {
        return asString; // store as JSON string in jsonb column
    }
}

export async function persistActionsToSupabase() {
    if (!uiActions.length) return;
    const batch = uiActions.splice(0, uiActions.length);
    const { error } = await supabase.from("user_action_logs").insert(
        batch.map((a) => ({
            ts: new Date(a.t).toISOString(),
            user_id: a.userId ?? null,
            type: a.type,
            payload: a.payload ?? null,
        }))
    );
    if (error) {
        // put back if failed
        uiActions.unshift(...batch);
        // eslint-disable-next-line no-console
        console.warn("[user_action_logs] insert failed:", error);
    }
}

export async function persistApiCallsToSupabase() {
    if (!apiCalls.length) return;
    const batch = apiCalls.splice(0, apiCalls.length);
    const { error } = await supabase.from("api_call_logs").insert(
        batch.map((c) => ({
            ts_start: new Date(c.tStart).toISOString(),
            ts_end: new Date(c.tEnd).toISOString(),
            duration_ms: Math.round(c.tEnd - c.tStart),
            user_id: c.userId ?? null,
            endpoint: c.endpoint,
            method: c.method,
            graph_id: c.graphId ?? null,
            node_id: c.nodeId ?? null,
            status_code: c.status,
            ok: c.ok,
            request: toJsonbValue(c.request),
            response: toJsonbValue(c.response),
            error: c.error ?? null,
            meta: c.meta ?? null,
        }))
    );
    if (error) {
        apiCalls.unshift(...batch);
        // eslint-disable-next-line no-console
        console.warn("[api_call_logs] insert failed:", error);
    }
}

export function downloadActionLog(filename = "user_actions.ndjson") {
    const blob = new Blob(uiActions.map((a) => JSON.stringify(a) + "\n"), {
        type: "text/plain",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

export function downloadApiLog(filename = "api_calls.ndjson") {
    const blob = new Blob(apiCalls.map((a) => JSON.stringify(a) + "\n"), {
        type: "text/plain",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

export type FetchLoggerMeta = {
    endpoint?: string;
    method?: string;
    graphId?: string;
    nodeId?: string;
    userId?: string;
};

export async function logApiCall(entry: ApiCall) {
    apiCalls.push(entry);
    // fire-and-forget streaming to DB is optional; keep client responsive
    // do not await here to avoid blocking UI
    void persistApiCallsToSupabase();
}

// Install a global fetch wrapper on the client
export function installFetchLogger(getMeta?: () => FetchLoggerMeta) {
    if (typeof window === "undefined") return () => { };
    const original = window.fetch.bind(window);
    const wrapped: typeof window.fetch = async (
        input: RequestInfo | URL,
        init?: RequestInit & { meta?: FetchLoggerMeta }
    ) => {
        const tStart = performance.now();
        const endpoint = init?.meta?.endpoint ?? (typeof input === "string" ? input : String(input));
        const method = init?.meta?.method ?? init?.method ?? "GET";
        try {
            const res = await original(input, init);
            const tEnd = performance.now();
            let bodyPreview: unknown = null;
            try {
                const clone = res.clone();
                const ct = clone.headers.get("content-type") || "";
                if (ct.includes("application/json")) bodyPreview = await clone.json();
                else bodyPreview = await clone.text();
            } catch {
                bodyPreview = "[non-readable response]";
            }
            const meta = { ...(getMeta?.() ?? {}), ...(init?.meta ?? {}) };
            void logApiCall({
                tStart,
                tEnd,
                userId: meta.userId,
                endpoint: String(endpoint),
                method: String(method),
                graphId: meta.graphId,
                nodeId: meta.nodeId,
                status: res.status,
                ok: res.ok,
                request: init?.body ? { body: init.body } : undefined,
                response: bodyPreview,
                meta,
            });
            return res;
        } catch (e: any) {
            const tEnd = performance.now();
            const meta = { ...(getMeta?.() ?? {}), ...(init?.meta ?? {}) };
            void logApiCall({
                tStart,
                tEnd,
                userId: meta.userId,
                endpoint: String(endpoint),
                method: String(method),
                graphId: meta.graphId,
                nodeId: meta.nodeId,
                status: -1,
                ok: false,
                request: init?.body ? { body: init.body } : undefined,
                error: String(e?.message ?? e),
                meta,
            });
            throw e;
        }
    };
    window.fetch = wrapped;
    return () => {
        window.fetch = original;
    };
}


