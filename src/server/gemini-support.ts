import { GoogleGenAI, Type } from "@google/genai";

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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      thinkingSteps: [
        "Verifying connection to QBLOCK Official Support node...",
        "QBLOCK system offline: GEMINI_API_KEY is not configured.",
      ],
      actionLabel: "Support Offline",
      actionDetail: "env/GEMINI_API_KEY",
      message:
        "Official Support is currently offline (API key not configured in environment). Please check back shortly!",
    };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // Prepare contents with context
  const contents: any[] = [];
  for (const h of history.slice(-6)) {
    contents.push({
      role: h.role,
      parts: [{ text: h.content }],
    });
  }
  contents.push({
    role: "user",
    parts: [{ text: userPrompt }],
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            thinkingSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "2 to 4 realistic, analytical thinking sentences regarding QBLOCK gameplay, mechanics, or policy validation.",
            },
            actionLabel: {
              type: Type.STRING,
              description:
                "Short action chip, e.g. 'Search game mechanics', 'Check security permissions', 'Inspect Skyblock wiki'",
            },
            actionDetail: {
              type: Type.STRING,
              description: "Brief file or index queried, e.g. 'kb/skyblock-guide.md'",
            },
            message: {
              type: Type.STRING,
              description: "The clean, formatted reply for the player.",
            },
          },
          required: ["thinkingSteps", "actionLabel", "actionDetail", "message"],
        },
      },
    });

    const text = response.text?.trim() || "{}";
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
