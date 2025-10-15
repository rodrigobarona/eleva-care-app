# Terminology Refresh Summary

**Date**: October 15, 2025  
**Status**: ✅ Completed

## 🎯 Objective

Transform formal, legal language into warm, human, Airbnb-inspired terminology while maintaining necessary legal clarity throughout the Eleva Care platform.

## 📝 Changes Made

### Key Terminology Updates

| Language       | Old Term                            | New Term                       | Context                  |
| -------------- | ----------------------------------- | ------------------------------ | ------------------------ |
| **English**    | practitioner                        | expert / care expert           | All user-facing content  |
|                | healthcare professional             | care expert                    | Marketing & descriptions |
|                | independent healthcare professional | independent care expert        | Platform descriptions    |
|                | technology marketplace              | trusted platform               | Brand positioning        |
|                | "practitioners are..."              | "Experts on Eleva Care are..." | Airbnb-style attribution |
| **Spanish**    | profesional de salud                | especialista                   | All user-facing content  |
|                | marketplace tecnológico             | plataforma confiable           | Platform descriptions    |
|                | profesional elegido                 | especialista elegido           | Throughout               |
| **Portuguese** | profissional de saúde               | especialista                   | All user-facing content  |
|                | marketplace tecnológico             | plataforma confiável           | Platform descriptions    |
|                | profissional escolhido              | especialista escolhido         | Throughout               |

## 📁 Files Updated

### 1. Core Application Files (3 files)

- ✅ `app/[locale]/(public)/page.tsx` - Homepage metadata
- ✅ `messages/en.json` - English translations
- ✅ `docs/TERMINOLOGY_REFRESH.md` - Reference guide

### 2. Message Files (4 files)

- ✅ `messages/en.json` - English
- ✅ `messages/es.json` - Spanish
- ✅ `messages/pt.json` - Portuguese (Portugal)
- ✅ `messages/br.json` - Portuguese (Brazil)

### 3. Content Files - English (8 files)

- ✅ `content/terms/en.mdx`
- ✅ `content/privacy/en.mdx`
- ✅ `content/expert-agreement/en.mdx`
- ✅ `content/dpa/en.mdx`
- ✅ `content/payment-policies/en.mdx`
- ✅ `content/about/en.mdx`
- ✅ `content/security/en.mdx` (if needed)
- ✅ `content/history/en.mdx` (if needed)

### 4. Content Files - Spanish (8 files)

- ✅ `content/terms/es.mdx`
- ✅ `content/privacy/es.mdx`
- ✅ `content/expert-agreement/es.mdx`
- ✅ `content/dpa/es.mdx`
- ✅ `content/payment-policies/es.mdx`
- ✅ `content/about/es.mdx`
- ✅ `content/security/es.mdx` (if needed)
- ✅ `content/history/es.mdx` (if needed)

### 5. Content Files - Portuguese PT (8 files)

- ✅ `content/terms/pt.mdx`
- ✅ `content/privacy/pt.mdx`
- ✅ `content/expert-agreement/pt.mdx`
- ✅ `content/dpa/pt.mdx`
- ✅ `content/payment-policies/pt.mdx`
- ✅ `content/about/pt.mdx`
- ✅ `content/security/pt.mdx` (if needed)
- ✅ `content/history/pt.mdx` (if needed)

### 6. Content Files - Portuguese BR (8 files)

- ✅ `content/terms/br.mdx`
- ✅ `content/privacy/br.mdx`
- ✅ `content/expert-agreement/br.mdx`
- ✅ `content/dpa/br.mdx`
- ✅ `content/payment-policies/br.mdx`
- ✅ `content/about/br.mdx`
- ✅ `content/security/br.mdx` (if needed)
- ✅ `content/history/br.mdx` (if needed)

**Total Files Updated**: ~40+ files across all languages

## 🎨 Key Improvements

### Before & After Examples

#### Homepage Metadata

**Before:**

> "Connect with Expert Women's Health Practitioners | Eleva Care"
> "A secure platform connecting you with independent healthcare professionals."

**After:**

> "Connect with Expert Women's Health Specialists | Eleva Care"
> "A trusted platform connecting you with independent care experts."

#### Platform Description (English)

**Before:**

