import uuid
from datetime import datetime, timezone

import requests
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from db import db
from services.storage import APP_NAME, get_object, put_object

router = APIRouter()

# ---- Photo upload / serve ---------------------------------------------------
MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp",
}


@router.post("/upload")
async def upload_photo(file: UploadFile = File(...)):
    ext = (file.filename or "bin").rsplit(".", 1)[-1].lower()
    content_type = MIME_TYPES.get(ext, file.content_type or "application/octet-stream")
    path = f"{APP_NAME}/photos/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, content_type)
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size"),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": result["path"]}


@router.get("/photos/{path:path}")
async def get_photo(path: str):
    try:
        data, content_type = get_object(path)
    except requests.HTTPError as e:
        raise HTTPException(status_code=404, detail="File not found") from e
    return Response(content=data, media_type=content_type)
