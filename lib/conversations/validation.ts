import { z } from "zod";

export const conversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(40_000).refine((content) => content.trim().length > 0),
});

export const conversationHistorySchema = z.array(conversationMessageSchema).max(24).superRefine((history, context) => {
  const totalCharacters = history.reduce((total, message) => total + message.content.length, 0);
  if (totalCharacters > 60_000) {
    context.addIssue({ code: "custom", message: "Conversation context is too long." });
  }
});

export const createConversationSchema = z.object({
  messages: z.array(conversationMessageSchema).min(1).max(100),
}).superRefine(({ messages }, context) => {
  const totalCharacters = messages.reduce((total, message) => total + message.content.length, 0);
  if (totalCharacters > 100_000) {
    context.addIssue({ code: "custom", message: "Conversation is too long to save in one request." });
  }
});

export const renameConversationSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export const appendConversationMessageSchema = conversationMessageSchema;
