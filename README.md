# CPU Scheduling Lab

This project was reconstructed from the four code batches provided in the conversation.

## Requirements
- Python 3.10+
- Node.js 20.19+
- npm
- MongoDB is only needed for optional saved AI Tutor history; the AI Tutor is disabled in this local setup.

## Start backend (Terminal 1, Windows PowerShell)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```
If PowerShell blocks activation, run `Set-ExecutionPolicy -Scope Process Bypass` in that terminal and activate again.
Check http://localhost:8001/api/

## Start frontend (Terminal 2)
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:3000

## Notes
- `backend/.env.example` is a template. Copy it to `backend/.env` only if you need local MongoDB settings.
- The private Emergent AI integration has been disabled in `backend/server.py`; the AI Tutor is expected not to work outside Emergent.
- Check the `frontend` and `backend` terminals for missing files or dependency errors. This reconstruction has not been run against your machine and may need small fixes.
