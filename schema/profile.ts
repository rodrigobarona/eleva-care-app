import { z } from "zod";

const socialLinkSchema = z.object({
  name: z.string().min(1, "Network name is required"),
  url: z.string().url("Must be a valid URL"),
});

export const profileFormSchema = z.object({
  profilePicture: z.string().url().optional(),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  role: z.string().min(2, "Role must be at least 2 characters").optional(),
  shortBio: z
    .string()
    .max(160, "Short bio must be less than 160 characters")
    .optional(),
  longBio: z
    .string()
    .max(2000, "Long bio must be less than 2000 characters")
    .optional(),
  socialLinks: z.array(socialLinkSchema).default([]),
  isVerified: z.boolean().default(false),
  isTopExpert: z.boolean().default(false),
  promotion: z
    .string()
    .max(500, "Promotion text must be less than 500 characters")
    .optional(),
});

export const profileActionSchema = profileFormSchema.extend({
  clerkUserId: z.string().min(1, "Required"),
});
