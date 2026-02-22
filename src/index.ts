import {
  ChannelType,
  Client,
  GatewayIntentBits,
  Message,
  Partials,
} from "discord.js";
import { config } from "./config.js";
import { callGroq, GroqMessage } from "./groq.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const THREAD_ARCHIVE_MINUTES = 1440;

const toThreadName = (message: Message) => {
  const cleaned = message.content
    .replace(/<@!?\d+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(Boolean).slice(0, 6);
  const base = words.length > 0 ? words.join(" ") : "request";
  return `amaan's-coding-agent-${base}`.slice(0, 100);
};

const isBotOwnedThread = (message: Message) => {
  if (!message.channel.isThread()) return false;
  return message.channel.ownerId === client.user?.id;
};

const buildThreadContext = async (message: Message) => {
  const channel = message.channel;
  if (!channel.isThread()) return [] as GroqMessage[];

  const fetched = await channel.messages.fetch({ limit: 20 });
  const ordered = [...fetched.values()].sort(
    (a, b) => a.createdTimestamp - b.createdTimestamp
  );

  const messages: GroqMessage[] = ordered.map((msg) => {
    const role: GroqMessage["role"] = msg.author.bot ? "assistant" : "user";
    return {
      role,
      content: msg.content,
    };
  });

  return messages;
};

const handleThreadMessage = async (message: Message) => {
  const content = message.content.trim().toLowerCase();
  const wantsPlan = content === "plan" || content.includes("make a plan");
  const wantsImplement =
    content === "implement" ||
    content === "go" ||
    content.includes("start implementing");
  const wantsHealth =
    content === "health" ||
    content === "groq" ||
    content === "check" ||
    content === "status";

  console.log(
    `Thread message from ${message.author.tag} (${message.id}): ${message.content}`
  );

  if (wantsHealth) {
    try {
      const reply = await callGroq([
        {
          role: "system",
          content: "Reply with only: OK",
        },
      ]);
      await message.reply(`Groq: ${reply}`);
    } catch (error) {
      console.error("Groq health error", error);
      await message.reply(
        "Groq: error reaching the API. Check GROQ_API_KEY and connectivity."
      );
    }
    return;
  }

  if (wantsImplement) {
    await message.reply(
      "Execution is not wired yet. I can draft a plan now; say `plan`."
    );
    return;
  }

  const systemPrompt = wantsPlan
    ? "You are a concise software code planning assistant. Ask clarifying questions until a good plan has been drafted to pass onto a coding agent."
    : "You are a concise software code planning assistant. Summarize the request, list constraints, and ask focused clarification question if something critical is missing.";

  try {
    const context = await buildThreadContext(message);
    const reply = await callGroq([
      { role: "system", content: systemPrompt },
      ...context,
    ]);
    console.log("Groq reply generated");
    await message.reply(reply);
  } catch (error) {
    console.error("Groq error", error);
    await message.reply(
      "I hit an issue reaching the planning model. Please try again in a moment or say `health`."
    );
  }
};

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (isBotOwnedThread(message)) {
    await handleThreadMessage(message);
    return;
  }

  const isMentioned = message.mentions.has(client.user?.id ?? "");
  if (!isMentioned) return;

  if (message.channel.type !== ChannelType.GuildText) return;

  const thread = message.hasThread && message.thread
    ? message.thread
    : await message.startThread({
        name: toThreadName(message),
        autoArchiveDuration: THREAD_ARCHIVE_MINUTES,
      });

  await thread.send(
    "Got it. Use this thread to refine requirements. Say `plan` when ready or `health` to check Groq."
  );
});

client.once("ready", () => {
  if (!client.user) return;
  console.log(`Bot logged in as ${client.user.tag}`);
});

client.login(config.discordToken);
