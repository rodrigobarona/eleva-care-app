# Expert Application System - Implementation Summary

**Date:** 2025-11-08  
**Status:** 🚧 Phase 1 Complete (Menu + Schema)  
**Pattern:** Airbnb/Uber-style manual application review

---

## ✅ **What We've Implemented**

### **Phase 1: Foundation (COMPLETE)**

1. ✅ **Nav Menu CTA** - Added "Become an Expert" to `NavUser.tsx`
   - Styled like Airbnb's "Airbnb your home"
   - Highlighted with `bg-primary/5` and `GraduationCap` icon
   - Links to `/become-expert`

2. ✅ **Database Schema** - Added `ExpertApplicationsTable`
   - Fields: expertise, credentials, experience, motivation, hourlyRate
   - Status workflow: `pending` → `under_review` → `approved`/`rejected`
   - Admin review fields: `reviewedBy`, `reviewNotes`, `rejectionReason`
   - Unique constraint: One active application per user

---

## 📋 **Next Steps (TO-DO)**

### **Phase 2: Application Form**

- [ ] Update `/become-expert` page to detect if user is logged in
- [ ] Create `ExpertApplicationForm.tsx` component
  - Expertise field (dropdown or text)
  - Credentials (textarea)
  - Experience (number + textarea)
  - Motivation (textarea)
  - Hourly rate (number input)
  - Optional: Website, LinkedIn, Resume upload
- [ ] Form validation (Zod schema)
- [ ] Submit API route `/api/expert-applications`

### **Phase 3: Admin Review Interface**

- [ ] Create `/admin/expert-applications` page
  - List all applications
  - Filter by status
  - View application details
- [ ] Create review modal/page
  - Display all application data
  - Approve/Reject buttons
  - Notes field
- [ ] Approval workflow server action
  - Update `ExpertApplicationsTable.status` to 'approved'
  - Convert user's organization to `expert_individual`
  - Update user role to `expert_community` (default)
  - Send approval email (Novu workflow)
  - Redirect user to `/setup` on next login

### **Phase 4: Rejection Workflow**

- [ ] Rejection reason selection
- [ ] Send rejection email (Novu workflow)
- [ ] Allow reapplication after 30 days

### **Phase 5: User Experience**

- [ ] Application status page `/expert-application/status`
- [ ] Show application status in nav menu
- [ ] Email notifications
  - Application received
  - Under review
  - Approved / Rejected

---

## 🏗️ **Technical Architecture**

### **Database Schema**

```typescript
ExpertApplicationsTable {
  id: uuid (PK)
  workosUserId: text → UsersTable

  // Application
  expertise: text (required)
  credentials: text (required)
  experience: text (required)
  motivation: text (required)
  hourlyRate: integer (optional)
  website: text (optional)
  linkedIn: text (optional)
  resume: text (optional)

  // Review
  status: 'pending' | 'under_review' | 'approved' | 'rejected'
  reviewedBy: text (workos_user_id)
  reviewedAt: timestamp
  reviewNotes: text
  rejectionReason: text

  // Unique: One application per user
}
```

### **Status Flow**

```
User submits application
  ↓
status: 'pending'
  ↓
Admin reviews
  ↓
status: 'under_review'
  ↓
Admin decides
  ↓
APPROVED                          REJECTED
  ├─ status: 'approved'            ├─ status: 'rejected'
  ├─ Update organization type      ├─ Set rejection reason
  ├─ Update user role              ├─ Send rejection email
  ├─ Send approval email           └─ Allow reapply in 30 days
  └─ Redirect to /setup
```

---

## 🎨 **UI Components Needed**

### **1. ExpertApplicationForm.tsx**

```typescript
interface ExpertApplicationFormProps {
  userId: string;
  userEmail: string;
}

// Fields:
- Expertise (dropdown: Psychologist, Therapist, Coach, etc.)
- Credentials (textarea: degrees, certifications)
- Experience (number + textarea)
- Motivation (textarea: why become an expert?)
- Hourly Rate (number input, min: $50, max: $500)
- Website (optional URL)
- LinkedIn (optional URL)
- Resume/CV upload (optional, Uploadthing)
```

### **2. ApplicationStatusCard.tsx**

