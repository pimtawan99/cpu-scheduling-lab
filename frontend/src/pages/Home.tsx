import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpen,
  BrainCircuit,
  Check,
  Clock3,
  Cpu,
  GitCompare,
  Minus,
  Moon,
  Plus,
  Play,
  RefreshCw,
  RotateCcw,
  Shuffle,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiPost } from "@/lib/api";
import type {
  AiExplainRequest,
  AiExplainResponse,
  Algorithm,
  CompareRequest,
  CompareResponse,
  Language,
  ProcessInput,
  SimulationRequest,
  SimulationResult,
} from "@/lib/types";

const PROCESS_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#06B6D4", "#F97316", "#84CC16", "#EF4444", "#14B8A6"];

const algorithmMeta: Record<Algorithm, { th: string; en: string; short: string }> = {
  fcfs: { th: "มาก่อนได้ก่อน", en: "First-Come, First-Served", short: "FCFS" },
  sjf_nonpreemptive: { th: "งานสั้นที่สุดก่อน · ไม่แย่งสิทธิ์", en: "Shortest Job · Non-preemptive", short: "SJF-NP" },
  sjf_preemptive: { th: "งานสั้นที่สุดก่อน · แย่งสิทธิ์", en: "Shortest Remaining Time First", short: "SRTF" },
  rr: { th: "รอบโรบิน", en: "Round Robin", short: "RR" },
};

const copy = {
  th: {
    eyebrow: "ห้องทดลองการจัดตาราง CPU",
    title: "จำลองการทำงานของ CPU Scheduling",
    subtitle: "ทดลอง ปรับค่า และเห็นผลลัพธ์ของแต่ละอัลกอริทึมแบบทันที",
    language: "ไทย",
    english: "EN",
    guide: "คู่มือสั้น",
    processes: "จำนวนโปรเซส",
    addProcess: "เพิ่มโปรเซส",
    removeProcess: "ลบโปรเซส",
    burstInput: "ข้อมูลโปรเซส",
    arrival: "AT · มาถึง",
    burst: "BT · ใช้ CPU",
    random: "สุ่ม Burst Time",
    preset: "ชุดข้อมูลตัวอย่าง",
    balanced: "สมดุล",
    convoy: "Convoy",
    clear: "ล้างค่า",
    algorithm: "อัลกอริทึม",
    quantum: "Time Quantum",
    run: "เริ่มจำลอง",
    compare: "เปรียบเทียบทั้งหมด",
    simulation: "ผลการจำลอง",
    ready: "พร้อมประมวลผล",
    timeline: "Gantt Timeline",
    metrics: "ตารางผลลัพธ์",
    process: "โปรเซส",
    start: "ST",
    complete: "CT",
    turnaround: "TAT",
    waiting: "WT",
    response: "RT",
    averageWait: "AVG WT",
    averageTurn: "AVG TAT",
    utilization: "CPU ใช้งาน",
    aiExplain: "ให้ AI อธิบายผล",
    aiCaption: "AI Tutor · ตรวจสอบความเข้าใจ",
    compareTitle: "เปรียบเทียบประสิทธิภาพ",
    compareCaption: "ชุดข้อมูลเดียวกัน · ค่าเฉลี่ยยิ่งน้อยยิ่งรอคอยสั้น",
    noResult: "ยังไม่มีผลลัพธ์",
    noResultHint: "แก้ค่า Burst Time แล้วกดเริ่มจำลอง",
    guideHint: "ทำความเข้าใจสูตรและหลักการใน 2 นาที",
    footer: "CPU Scheduling Lab · Term Project",
  },
  en: {
    eyebrow: "CPU SCHEDULING LAB",
    title: "CPU Scheduling Simulator",
    subtitle: "Tune the workload, run the queue, and see every timing metric instantly.",
    language: "TH",
    english: "EN",
    guide: "Quick guide",
    processes: "Processes",
    addProcess: "Add process",
    removeProcess: "Remove process",
    burstInput: "Process inputs",
    arrival: "AT · Arrival",
    burst: "BT · Burst",
    random: "Random burst",
    preset: "Presets",
    balanced: "Balanced",
    convoy: "Convoy",
    clear: "Reset",
    algorithm: "Algorithm",
    quantum: "Time Quantum",
    run: "Run simulation",
    compare: "Compare all",
    simulation: "Simulation result",
    ready: "Ready to compute",
    timeline: "Gantt Timeline",
    metrics: "Metrics table",
    process: "Process",
    start: "ST",
    complete: "CT",
    turnaround: "TAT",
    waiting: "WT",
    response: "RT",
    averageWait: "AVG WT",
    averageTurn: "AVG TAT",
    utilization: "CPU busy",
    aiExplain: "Ask AI to explain",
    aiCaption: "AI Tutor · verify your understanding",
    compareTitle: "Performance comparison",
    compareCaption: "Same workload · lower average means less waiting",
    noResult: "No result yet",
    noResultHint: "Tune the burst times and run a simulation",
    guideHint: "Understand the formulas and algorithms in 2 minutes",
    footer: "CPU Scheduling Lab · Term Project",
  },
} as const;

