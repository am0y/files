from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import httpx
import re
import logging
import asyncio
import math
from urllib.parse import quote

# Configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
GCS_BASE_URL = "https://storage.googleapis.com/isolate-dev-hot-rooster_toolkit_public_bucket/github_5c6na2onelw04sc0vpxr87z6"
FAL_API_KEY = "91591c58-6a8b-4d9a-8aec-c1d8c01231c1:aba9457f9be6c47134301d2c06289d81"
FAL_UPLOAD_URL = "https://rest.alpha.fal.ai/storage/upload/initiate-multipart?storage_type=gcs"

CHUNK_SIZE = 10 * 1024 * 1024


app = FastAPI(
    title="Files",
    description="A file uploading and sharing service.",
    version="1.0.0"
)

# Mount static files directory
static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=HTMLResponse)
async def root():
    html_file = Path("static/index.html")
    return html_file.read_text()

@app.get("/terms", response_class=HTMLResponse)
async def terms():
    html_file = Path("static/terms.html")
    return html_file.read_text()


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
   """
   Upload a file to fal.ai storage using the correct multipart upload process.
   """
   try:
       upload_data = await initiate_upload(file)
       base_upload_url = upload_data["upload_url"]
       
       part_info = await upload_file_in_parts(file, base_upload_url)
       
       await complete_upload(base_upload_url, part_info)
       
       filename = extract_filename(upload_data["file_url"])
       
       return {
           "url": upload_data["file_url"],
           "filename": filename
       }
       
   except Exception as e:
       logger.error(f"Upload failed: {e}")
       raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")



async def initiate_upload(file: UploadFile) -> dict:
   """
   Informs fal.ai that we are starting a multipart upload.
   Returns the session's base URL and the final file URL.
   """
   payload = {
       "content_type": file.content_type or "application/octet-stream",
       "file_name": file.filename
   }
   headers = {
       "Authorization": f"Key {FAL_API_KEY}",
       "Content-Type": "application/json"
   }
   
   async with httpx.AsyncClient(timeout=60.0) as client:
       response = await client.post(FAL_UPLOAD_URL, headers=headers, json=payload)
       if response.status_code != 200:
           raise Exception(f"Failed to initiate upload: {response.status_code} - {response.text}")
       return response.json()

async def upload_file_in_parts(file: UploadFile, base_upload_url: str) -> list:
    """
    Reads the file in chunks and creates concurrent tasks to upload each part.
    """
    upload_tasks = []
    part_number = 0
    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        part_number += 1
        task = asyncio.create_task(upload_part(base_upload_url, part_number, chunk))
        upload_tasks.append(task)
    
    uploaded_parts = await asyncio.gather(*upload_tasks)
    
    uploaded_parts.sort(key=lambda x: x['part_number'])
    return uploaded_parts

async def upload_part(base_upload_url: str, part_number: int, data: bytes) -> dict:
    """
    Uploads a single chunk (part) of the file.
    This involves first getting a pre-signed URL for the specific part,
    and then PUT-ing the data to that URL.
    """
    async with httpx.AsyncClient(timeout=120.0) as client:
        initiate_part_url = f"{base_upload_url}/{part_number}"
        headers = {"Authorization": f"Key {FAL_API_KEY}"}
        
        init_res = await client.post(initiate_part_url, headers=headers)
        if init_res.status_code != 200:
            raise Exception(f"Failed to get upload URL for part {part_number}: {init_res.text}")
        
        part_upload_url = init_res.json()["upload_url"]

        upload_res = await client.put(part_upload_url, content=data)
        if upload_res.status_code != 200:
            raise Exception(f"Failed to upload part {part_number}: {upload_res.text}")

        etag = upload_res.headers["ETag"].strip('"')
        return {"part_number": part_number, "etag": etag}

async def complete_upload(base_upload_url: str, parts: list):
    """
    Finalizes the upload by telling fal.ai that all parts are uploaded.
    The payload includes the part number and ETag for each uploaded chunk.
    """
    complete_url = f"{base_upload_url}/complete"
    headers = {
       "Authorization": f"Key {FAL_API_KEY}",
       "Content-Type": "application/json"
    }
    payload = {"parts": parts}

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(complete_url, headers=headers, json=payload)
        if response.status_code != 200:
            raise Exception(f"Failed to complete upload: {response.status_code} - {response.text}")

# Helper Functions
def extract_filename(file_url: str) -> str:
   """Extracts the filename from the GCS file URL."""
   match = re.search(r'/([^/]+)$', file_url)
   if not match:
       raise Exception("Could not extract filename from URL")
   return match.group(1)


if __name__ == "__main__":
    # Note: limit_max_request_size requires uvicorn >= 0.15.0
    config = uvicorn.Config(app, host="0.0.0.0", port=3000)
    server = uvicorn.Server(config)
    server.run()


