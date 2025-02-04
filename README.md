# Eleva: Empowering Women's Healthcare

Welcome to Eleva, a modern scheduling and appointment management platform designed exclusively for women's health professionals and their clients. Eleva streamlines the booking process and payment handling, ensuring that experts and clients share a seamless experience—from appointment scheduling to secure payouts. Hosted at [https://eleva.care](https://eleva.care), Eleva is transforming women's healthcare with state‑of‑the‑art technology and compassionate service.

## Overview

Eleva combines a robust tech stack with an intuitive user interface:

- **Framework:** Next.js 14 (App Router) for dynamic and responsive pages.
- **Authentication:** Clerk ensures secure sign‑in for both experts and clients.
- **Database:** PostgreSQL with Drizzle ORM for flexible and scalable data management.
- **Styling:** Tailwind CSS and shadcn/ui provide beautiful, responsive design.
- **Payments:** Stripe Connect processes payments securely and handles payouts (with Eleva retaining a 15% fee).
- **Calendar Integration:** Google Calendar sync keeps your schedule up‑to‑date.
- **Form Handling & Validation:** React Hook Form combined with Zod.
- **Date Management:** date-fns simplifies date and time manipulation.

## Key Features

### Appointment Scheduling

- **Easy Booking:** Experts create and manage different appointment types (e.g. "30min Consultation", "Postpartum Checkup") with descriptions, durations, and custom pricing.
- **Availability Management:** Define and update weekly availability with flexible time slots.
- **Seamless Flow:** Clients follow personalized booking links, select slots (with automatic timezone conversion), and instantly receive calendar invites.

### Payments & Payouts

- **Stripe Integration:** Process payments securely using Stripe Connect. When a payment is made, the expert’s Connect account (included in the payment metadata) ensures that funds are transferred after deducting Eleva's 15% service fee.
- **Webhook Automation:** Upon a successful checkout session, Stripe webhooks update payment statuses and trigger necessary transfers automatically.

### User Experience & Notifications

- **Responsive Design:** Enjoy a consistent and mobile-friendly interface built with Tailwind CSS and shadcn/ui.
- **Email Notifications:** Automatic updates keep clients and experts notified of new bookings, cancellations, and reminders.
- **Calendar Sync:** Integrate appointments with Google Calendar for hassle‑free schedule management.

### Expert Profiles & Services

- **Expert Setup:** Specialists configure their profiles to showcase their qualifications, services, and availability.
- **Detailed Descriptions:** Services include Pelvic Health, Pregnancy & Postpartum Care, and more—detailed on each expert’s profile.
- **Team & Community:** Dedicated team members, like Patricia Mota, Cristine Homsi Jorge, Alexandre Delgado, and others, guide our mission.

### Additional Resources

- **Podcast & Insights:** Listen to expert-led podcasts discussing cutting‑edge research and practical health tips.
- **Newsletter:** Subscribe to “Femme Focus” for monthly health insights, empowering stories, and expert advice delivered straight to your inbox.

## How It Works

1. **User Authentication:**  
   Secure sign‑in via Clerk ensures that both experts and clients are authenticated before accessing their dashboards.

2. **Expert Setup:**  
   Experts set up their profiles, configure available appointment types, and connect their Stripe account for receiving direct payouts.

3. **Booking Process:**  
   Clients use personalized links to view available slots, book appointments, and get instant calendar invites.

4. **Payment Handling:**  
   During checkout, the created payment intent includes metadata (such as the event ID and expertConnectAccountId), ensuring that Stripe webhooks can update payment statuses and trigger scheduled payout transfers.

5. **Calendar Integration:**  
   Booked appointments are automatically synced with Google Calendar, guaranteeing that schedules always remain current.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) installed.
- A PostgreSQL database set up.
- Valid credentials for Stripe, Clerk, and Google Calendar APIs.

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Configure Environment Variables:**  
   Create a `.env` file at the root of the project and add variables like:

   ```env
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=

   # Database
   DATABASE_URL=
   AUDIT_DATABASE_URL=

   # Stripe
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=

   # Google Calendar
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=

   # General Config
   NEXT_PUBLIC_BASE_URL=https://eleva.care
   ```

4. **Run the development server:**

   ```bash
   pnpm dev
   ```

5. **Open in Browser:**  
   Visit [http://localhost:3000](http://localhost:3000) to explore Eleva.

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── (private)/         # Protected routes (authenticated pages)
│   └── (public)/          # Public routes (landing pages, etc.)
├── components/             # Reusable React components
│   ├── atoms/             # Small, reusable UI components
│   ├── forms/             # Form components for input handling
│   └── ui/                # UI components from shadcn/ui
├── drizzle/                # Database schema definitions and migrations
├── lib/                    # Utility functions and third-party integrations (e.g., Stripe)
├── schema/                 # Zod validation schemas and relations
└── server/                # Server-side logic, API routes, and webhooks
```

## Contributing

We welcome contributions! If you’d like to improve Eleva or add new features, please:

1. Fork the repository.
2. Create your feature branch.
3. Make your changes.
4. Submit a pull request for review.

For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Additional Information

Eleva is dedicated to transforming women's healthcare by harnessing innovative scheduling, secure payment processing, and expert-led consultations. Our platform aims to empower women by providing them easy access to top-rated healthcare professionals and comprehensive resources.

For localization and additional context, key terms and translations (such as “Services”, “Approach”, “Mission”, and “Team”) can be referenced from our localization files (e.g., `public/locales/en.js`).

Thank you for exploring Eleva. Visit [https://eleva.care](https://eleva.care) to learn more and join us on our mission to empower women's health.