```typescript
// Shows current application status
- Pending: "We've received your application"
- Under Review: "Your application is being reviewed"
- Approved: "Congratulations! Complete your expert profile"
- Rejected: "We're unable to approve your application at this time"
```

### **3. Admin: ApplicationReviewModal.tsx**

```typescript
// Admin review interface
- Display all application data
- Approve button → ConvertToExpert workflow
- Reject button → Rejection reason modal
- Notes field for internal use
```

---

## 🔄 **Approval Workflow (Server Action)**

```typescript
// server/actions/expert-applications.ts

export async function approveExpertApplication(
  applicationId: string,
  adminUserId: string,
  notes?: string,
) {
  // 1. Update application status
  await db
    .update(ExpertApplicationsTable)
    .set({
      status: 'approved',
      reviewedBy: adminUserId,
      reviewedAt: new Date(),
      reviewNotes: notes,
    })
    .where(eq(ExpertApplicationsTable.id, applicationId));

  // 2. Get application data
  const app = await db.query.ExpertApplicationsTable.findFirst({
    where: eq(ExpertApplicationsTable.id, applicationId),
  });

  // 3. Convert user's organization to expert_individual
  const membership = await db.query.UserOrgMembershipsTable.findFirst({
    where: eq(UserOrgMembershipsTable.workosUserId, app.workosUserId),
    with: { organization: true },
  });

  await db
    .update(OrganizationsTable)
    .set({ type: 'expert_individual' })
    .where(eq(OrganizationsTable.id, membership.organization.id));

  // 4. Update user role
  await db
    .update(UsersTable)
    .set({ role: 'expert_community' }) // Default tier
    .where(eq(UsersTable.workosUserId, app.workosUserId));

  // 5. Create ExpertSetup record
  await db.insert(ExpertSetupTable).values({
    workosUserId: app.workosUserId,
    orgId: membership.organization.id,
  });

  // 6. Send approval email (Novu)
  await novu.trigger('expert-application-approved', {
    to: { subscriberId: app.workosUserId },
    payload: {
      /* ... */
    },
  });

  return { success: true };
}
```

---

## 📱 **Current State**

### **What Works Now:**

- ✅ Users see "Become an Expert" in nav menu
- ✅ Clicking opens `/become-expert` landing page
- ✅ Database ready to store applications

### **What Needs Building:**

- ⏳ Application form UI
- ⏳ Form submission API
- ⏳ Admin review interface
- ⏳ Approval/rejection workflows
- ⏳ Email notifications

---

## 🎯 **Why This Approach is Better**

### **Auto-Approval (Previous)**

- ❌ Anyone can become an expert
- ❌ No quality control
- ❌ Potential for abuse/spam
- ❌ Unprofessional marketplace

### **Manual Review (Current)**

- ✅ Curated expert community
- ✅ Quality assurance
- ✅ Professional marketplace
- ✅ Trust and safety
- ✅ Like Airbnb, Uber, Upwork

---

## 📊 **Expected Metrics**

- **Application rate:** ~5-10% of active users
- **Approval rate:** ~60-70% (with quality standards)
- **Review time:** 24-48 hours average
- **Reapplication rate:** ~30% of rejections

---

## 🚀 **Quick Implementation Guide**

1. **Build the form** (1-2 hours)
   - Create `components/features/expert/ExpertApplicationForm.tsx`
   - Use shadcn/ui form components
   - Zod validation

2. **Create API route** (30 mins)
   - `app/api/expert-applications/route.ts`
   - POST: Submit application
   - GET: Check application status

3. **Admin interface** (2-3 hours)
   - `app/admin/expert-applications/page.tsx`
   - List view with filters
   - Review modal

4. **Workflows** (1-2 hours)
   - Approval server action
   - Rejection server action
   - Email templates (Novu)

**Total estimate:** ~6-8 hours of development

---

## 🎉 **Summary**

We've laid the **foundation for a professional expert vetting system**:

- ✅ Prominent CTA in navigation
- ✅ Database schema for applications
- ✅ Clear status workflow

**Next:** Build the application form and admin review interface!

This mirrors how successful marketplaces like Airbnb, Uber, and Upwork manage their supply side - with **quality over quantity**. 🌟
