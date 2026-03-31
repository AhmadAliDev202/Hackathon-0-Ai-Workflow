require('dotenv').config();
const fs = require("fs");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API_KEY = process.env.ROUTER_API_KEY;
const BASE_URL = "http://localhost:20128/v1";
const MODEL = "kr/qwen3-coder-next";

async function processFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that classifies and summarizes tasks."
          },
          {
            role: "user",
            content: `Classify this task and summarize it:\n\n${content}`
          }
        ],
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`API error ${response.status}:`, errText);
      return "";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "";

  } catch (err) {
    console.error("9Router (kiro) processing error:", err);
    return "";
  }
}

module.exports = { processFile };