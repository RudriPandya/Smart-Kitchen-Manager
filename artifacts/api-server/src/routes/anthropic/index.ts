import { Router } from "express";
import { db } from "@workspace/db";
import { conversations as conversationsTable, messages as messagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { kitchenStockTable } from "@workspace/db";

const router = Router();

const KITCHEN_SYSTEM_PROMPT = `You are a helpful kitchen and cooking assistant for the Smart Kitchen Manager app. 
You help users with meal planning, recipe suggestions, ingredient substitutions, cooking techniques, and kitchen management tips.
You have context about the user's kitchen stock when provided. Be friendly, practical, and concise.`;

router.get("/anthropic/conversations", async (req, res) => {
  try {
    const conversations = await db.select().from(conversationsTable).orderBy(conversationsTable.createdAt);
    res.json(conversations.map(c => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.post("/anthropic/conversations", async (req, res) => {
  try {
    const { title } = req.body;
    const [conversation] = await db.insert(conversationsTable).values({ title }).returning();
    res.status(201).json({
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/anthropic/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    const messages = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id));
    res.json({
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      messages: messages.map(m => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(404).json({ error: "Conversation not found" });
  }
});

router.delete("/anthropic/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(messagesTable).where(eq(messagesTable.conversationId, id));
    const [deleted] = await db.delete(conversationsTable).where(eq(conversationsTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Conversation not found" });
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.get("/anthropic/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const messages = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id));
    res.json(messages.map(m => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list messages" });
  }
});

router.post("/anthropic/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { content } = req.body;

    const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    await db.insert(messagesTable).values({
      conversationId: id,
      role: "user",
      content,
    });

    const previousMessages = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id));

    // Get kitchen context
    const stock = await db.select().from(kitchenStockTable);
    const stockContext = stock.filter(s => s.quantity > 0)
      .map(s => `${s.ingredientName}: ${s.quantity} ${s.unit}`)
      .join(", ");

    const systemPromptWithContext = stockContext
      ? `${KITCHEN_SYSTEM_PROMPT}\n\nUser's current kitchen stock: ${stockContext}`
      : KITCHEN_SYSTEM_PROMPT;

    const chatMessages = previousMessages.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPromptWithContext,
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    await db.insert(messagesTable).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error(err);
    res.write(`data: ${JSON.stringify({ error: "AI response failed" })}\n\n`);
    res.end();
  }
});

export default router;
