// Surface entrypoint (§8.2). Rendered inside the AgentHub iframe sandbox.
// Non-trusted: every hub.* call crosses postMessage to the Host. The Surface
// never calls the LLM or fetches externally — it only drives Runs and reads
// Session State (state_mode=agenthub-managed, so it is read-only here).

import { useEffect, useRef, useState } from "react";
import { useAgentHub } from "@agenthub/surface-sdk";
import type { DatasetMeta, Kpi, SessionState } from "../shared/types.js";
import Chart from "./Chart.js";
import "./styles.css";

const EXAMPLE_PROMPTS = [
  "월별 판매량 추이 차트 만들어줘",
  "사용자 이탈 구간 분석해줘",
  "핵심 KPI 요약 대시보드 구성해줘",
];

function fmt(n: number): string {
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(1) + "억";
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(1) + "만";
  return n.toLocaleString("ko-KR");
}

export default function App() {
  const hub = useAgentHub();

  const datasets = hub.state.useSelector<DatasetMeta[]>(
    (s) => (s as SessionState).datasets ?? [],
  );
  const activeId = hub.state.useSelector<string | null>(
    (s) => (s as SessionState).activeDatasetId ?? null,
  );
  const kpis = hub.state.useSelector<Kpi[]>(
    (s) => (s as SessionState).kpis ?? [],
  );
  const chart = hub.state.useSelector<SessionState["chart"]>(
    (s) => (s as SessionState).chart ?? null,
  );
  const note = hub.state.useSelector<string>(
    (s) => (s as SessionState).note ?? "",
  );

  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const seeded = useRef(false);

  // Seed sample datasets once when the session is empty.
  useEffect(() => {
    if (seeded.current || datasets.length > 0) return;
    seeded.current = true;
    void hub.run({ input: { action: "init" } });
  }, [datasets.length, hub]);

  async function trigger(input: unknown) {
    setBusy(true);
    try {
      await hub.run({ input });
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(file: File) {
    setBusy(true);
    try {
      const { file_id } = await hub.files.upload(file);
      await hub.run({
        input: { action: "ingest", fileId: file_id, name: file.name },
      });
    } finally {
      setBusy(false);
    }
  }

  const active = datasets.find((d) => d.id === activeId) ?? null;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="side-section">
          <h2 className="side-title">데이터셋</h2>
          <ul className="dataset-list">
            {datasets.map((d) => (
              <li
                key={d.id}
                className={"dataset-item" + (d.id === activeId ? " active" : "")}
                onClick={() =>
                  trigger({ action: "select", datasetId: d.id })
                }
              >
                <div className="dataset-item__name">
                  {d.name}
                  <span className="dataset-item__src">
                    {d.source === "upload" ? "업로드" : "샘플"}
                  </span>
                </div>
                <div className="dataset-item__meta">
                  {d.rowCount}행 · {d.columns.length}열
                </div>
              </li>
            ))}
            {datasets.length === 0 && (
              <li className="dataset-empty">데이터셋을 불러오는 중…</li>
            )}
          </ul>
        </div>

        <div className="side-section">
          <h2 className="side-title">데이터 업로드</h2>
          <label
            className="upload-box"
            onClick={() => fileRef.current?.click()}
          >
            <span className="upload-ico">⬆</span>
            <span className="upload-text">CSV / JSON 파일 선택</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUpload(f);
              }}
            />
          </label>
        </div>
      </aside>

      <section className="content">
        <div className="content-head">
          <h1 className="ds-name">{active ? active.name : "데이터 대시보드"}</h1>
          <p className="ds-desc">
            {active
              ? `${active.description} · ${active.columns.join(", ")}`
              : "데이터셋을 선택하세요"}
          </p>
        </div>

        <div className="kpi-row">
          {kpis.map((k, i) => (
            <div className="kpi-card" key={i}>
              <div className="kpi-card__val">
                {fmt(k.value)}
                {k.unit ? <span className="kpi-card__unit">{k.unit}</span> : null}
              </div>
              <div className="kpi-card__label">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="prompt-bar">
          <input
            className="prompt-input"
            value={prompt}
            placeholder="예) 월별 판매량 추이 차트 만들어줘"
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && prompt.trim()) {
                trigger({ action: "query", prompt });
              }
            }}
          />
          <button
            className="prompt-send"
            disabled={busy || !prompt.trim()}
            onClick={() => trigger({ action: "query", prompt })}
          >
            {busy ? "생성 중…" : "생성"}
          </button>
        </div>

        <div className="chips">
          {EXAMPLE_PROMPTS.map((c) => (
            <button
              key={c}
              className="chip"
              disabled={busy}
              onClick={() => {
                setPrompt(c);
                trigger({ action: "query", prompt: c });
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="chart-card">
          <div className="chart-head">
            <h3 className="chart-title">{chart ? chart.title : "차트"}</h3>
            <span className="chart-note">{note}</span>
          </div>
          <Chart spec={chart} />
        </div>
      </section>
    </div>
  );
}
