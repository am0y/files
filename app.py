from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

# Create directory for static files
static_dir = Path(__file__).parent / "static"
os.makedirs(static_dir, exist_ok=True)

app = FastAPI(
    title="Files",
    description="A file uploading and sharing service.",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/", response_class=HTMLResponse)
async def root():
    html_file = Path("static/index.html")
    return html_file.read_text()

@app.get("/terms", response_class=HTMLResponse)
async def terms():
    html_file = Path("static/terms.html")
    return html_file.read_text()

if __name__ == "__main__":
    print("File Upload App is running at http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
