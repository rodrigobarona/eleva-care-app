import { z } from "zod";

const socialLinkSchema = z.object({
  name: z.string().min(1, "Network name is required"),
  url: z.string().url("Must be a valid URL"),
});

const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB in bytes

export const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  profilePicture: z
    .string()
    .refine(
      (val) => !val || val.startsWith("http") || val.startsWith("blob:"),
      {
        message: "Profile picture must be a valid URL",
      }
    )
    .refine(
      (val): val is string =>
        !val.startsWith("blob:") || val.length <= MAX_FILE_SIZE,
      {
        message: "File size must be less than 4.5MB",
        params: { maxSize: MAX_FILE_SIZE },
      }
    ),
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
