import os
from dotenv import load_dotenv

load_dotenv()

# Use certifi's CA bundle for HTTPS (fixes SSL_CERTIFICATE_VERIFY_FAILED on macOS)
import certifi
if "SSL_CERT_FILE" not in os.environ:
    os.environ["SSL_CERT_FILE"] = certifi.where()
if "REQUESTS_CA_BUNDLE" not in os.environ:
    os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.ws import router as ws_router

app = FastAPI(title="CrowdSynth API", version="1.0.0")

FRONTEND_URL = os.getenv("FRONTEND_URL", "*")
ALLOWED_ORIGINS = [FRONTEND_URL]
if FRONTEND_URL != "*":
    ALLOWED_ORIGINS.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "crowdsynth-backend"}
