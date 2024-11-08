# Meeting Scheduler App

A modern scheduling application built with Next.js that allows users to manage their availability and let others book meetings with them.

## Features

- 📅 Create and manage event types
- ⏰ Set your weekly availability
- 🔗 Share booking links with custom usernames
- 🌍 Timezone support for international scheduling
- 📧 Email notifications for bookings
- 📱 Responsive design
- 🔒 Authentication with Clerk
- 📊 Google Calendar integration

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Authentication**: Clerk
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Calendar Integration**: Google Calendar API
- **Form Handling**: React Hook Form + Zod
- **Date/Time**: date-fns

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Set up your environment variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database
DATABASE_URL=
AUDIT_DATABASE_URL=

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

4. Run the development server:

```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) to see the application

## Project Structure

```
├── app/                    # Next.js app router pages
│   ├── (private)/         # Protected routes
│   └── (public)/          # Public routes
├── components/            # React components
│   ├── atoms/            # Small, reusable components
│   ├── forms/            # Form components
│   └── ui/               # UI components from shadcn
├── drizzle/              # Database schema and config
├── lib/                  # Utility functions
├── schema/               # Zod validation schemas
└── server/               # Server-side code
    ├── actions/          # Server actions
    └── googleCalendar.ts # Google Calendar integration
```

## Key Features Explained

### Event Types

Users can create different types of meetings (e.g., "30min Meeting", "Coffee Chat") with custom durations and descriptions.

### Availability Management

Set your weekly availability with custom time slots for each day of the week.

### Booking Flow

1. Share your booking link (`/[username]`)
2. Guests select an event type
3. Choose from available time slots
4. Fill in their details
5. Receive calendar invitations

### Timezone Handling

- All times are stored in UTC
- Automatic timezone conversion for users
- Clear timezone display in the interface

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
