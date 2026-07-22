export async function onRequest({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== "POST") {
    return sse({ error: "method not allowed" }, 405);
  }

  const body = await request.json().catch(() => ({}));
  const message = String(body.message || "").trim();
  if (!message) return sse({ error: "empty message" }, 400);

  const apiKey = clean(process.env.LLM_API_KEY);
  if (!apiKey) return sse({ error: "LLM_API_KEY not configured" }, 500);

  const baseUrl = clean(process.env.LLM_BASE_URL) || "https://integrate.api.nvidia.com/v1";
  const model = clean(process.env.LLM_MODEL) || "meta/llama-3.1-8b-instruct";
  const maxTokens = Number(clean(process.env.LLM_MAX_TOKENS) || "220");

  const upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt() },
        { role: "user", content: message },
      ],
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return sse({ error: `upstream ${upstream.status}: ${text.slice(0, 180)}` }, 502);
  }

  const data = await upstream.json();
  const reply = data?.choices?.[0]?.message?.content || "模型沒有返回內容，請重試。";
  return sse({ token: reply });
}

function systemPrompt() {
  return [
    "你是倪海厦中醫學習顧問，只提供中醫學習與日常養生參考，不構成診斷或治療。",
    "先問診，再辨證。優先詢問主訴、寒熱、二便、睡眠、胃口、舌象、病程。",
    "急症、重症、孕婦、嬰幼兒、胸痛、呼吸困難、出血、劇烈疼痛，必須建議立即就醫。",
    "不要輸出推理過程，只輸出給使用者看的簡潔回覆。",
  ].join("\n");
}

function clean(value) {
  return String(value || "").trim().replace(/^\uFEFF/, "");
}

function sse(data, status = 200) {
  return new Response(`data: ${JSON.stringify(data)}\n\ndata: [DONE]\n\n`, {
    status,
    headers: {
      ...corsHeaders(),
      "content-type": "text/event-stream; charset=utf-8",
    },
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  };
}
