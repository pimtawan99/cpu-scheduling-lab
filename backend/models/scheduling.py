from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ProcessInput(BaseModel):
    pid: str = Field(min_length=1, max_length=8)
    arrival_time: int = Field(default=0, ge=0)
    burst_time: int = Field(gt=0)


class GanttSegment(BaseModel):
    pid: str
    start_time: int = Field(ge=0)
    end_time: int = Field(gt=0)


class ProcessResult(BaseModel):
    pid: str
    arrival_time: int
    burst_time: int
    start_time: int
    completion_time: int
    turnaround_time: int
    waiting_time: int
    response_time: int


class SimulationRequest(BaseModel):
    algorithm: Literal["fcfs", "sjf_nonpreemptive", "sjf_preemptive", "rr"]
    processes: list[ProcessInput] = Field(min_length=1, max_length=10)
    quantum: int | None = Field(default=None, gt=0)

    @field_validator("processes")
    @classmethod
    def unique_process_ids(cls, value: list[ProcessInput]) -> list[ProcessInput]:
        ids = [process.pid for process in value]
        if len(ids) != len(set(ids)):
            raise ValueError("Process IDs must be unique")
        return value

    @field_validator("quantum")
    @classmethod
    def quantum_required_for_round_robin(cls, value: int | None, info):
        if info.data.get("algorithm") == "rr" and value is None:
            raise ValueError("Time quantum is required for Round Robin")
        return value


class SimulationResult(BaseModel):
    algorithm: Literal["fcfs", "sjf_nonpreemptive", "sjf_preemptive", "rr"]
    quantum: int | None = None
    processes: list[ProcessResult]
    gantt: list[GanttSegment]
    average_waiting_time: float
    average_turnaround_time: float
    average_response_time: float
    cpu_utilization: float


class CompareRequest(BaseModel):
    processes: list[ProcessInput] = Field(min_length=1, max_length=10)
    quantum: int = Field(default=2, gt=0)


class CompareResponse(BaseModel):
    results: list[SimulationResult]


class AiExplainRequest(BaseModel):
    language: Literal["th", "en"] = "th"
    question: str = Field(default="Explain the result clearly for a student.", max_length=600)
    result: SimulationResult


class AiExplainResponse(BaseModel):
    explanation: str
    created_at: str