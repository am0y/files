<<<<<<< HEAD
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import HTMLResponse, Response
=======
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
>>>>>>> ebde854573f81887de19b4d4bbf18d1e27a37a7a
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
<<<<<<< HEAD
import httpx
=======
>>>>>>> ebde854573f81887de19b4d4bbf18d1e27a37a7a

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

<<<<<<< HEAD

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    upload_url = "https://cdn2.verm.dev/v1/upload"
    async with httpx.AsyncClient(timeout=None) as client:
        try:
            files_to_upload = {'file': (file.filename, file.file, file.content_type)}
            resp = await client.post(upload_url, files=files_to_upload)
            return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get('content-type'))
        except httpx.RequestError as exc:
            return Response(content=f"Error connecting to upload service: {exc}", status_code=503)


=======
>>>>>>> ebde854573f81887de19b4d4bbf18d1e27a37a7a
if __name__ == "__main__":
    print("File Upload App is running at http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
