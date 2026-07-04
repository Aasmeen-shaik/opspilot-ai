from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from datetime import datetime
from typing import List
import json
import re
import uuid


app = FastAPI(
    title="OpsPilot AI API",
    description="Meeting-to-Execution Intelligence Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_FILE = DATA_DIR / "meetings.json"
STATIC_DIR = Path(__file__).resolve().parent / "static"

DATA_DIR.mkdir(exist_ok=True)

if not DATA_FILE.exists():
    DATA_FILE.write_text("[]", encoding="utf-8")


class MeetingRequest(BaseModel):
    title: str
    project: str
    transcript: str


class TaskStatusUpdate(BaseModel):
    status: str


def load_meetings():
    with open(DATA_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def save_meetings(meetings):
    with open(DATA_FILE, "w", encoding="utf-8") as file:
        json.dump(meetings, file, indent=2)


def split_sentences(text: str) -> List[str]:
    text = re.sub(r"\s+", " ", text)
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [sentence.strip() for sentence in sentences if len(sentence.strip()) > 8]


def detect_priority(sentence: str) -> str:
    high_words = ["urgent", "production", "blocked", "failure", "risk", "capacity", "critical", "client"]
    medium_words = ["need", "should", "validate", "test", "manual", "schedule"]

    lower = sentence.lower()

    if any(word in lower for word in high_words):
        return "High"

    if any(word in lower for word in medium_words):
        return "Medium"

    return "Low"


def detect_owner(sentence: str) -> str:
    names = ["Michael", "JC", "Saud", "DevOps", "Engineering", "QA", "Product", "Team"]

    for name in names:
        if name.lower() in sentence.lower():
            return name

    return "Unassigned"


def analyze_transcript(title: str, project: str, transcript: str):
    sentences = split_sentences(transcript)

    decision_keywords = [
        "decided", "agreed", "approved", "finalized", "we will",
        "we should", "plan is", "go with", "moving forward"
    ]

    action_keywords = [
        "need to", "must", "should", "create", "prepare", "validate",
        "implement", "test", "check", "follow up", "automate", "schedule"
    ]

    risk_keywords = [
        "risk", "blocked", "blocker", "issue", "problem", "capacity",
        "failure", "unsupported", "unavailable", "delay", "concern", "downtime"
    ]

    runbook_keywords = [
        "check", "run", "scale", "deploy", "validate", "monitor",
        "restart", "stop", "start", "confirm", "verify"
    ]

    decisions = []
    tasks = []
    risks = []
    runbook_steps = []

    for sentence in sentences:
        lower = sentence.lower()

        if any(keyword in lower for keyword in decision_keywords):
            decisions.append({
                "id": str(uuid.uuid4()),
                "text": sentence
            })

        if any(keyword in lower for keyword in action_keywords):
            tasks.append({
                "id": str(uuid.uuid4()),
                "task": sentence,
                "owner": detect_owner(sentence),
                "priority": detect_priority(sentence),
                "status": "To Do"
            })

        if any(keyword in lower for keyword in risk_keywords):
            risks.append({
                "id": str(uuid.uuid4()),
                "risk": sentence,
                "severity": detect_priority(sentence),
                "impact": "May affect delivery, availability, cost, or execution quality.",
                "mitigation": "Track closely, assign an owner, validate early, and document the resolution."
            })

        if any(keyword in lower for keyword in runbook_keywords):
            runbook_steps.append({
                "id": str(uuid.uuid4()),
                "step": sentence
            })

    if not decisions:
        decisions.append({
            "id": str(uuid.uuid4()),
            "text": "No explicit decision was detected. The team should confirm the final decision."
        })

    if not tasks:
        tasks.append({
            "id": str(uuid.uuid4()),
            "task": "Review the meeting notes and confirm next steps.",
            "owner": "Unassigned",
            "priority": "Medium",
            "status": "To Do"
        })

    if not risks:
        risks.append({
            "id": str(uuid.uuid4()),
            "risk": "No major risk was detected from the meeting notes.",
            "severity": "Low",
            "impact": "Low immediate impact.",
            "mitigation": "Continue monitoring during execution."
        })

    if not runbook_steps:
        runbook_steps.append({
            "id": str(uuid.uuid4()),
            "step": "Review meeting decisions and convert them into execution steps."
        })

    summary = " ".join(sentences[:2])

    technical_summary = (
        f"The meeting for {project} resulted in {len(decisions)} decision(s), "
        f"{len(tasks)} action item(s), {len(risks)} risk(s), and {len(runbook_steps)} runbook step(s). "
        "The platform converted unstructured discussion into structured execution artifacts."
    )

    business_summary = (
        f"{project} has been reviewed and converted into an execution-ready plan. "
        "The team can now track decisions, owners, risks, and next steps from one dashboard."
    )

    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    audit = [
        {"time": current_time, "event": "Meeting submitted"},
        {"time": current_time, "event": "Transcript analyzed"},
        {"time": current_time, "event": "Decisions extracted"},
        {"time": current_time, "event": "Action items generated"},
        {"time": current_time, "event": "Risk register created"},
        {"time": current_time, "event": "Runbook generated"}
    ]

    return {
        "id": str(uuid.uuid4()),
        "title": title,
        "project": project,
        "summary": summary,
        "created_at": current_time,
        "decisions": decisions,
        "tasks": tasks,
        "risks": risks,
        "runbook_steps": runbook_steps,
        "technical_summary": technical_summary,
        "business_summary": business_summary,
        "audit": audit
    }


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def home():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
def health():
    return {
        "service": "OpsPilot AI API",
        "status": "active"
    }


@app.post("/api/meetings/analyze")
def analyze_meeting(request: MeetingRequest):
    meetings = load_meetings()

    meeting = analyze_transcript(
        title=request.title,
        project=request.project,
        transcript=request.transcript
    )

    meetings.insert(0, meeting)
    save_meetings(meetings)

    return meeting


@app.get("/api/meetings")
def get_meetings():
    return load_meetings()


@app.get("/api/meetings/{meeting_id}")
def get_meeting(meeting_id: str):
    meetings = load_meetings()

    for meeting in meetings:
        if meeting["id"] == meeting_id:
            return meeting

    raise HTTPException(status_code=404, detail="Meeting not found")


@app.patch("/api/meetings/{meeting_id}/tasks/{task_id}")
def update_task_status(meeting_id: str, task_id: str, update: TaskStatusUpdate):
    meetings = load_meetings()

    for meeting in meetings:
        if meeting["id"] == meeting_id:
            for task in meeting["tasks"]:
                if task["id"] == task_id:
                    task["status"] = update.status
                    meeting["audit"].append({
                        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "event": f"Task status updated to {update.status}"
                    })
                    save_meetings(meetings)
                    return meeting

    raise HTTPException(status_code=404, detail="Meeting or task not found")