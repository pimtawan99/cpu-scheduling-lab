export type Algorithm = "fcfs" | "sjf_nonpreemptive" | "sjf_preemptive" | "rr";
export type Language = "th" | "en";

export interface ProcessInput {
  pid: string;
  arrival_time: number;
  burst_time: number;
}

export interface GanttSegment {
  pid: string;
  start_time: number;
  end_time: number;
}

export interface ProcessResult {
  pid: string;
  arrival_time: number;
  burst_time: number;
  start_time: number;
  completion_time: number;
  turnaround_time: number;
  waiting_time: number;
  response_time: number;
}

export interface SimulationResult {
  algorithm: Algorithm;
  quantum: number | null;
  processes: ProcessResult[];
  gantt: GanttSegment[];
  average_waiting_time: number;
  average_turnaround_time: number;
  average_response_time: number;
  cpu_utilization: number;
}

export interface SimulationRequest {
  algorithm: Algorithm;
  processes: ProcessInput[];
  quantum: number | null;
}

export interface CompareRequest {
  processes: ProcessInput[];
  quantum: number;
}

export interface CompareResponse {
  results: SimulationResult[];
}

export interface AiExplainRequest {
  language: Language;
  question: string;
  result: SimulationResult;
}

export interface AiExplainResponse {
  explanation: string;
  created_at: string;
}