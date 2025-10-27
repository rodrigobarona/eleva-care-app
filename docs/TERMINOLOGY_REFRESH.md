# Terminology Refresh: Making Eleva Care More Human

## 🎯 Objective

Transform legal/formal language into warm, human, Airbnb-inspired terminology while maintaining necessary legal clarity.

## 📊 Terminology Mapping

### Primary Changes

| Current (Formal)                        | New (Human-Friendly)                        | Context              |
| --------------------------------------- | ------------------------------------------- | -------------------- |
| **practitioner**                        | **expert**                                  | General references   |
| **healthcare professional**             | **care expert** or **expert**               | General references   |
| **independent healthcare professional** | **independent expert**                      | Platform description |
| **licensed practitioner**               | **licensed expert**                         | Credential mentions  |
| **independent, licensed practitioners** | **trusted experts** or **licensed experts** | Marketing copy       |
| **healthcare practitioners**            | **care experts** or **experts**             | All contexts         |

### Specific Phrases to Update

| Current                                                                      | New                                                               | Notes                                 |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| "Connect with Expert Women's Health Practitioners"                           | "Connect with Expert Women's Health Specialists"                  | More approachable                     |
| "Find and book licensed women's health practitioners"                        | "Find and book trusted women's health experts"                    | Warmer tone                           |
| "A secure platform connecting you with independent healthcare professionals" | "A trusted platform connecting you with independent care experts" | Less corporate                        |
| "Practitioners are independent professionals"                                | "Experts on Eleva Care are independent professionals"             | Airbnb-style (like "Hosts on Airbnb") |
| "Your practitioner provides your care"                                       | "Your expert provides your care"                                  | Consistent terminology                |
| "Practitioner Agreement"                                                     | "Expert Agreement"                                                | Already used, ensure consistency      |

### What to Keep

- **Legal documents**: Keep precise legal language where required by law (e.g., "licensed healthcare provider" in liability sections)
- **Database fields**: Keep technical names like `practitioner_agreement_*` for backward compatibility
- **Code comments**: Update to match new terminology
- **User-facing content**: All should use the new friendly language

## 🎨 Writing Style Principles (Airbnb-Inspired)

1. **Human First**: Write like talking to a friend, not reading a contract
2. **Trust Building**: Use "trusted", "verified", "expert" instead of legal terms
3. **Platform Identity**: Use "Experts on Eleva Care" (like "Hosts on Airbnb")
4. **Active Voice**: "Your expert provides care" not "Care is provided by practitioners"
5. **Simplify**: "Find trusted experts" not "Discover independent licensed healthcare practitioners"

## 📁 Files to Update

### Content Files (36 MDX files)

- [x] content/terms/en.mdx (and es, pt, br)
- [x] content/about/en.mdx (and es, pt, br)
- [x] content/privacy/en.mdx (and es, pt, br)
- [x] content/expert-agreement/en.mdx (and es, pt, br)
- [x] content/security/en.mdx (and es, pt, br)
- [x] content/dpa/en.mdx (and es, pt, br)
- [x] content/payment-policies/en.mdx (and es, pt, br)
- [x] content/history/en.mdx (and es, pt, br)

### Message Files (4 JSON files)

- [x] messages/en.json
- [x] messages/es.json
- [x] messages/pt.json
- [x] messages/br.json

### Component Files

- [x] app/[locale]/(public)/page.tsx
- [x] Components with hardcoded strings (ProfilePublishToggle - HTML IDs only)
- [x] Email templates (welcome-email.tsx, welcome-email-i18n.tsx)

### Configuration Files

- [x] config/legal-agreements.ts (code comments updated)
- [x] All config files reviewed

## 🔄 Translation Notes

### Spanish

- "practitioner" → "especialista" or "experta/experto"
- "healthcare professional" → "profesional de salud" → "experta en salud"

### Portuguese (PT/BR)

- "practitioner" → "profissional" → "especialista" or "expert"
- "healthcare professional" → "profissional de saúde" → "especialista"

## ✅ Review Checklist

- [x] All user-facing copy uses "expert" instead of "practitioner"
- [x] Marketing copy feels warm and human
- [x] Legal disclaimers maintain necessary precision
- [x] Translations maintain the same warmth across languages
- [x] Database/code maintains backward compatibility
- [x] SEO metadata updated with new terminology

## 📝 Examples

### Before

> "Eleva Care is a technology marketplace that connects you with independent, licensed healthcare practitioners. We provide the technology; your chosen practitioner provides your care."

### After

> "Eleva Care is a trusted platform that connects you with independent, licensed care experts. We provide the technology; your chosen expert provides your care."

### Before

> "Practitioners are independent professionals who self-certify their credentials."

### After

> "Experts on Eleva Care are independent professionals who self-certify their credentials."

---

**Status**: ✅ **Complete**
**Updated**: October 15, 2025
