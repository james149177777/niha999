import json
import os
import sys
from pathlib import Path

from flask import Flask, Response, jsonify, request, send_file


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

def clean_env(name, default=""):
    value = os.environ.get(name, default).strip().lstrip("\ufeff")
    os.environ[name] = value
    return value


clean_env("LLM_BASE_URL", "https://integrate.api.nvidia.com/v1")
clean_env("LLM_MODEL", "meta/llama-3.1-8b-instruct")
clean_env("ENABLE_SEARCH", "0")
clean_env("KB_MAX_CHARS", "1200")
clean_env("LLM_MAX_TOKENS", "220")

from agent import TCMAdvisor  # noqa: E402


app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/api/status", methods=["OPTIONS"])
@app.route("/api/chat", methods=["OPTIONS"])
def options():
    return Response(status=204)


@app.get("/")
def home():
    return send_file(ROOT / "index.html")


@app.get("/api/status")
def status():
    return jsonify(
        {
            "model": clean_env("LLM_MODEL", "meta/llama-3.1-8b-instruct"),
            "search_enabled": clean_env("ENABLE_SEARCH", "0") != "0",
            "api_connected": bool(clean_env("LLM_API_KEY")),
        }
    )


@app.post("/api/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    message = (payload.get("message") or "").strip()
    if not message:
        return sse({"error": "empty message"})

    try:
        reply = TCMAdvisor().chat(message)
        return sse({"token": reply})
    except Exception as error:
        return sse({"error": str(error)})


def sse(data):
    body = f"data: {json.dumps(data, ensure_ascii=False)}\n\ndata: [DONE]\n\n"
    return Response(body, mimetype="text/event-stream")
