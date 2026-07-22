export async function onRequest() {
  return json({
    api_connected: Boolean(process.env.LLM_API_KEY),
    model: clean(process.env.LLM_MODEL) || "meta/llama-3.1-8b-instruct",
    search_enabled: false,
  });
}

function clean(value) {
  return String(value || "").trim().replace(/^\uFEFF/, "");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
}
