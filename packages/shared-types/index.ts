export type EndpointStatus =
  "online" | "offline" | "busy" | "degraded" | "disabled";
export type JobState =
  "queued" | "dispatched" | "running" | "completed" | "failed" | "cancelled";
export interface Provenance {
  endpoint_id: string;
  job_id: string;
  collector: string;
  collected_at: string;
  source: string;
  agent_version: string;
  sha256: string;
}
export interface ForensicObservation extends Provenance {
  id: string;
  kind:
    | "process"
    | "network"
    | "file"
    | "system"
    | "persistence"
    | "driver"
    | "event"
    | "finding"
    | "user";
  data: Record<string, unknown>;
}
