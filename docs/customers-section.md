# Customers Section

## Overview

The Customers section provides experts with a centralized view of all their clients, allowing them to track customer interactions, appointment history, and payment details. This feature enhances the expert's ability to manage their client relationships and gain insights into customer engagement patterns.

## Components

### 1. Customer List Page (`/customers`)

The main customers page displays a table of all clients who have booked appointments with the expert. Key features include:

- **Search Functionality**: Filter customers by name or email address
- **Customer Statistics**: View appointment count and total spend for each customer
- **Quick Access**: Links to detailed customer profiles

### 2. Customer Detail Page (`/customers/[id]`)

The detail page provides comprehensive information about an individual customer:

- **Personal Information**: Name, email, and account creation date
- **Quick Stats**: Summary of appointments, revenue, and session information
- **Appointment History**: Complete list of past and upcoming appointments
- **Payment History**: Record of all payments made by the customer

## Data Architecture

The Customers section aggregates data from multiple sources:

1. **Meeting Data**: Customer appointments stored in the application database
2. **Stripe Data**: Payment information associated with customer bookings

Unlike a traditional e-commerce platform, our approach maintains the marketplace model where experts do not directly "own" customers in Stripe. Instead, customers belong to the Eleva Care platform, and payments are transferred to expert Connect accounts after processing.

## Technical Implementation

### API Endpoints

1. `/api/customers`

   - Returns a list of all customers who have booked with the current expert
   - Includes statistics about appointment count and total spend

2. `/api/customers/[id]`
   - Returns detailed information about a specific customer (identified by email)
   - Includes appointment history and payment records

### Data Flow

1. When a customer books an appointment:

   - A record is created in the MeetingTable with customer details
   - The payment is processed through Stripe using the platform's Stripe account
   - Funds are transferred to the expert's Connect account (minus platform fees)

2. In the Customers section:
   - The application groups appointments by customer email
   - Customer statistics are calculated from appointment data
   - Payment information is derived from the meeting records

## Benefits

1. **Centralized Client Management**: All customer information in one place
2. **Revenue Insights**: Track earnings by customer
3. **Relationship Management**: View complete history of interactions with each client

## Future Enhancements

Potential future improvements to the Customers section:

1. **Customer Notes**: Allow experts to add private notes about clients
2. **Communication History**: Track messages exchanged with clients
3. **Custom Fields**: Enable experts to add custom data fields for their customers
4. **Export Functionality**: Allow exporting customer data for external analysis
5. **Direct Stripe Integration**: Fetch payment details directly from Stripe API

## Security and Privacy

The Customers section adheres to these privacy principles:

1. Customer data is only visible to the expert who provided the service
2. Sensitive payment details (like full card numbers) are never stored or displayed
3. All customer data is handled in compliance with GDPR and other privacy regulations
