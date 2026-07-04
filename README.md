# OpsPilot AI

OpsPilot AI is a full-stack Meeting-to-Execution Intelligence Platform that converts technical meeting notes into structured execution artifacts such as decisions, action items, risks, runbook steps, stakeholder summaries, and audit history.

## Project Overview

OpsPilot AI helps engineering, DevOps, product, and operations teams convert meeting discussions into execution-ready workflows.

Users can paste meeting notes or use live microphone capture, then generate a structured execution plan through a modern dashboard interface.

## Key Features

- Modern dashboard UI
- Meeting transcript input
- Live microphone capture
- Decision extraction
- Action item generation
- Execution board with task status updates
- Risk register
- Technical runbook generation
- Stakeholder summaries
- Audit trail
- FastAPI backend APIs
- Local JSON storage
- Progressive Web App support
- Custom app icon
- Installable desktop app experience

## Tech Stack

### Backend
- Python
- FastAPI
- Pydantic
- Uvicorn
- JSON file storage

### Frontend
- HTML
- CSS
- JavaScript

### PWA
- Web Manifest
- Service Worker
- Custom PNG app icons

## How to Run Locally

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload