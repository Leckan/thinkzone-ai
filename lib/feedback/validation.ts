import { z } from "zod";

export const feedbackSubmissionSchema = z.object({
  category: z.enum(["feature_request", "feedback", "bug", "issue"]),
  subject: z.string().trim().min(3).max(160),
  details: z.string().trim().min(10).max(5_000),
});
