import { config } from "./config.js";

export type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GroqResponse = {
  choices: Array<{ message: { role: string; content: string } }>;
};

export const callGroq = async (messages: GroqMessage[]) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.groqApiKey}`,
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: config.groqModel,
      messages,
      temperature: 0.4,
      max_tokens: 500,
    }),
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as GroqResponse;
  const content = data.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Groq API returned empty response");
  }

  return content;
};
