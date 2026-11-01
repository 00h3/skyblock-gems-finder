export interface SupportChatMessage {
  role: "user" | "model";
  content: string;
}

export interface SupportResponsePayload {
  thinkingSteps: string[];
  actionLabel: string;
  actionDetail: string;
  message: string;
}

const SYSTEM_INSTRUCTION = `You are QBLOCK Official Support, the official in-game and platform assistant for QBLOCK (a modern block/voxel gaming platform featuring Skyblock, Sandbox/Baseplate, multiplayer, player profiles, avatar customization, marketplace, daily rewards, and social features).
Persona: Enthusiastic, knowledgeable, concise, respectful, and game-focused.

STRICT SCOPE & GUARDRAILS:
1. ONLY assist with QBLOCK platform and gameplay topics:
   - Skyblock gameplay: starter island, cobblestone generators, mining tiers, rare ores (Coal, Iron, Gold, Diamond, Emerald, Netherite), custom recipes, island expansion, trading, and shops.
   - Baseplate & Sandbox: placing and breaking blocks, creative tools, controls (WASD, Space jump, Shift sneak, touch controls on mobile), and multiplayer sandbox rooms.
   - Platform features: Avatar Studio (3D cosmetics, frames, accessories, skins), Shop (Pink Gems & Gold Coins), Events, Fragments, Daily Rewards, Friend requests, Tribes, and Settings.
   - Economy: how Pink Gems and Gold Coins work, how to earn them through play/events, and how to spend them in the store.
   - Platform guidelines: fair play, anti-duplication, community rules.
2. STRICT SECURITY REFUSAL:
   - You CANNOT perform account resets, password resets, email updates, ban appeals, or database actions.
   - If asked for an account reset, password change, or unban: politely state: "For your account security, I cannot perform account or password resets directly. Please go to Settings > Account / Security to update your credentials, or reach out to QBLOCK Support."
3. STRICT OFF-TOPIC REFUSAL:
   - You do NOT answer unrelated general trivia, homework, math problems (e.g. "1+1", "what is 2+2", "who is Napoleon", politics, general programming outside QBLOCK).
   - If asked an off-topic question, politely decline: "I'm the QBLOCK Official Support assistant, so I can only help with questions about QBLOCK gameplay, Skyblock, and platform features! Let me know if you need help with anything in QBLOCK."
4. Provide structured thinking steps that reflect checking the QBLOCK knowledge base and security policies.`;

export async function handleSupportChat(
  userPrompt: string,
  history: SupportChatMessage[] = []
): Promise<SupportResponsePayload> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      thinkingSteps: [
        "Verifying connection to QBLOCK Official Support node...",
        "QBLOCK system offline: GROQ_API_KEY is not configured.",
      ],
      actionLabel: "Support Offline",
      actionDetail: "env/GROQ_API_KEY",
      message:
        "Official Support is currently offline (API key not configured in environment). Please check back shortly!",
    };
  }

  try {
    const requestBody = {
      model: "llama-3.3-70b-versatile",
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        ...history.slice(-6).map((h) => ({
          role: h.role === "model" ? "assistant" : "user",
          content: h.content,
        })),
        { role: "user", content: userPrompt },
      ],
    };
    let response: Response | undefined;
    let lastStatus = 0;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      lastStatus = response.status;
      if (response.ok || (response.status < 500 && response.status !== 429)) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }

    if (!response?.ok) {
      throw new Error(`Groq request failed with status ${lastStatus}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = payload.choices?.[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(text) as Partial<SupportResponsePayload>;

    return {
      thinkingSteps:
        Array.isArray(parsed.thinkingSteps) && parsed.thinkingSteps.length > 0
          ? parsed.thinkingSteps
          : [
              "Querying QBLOCK knowledge repository for user question...",
              "Evaluating platform guidelines and gameplay constraints...",
            ],
      actionLabel: parsed.actionLabel || "Inspect knowledge base",
      actionDetail: parsed.actionDetail || "qblock/support-index",
      message: parsed.message || "How can I help you in QBLOCK today?",
    };
  } catch (error) {
    console.error("Gemini Support Chat Error:", error);
    return {
      thinkingSteps: [
        "Connecting to QBLOCK Support reasoning cluster...",
        "Encountered temporary API network timeout.",
      ],
      actionLabel: "Support Diagnostic",
      actionDetail: "network/api-gateway",
      message:
        "I had a slight hiccup connecting to the QBLOCK knowledge core. Please try asking again in a moment!",
    };
  }
}