const makeProcesses = (count: number): ProcessInput[] =>
  Array.from({ length: count }, (_, index) => ({
    pid: `P${index + 1}`,
    arrival_time: 0,
    burst_time: [5, 3, 8, 2, 6, 4, 7, 1, 9, 3][index] ?? 4,
  }));

const formatNumber = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2));

export default function Home() {
  const [language, setLanguage] = useState<Language>("th");
  const [darkMode, setDarkMode] = useState(true);
  const [processes, setProcesses] = useState<ProcessInput[]>(makeProcesses(3));
  const [algorithm, setAlgorithm] = useState<Algorithm>("fcfs");
  const [quantum, setQuantum] = useState(2);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const t = copy[language];

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const hasInvalidBurst = processes.some((process) => !Number.isInteger(process.burst_time) || process.burst_time <= 0);
  const hasInvalidArrival = processes.some((process) => !Number.isInteger(process.arrival_time) || process.arrival_time < 0);
  const makespan = result?.gantt[result.gantt.length - 1]?.end_time ?? 0;
  const timelineSegments = useMemo(() => {
    const segments: { pid: string; start_time: number; end_time: number }[] = [];
    let previousEnd = 0;
    for (const segment of result?.gantt ?? []) {
      if (segment.start_time > previousEnd) segments.push({ pid: "IDLE", start_time: previousEnd, end_time: segment.start_time });
      segments.push(segment);
      previousEnd = segment.end_time;
    }
    return segments;
  }, [result]);

  const simulateMutation = useMutation({
    mutationFn: (request: SimulationRequest) => apiPost<SimulationResult>("/simulate", request),
    onSuccess: (data) => {
      setResult(data);
      setAiExplanation(null);
      toast.success(language === "th" ? "จำลองสำเร็จ" : "Simulation complete");
    },
    onError: () => toast.error(language === "th" ? "คำนวณไม่สำเร็จ กรุณาตรวจสอบข้อมูล" : "Could not calculate. Check your inputs."),
  });

  const compareMutation = useMutation({
    mutationFn: (request: CompareRequest) => apiPost<CompareResponse>("/simulate/compare", request),
    onSuccess: (data) => {
      setComparison(data);
      toast.success(language === "th" ? "เปรียบเทียบครบทุกอัลกอริทึม" : "All algorithms compared");
    },
    onError: () => toast.error(language === "th" ? "เปรียบเทียบไม่สำเร็จ" : "Comparison failed"),
  });

  const aiMutation = useMutation({
    mutationFn: (request: AiExplainRequest) => apiPost<AiExplainResponse>("/ai/explain", request),
    onSuccess: (data) => setAiExplanation(data.explanation),
    onError: () => toast.error(language === "th" ? "AI ยังไม่พร้อมใช้งาน ลองใหม่อีกครั้ง" : "AI is unavailable right now. Try again."),
  });

  const addProcess = () => {
    if (processes.length >= 10) {
      toast.info(language === "th" ? "เพิ่มได้สูงสุด 10 โปรเซส" : "You can add up to 10 processes");
      return;
    }
    const nextProcess = makeProcesses(processes.length + 1)[processes.length];
    setProcesses((current) => [...current, nextProcess]);
    setResult(null);
    setComparison(null);
  };

  const removeProcess = () => {
    if (processes.length <= 1) {
      toast.info(language === "th" ? "ต้องมีอย่างน้อย 1 โปรเซส" : "At least 1 process is required");
      return;
    }
    setProcesses((current) => current.slice(0, -1));
    setResult(null);
    setComparison(null);
  };

  const updateField = (index: number, field: "arrival_time" | "burst_time", value: string) => {
    const parsed = value === "" ? (field === "burst_time" ? 0 : -1) : Number(value);
    setProcesses((current) => current.map((process, processIndex) => processIndex === index ? { ...process, [field]: parsed } : process));
  };

  const randomize = () => {
    setProcesses((current) => current.map((process) => ({ ...process, burst_time: Math.floor(Math.random() * 12) + 1 })));
    toast.success(language === "th" ? "สุ่มค่า Burst Time แล้ว" : "Random burst times generated");
  };

  const runSimulation = () => {
    if (hasInvalidArrival) {
      toast.error(language === "th" ? "Arrival Time ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป" : "Arrival Time must be an integer of 0 or more");
      return;
    }
    if (hasInvalidBurst) {
      toast.error(language === "th" ? "Burst Time ต้องเป็นจำนวนเต็มบวก" : "Burst Time must be a positive integer");
      return;
    }
    if (algorithm === "rr" && (!Number.isInteger(quantum) || quantum <= 0)) {
      toast.error(language === "th" ? "Time Quantum ต้องเป็นจำนวนเต็มบวก" : "Time Quantum must be a positive integer");
      return;
    }
    simulateMutation.mutate({ algorithm, processes, quantum: algorithm === "rr" ? quantum : null });
  };

  const compareAll = () => {
    if (hasInvalidBurst || hasInvalidArrival) {
      toast.error(language === "th" ? "ตรวจสอบ Arrival Time และ Burst Time ก่อนเปรียบเทียบ" : "Check Arrival Time and Burst Time before comparing");
      return;
    }
    if (!Number.isInteger(quantum) || quantum <= 0) {
      toast.error(language === "th" ? "Time Quantum ต้องเป็นจำนวนเต็มบวก" : "Time Quantum must be a positive integer");
      return;
    }
    compareMutation.mutate({ processes, quantum });
  };

  const algorithmButtons = useMemo(() => Object.entries(algorithmMeta) as [Algorithm, typeof algorithmMeta[Algorithm]][], []);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3" data-testid="app-header-brand">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_25px_color-mix(in_oklab,var(--primary)_40%,transparent)]"><Cpu size={19} /></div>
            <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-primary">{t.eyebrow}</p><p className="text-sm font-semibold tracking-tight">{t.footer}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/guide" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex sm:items-center sm:gap-2" data-testid="header-guide-link"><BookOpen size={15} />{t.guide}</Link>
            <div className="flex rounded-lg border border-border bg-card p-1" data-testid="language-switcher">
              <button className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${language === "th" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setLanguage("th")} data-testid="language-th-button">{t.language}</button>
              <button className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${language === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setLanguage("en")} data-testid="language-en-button">{t.english}</button>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => setDarkMode((current) => !current)} aria-label="Toggle theme" data-testid="theme-toggle-button">{darkMode ? <Sun size={16} /> : <Moon size={16} />}</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 pb-12 pt-8 lg:px-8 lg:pt-10">
        <div className="mb-8 max-w-4xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><span className="size-2 animate-pulse rounded-full bg-emerald-400" />{language === "th" ? "ระบบพร้อมใช้งาน" : "System online"}</div>
          <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl" data-testid="page-title">{t.title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg" data-testid="page-subtitle">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Card className="border-border/80 bg-card/75 lg:col-span-4" data-testid="process-config-card">
            <CardHeader className="border-b border-border/70 pb-4">
              <div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg">{t.burstInput}</CardTitle><CardDescription className="mt-1">{language === "th" ? "กำหนดเวลามาถึง (AT) และเวลาใช้ CPU (BT) ได้เอง" : "Set each Arrival Time (AT) and Burst Time (BT)"}</CardDescription></div><Badge variant="outline" className="font-mono">AT ≥ 0</Badge></div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="flex items-end justify-between gap-3"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t.processes}</p><p className="font-mono text-sm font-bold text-foreground" data-testid="process-count-display"><span className="text-primary">{processes.length}</span><span className="text-muted-foreground"> / 10</span></p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={removeProcess} disabled={processes.length <= 1} aria-label={t.removeProcess} title={t.removeProcess} data-testid="remove-process-button"><Minus size={15} /></Button><Button variant="outline" size="sm" onClick={addProcess} disabled={processes.length >= 10} className="border-primary/40" data-testid="add-process-button"><Plus size={15} />{t.addProcess}</Button></div></div>
              <div className="overflow-hidden rounded-xl border border-border/70" data-testid="process-input-table">
                <div className="grid grid-cols-[1fr_1.15fr_1.4fr] bg-muted/50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><span>{t.process}</span><span>{t.arrival}</span><span>{t.burst}</span></div>
                {processes.map((process, index) => <div key={process.pid} className="grid grid-cols-[1fr_1.15fr_1.4fr] items-center gap-2 border-t border-border/60 px-3 py-2.5"><div className="flex items-center gap-2 font-mono text-sm font-bold"><span className="size-2 rounded-full" style={{ backgroundColor: PROCESS_COLORS[index] }} />{process.pid}</div><Input type="number" min="0" value={process.arrival_time < 0 ? "" : process.arrival_time} onChange={(event) => updateField(index, "arrival_time", event.target.value)} className="h-8 border-border bg-background/70 font-mono text-sm" aria-label={`${process.pid} arrival time`} data-testid={`process-${index + 1}-arrival-input`} /><Input type="number" min="1" value={process.burst_time || ""} onChange={(event) => updateField(index, "burst_time", event.target.value)} className="h-8 border-border bg-background/70 font-mono text-sm" aria-label={`${process.pid} burst time`} data-testid={`process-${index + 1}-burst-input`} /> </div>)}
              </div>
              <Button variant="outline" size="sm" onClick={randomize} className="w-full" data-testid="random-burst-button"><Shuffle size={14} />{t.random}</Button>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/75 lg:col-span-8" data-testid="algorithm-control-card">
            <CardHeader className="border-b border-border/70 pb-4"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg">{t.algorithm}</CardTitle><CardDescription className="mt-1">{language === "th" ? "เลือกวิธีจัดคิวก่อนเริ่มคำนวณ" : "Choose a queue policy before computing"}</CardDescription></div><div className="hidden items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground sm:flex"><Clock3 size={14} className="text-primary" />{result ? `${makespan} ms` : t.ready}</div></div></CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="algorithm-selector">{algorithmButtons.map(([key, meta]) => <button key={key} onClick={() => setAlgorithm(key)} className={`group rounded-xl border p-3 text-left transition-transform hover:-translate-y-0.5 ${algorithm === key ? "border-primary bg-primary/10 shadow-[0_0_20px_color-mix(in_oklab,var(--primary)_15%,transparent)]" : "border-border bg-background/30 hover:border-primary/50"}`} data-testid={`algorithm-${key}-button`}><div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-primary">{meta.short}</span>{algorithm === key && <Check size={15} className="text-primary" />}</div><p className="mt-2 text-sm font-semibold">{language === "th" ? meta.th : meta.en}</p></button>)}</div>
              <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-end sm:justify-between"><div className="w-full max-w-[180px]"><label className={`mb-2 block text-xs font-semibold uppercase tracking-wider ${algorithm === "rr" ? "text-foreground" : "text-muted-foreground"}`}>{t.quantum}</label><Input type="number" min="1" value={quantum} onChange={(event) => setQuantum(Number(event.target.value))} disabled={algorithm !== "rr"} className="border-border bg-background/70 font-mono" data-testid="time-quantum-input" /></div><div className="flex w-full gap-2 sm:w-auto"><Button onClick={runSimulation} disabled={simulateMutation.isPending} className="flex-1 sm:min-w-44" data-testid="run-simulation-button"><Play size={15} fill="currentColor" />{simulateMutation.isPending ? (language === "th" ? "กำลังคำนวณ..." : "Computing...") : t.run}</Button><Button variant="outline" onClick={compareAll} disabled={compareMutation.isPending} className="flex-1 sm:flex-none" data-testid="compare-algorithms-button"><GitCompare size={15} />{t.compare}</Button></div></div>
            </CardContent>
          </Card>

          <Card className="min-h-[250px] border-border/80 bg-card/75 lg:col-span-8" data-testid="result-card">
            <CardHeader className="flex-row items-start justify-between border-b border-border/70 pb-4"><div><CardTitle className="text-lg">{t.simulation}</CardTitle><CardDescription className="mt-1">{result ? `${algorithmMeta[result.algorithm][language]}${result.quantum ? ` · Q=${result.quantum}` : ""}` : t.noResultHint}</CardDescription></div>{result && <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15"><Zap size={13} />{language === "th" ? "คำนวณแล้ว" : "Computed"}</Badge>}</CardHeader>
            <CardContent className="pt-5">{result ? <div className="space-y-6"><div><div className="mb-3 flex items-center justify-between"><p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{t.timeline}</p><span className="font-mono text-xs text-muted-foreground">0 — {makespan}</span></div><div className="flex min-h-14 overflow-hidden rounded-xl border border-border/70 bg-background/60" data-testid="gantt-timeline">{timelineSegments.map((segment, index) => <div key={`${segment.pid}-${segment.start_time}`} title={`${segment.pid}: ${segment.start_time} → ${segment.end_time}`} className={`flex min-w-12 flex-1 flex-col justify-center border-r border-black/20 px-2 text-center transition-transform hover:z-10 hover:scale-y-110 ${segment.pid === "IDLE" ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,0.06)_6px,rgba(255,255,255,0.06)_12px)] text-muted-foreground" : "text-white"}`} style={{ backgroundColor: segment.pid === "IDLE" ? undefined : PROCESS_COLORS[Math.max(processes.findIndex((item) => item.pid === segment.pid), 0) % PROCESS_COLORS.length], flexGrow: Math.max(segment.end_time - segment.start_time, 1) }} data-testid={`gantt-segment-${index + 1}`}><span className="font-mono text-sm font-extrabold">{segment.pid}</span><span className="font-mono text-[10px] opacity-80">{segment.start_time} → {segment.end_time}</span></div>)}</div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="summary-metrics"><Metric label={t.averageWait} value={result.average_waiting_time} accent="text-amber-400" /><Metric label={t.averageTurn} value={result.average_turnaround_time} accent="text-cyan-400" /><Metric label={t.utilization} value={`${result.cpu_utilization}%`} accent="text-emerald-400" /><Metric label={t.response} value={result.average_response_time} accent="text-violet-400" /></div></div> : <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/25 text-center" data-testid="empty-result-state"><div className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><Cpu size={21} /></div><p className="font-semibold">{t.noResult}</p><p className="mt-1 text-sm text-muted-foreground">{t.noResultHint}</p></div>}</CardContent>
          </Card>

          <Card className="border-border/80 bg-card/75 lg:col-span-4" data-testid="ai-tutor-card"><CardHeader className="border-b border-border/70 pb-4"><div className="flex items-start gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400"><BrainCircuit size={18} /></div><div><CardTitle className="text-lg">{t.aiCaption}</CardTitle><CardDescription className="mt-1">{language === "th" ? "ขอคำอธิบายโดยยึดตัวเลขจริงจากผลจำลอง" : "Get a grounded explanation from the exact result"}</CardDescription></div></div></CardHeader><CardContent className="pt-5"><Button variant="outline" className="w-full" disabled={!result || aiMutation.isPending} onClick={() => result && aiMutation.mutate({ language, question: language === "th" ? "ช่วยอธิบายว่าทำไมลำดับนี้จึงเกิดขึ้น" : "Why did this execution order happen?", result })} data-testid="ai-explain-button"><Sparkles size={15} />{aiMutation.isPending ? (language === "th" ? "กำลังถาม AI..." : "Asking AI...") : t.aiExplain}</Button>{aiExplanation && <div className="mt-4 rounded-xl border border-violet-500/25 bg-violet-500/5 p-4 text-sm leading-6 text-muted-foreground" data-testid="ai-explanation"><p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400">AI INSIGHT</p>{aiExplanation}</div>}<div className="mt-5 rounded-xl bg-muted/40 p-3 text-xs leading-5 text-muted-foreground"><AlertTriangle size={14} className="mb-1 text-amber-400" />{language === "th" ? "AI เป็นผู้ช่วยอธิบาย ไม่ใช่แหล่งคำนวณ ผลลัพธ์หลักคำนวณโดยระบบ" : "AI explains the result; it does not calculate it. Core metrics are deterministic."}</div></CardContent></Card>

          <Card className="border-border/80 bg-card/75 lg:col-span-12" data-testid="metrics-table-card"><CardHeader className="flex-row items-start justify-between border-b border-border/70 pb-4"><div><CardTitle className="text-lg">{t.metrics}</CardTitle><CardDescription className="mt-1">{language === "th" ? "สูตร: TAT = CT − AT · WT = TAT − BT" : "Formula: TAT = CT − AT · WT = TAT − BT"}</CardDescription></div><Button variant="ghost" size="icon-sm" onClick={() => { setResult(null); setComparison(null); setAiExplanation(null); }} aria-label={t.clear} data-testid="reset-results-button"><RotateCcw size={15} /></Button></CardHeader><CardContent className="pt-5"><div className="overflow-x-auto">{result ? <table className="w-full min-w-[720px] text-left" data-testid="metrics-table"><thead><tr className="border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><th className="px-3 pb-3">{t.process}</th><th className="px-3 pb-3">AT</th><th className="px-3 pb-3">BT</th><th className="px-3 pb-3">{t.start}</th><th className="px-3 pb-3">{t.complete}</th><th className="px-3 pb-3">{t.turnaround}</th><th className="px-3 pb-3">{t.waiting}</th><th className="px-3 pb-3">{t.response}</th></tr></thead><tbody>{result.processes.map((process, index) => <tr key={process.pid} className="border-b border-border/50 text-sm last:border-0"><td className="px-3 py-3 font-mono font-bold"><span className="mr-2 inline-block size-2 rounded-full" style={{ backgroundColor: PROCESS_COLORS[index] }} />{process.pid}</td><td className="px-3 py-3 font-mono text-muted-foreground">{process.arrival_time}</td><td className="px-3 py-3 font-mono">{process.burst_time}</td><td className="px-3 py-3 font-mono text-primary">{process.start_time}</td><td className="px-3 py-3 font-mono">{process.completion_time}</td><td className="px-3 py-3 font-mono text-cyan-400">{process.turnaround_time}</td><td className="px-3 py-3 font-mono text-amber-400">{process.waiting_time}</td><td className="px-3 py-3 font-mono text-violet-400">{process.response_time}</td></tr>)}</tbody></table> : <div className="py-8 text-center text-sm text-muted-foreground">{t.noResultHint}</div>}</div></CardContent></Card>

          {comparison && <Card className="border-border/80 bg-card/75 lg:col-span-12" data-testid="comparison-card"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><GitCompare size={18} className="text-primary" />{t.compareTitle}</CardTitle><CardDescription>{t.compareCaption}</CardDescription></CardHeader><CardContent><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{comparison.results.map((item) => { const winner = item.average_waiting_time === Math.min(...comparison.results.map((entry) => entry.average_waiting_time)); return <div key={item.algorithm} className={`rounded-xl border p-4 ${winner ? "border-emerald-400/50 bg-emerald-400/5" : "border-border bg-background/30"}`} data-testid={`comparison-${item.algorithm}`}><div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-primary">{algorithmMeta[item.algorithm].short}</span>{winner && <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15"><Check size={12} />BEST WT</Badge>}</div><p className="mt-2 text-sm font-semibold">{algorithmMeta[item.algorithm][language]}</p><div className="mt-4 grid grid-cols-2 gap-3"><Metric label={t.averageWait} value={item.average_waiting_time} compact /><Metric label={t.averageTurn} value={item.average_turnaround_time} compact /></div></div> })}</div></CardContent></Card>}
        </div>
        <footer className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center"><span>{t.footer}</span><Link to="/guide" className="flex items-center gap-1.5 text-primary transition-colors hover:text-foreground" data-testid="footer-guide-link"><BookOpen size={13} />{t.guide}</Link></footer>
      </main>
    </div>
  );
}

function Metric({ label, value, accent = "text-foreground", compact = false }: { label: string; value: number | string; accent?: string; compact?: boolean }) {
  return <div className={`rounded-xl border border-border/60 bg-background/35 ${compact ? "p-2" : "p-3"}`} data-testid={`metric-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className={`mt-1 font-mono font-bold tracking-tight ${compact ? "text-lg" : "text-xl"} ${accent}`}>{typeof value === "number" ? formatNumber(value) : value}</p></div>;
}