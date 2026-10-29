from collections import deque
from typing import Callable

from fastapi import APIRouter, HTTPException

from models.scheduling import (
    CompareRequest,
    CompareResponse,
    GanttSegment,
    ProcessInput,
    ProcessResult,
    SimulationRequest,
    SimulationResult,
)

router = APIRouter()


def _append_segment(segments: list[GanttSegment], pid: str, start: int, end: int) -> None:
    if end <= start:
        return
    if segments and segments[-1].pid == pid and segments[-1].end_time == start:
        segments[-1].end_time = end
    else:
        segments.append(GanttSegment(pid=pid, start_time=start, end_time=end))


def _build_result(
    algorithm: str,
    processes: list[ProcessInput],
    starts: dict[str, int],
    completions: dict[str, int],
    segments: list[GanttSegment],
    quantum: int | None = None,
) -> SimulationResult:
    results: list[ProcessResult] = []
    for process in processes:
        completion = completions[process.pid]
        start = starts[process.pid]
        turnaround = completion - process.arrival_time
        waiting = turnaround - process.burst_time
        results.append(
            ProcessResult(
                pid=process.pid,
                arrival_time=process.arrival_time,
                burst_time=process.burst_time,
                start_time=start,
                completion_time=completion,
                turnaround_time=turnaround,
                waiting_time=waiting,
                response_time=start - process.arrival_time,
            )
        )
    total = len(results)
    makespan = max((segment.end_time for segment in segments), default=0)
    busy = sum(segment.end_time - segment.start_time for segment in segments)
    return SimulationResult(
        algorithm=algorithm,
        quantum=quantum,
        processes=results,
        gantt=segments,
        average_waiting_time=round(sum(item.waiting_time for item in results) / total, 2),
        average_turnaround_time=round(sum(item.turnaround_time for item in results) / total, 2),
        average_response_time=round(sum(item.response_time for item in results) / total, 2),
        cpu_utilization=round((busy / makespan) * 100, 2) if makespan else 0,
    )


def _fcfs(processes: list[ProcessInput]) -> tuple[dict[str, int], dict[str, int], list[GanttSegment]]:
    ordered = sorted(processes, key=lambda item: (item.arrival_time, item.pid))
    starts: dict[str, int] = {}
    completions: dict[str, int] = {}
    segments: list[GanttSegment] = []
    clock = 0
    for process in ordered:
        clock = max(clock, process.arrival_time)
        starts[process.pid] = clock
        clock += process.burst_time
        completions[process.pid] = clock
        _append_segment(segments, process.pid, starts[process.pid], clock)
    return starts, completions, segments


def _sjf_nonpreemptive(processes: list[ProcessInput]) -> tuple[dict[str, int], dict[str, int], list[GanttSegment]]:
    pending = set(process.pid for process in processes)
    by_id = {process.pid: process for process in processes}
    starts: dict[str, int] = {}
    completions: dict[str, int] = {}
    segments: list[GanttSegment] = []
    clock = 0
    while pending:
        available = [by_id[pid] for pid in pending if by_id[pid].arrival_time <= clock]
        if not available:
            clock = min(by_id[pid].arrival_time for pid in pending)
            continue
        process = min(available, key=lambda item: (item.burst_time, item.arrival_time, item.pid))
        pending.remove(process.pid)
        starts[process.pid] = clock
        clock += process.burst_time
        completions[process.pid] = clock
        _append_segment(segments, process.pid, starts[process.pid], clock)
    return starts, completions, segments


def _sjf_preemptive(processes: list[ProcessInput]) -> tuple[dict[str, int], dict[str, int], list[GanttSegment]]:
    remaining = {process.pid: process.burst_time for process in processes}
    by_id = {process.pid: process for process in processes}
    starts: dict[str, int] = {}
    completions: dict[str, int] = {}
    segments: list[GanttSegment] = []
    clock = 0
    while len(completions) < len(processes):
        available = [
            process
            for process in processes
            if process.pid not in completions and process.arrival_time <= clock and remaining[process.pid] > 0
        ]
        if not available:
            clock = min(process.arrival_time for process in processes if process.pid not in completions and process.arrival_time > clock)
            continue
        process = min(available, key=lambda item: (remaining[item.pid], item.arrival_time, item.pid))
        starts.setdefault(process.pid, clock)
        _append_segment(segments, process.pid, clock, clock + 1)
        remaining[process.pid] -= 1
        clock += 1
        if remaining[process.pid] == 0:
            completions[process.pid] = clock
    return starts, completions, segments


def _round_robin(processes: list[ProcessInput], quantum: int) -> tuple[dict[str, int], dict[str, int], list[GanttSegment]]:
    ordered = sorted(processes, key=lambda item: (item.arrival_time, item.pid))
    remaining = {process.pid: process.burst_time for process in processes}
    starts: dict[str, int] = {}
    completions: dict[str, int] = {}
    queue: deque[ProcessInput] = deque()
    index = 0
    clock = 0
    segments: list[GanttSegment] = []
    while len(completions) < len(processes):
        while index < len(ordered) and ordered[index].arrival_time <= clock:
            queue.append(ordered[index])
            index += 1
        if not queue:
            clock = ordered[index].arrival_time
            continue
        process = queue.popleft()
        starts.setdefault(process.pid, clock)
        run_for = min(quantum, remaining[process.pid])
        _append_segment(segments, process.pid, clock, clock + run_for)
        clock += run_for
        remaining[process.pid] -= run_for
        while index < len(ordered) and ordered[index].arrival_time <= clock:
            queue.append(ordered[index])
            index += 1
        if remaining[process.pid] == 0:
            completions[process.pid] = clock
        else:
            queue.append(process)
    return starts, completions, segments


def calculate(request: SimulationRequest) -> SimulationResult:
    calculators: dict[str, Callable[..., tuple[dict[str, int], dict[str, int], list[GanttSegment]]]] = {
        "fcfs": _fcfs,
        "sjf_nonpreemptive": _sjf_nonpreemptive,
        "sjf_preemptive": _sjf_preemptive,
        "rr": _round_robin,
    }
    if request.algorithm == "rr":
        starts, completions, segments = calculators[request.algorithm](request.processes, request.quantum or 1)
    else:
        starts, completions, segments = calculators[request.algorithm](request.processes)
    return _build_result(request.algorithm, request.processes, starts, completions, segments, request.quantum)


@router.post("/simulate", response_model=SimulationResult)
async def simulate(request: SimulationRequest) -> SimulationResult:
    try:
        return calculate(request)
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/simulate/compare", response_model=CompareResponse)
async def compare(request: CompareRequest) -> CompareResponse:
    results = [
        calculate(SimulationRequest(algorithm=algorithm, processes=request.processes, quantum=request.quantum if algorithm == "rr" else None))
        for algorithm in ("fcfs", "sjf_nonpreemptive", "sjf_preemptive", "rr")
    ]
    return CompareResponse(results=results)