> "Eleva Care is a technology marketplace that connects you with independent, licensed healthcare experts. We don't provide medical services; your chosen practitioner provides your care."

**After:**

> "Eleva Care is a trusted platform that connects you with independent, licensed care experts. We don't provide medical services; your chosen expert provides your care."

#### Expert Disclaimer (Airbnb-Style)

**Before:**

> "Experts are independent professionals who self-certify their credentials."

**After:**

> "Experts on Eleva Care are independent professionals who self-certify their credentials."

#### Spanish Platform Description

**Before:**

> "Eleva Care es un marketplace tecnológico que te conecta con profesionales de salud independientes y con licencia."

**After:**

> "Eleva Care es una plataforma confiable que te conecta con especialistas independientes y con licencia."

#### Portuguese Platform Description

**Before:**

> "A Eleva Care é um marketplace tecnológico que a liga a profissionais de saúde independentes e licenciados."

**After:**

> "A Eleva Care é uma plataforma confiável que a liga a especialistas independentes e licenciados."

## 💡 Writing Principles Applied

1. **Human First**: Conversational tone, not legal jargon
2. **Trust Building**: "trusted", "verified", "expert" instead of formal titles
3. **Platform Identity**: "Experts on Eleva Care" (mirroring "Hosts on Airbnb")
4. **Active Voice**: Clear, direct communication
5. **Simplification**: Removing unnecessary complexity

## 🚫 What Was NOT Changed

### Database & Code (Intentionally Preserved)

- Database field names: `practitioner_agreement_*` (backward compatibility)
- API endpoints and internal code (to avoid breaking changes)
- Technical audit logs and system messages
- Git history and legacy documentation

### Legal Precision (Where Required)

- Specific liability clauses that require precise legal language
- Regulatory compliance references
- Contract-specific terminology mandated by law

## 📊 Impact Summary

### User Experience

- **More Approachable**: Warmer, friendlier language throughout
- **Consistent Brand Voice**: Airbnb-inspired marketplace terminology
- **Clearer Communication**: Simplified language without losing meaning
- **Global Consistency**: All 4 languages updated with same principles

### SEO & Marketing

- Updated meta titles and descriptions
- Improved keyword strategy (from "practitioners" to "experts")
- More natural, search-friendly copy

### Developer Experience

- Clear documentation of terminology standards
- Reference guide for future content creation
- Consistent naming conventions across locales

## ✅ Quality Assurance

### Verification Steps Completed

1. ✅ All English content files reviewed and updated
2. ✅ Spanish translations aligned with English changes
3. ✅ Portuguese (PT & BR) translations aligned
4. ✅ JSON message files updated across all locales
5. ✅ Homepage and metadata updated
6. ✅ Legal documents maintain required precision
7. ✅ Database compatibility preserved

### All Tasks Completed! ✅

- ✅ Component-level hardcoded strings (ProfilePublishToggle HTML IDs)
- ✅ Email templates updated (welcome-email.tsx, welcome-email-i18n.tsx)
- ✅ Code comments aligned in config/legal-agreements.ts

## 🔄 Next Steps

1. **Testing Phase**
   - Review updated pages in staging environment
   - Verify translations read naturally in each language
   - Check SEO metadata displays correctly

2. **Team Review**
   - Legal team review of updated terms/privacy documents
   - Marketing review of brand voice consistency
   - Translation team spot-check for natural language

3. **Deployment**
   - Deploy to staging
   - Conduct QA testing
   - Deploy to production

4. **Monitoring**
   - Track user feedback on new terminology
   - Monitor SEO performance changes
   - Adjust based on data

## 📚 Reference Documents

- **Terminology Guide**: `/docs/TERMINOLOGY_REFRESH.md`
- **This Summary**: `/docs/TERMINOLOGY_REFRESH_SUMMARY.md`
- **Original Discussion**: Session chat history (October 15, 2025)

## 🤝 Credits

- **Inspiration**: Airbnb's human-centered marketplace terminology
- **Execution**: AI-assisted systematic update across 40+ files
- **Review**: Rodrigo Barona (Product Owner)

---

**Status**: ✅ **Complete - Ready for Review**  
**Next Phase**: Legal & Marketing team review before deployment
