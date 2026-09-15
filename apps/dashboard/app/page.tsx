"use client";
import { useState, useEffect } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  Shield,
  Monitor,
  Search,
  Code2,
  Network,
  FolderOpen,
  Fingerprint,
  Clock,
  Target,
  FileText,
  Settings,
  BookOpen,
  Terminal,
  ChevronRight,
  Plus,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Download,
  FlaskConical,
  PanelLeftClose,
  LockKeyhole,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import dynamic from "next/dynamic";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
const Editor = dynamic(() => import("../components/editor"), {
  ssr: false,
  loading: () => <p className="empty">Loading the local code editor…</p>,
});
const Graph = dynamic(() => import("../components/graph"), { ssr: false });
const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchInterval: 10000, refetchOnWindowFocus: false },
  },
});
const nav = [
  ["Command Center", Activity],
  ["Endpoints", Monitor],
  ["Investigations", Search],
  ["Detections", Shield],
  ["Cases", FolderOpen],
  ["Timeline", Clock],
  ["Indicators", Target],
  ["Evidence", Fingerprint],
  ["Rules", BookOpen],
  ["JOCKY Playground", Code2],
  ["Compiler Lab", FlaskConical],
  ["AI Investigator", Terminal],
  ["Reports", FileText],
  ["Audit Logs", LockKeyhole],
  ["Settings", Settings],
] as const;
const examples: Record<string, string> = {
  "Process inventory":
    "hunt process_inventory {\n    p = processes()\n    report p\n}",
  "Word → PowerShell":
    'hunt word_powershell {\n    p = processes()\n    suspect = p where name == "powershell.exe"\n        and parent.name == "winword.exe"\n    report suspect\n    if len(suspect) > 0 {\n        alert "Word launched PowerShell; review context"\n    }\n}',
  "Local demo process":
    'hunt demo_process {\n    p = processes()\n    matches = p where name == "jocky-agent" or name == "jocky-agent.exe"\n    report matches\n    if len(matches) > 0 {\n        alert "JOCKY DEMO: our own agent was observed"\n    }\n}',
  "Network inventory":
    "hunt network_inventory {\n    connections = network()\n    report connections\n}",
};
const short = (s: string = "") => s.slice(0, 8);
const time = (s: string) => (s ? new Date(s).toLocaleString() : "—");
const pretty = (v: any) => JSON.stringify(v, null, 2);
function Badge({ value }: { value: any }) {
  return (
    <span
      className={"badge " + String(value).toLowerCase().replaceAll(" ", "_")}
    >
      {String(value).replaceAll("_", " ")}
    </span>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="empty">
      <Search size={25} />
      <p>{children}</p>
    </div>
  );
}
function DataTable({
  rows,
  columns,
  onRow,
}: {
  rows: any[];
  columns: [string, (r: any) => React.ReactNode][];
  onRow?: (r: any) => void;
}) {
  return rows.length ? (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map(([n]) => (
              <th key={n}>{n}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.id || i}
              onClick={() => onRow?.(r)}
              className={onRow ? "clickable" : ""}
            >
              {columns.map(([n, f]) => (
                <td key={n}>{f(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty>
      No records yet. Run a collection or create a record to get started.
    </Empty>
  );
}
function SelectEndpoint({
  endpoints,
  value,
  onChange,
  all = false,
}: {
  endpoints: any[];
  value: string;
  onChange: (v: string) => void;
  all?: boolean;
}) {
  return (
    <select
      aria-label="Target endpoint"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Choose endpoint</option>
      {all && <option value="all">All enrolled endpoints</option>}
      {endpoints
        .filter((e) => !e.demo && !e.disabled)
        .map((e) => (
          <option key={e.id} value={e.id}>
            {e.hostname} · {e.os}
          </option>
        ))}
    </select>
  );
}
function App() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState("Command Center");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [endpoint, setEndpoint] = useState("");
  const [kind, setKind] = useState("quick");
  const [path, setPath] = useState("");
  const [source, setSource] = useState(examples["Process inventory"]);
  const [compiler, setCompiler] = useState<any>(null);
  const [caseId, setCaseId] = useState("");
  const [live, setLive] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [obsKind, setObsKind] = useState("process");
  const [obsPage, setObsPage] = useState(0);
  const [viewGraph, setViewGraph] = useState(false);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api("auth/me"),
    retry: false,
    refetchInterval: false,
  });
  const enabled = !!me.data;
  const q = (name: string) =>
    useQuery({ queryKey: [name], queryFn: () => api(name), enabled });
  const endpoints = q("endpoints"),
    summary = q("summary"),
    jobs = q("jobs"),
    detections = q("detections"),
    cases = q("cases"),
    evidence = q("evidence"),
    rules = q("rules"),
    indicators = q("indicators"),
    reports = q("reports"),
    settings = q("settings"),
    health = q("health");
  const audit = useQuery({
    queryKey: ["audit"],
    queryFn: () => api("audit"),
    enabled: enabled && page === "Audit Logs",
  });
  const timeline = useQuery({
    queryKey: ["timeline", endpoint, obsKind],
    queryFn: () =>
      api(
        "timeline?" +
          new URLSearchParams({
            ...(endpoint ? { endpoint_id: endpoint } : {}),
            ...(obsKind ? { kind: obsKind } : {}),
          }),
      ),
    enabled: enabled && page === "Timeline",
  });
  const observations = useQuery({
    queryKey: ["observations", endpoint, obsKind, obsPage],
    queryFn: () =>
      api(
        "observations?" +
          new URLSearchParams({
            kind: obsKind,
            offset: String(obsPage * 100),
            ...(endpoint ? { endpoint_id: endpoint } : {}),
          }),
      ),
    enabled: enabled && ["Endpoints", "Investigations"].includes(page),
  });
  const graph = useQuery({
    queryKey: ["graph", endpoint],
    queryFn: () => api("graph/" + endpoint),
    enabled: enabled && !!endpoint && viewGraph,
  });
  const caseDetail = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => api("cases/" + caseId),
    enabled: enabled && !!caseId && page === "Cases",
  });
  const es = endpoints.data || [];
  const ds = detections.data || [];
  const cs = cases.data || [];
  const ev = evidence.data || [];
  const js = jobs.data || [];
  const activeErrors = [
    endpoints,
    summary,
    jobs,
    detections,
    cases,
    evidence,
    rules,
    indicators,
    reports,
    settings,
    health,
  ]
    .filter((q) => q.error)
    .map((q) => String(q.error));
  useEffect(() => {
    if (!enabled) return;
    let ws: WebSocket | undefined;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout>;
    async function connect() {
      try {
        const { ticket } = await api("ws-ticket", {});
        if (stopped) return;
        const base =
          location.hostname === "127.0.0.1" || location.hostname === "localhost"
            ? `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:58000/ws`
            : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
        ws = new WebSocket(base);
        ws.onopen = () => ws?.send(JSON.stringify({ ticket }));
        ws.onmessage = (e) => {
          const data = JSON.parse(e.data);
          setLive(true);
          if (!["ping", "connected"].includes(data.event))
            queryClient.invalidateQueries({
              predicate: (q) => q.queryKey[0] !== "me",
            });
        };
        ws.onclose = () => {
          setLive(false);
          if (!stopped) retry = setTimeout(connect, 10000);
        };
        ws.onerror = () => setLive(false);
      } catch {
        if (!stopped) retry = setTimeout(connect, 10000);
      }
    }
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      ws?.close();
    };
  }, [enabled, queryClient]);
  async function act(fn: () => Promise<any>, message?: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fn();
      if (message) setNotice(message);
      await queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== "me",
      });
      return r;
    } catch (e) {
      setError(String((e as Error).message));
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  const filtered = (rows: any[]) =>
    rows.filter((r) => pretty(r).toLowerCase().includes(search.toLowerCase()));
  async function scan(k = kind, s = source) {
    if (!endpoint) {
      setError("Choose an endpoint first.");
      return;
    }
    await act(
      () =>
        api("jobs", {
          kind: k,
          endpoint_ids: endpoint === "all" ? [] : [endpoint],
          all_endpoints: endpoint === "all",
          params:
            k === "script" ? { source: s } : k === "files" ? { path } : {},
        }),
      "Job queued. The endpoint agent will collect results on its next poll.",
    );
  }
  function heading(
    title: string,
    description: string,
    action?: React.ReactNode,
  ) {
    return (
      <div className="page-heading">
        <div>
          <div className="eyebrow">WORKSPACE / {title.toUpperCase()}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action}
      </div>
    );
  }
  function formSubmit(
    e: React.FormEvent<HTMLFormElement>,
    fn: (v: any) => Promise<any>,
    message: string,
  ) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    act(() => fn(data), message);
  }
  if (me.isPending)
    return (
      <div className="login">
        <div className="brand">
          J<span>O</span>CKY
        </div>
        <p>Connecting to the command center…</p>
      </div>
    );
  if (!enabled)
    return (
      <div className="login">
        <div className="login-copy">
          <span className="eyebrow">FORENSIC INTELLIGENCE PLATFORM</span>
          <div className="wordmark">
            J<span>O</span>CKY<span className="brand-dot">.</span>
          </div>
          <h1>
            Every finding.
            <br />A traceable origin.
          </h1>
          <p>
            Investigate your endpoints. Preserve the evidence.
            <br />
            Understand the story behind the signals.
          </p>
          <div className="login-proof">
            <Fingerprint /> Read-only collection <span> / </span> Evidence
            integrity
          </div>
        </div>
        <form
          className="login-card"
          onSubmit={(e) =>
            formSubmit(
              e,
              async (d) => {
                const r = await api("auth/login", d);
                await me.refetch();
                return r;
              },
              "Signed in",
            )
          }
        >
          <Shield className="cyan" size={30} />
          <h2>Access your workspace</h2>
          <p>Sign in to your JOCKY workspace</p>
          <label>
            Email
            <input
              name="email"
              type="email"
              defaultValue="admin@jocky.local"
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <Button disabled={busy} type="submit">
            {busy ? "Signing in…" : "Sign in"} <ArrowUpRight size={16} />
          </Button>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          <p className="small">
            Use the credentials provided by your workspace administrator.
          </p>
        </form>
      </div>
    );
  return (
    <div className={"shell " + (collapsed ? "collapsed" : "")}>
      <aside className="sidebar">
        <div className="brand">
          J<span>O</span>CKY<span className="brand-dot">.</span>
        </div>
        <div className="workspace">
          <div className="workspace-icon">JW</div>
          <div>
            <b>JOCKY Workspace</b>
            <small>Investigation workspace</small>
          </div>
          <ChevronRight size={14} />
        </div>
        <div className="nav-section">OPERATIONS</div>
        <nav>
          {nav.map(([label, Icon], i) => (
            <div key={label}>
              {i === 9 && (
                <div className="nav-section">INTELLIGENCE & TOOLS</div>
              )}
              <button
                title={label}
                className={page === label ? "active" : ""}
                onClick={() => {
                  setPage(label);
                  setSearch("");
                  setError("");
                  setNotice("");
                  setViewGraph(false);
                }}
              >
                <Icon size={17} />
                <span>{label}</span>
                {label === "Detections" &&
                  ds.filter((d: any) => d.status === "new").length > 0 && (
                    <em>{ds.filter((d: any) => d.status === "new").length}</em>
                  )}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="agent-safety">
            <LockKeyhole size={14} /> READ-ONLY COLLECTION
          </div>
          <div className="profile">
            <span className="avatar">
              {me.data.email.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <b>{me.data.role}</b>
              <small>{me.data.email}</small>
            </div>
            <button
              aria-label="Sign out"
              onClick={async () => {
                await api("auth/logout", {});
                queryClient.clear();
                location.reload();
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <button
            className="icon-button"
            title="Toggle sidebar"
            aria-label="Toggle sidebar"
            onClick={() => setCollapsed(!collapsed)}
          >
            <PanelLeftClose size={18} />
          </button>
          <span className="breadcrumb">
            Workspace <ChevronRight size={12} /> <b>{page}</b>
          </span>
          <div className="topbar-right">
            <span className="live">
              <i className={live ? "" : "offline"} />
              {live ? "Live stream" : "Polling · 10s"}
            </span>
            <span className="top-date">
              {new Date().toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="avatar">JL</span>
          </div>
        </header>
        <div className="main-content">
          {error && (
            <div className="error" role="alert">
              <AlertTriangle size={17} />
              {error}
              <button onClick={() => setError("")}>Dismiss</button>
            </div>
          )}
          {notice && (
            <div className="success" role="status">
              <CheckCircle2 size={17} />
              {notice}
              <button onClick={() => setNotice("")}>Dismiss</button>
            </div>
          )}
          {activeErrors.length > 0 && (
            <div className="error">
              Some live data is unavailable: {activeErrors[0]}
            </div>
          )}
          {page === "Command Center" && (
            <>
              {heading(
                "Command Center",
                "Your fleet, evidence, and investigations. One connected view.",
                <Button onClick={() => setPage("Investigations")}>
                  <Plus size={16} /> New investigation
                </Button>,
              )}
              <div className="status-strip">
                <span>
                  <i />{" "}
                  {health.data?.status === "healthy"
                    ? "Platform operational"
                    : "Checking platform health"}
                </span>
                <span>
                  Evidence-led investigation{" "}
                  <span className="separator">/</span> Live endpoint telemetry
                </span>
                <button
                  onClick={() => {
                    setPage("Settings");
                  }}
                >
                  Service status <ArrowUpRight size={13} />
                </button>
              </div>
              <div className="metrics">
                {[
                  [
                    "Enrolled endpoints",
                    summary.data?.endpoints || 0,
                    `${summary.data?.online || 0} reporting online`,
                    Monitor,
                  ],
                  [
                    "Open detections",
                    ds.filter((d: any) =>
                      ["new", "investigating"].includes(d.status),
                    ).length,
                    `${summary.data?.critical_alerts || 0} critical severity`,
                    Shield,
                  ],
                  [
                    "Open cases",
                    summary.data?.open_cases || 0,
                    "Investigations in progress",
                    FolderOpen,
                  ],
                  [
                    "Evidence objects",
                    summary.data?.counts?.evidence || 0,
                    "SHA-256 fingerprinted",
                    Fingerprint,
                  ],
                ].map(([label, num, sub, Icon]: any, i) => (
                  <div className={"metric m" + i} key={label}>
                    <div>
                      <span>{label}</span>
                      <Icon size={18} />
                    </div>
                    <strong>{num.toString().padStart(2, "0")}</strong>
                    <small>{sub}</small>
                  </div>
                ))}
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="panel-head">
                    <h2>
                      Fleet overview <span className="count">{es.length}</span>
                    </h2>
                    <button onClick={() => setPage("Endpoints")}>
                      View endpoints <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <DataTable
                    rows={es.slice(0, 5)}
                    columns={[
                      [
                        "ENDPOINT",
                        (e) => (
                          <div className="entity">
                            <span className="entity-icon">
                              <Monitor size={18} />
                            </span>
                            <div>
                              <b>{e.hostname}</b>
                              <small>
                                {e.os} · {e.architecture}{" "}
                                {e.demo ? "· DEMO" : ""}
                              </small>
                            </div>
                          </div>
                        ),
                      ],
                      ["STATUS", (e) => <Badge value={e.status} />],
                      [
                        "RISK",
                        (e) => (
                          <div className="risk">
                            <span>{e.risk.score}</span>
                            <div>
                              <i style={{ width: e.risk.score + "%" }} />
                            </div>
                          </div>
                        ),
                      ],
                      [
                        "LAST SEEN",
                        (e) => (
                          <span className="mono muted">
                            {new Date(e.last_seen).toLocaleTimeString()}
                          </span>
                        ),
                      ],
                    ]}
                    onRow={(e) => {
                      setEndpoint(e.id);
                      setPage("Endpoints");
                    }}
                  />
                  <div className="panel-foot">
                    <span>
                      Agents connect outbound. No inbound endpoint ports.
                    </span>
                    <button onClick={() => setPage("Endpoints")}>
                      Enroll an endpoint →
                    </button>
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-head">
                    <h2>Risk distribution</h2>
                    <Badge value="explainable" />
                  </div>
                  <div className="chart">
                    <ResponsiveContainer width="100%" height={185}>
                      <BarChart
                        data={Object.entries(
                          summary.data?.risk_distribution || {},
                        ).map(([name, value]) => ({ name, value }))}
                      >
                        <XAxis
                          dataKey="name"
                          stroke="#738394"
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#16212c",
                            border: "1px solid #334453",
                          }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {["#28bca4", "#e8ae57", "#ea6578"].map((c) => (
                            <Cell key={c} fill={c} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-note">
                    Scores come from active detection rules and IOC matches.
                  </div>
                </section>
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="panel-head">
                    <h2>Recent detections</h2>
                    <button onClick={() => setPage("Detections")}>
                      View all <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <DataTable
                    rows={ds.slice(0, 5)}
                    columns={[
                      ["SEVERITY", (d) => <Badge value={d.severity} />],
                      [
                        "FINDING",
                        (d) => (
                          <div>
                            <b>{d.title}</b>
                            <small className="mono">
                              OBS {short(d.observation_id)}
                            </small>
                          </div>
                        ),
                      ],
                      ["STATUS", (d) => <Badge value={d.status} />],
                    ]}
                    onRow={setDetail}
                  />
                </section>
                <section className="panel">
                  <div className="panel-head">
                    <h2>Collection activity</h2>
                    <Activity size={16} />
                  </div>
                  <div className="activity-list">
                    {js.length ? (
                      js.slice(0, 5).map((j: any) => (
                        <div key={j.id}>
                          <span className="activity-dot" />
                          <div>
                            <b>{j.kind} collection</b>
                            <small>
                              {j.targets.length} endpoint(s) ·{" "}
                              {time(j.created_at)}
                            </small>
                          </div>
                          <Badge value={j.targets[0]?.state || "queued"} />
                        </div>
                      ))
                    ) : (
                      <Empty>Collection jobs will appear here.</Empty>
                    )}
                  </div>
                </section>
              </div>
              <section className="learning">
                <div className="learning-icon">
                  <BookOpen size={25} />
                </div>
                <div>
                  <span className="eyebrow">NEW TO ENDPOINT FORENSICS?</span>
                  <h3>Start with a snapshot. Follow the evidence.</h3>
                  <p>
                    Enroll a device, run Quick Scan, then inspect processes and
                    network connections. Every record links back to its source.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPage("Investigations")}
                >
                  Start investigating <ArrowUpRight size={15} />
                </Button>
              </section>
            </>
          )}
          {page === "Endpoints" && (
            <>
              {heading(
                "Endpoints",
                "Computers enrolled in your workspace. Click a device to investigate.",
                <Button
                  onClick={() =>
                    act(async () => {
                      const r = await api("enrollments", { uses: 1 });
                      setDetail({
                        title: "One-time enrollment token · expires in 1 hour",
                        ...r,
                        instructions:
                          "On the endpoint, set JOCKY_SERVER_URL and ENROLLMENT_TOKEN. Run jocky-agent. See docs/setup-windows-agent.md. This token is displayed once; keep it private.",
                      });
                      return r;
                    })
                  }
                >
                  <Plus size={16} /> Enroll endpoint
                </Button>,
              )}
              <div className="toolbar">
                <Search size={17} />
                <input
                  aria-label="Search endpoints"
                  placeholder="Search hostname, OS, user, IP…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <section className="panel">
                <DataTable
                  rows={filtered(es)}
                  columns={[
                    [
                      "HOSTNAME",
                      (e) => (
                        <b>
                          {e.hostname}
                          {e.demo ? " [DEMO]" : ""}
                        </b>
                      ),
                    ],
                    [
                      "OPERATING SYSTEM",
                      (e) => (
                        <span>
                          {e.os} · {e.architecture}
                        </span>
                      ),
                    ],
                    ["USER", (e) => e.info.user || "—"],
                    ["IP", (e) => <code>{e.info.ip || "—"}</code>],
                    ["STATUS", (e) => <Badge value={e.status} />],
                    [
                      "RISK",
                      (e) => <span className="mono">{e.risk.score}/100</span>,
                    ],
                    [
                      "AGENT",
                      (e) => <span className="mono">v{e.agent_version}</span>,
                    ],
                    ["LAST SEEN", (e) => time(e.last_seen)],
                  ]}
                  onRow={(e) => {
                    setEndpoint(e.id);
                    setObsPage(0);
                  }}
                />
              </section>
              {endpoint && (
                <section className="panel endpoint-detail">
                  <div className="panel-head">
                    <h2>
                      {es.find((e: any) => e.id === endpoint)?.hostname}{" "}
                      <span className="muted">/ investigation</span>
                    </h2>
                    <div className="actions">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setDetail(es.find((e: any) => e.id === endpoint))
                        }
                      >
                        Identity & risk
                      </Button>
                      <Button disabled={busy} onClick={() => scan("quick")}>
                        Quick Scan <Play size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="tabs">
                    {[
                      "process",
                      "network",
                      "system",
                      "file",
                      "persistence",
                      "driver",
                      "event",
                      "finding",
                    ].map((k) => (
                      <button
                        key={k}
                        className={
                          !viewGraph && obsKind === k ? "selected" : ""
                        }
                        onClick={() => {
                          setObsKind(k);
                          setObsPage(0);
                          setViewGraph(false);
                        }}
                      >
                        {k === "finding" ? "Scripts" : k}
                      </button>
                    ))}
                    <button
                      className={viewGraph ? "selected" : ""}
                      onClick={() => setViewGraph(true)}
                    >
                      Relationship graph
                    </button>
                  </div>
                  {viewGraph ? (
                    graph.data ? (
                      <Graph data={graph.data} onSelect={setDetail} />
                    ) : (
                      <Empty>
                        {graph.error
                          ? String(graph.error)
                          : "Loading relationships…"}
                      </Empty>
                    )
                  ) : (
                    <ObservationTable
                      result={observations}
                      setDetail={setDetail}
                      obsPage={obsPage}
                      setObsPage={setObsPage}
                    />
                  )}
                </section>
              )}
            </>
          )}
          {page === "Investigations" && (
            <>
              {heading(
                "Live investigations",
                "Request bounded, read-only collection from one device or the fleet.",
              )}
              <section className="panel padded">
                <div className="eyebrow">NEW COLLECTION JOB</div>
                <div className="toolbar">
                  <SelectEndpoint
                    endpoints={es}
                    value={endpoint}
                    onChange={setEndpoint}
                    all
                  />
                  <select
                    aria-label="Collector"
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    {[
                      "quick",
                      "deep",
                      "system",
                      "process",
                      "network",
                      "files",
                      "persistence",
                      "driver",
                      "event",
                      "ioc",
                    ].map((k) => (
                      <option key={k} value={k}>
                        {k === "quick"
                          ? "Quick Scan — system, process, network"
                          : k + " collection"}
                      </option>
                    ))}
                  </select>
                  {kind === "files" && (
                    <input
                      aria-label="Explicit file path"
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                      placeholder="Explicit path allowed by agent"
                    />
                  )}
                  <Button disabled={busy || !endpoint} onClick={() => scan()}>
                    <Play size={15} /> Run collection
                  </Button>
                </div>
                <p className="muted">
                  The endpoint must be online. Offline jobs wait up to one hour.
                  Permission failures are returned alongside successful results.
                </p>
              </section>
              <section className="panel">
                <div className="panel-head">
                  <h2>Job queue</h2>
                  <span className="live">
                    <i />
                    {live ? "Live updates" : "Refreshes every 10s"}
                  </span>
                </div>
                <DataTable
                  rows={js}
                  columns={[
                    ["JOB", (j) => <span className="mono">{short(j.id)}</span>],
                    ["COLLECTOR", (j) => <b>{j.kind}</b>],
                    [
                      "TARGETS / STATE",
                      (j) => (
                        <div className="badge-row">
                          {j.targets.map((t: any) => (
                            <Badge key={t.id} value={t.state} />
                          ))}
                        </div>
                      ),
                    ],
                    [
                      "RESULTS",
                      (j) =>
                        j.results
                          .map(
                            (r: any) =>
                              `${r.summary.observations} observations`,
                          )
                          .join(", ") || "Awaiting agent",
                    ],
                    ["CREATED", (j) => time(j.created_at)],
                    [
                      "ACTIONS",
                      (j) => (
                        <div className="actions">
                          <Button variant="ghost" onClick={() => setDetail(j)}>
                            Inspect
                          </Button>
                          {j.targets.some((t: any) =>
                            ["queued", "running", "dispatched"].includes(
                              t.state,
                            ),
                          ) && (
                            <Button
                              variant="ghost"
                              onClick={() =>
                                act(
                                  () => api("jobs/" + j.id + "/cancel", {}),
                                  "Job cancelled",
                                )
                              }
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      ),
                    ],
                  ]}
                />
              </section>
              <section className="panel">
                <div className="panel-head">
                  <h2>Collected observations</h2>
                  <select
                    aria-label="Observation category"
                    value={obsKind}
                    onChange={(e) => {
                      setObsKind(e.target.value);
                      setObsPage(0);
                    }}
                  >
                    {[
                      "process",
                      "network",
                      "system",
                      "file",
                      "persistence",
                      "driver",
                      "event",
                      "finding",
                    ].map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </div>
                <ObservationTable
                  result={observations}
                  setDetail={setDetail}
                  obsPage={obsPage}
                  setObsPage={setObsPage}
                />
              </section>
            </>
          )}
          {page === "Detections" && (
            <>
              {heading(
                "Detections",
                "Explainable rule matches. A detection is a reason to investigate, not proof of compromise.",
              )}
              <div className="toolbar">
                <Search size={16} />
                <input
                  aria-label="Filter detections"
                  placeholder="Filter by severity, endpoint ID, rule, or status…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <section className="panel">
                <DataTable
                  rows={filtered(ds)}
                  columns={[
                    ["SEVERITY", (d) => <Badge value={d.severity} />],
                    [
                      "FINDING",
                      (d) => (
                        <button
                          className="text-button"
                          onClick={() => setDetail(d)}
                        >
                          {d.title}
                        </button>
                      ),
                    ],
                    [
                      "ENDPOINT",
                      (d) =>
                        es.find((e: any) => e.id === d.endpoint_id)?.hostname ||
                        short(d.endpoint_id),
                    ],
                    [
                      "RISK POINTS",
                      (d) => <span className="mono">+{d.score}</span>,
                    ],
                    [
                      "STATUS",
                      (d) => (
                        <select
                          aria-label={"Detection status " + short(d.id)}
                          value={d.status}
                          onChange={(e) =>
                            act(
                              () =>
                                api(
                                  "detections/" + d.id,
                                  { status: e.target.value },
                                  "PATCH",
                                ),
                              "Detection updated",
                            )
                          }
                        >
                          {[
                            "new",
                            "investigating",
                            "resolved",
                            "false_positive",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      ),
                    ],
                    ["TIME", (d) => time(d.created_at)],
                  ]}
                />
              </section>
            </>
          )}
          {page === "Cases" && (
            <>
              {heading(
                "Cases",
                "Group findings, preserve evidence, and document your investigation.",
              )}
              <form
                className="panel padded inline-form"
                onSubmit={(e) =>
                  formSubmit(e, (d) => api("cases", d), "Case created")
                }
              >
                <input
                  name="title"
                  placeholder="Case title"
                  aria-label="Case title"
                  required
                />
                <input
                  name="description"
                  placeholder="What are you investigating?"
                  aria-label="Case description"
                />
                <select name="severity" aria-label="Case severity">
                  <option>medium</option>
                  <option>high</option>
                  <option>critical</option>
                  <option>low</option>
                </select>
                <Button type="submit" disabled={busy}>
                  <Plus size={15} /> Create case
                </Button>
              </form>
              <section className="panel">
                <DataTable
                  rows={cs}
                  columns={[
                    ["CASE", (c) => <b>{c.title}</b>],
                    ["SEVERITY", (c) => <Badge value={c.severity} />],
                    ["STATUS", (c) => <Badge value={c.status} />],
                    ["CREATED", (c) => time(c.created_at)],
                    [
                      "ACTION",
                      (c) => (
                        <Button
                          variant="outline"
                          onClick={() => setCaseId(c.id)}
                        >
                          Open case
                        </Button>
                      ),
                    ],
                  ]}
                />
              </section>
              {caseDetail.data && (
                <section className="panel padded">
                  <h2>{caseDetail.data.title}</h2>
                  <p>{caseDetail.data.description}</p>
                  <div className="toolbar">
                    <select
                      aria-label="Case status"
                      value={caseDetail.data.status}
                      onChange={(e) =>
                        act(
                          () =>
                            api(
                              "cases/" + caseId,
                              { status: e.target.value },
                              "PATCH",
                            ),
                          "Case status updated",
                        )
                      }
                    >
                      {[
                        "open",
                        "investigating",
                        "contained",
                        "resolved",
                        "closed",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <Button
                      onClick={() =>
                        act(
                          () => api("cases/" + caseId + "/report", {}),
                          "Report generated. Open Reports to read or print it.",
                        )
                      }
                    >
                      Generate report
                    </Button>
                  </div>
                  <form
                    className="inline-form"
                    onSubmit={(e) =>
                      formSubmit(
                        e,
                        (d) => api("cases/" + caseId + "/attach", d),
                        "Attached to case",
                      )
                    }
                  >
                    <select name="kind" aria-label="Attachment type">
                      <option value="endpoint">Endpoint</option>
                      <option value="evidence">Evidence</option>
                      <option value="detection">Detection</option>
                    </select>
                    <input
                      name="id"
                      placeholder="Full record ID — copy from Inspect"
                      aria-label="Record ID"
                      required
                    />
                    <Button variant="outline">Attach record</Button>
                  </form>
                  <div className="attachment-picker">
                    {es.map((e: any) => (
                      <Button
                        key={e.id}
                        variant="ghost"
                        onClick={() =>
                          act(
                            () =>
                              api("cases/" + caseId + "/attach", {
                                kind: "endpoint",
                                id: e.id,
                              }),
                            "Endpoint attached",
                          )
                        }
                      >
                        + {e.hostname}
                      </Button>
                    ))}
                    {ev.slice(0, 5).map((e: any) => (
                      <Button
                        key={e.id}
                        variant="ghost"
                        onClick={() =>
                          act(
                            () =>
                              api("cases/" + caseId + "/attach", {
                                kind: "evidence",
                                id: e.id,
                              }),
                            "Evidence attached",
                          )
                        }
                      >
                        + Evidence {short(e.id)}
                      </Button>
                    ))}
                    {ds.slice(0, 5).map((d: any) => (
                      <Button
                        key={d.id}
                        variant="ghost"
                        onClick={() =>
                          act(
                            () =>
                              api("cases/" + caseId + "/attach", {
                                kind: "detection",
                                id: d.id,
                              }),
                            "Detection attached",
                          )
                        }
                      >
                        + Detection {short(d.id)}
                      </Button>
                    ))}
                  </div>
                  <p className="muted">
                    Attached: {caseDetail.data.endpoints.length} endpoints ·{" "}
                    {caseDetail.data.evidence.length} evidence ·{" "}
                    {caseDetail.data.detections.length} detections
                  </p>
                  <form
                    className="inline-form"
                    onSubmit={(e) =>
                      formSubmit(
                        e,
                        (d) => api("cases/" + caseId + "/notes", d),
                        "Note saved",
                      )
                    }
                  >
                    <textarea
                      name="body"
                      aria-label="Investigator note"
                      placeholder="Record your reasoning and next steps…"
                      required
                    />
                    <Button variant="outline">Save note</Button>
                  </form>
                  {caseDetail.data.notes.map((n: any) => (
                    <blockquote key={n.id}>
                      {n.body}
                      <small>{time(n.created_at)}</small>
                    </blockquote>
                  ))}
                </section>
              )}
            </>
          )}
          {page === "Timeline" && (
            <>
              {heading(
                "Incident timeline",
                "Observation times are collection timestamps. They do not imply when a process or connection first started.",
              )}
              <div className="toolbar">
                <SelectEndpoint
                  endpoints={es}
                  value={endpoint}
                  onChange={setEndpoint}
                />
                <select
                  aria-label="Timeline category"
                  value={obsKind}
                  onChange={(e) => setObsKind(e.target.value)}
                >
                  <option value="">All categories</option>
                  {[
                    "process",
                    "network",
                    "system",
                    "file",
                    "persistence",
                    "driver",
                    "event",
                    "finding",
                  ].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <span className="muted">Latest 500 observations</span>
              </div>
              <section className="panel timeline-list">
                {timeline.error ? (
                  <div className="error">{String(timeline.error)}</div>
                ) : (timeline.data || []).length ? (
                  (timeline.data || []).map((t: any) => (
                    <button key={t.id} onClick={() => setDetail(t.observation)}>
                      <time>{new Date(t.timestamp).toLocaleTimeString()}</time>
                      <i />
                      <div>
                        <Badge value={t.observation.kind} />
                        <b>
                          {t.observation.data.name ||
                            t.observation.data.hostname ||
                            t.observation.data.remote_ip ||
                            t.observation.source}
                        </b>
                        <small>
                          {t.event_type} · OBS {short(t.observation_id)} ·{" "}
                          {t.observation.collector}
                        </small>
                      </div>
                      <ChevronRight size={16} />
                    </button>
                  ))
                ) : (
                  <Empty>Run a collection to populate the timeline.</Empty>
                )}
              </section>
            </>
          )}
          {page === "Indicators" && (
            <>
              {heading(
                "Indicators of compromise",
                "Match known IPs, domains, filenames, paths, and SHA-256 hashes against collected data.",
                <Button
                  onClick={() =>
                    act(async () => {
                      const r = await api("indicators/hunt", {});
                      setDetail(r);
                      return r;
                    }, "Stored-observation IOC hunt completed")
                  }
                >
                  <Target size={16} /> Hunt stored observations
                </Button>,
              )}
              <form
                className="panel padded stacked-form"
                onSubmit={(e) =>
                  formSubmit(
                    e,
                    (d) => api("indicators", d),
                    "Indicator added. Run a hunt to match existing data.",
                  )
                }
              >
                <div className="inline-form">
                  <select name="type" aria-label="Indicator type">
                    {["ip", "domain", "hash", "filename", "path"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    name="value"
                    placeholder="Indicator value"
                    aria-label="Indicator value"
                    required
                  />
                  <select name="severity" aria-label="Indicator severity">
                    <option>high</option>
                    <option>critical</option>
                    <option>medium</option>
                    <option>low</option>
                  </select>
                </div>
                <div className="inline-form">
                  <input
                    name="description"
                    aria-label="Indicator description"
                    placeholder="Description and context"
                  />
                  <input
                    name="source"
                    aria-label="Indicator source"
                    placeholder="Source (e.g. analyst investigation)"
                    defaultValue="Analyst"
                  />
                  <Button disabled={busy}>Add indicator</Button>
                </div>
              </form>
              <section className="panel">
                <DataTable
                  rows={indicators.data || []}
                  columns={[
                    ["TYPE", (i) => <Badge value={i.type} />],
                    ["VALUE", (i) => <code>{i.value}</code>],
                    ["SEVERITY", (i) => <Badge value={i.severity} />],
                    ["SOURCE", (i) => i.source],
                    ["DESCRIPTION", (i) => i.description],
                  ]}
                  onRow={setDetail}
                />
              </section>
            </>
          )}
          {page === "Evidence" && (
            <>
              {heading(
                "Evidence vault",
                "Original collection results, cryptographic fingerprints, and a traceable chain of custody.",
              )}
              <section className="panel">
                <DataTable
                  rows={ev}
                  columns={[
                    [
                      "EVIDENCE",
                      (e) => (
                        <button
                          className="text-button mono"
                          onClick={() => setDetail(e)}
                        >
                          {short(e.id)}
                        </button>
                      ),
                    ],
                    ["COLLECTOR", (e) => <b>{e.collector}</b>],
                    [
                      "SHA-256",
                      (e) => (
                        <code title={e.sha256}>{e.sha256.slice(0, 20)}…</code>
                      ),
                    ],
                    ["SIZE", (e) => (e.size / 1024).toFixed(1) + " KB"],
                    ["INTEGRITY", (e) => <Badge value={e.integrity} />],
                    [
                      "ACTIONS",
                      (e) => (
                        <div className="actions">
                          <Button
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              act(
                                () => api("evidence/" + e.id + "/verify", {}),
                                "Integrity check completed",
                              )
                            }
                          >
                            Verify
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              act(async () => {
                                const r = await api(
                                  "evidence/" + e.id + "/custody",
                                );
                                setDetail(r);
                                return r;
                              })
                            }
                          >
                            Custody
                          </Button>
                          <a
                            className="icon-button"
                            title="Download evidence"
                            href={"/api/evidence/" + e.id + "/download"}
                          >
                            <Download size={16} />
                          </a>
                        </div>
                      ),
                    ],
                  ]}
                />
              </section>
              <div className="info">
                SHA-256 is a file fingerprint. Verify downloads the saved object
                and recomputes its fingerprint. “Unchecked” means no comparison
                has been run yet.
              </div>
            </>
          )}
          {page === "Rules" && (
            <>
              {heading(
                "Detection rules",
                "Native JOCKY rules and a clearly bounded Sigma subset.",
              )}
              <form
                className="panel padded stacked-form"
                onSubmit={(e) =>
                  formSubmit(
                    e,
                    (d) => api("rules", d),
                    "Rule validated and stored",
                  )
                }
              >
                <div className="inline-form">
                  <input
                    name="name"
                    aria-label="Rule name"
                    placeholder="Rule name"
                    required
                  />
                  <select name="format" aria-label="Rule format">
                    <option value="jocky">JOCKY native</option>
                    <option value="sigma">Sigma YAML</option>
                  </select>
                </div>
                <textarea
                  name="source"
                  aria-label="Rule source"
                  rows={6}
                  defaultValue={
                    'rule demo_agent {\n    when: process.name == "jocky-agent"\n    severity: low\n    message: "JOCKY DEMO: agent process observed"\n}'
                  }
                  required
                />
                <div className="actions">
                  <Button disabled={busy}>Validate & save rule</Button>
                  <span className="muted">
                    Native: exact comparisons joined by and. Sigma: exact
                    selection only.
                  </span>
                </div>
              </form>
              <section className="panel">
                <DataTable
                  rows={rules.data || []}
                  columns={[
                    ["RULE", (r) => <b>{r.name}</b>],
                    ["FORMAT", (r) => <Badge value={r.format} />],
                    [
                      "SUPPORT",
                      (r) =>
                        r.compiled.supported
                          ? "Executable"
                          : "Stored · unsupported conversion",
                    ],
                    [
                      "STATUS",
                      (r) => (
                        <Badge value={r.enabled ? "enabled" : "disabled"} />
                      ),
                    ],
                    [
                      "ACTION",
                      (r) => (
                        <div className="actions">
                          <Button variant="ghost" onClick={() => setDetail(r)}>
                            Inspect
                          </Button>
                          <Button
                            variant="outline"
                            disabled={!r.compiled.supported || busy}
                            onClick={() =>
                              act(
                                () => api("rules/" + r.id + "/toggle", {}),
                                "Rule state updated",
                              )
                            }
                          >
                            {r.enabled ? "Disable" : "Enable"}
                          </Button>
                        </div>
                      ),
                    ],
                  ]}
                />
              </section>
            </>
          )}
          {page === "Rules" && (
            <section className="panel padded">
              <h2>YARA evidence scan</h2>
              <p>
                Scan one saved evidence object for a pattern. Rules cannot
                include external files or modules.
              </p>
              {!settings.data?.yara_available ? (
                <div className="info">
                  YARA is not installed on the API host. This feature is
                  disabled; normal detection rules still work.
                </div>
              ) : (
                <form
                  className="stacked-form"
                  onSubmit={(e) =>
                    formSubmit(
                      e,
                      async (d) => {
                        const r = await api("evidence/" + d.id + "/yara", {
                          source: d.source,
                        });
                        setDetail(r);
                        return r;
                      },
                      "YARA scan completed",
                    )
                  }
                >
                  <select name="id" aria-label="YARA evidence" required>
                    <option value="">Select evidence</option>
                    {ev.map((e: any) => (
                      <option key={e.id} value={e.id}>
                        {short(e.id)} · {e.collector}
                      </option>
                    ))}
                  </select>
                  <textarea
                    name="source"
                    aria-label="YARA rule"
                    defaultValue={
                      'rule JockyDemo { strings: $marker = "JOCKY DEMO" condition: $marker }'
                    }
                    required
                  />
                  <Button disabled={busy}>Scan selected evidence</Button>
                </form>
              )}
            </section>
          )}
          {page === "JOCKY Playground" && (
            <>
              {heading(
                "JOCKY Playground",
                "Write a forensic query. Inspect the compiler output. Execute it on an enrolled endpoint.",
              )}
              <div className="toolbar">
                <select
                  aria-label="Example script"
                  onChange={(e) => {
                    setSource(examples[e.target.value]);
                    setCompiler(null);
                  }}
                >
                  {Object.keys(examples).map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <SelectEndpoint
                  endpoints={es}
                  value={endpoint}
                  onChange={setEndpoint}
                  all
                />
                <Button
                  disabled={busy || !endpoint}
                  onClick={() => scan("script")}
                >
                  <Play size={15} /> Run on endpoint
                </Button>
              </div>
              <section className="panel editor-panel">
                <div className="panel-head">
                  <span className="mono cyan">investigation.jky</span>
                  <span className="muted">Safe forensic built-ins only</span>
                </div>
                <Editor value={source} onChange={setSource} />
                <div className="panel-foot actions">
                  {["check", "ast", "tokens", "fmt"].map((m) => (
                    <Button
                      variant="outline"
                      key={m}
                      disabled={busy}
                      onClick={() =>
                        act(async () => {
                          const r = await api("compiler/" + m, { source });
                          if (m === "fmt") setSource(r.result);
                          setCompiler(r);
                          return r;
                        })
                      }
                    >
                      {m === "check"
                        ? "Validate"
                        : m === "fmt"
                          ? "Format"
                          : m.toUpperCase()}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    onClick={() =>
                      act(
                        () => api("scripts", { name: "Investigation", source }),
                        "New script version saved",
                      )
                    }
                  >
                    Save version
                  </Button>
                </div>
              </section>
              {compiler && (
                <section className="panel padded">
                  <h2>Compiler output</h2>
                  <pre className="output">{pretty(compiler)}</pre>
                </section>
              )}
              <div className="info">
                Run creates a real agent job. Open Investigations → finding to
                read the returned reports and alerts. Validation never executes
                your script.
              </div>
            </>
          )}
          {page === "Compiler Lab" && (
            <>
              {heading(
                "Compiler research lab",
                "Compare two serializations of the same parsed program. This experiment does not generate native binaries.",
              )}
              <section className="panel padded">
                <h2>AST serialization experiment</h2>
                <p>
                  Build A uses readable indentation. Build B uses compact JSON.
                  Their byte hashes differ, while deserializing them gives the
                  same syntax tree.
                </p>
                <Editor value={source} onChange={setSource} />
                <Button
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      const r = await api("compiler-lab", { source });
                      setCompiler(r);
                      return r;
                    })
                  }
                >
                  <FlaskConical size={16} /> Compare representations
                </Button>
              </section>
              {compiler?.source_hash && (
                <section className="panel padded">
                  <Badge value={compiler.equivalent ? "pass" : "failed"} />
                  <h3>Structural equivalence</h3>
                  <label>
                    Build A SHA-256
                    <code className="hash">{compiler.source_hash}</code>
                  </label>
                  <label>
                    Build B SHA-256
                    <code className="hash">{compiler.alternate_hash}</code>
                  </label>
                  <p>{compiler.details.scope}</p>
                  <details>
                    <summary>Inspect generated representations</summary>
                    <pre className="output">{pretty(compiler)}</pre>
                  </details>
                </section>
              )}
            </>
          )}
          {page === "AI Investigator" && (
            <>
              {heading(
                "AI Investigator",
                "Evidence-grounded assistance. Findings remain subject to investigator review.",
              )}
              <section className="panel padded">
                {!settings.data?.ai_enabled ? (
                  <div className="disabled-feature">
                    <Terminal size={38} />
                    <h2>Connect an AI provider</h2>
                    <p>
                      AI is currently disabled. Configure{" "}
                      <code>AI_PROVIDER=ollama</code> and a local model, or
                      explicitly configure an OpenAI-compatible service in{" "}
                      <code>.env</code>, then restart the API.
                    </p>
                    <p>
                      With a local model, investigation context stays on your
                      machine. A cloud provider receives the selected
                      observation context.
                    </p>
                    <Badge value="disabled" />
                  </div>
                ) : (
                  <form
                    className="stacked-form"
                    onSubmit={(e) =>
                      formSubmit(
                        e,
                        async (d) => {
                          const r = await api("ai/investigate", {
                            question: d.question,
                            endpoint_id: endpoint,
                            generate_script: d.generate_script === "on",
                          });
                          setCompiler(r);
                          return r;
                        },
                        "AI answer received; review its evidence references",
                      )
                    }
                  >
                    <SelectEndpoint
                      endpoints={es}
                      value={endpoint}
                      onChange={setEndpoint}
                    />
                    <textarea
                      name="question"
                      aria-label="Investigation question"
                      placeholder="What do these observations tell us?"
                      required
                    />
                    <label className="checkbox">
                      <input type="checkbox" name="generate_script" /> Propose a
                      JOCKY script (manual Run required)
                    </label>
                    <Button disabled={busy || !endpoint}>
                      Ask investigator
                    </Button>
                  </form>
                )}
              </section>
              {compiler?.answer && (
                <section className="panel padded">
                  <p>{compiler.answer}</p>
                  <pre className="output">{pretty(compiler.references)}</pre>
                  {compiler.script && (
                    <>
                      <pre className="output">{compiler.script}</pre>
                      <Button
                        onClick={() => {
                          setSource(compiler.script);
                          setPage("JOCKY Playground");
                        }}
                      >
                        Review in Playground
                      </Button>
                    </>
                  )}
                  <p className="muted">{compiler.notice}</p>
                </section>
              )}
            </>
          )}
          {page === "Reports" && (
            <>
              {heading(
                "Investigation reports",
                "Generate a report from a case. Open the HTML report, or use browser Print → Save as PDF.",
              )}
              <section className="panel padded">
                <div className="toolbar">
                  <select
                    aria-label="Report case"
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                  >
                    <option value="">Choose a case</option>
                    {cs.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <Button
                    disabled={!caseId || busy}
                    onClick={() =>
                      act(
                        () => api("cases/" + caseId + "/report", {}),
                        "Report generated",
                      )
                    }
                  >
                    Generate report
                  </Button>
                </div>
              </section>
              <section className="panel">
                <DataTable
                  rows={reports.data || []}
                  columns={[
                    ["REPORT", (r) => <code>{short(r.id)}</code>],
                    [
                      "CASE",
                      (r) =>
                        cs.find((c: any) => c.id === r.case_id)?.title ||
                        short(r.case_id),
                    ],
                    ["CREATED", (r) => time(r.created_at)],
                    ["SHA-256", (r) => <code>{r.sha256.slice(0, 18)}…</code>],
                    [
                      "ACTION",
                      (r) => (
                        <a
                          className="button outline"
                          href={"/api/reports/" + r.id + "/html"}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open report <ArrowUpRight size={14} />
                        </a>
                      ),
                    ],
                  ]}
                />
              </section>
            </>
          )}
          {page === "Audit Logs" && (
            <>
              {heading(
                "Audit logs",
                "Security-sensitive actions recorded in an append-only database trail.",
              )}
              <div className="toolbar">
                <Search size={16} />
                <input
                  aria-label="Search audit events"
                  placeholder="Search action, actor, resource…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <section className="panel">
                <DataTable
                  rows={filtered(audit.data || [])}
                  columns={[
                    [
                      "TIME",
                      (a) => <span className="mono">{time(a.created_at)}</span>,
                    ],
                    ["ACTION", (a) => <Badge value={a.action} />],
                    ["ACTOR", (a) => <code>{short(a.actor)}</code>],
                    ["RESOURCE", (a) => <code>{short(a.resource)}</code>],
                    [
                      "DETAILS",
                      (a) => (
                        <Button variant="ghost" onClick={() => setDetail(a)}>
                          Inspect
                        </Button>
                      ),
                    ],
                  ]}
                />
              </section>
            </>
          )}
          {page === "Settings" && (
            <>
              {heading(
                "Workspace settings",
                "Service health, security boundaries, and supported capabilities.",
              )}
              <section className="panel padded">
                <h2>Service health</h2>
                <div className="service-grid">
                  {Object.entries(health.data?.services || {}).map(([k, v]) => (
                    <div key={k}>
                      <b>{k.replaceAll("_", " ")}</b>
                      <Badge value={v} />
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel padded">
                <h2>Capabilities & configuration</h2>
                <dl>
                  {Object.entries(settings.data || {}).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k.replaceAll("_", " ")}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              {me.data.role === "Admin" && (
                <form
                  className="panel padded stacked-form"
                  onSubmit={(e) =>
                    formSubmit(
                      e,
                      (d) => api("users", d),
                      "User created with the selected role",
                    )
                  }
                >
                  <h2>Add workspace user</h2>
                  <div className="inline-form">
                    <input
                      name="email"
                      type="email"
                      aria-label="New user email"
                      placeholder="Email"
                      required
                    />
                    <input
                      name="password"
                      type="password"
                      minLength={12}
                      aria-label="New user password"
                      placeholder="Password · 12+ characters"
                      required
                    />
                    <select name="role" aria-label="New user role">
                      {["Viewer", "Analyst", "Investigator", "Admin"].map(
                        (r) => (
                          <option key={r}>{r}</option>
                        ),
                      )}
                    </select>
                    <Button disabled={busy}>Create user</Button>
                  </div>
                </form>
              )}
            </>
          )}
          <footer className="footer">
            <span>
              JOCKY <b>0.1.0</b> <span>/</span> Defensive forensic platform
            </span>
            <span>Provenance first. Every observation has a source.</span>
          </footer>
        </div>
      </main>
      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Record details"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-head">
              <h2>Record details & provenance</h2>
              <Button
                autoFocus
                variant="outline"
                onClick={() => setDetail(null)}
              >
                Close
              </Button>
            </div>
            <p className="muted">
              IDs connect observations, jobs, endpoints, and evidence. Sensitive
              tokens stay in this view.
            </p>
            <pre className="output">{pretty(detail)}</pre>
          </section>
        </div>
      )}
    </div>
  );
}
function ObservationTable({
  result,
  setDetail,
  obsPage,
  setObsPage,
}: {
  result: any;
  setDetail: (v: any) => void;
  obsPage: number;
  setObsPage: (n: number) => void;
}) {
  if (result.isLoading) return <Empty>Loading collected data…</Empty>;
  if (result.error) return <div className="error">{String(result.error)}</div>;
  return (
    <>
      <DataTable
        rows={result.data?.items || []}
        columns={[
          [
            "OBSERVATION",
            (o) => (
              <div>
                <b>
                  {o.data.name ||
                    o.data.hostname ||
                    o.data.remote_ip ||
                    o.data.hunt ||
                    o.kind}
                </b>
                <small className="mono">{short(o.id)}</small>
              </div>
            ),
          ],
          [
            "DETAIL",
            (o) => (
              <span className="truncate mono">
                {o.kind === "process"
                  ? `PID ${o.data.pid} · parent ${o.data.parent?.name || "unknown"}`
                  : o.kind === "network"
                    ? `${o.data.remote_ip}:${o.data.remote_port} · ${o.data.state}`
                    : pretty(o.data).slice(0, 110)}
              </span>
            ),
          ],
          ["SOURCE", (o) => <span className="mono muted">{o.collector}</span>],
          ["COLLECTED", (o) => time(o.collected_at)],
          [
            "ACTION",
            (o) => (
              <Button variant="ghost" onClick={() => setDetail(o)}>
                Inspect
              </Button>
            ),
          ],
        ]}
      />
      <div className="panel-foot">
        <span>
          {result.data?.total || 0} observations · page {obsPage + 1}
        </span>
        <div className="actions">
          <Button
            variant="ghost"
            disabled={obsPage === 0}
            onClick={() => setObsPage(obsPage - 1)}
          >
            Previous
          </Button>
          <Button
            variant="ghost"
            disabled={(obsPage + 1) * 100 >= (result.data?.total || 0)}
            onClick={() => setObsPage(obsPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
export default function Home() {
  return (
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  );
}
