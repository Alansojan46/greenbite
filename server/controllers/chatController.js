import { chatWithAssistant, getAssistantStatus } from "../services/llmService.js";

export const chat = async (req, res) => {
  const { messages, currentPath } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: "messages[] is required" });
  }

  const cleaned = messages
    .slice(-20)
    .map((m) => ({
      role: m?.role === "user" ? "user" : "assistant",
      content: String(m?.content ?? ""),
    }))
    .filter((m) => m.content.trim().length > 0);

  if (cleaned.length === 0) {
    return res.status(400).json({ message: "messages[] must include content" });
  }

  try {
    const result = await chatWithAssistant({
      messages: cleaned,
      context: {
        currentPath: typeof currentPath === "string" ? currentPath : "/",
        user: req.user
          ? {
              name: req.user.name,
              role: req.user.role,
              email: req.user.email,
            }
          : null,
      },
    });

    res.json(result);
  } catch (err) {
    console.error("Chat error", err);
    res.status(500).json({ message: "Chat failed" });
  }
};

export const chatStatus = async (_req, res) => {
  try {
    const status = await getAssistantStatus();
    res.json(status);
  } catch (err) {
    console.error("Chat status error", err);
    res.status(500).json({ message: "Failed to get chat status" });
  }
};
