# Finnep Event App - User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Event Discovery & Browsing](#event-discovery--browsing)
4. [Event Details](#event-details)
5. [Purchasing Tickets](#purchasing-tickets)
6. [Managing Your Tickets](#managing-your-tickets)
7. [Account & Settings](#account--settings)
8. [Troubleshooting](#troubleshooting)
9. [FAQs](#faqs)

---

## Introduction

### What is Finnep Event App?

Finnep Event App is a modern event ticketing and discovery platform designed for the Finnish and Nordic markets. Whether you're looking for concerts, festivals, conferences, or cultural events, Finnep makes it easy to discover, browse, and purchase tickets.

### Key Features

- 🎫 **Easy Ticket Purchasing** - Secure payment processing with Stripe
- 🔍 **Advanced Search** - Find events by type, date, location, and more
- 🌍 **Multi-language Support** - Available in English, Finnish, Swedish, Danish, and Norwegian
- 📱 **Mobile-Friendly** - Fully responsive design for all devices
- 🎨 **Dark/Light Theme** - Choose your preferred viewing mode
- 📧 **Email Tickets** - Receive tickets directly in your email
- 🗺️ **Interactive Maps** - See event locations on interactive maps

---

## Getting Started

### Accessing the Platform

1. Open your web browser and navigate to the Finnep Event App website
2. The homepage will display featured events and upcoming events
3. No account creation is required to browse events

### Language Selection

Finnep supports 5 languages:
- **English (en-US)**
- **Finnish (fi-FI)**
- **Swedish (sv-SE)**
- **Danish (da-DK)**
- **Norwegian (no-NO)**

**To change language:**
1. Look for the language selector in the header (usually a globe icon)
2. Click on it to see available languages
3. Select your preferred language
4. The entire site will update to your selected language

![Language Selector](/docs/images/screenshots/language-selector.png)
*Language selector dropdown showing all available languages*

### Theme Selection

The platform supports both dark and light themes:

1. The theme automatically matches your system preferences
2. You can manually toggle themes (if available in settings)
3. Your preference is saved for future visits

![Theme Toggle - Light Mode](/docs/images/screenshots/theme-toggle-light.png)
*Homepage in light theme*

![Theme Toggle - Dark Mode](/docs/images/screenshots/theme-toggle-dark.png)
*Homepage in dark theme*

---

## Event Discovery & Browsing

### Homepage

The homepage features:

- **Hero Carousel** - Featured events with images or videos
- **Featured Events** - Priority events highlighted at the top
- **Ongoing Events** - Events happening today
- **Upcoming Events** - Future events with infinite scroll

![Homepage](/docs/images/screenshots/homepage.png)
*Main homepage showing featured events and navigation*

### Browsing All Events

**To browse all events:**

1. Click on **"Events"** in the navigation menu
2. You'll see a grid or list view of all available events
3. Use the filters to narrow down your search:
   - **Category** - Filter by event type
   - **Date** - Filter by date range
   - **Location** - Filter by city or country
   - **Status** - Filter by event status (upcoming, ongoing, past)

### Search Functionality

**To search for events:**

1. Use the search bar in the header
2. Type keywords related to:
   - Event name
   - Artist/performer name
   - Venue name
   - Event type
3. Results will appear as you type
4. Use advanced filters to refine your search

### Event Categories

Events are organized by categories such as:
- Concerts
- Festivals
- Conferences
- Cultural Events
- Sports Events
- And more...

Click on any category to see all events in that category.

---

## Event Details

### Viewing Event Details

**To view detailed information about an event:**

1. Click on any event card or event name
2. You'll be taken to the event detail page

![Event Detail Page](/docs/images/screenshots/event-detail.png)
*Example event detail page showing all information*

### Event Information Available

The event detail page includes:

- **Event Title & Description** - Full event information
- **Date & Time** - Event date, time, and timezone
- **Venue Information** - Full address and venue details
- **Interactive Map** - See the exact location on a map
- **Ticket Types & Pricing** - Available tickets with prices
- **Ticket Availability** - Real-time availability status
- **Image Gallery** - Multiple event photos
- **Videos** - Embedded videos (YouTube, Vimeo, TED)
- **Social Media Links** - Facebook, Twitter, Instagram, TikTok
- **Event Tags** - Categories and tags

### Understanding Ticket Status

Tickets can have different statuses:

- **Available** ✓ - Tickets are available for purchase
- **Low Stock** ⚠ - Limited tickets remaining (shown in orange)
- **Sold Out** ✗ - No tickets available (shown in red)

### Price Breakdown

When viewing tickets, you'll see:
- **Base Price** - The ticket price
- **Service Fee** - Platform service fee
- **VAT** - Value-added tax (if applicable)
- **Total** - Final amount to pay

---

## Purchasing Tickets

### Selecting Tickets

**To purchase tickets:**

1. Navigate to the event detail page
2. Scroll to the **"Tickets"** section
3. Select your desired ticket type
4. Choose the quantity using the +/- buttons
5. Review the price breakdown
6. Click **"Buy Tickets"** or **"Purchase"** button

![Ticket Purchase Modal](/docs/images/screenshots/ticket-purchase-modal.png)
*Ticket selection modal showing ticket types and pricing*

### Checkout Process

**Step 1: Review Your Order**
- Verify ticket type and quantity
- Check the total price
- Review event details

**Step 2: Enter Customer Information**
- **Email Address** - Required for ticket delivery
- **Full Name** - Your name as it should appear on tickets
- **Phone Number** - Optional, for event updates

**Step 3: Payment**
- Enter your payment card details securely
- Card number, expiry date, CVC, and cardholder name
- Payment is processed securely through Stripe
- Complete any required CAPTCHA verification

![Checkout Page](/docs/images/screenshots/checkout.png)
*Checkout page with payment form filled with card details*

**Step 4: Confirmation**
- Review your order one final time
- Click **"Complete Purchase"** button
- Wait for payment processing

![Ticket QR Code](/docs/images/screenshots/ticket-qr-code.png)
*Success page showing ticket QR code after successful payment*

### Payment Methods

Finnep accepts:
- Credit cards (Visa, Mastercard, American Express)
- Debit cards
- Other payment methods supported by Stripe

### After Purchase

Once payment is successful:

1. You'll be redirected to a **Success Page**
2. Your tickets will be sent to your email address
3. You can also access tickets through the "My Tickets" section
4. Save your confirmation email for reference

### Free Events

Some events are free to attend:

1. Navigate to the free event page
2. Click **"Register"** or **"Get Free Ticket"**
3. Enter your email address
4. Complete any required verification
5. Receive your free ticket via email

---

## Managing Your Tickets

### Accessing Your Tickets

**To view your purchased tickets:**

1. Click on **"My Tickets"** in the navigation menu
2. You'll need to verify your email to access tickets

### Email Verification for Tickets

**First-time access:**

1. Click **"My Tickets"** in the navigation
2. Enter the email address you used for purchase
3. Complete CAPTCHA verification
4. A verification code will be sent to your email
5. Enter the verification code
6. You'll now have access to your tickets

![Email Verification](/docs/images/screenshots/email-verification.png)
*Email verification modal with email filled and CAPTCHA*

**OTP Verification:**

After clicking Continue, you'll receive a verification code via email:

1. Wait for the email (usually arrives within 30 seconds)
2. Enter the 8-digit verification code in the OTP field
3. Click **"Verify"** button

![OTP Verification](/docs/images/screenshots/otp-verification.png)
*OTP verification screen where you enter the code from your email*

**Returning users:**

1. If you have a saved session, tickets will load automatically
2. Otherwise, verify your email again

### Viewing Ticket Details

Each ticket shows:
- **Event Name** - The event you're attending
- **Event Date & Time** - When the event occurs
- **Event Location** - Venue address
- **Ticket Type** - Type of ticket purchased
- **Quantity** - Number of tickets
- **Purchase Date** - When you bought the tickets
- **QR Code** - For event entry (if applicable)
- **OTP Code** - One-time password for verification

![My Tickets Page](/docs/images/screenshots/my-tickets.png)
*My Tickets page showing purchased tickets*

### Downloading Tickets

**To download your tickets:**

1. Go to "My Tickets"
2. Find the event you want
3. Click the **download icon** or **"Download"** button
4. Your ticket will download as:
   - PDF file
   - ICS calendar file (for adding to your calendar)

### Adding to Calendar

**To add an event to your calendar:**

1. Download the ICS file from your ticket
2. Open the file with your calendar application
3. The event will be added with all details

### Ticket Expiry

- Tickets are valid until the event date
- After the event, tickets remain in your history for reference
- Expired tickets cannot be used for entry

---

## Account & Settings

### Merchant Registration

**For event organizers:**

1. Navigate to the **"Merchant"** or **"Become a Merchant"** page
2. Fill out the registration form:
   - Organization name
   - Company email and phone
   - Company address
   - Country
   - Website and description
   - Logo upload
3. Connect your Stripe account for payments
4. Submit the registration
5. Wait for approval from the platform

### Contact & Support

**To contact support:**

1. Go to the **"Contact"** page
2. Fill out the contact form:
   - First name and last name
   - Email address
   - Subject
   - Message
3. Submit the form
4. You'll receive a confirmation email

### Other Pages

- **About** - Learn about Finnep
- **Careers** - Job opportunities
- **Venues** - Browse event venues
- **Terms & Conditions** - Legal terms
- **Privacy Policy** - Privacy and data handling

---

## Troubleshooting

### Payment Issues

**Payment failed:**
- Check your card details are correct
- Ensure sufficient funds are available
- Try a different payment method
- Contact your bank if issues persist
- Contact support if problems continue

**Payment processed but no tickets:**
- Check your email (including spam folder)
- Wait a few minutes for email delivery
- Access "My Tickets" section
- Contact support with your payment confirmation

### Ticket Access Issues

**Can't access "My Tickets":**
- Ensure you're using the correct email address
- Check your email for the verification code
- Complete CAPTCHA verification
- Clear browser cache and try again
- Contact support if issues persist

**Verification code not received:**
- Check spam/junk folder
- Wait a few minutes
- Request a new code
- Verify email address is correct

### Technical Issues

**Page not loading:**
- Refresh the page
- Clear browser cache
- Try a different browser
- Check your internet connection
- Disable browser extensions temporarily

**Language not changing:**
- Clear browser cache
- Try a different browser
- Check if language is supported
- Contact support

**Theme not working:**
- Clear browser cache
- Check browser settings
- Try a different browser

---

## FAQs

### General Questions

**Q: Do I need to create an account to buy tickets?**
A: No, you can purchase tickets without creating an account. However, you'll need to verify your email to access your tickets.

**Q: Can I cancel or refund my tickets?**
A: Refund policies vary by event. Contact the event organizer or support for refund requests.

**Q: Can I transfer tickets to someone else?**
A: Ticket transfer policies depend on the event. Check the event details or contact support.

**Q: What payment methods are accepted?**
A: We accept major consumer credit and debit cards through Stripe's secure payment processing. Business cards are not accepted.

**Q: Are my payment details secure?**
A: Yes, all payments are processed securely through Stripe. We never store your full card details.

### Event Questions

**Q: How do I find events near me?**
A: Use the filter by country on the Events page or search by city/country.

**Q: Can I see events happening today?**
A: Yes, the homepage shows "Ongoing Events" for events happening today.

**Q: How do I know if an event is sold out?**
A: Sold-out events will show a "Sold Out" status in red. Low stock events show an orange warning.

**Q: Can I get notifications about new events?**
A: Follow the event organizer's social media links on the event details page for updates.

### Ticket Questions

**Q: How do I receive my tickets?**
A: Tickets are sent to your email address immediately after purchase. You can also access them in "My Tickets."

**Q: Do I need to print my tickets?**
A: This depends on the event. Some events accept digital tickets (QR codes on your phone), while others may require printed tickets. Check the event details.

**Q: What is the OTP code for?**
A: The OTP (One-Time Password) is used for ticket verification at the event venue.

**Q: Can I download my tickets?**
A: Yes, you can download tickets as PDF or ICS files from the "My Tickets" section.

### Technical Questions

**Q: Which browsers are supported?**
A: We support all modern browsers including Chrome, Firefox, Safari, and Edge.

**Q: Is the platform mobile-friendly?**
A: Yes, the platform is fully responsive and works on all devices including smartphones and tablets.

**Q: Can I use the platform in my language?**
A: Yes, we support English, Finnish, Swedish, Danish, and Norwegian.

**Q: How do I change the language?**
A: Click the language selector (globe icon) in the header and choose your preferred language.

---

## Additional Resources

### Support

- **Email Support:** Contact us through the Contact page
- **Response Time:** We aim to respond within 24-48 hours

### Social Media

Follow us on:
- Facebook
- Twitter
- Instagram
- TikTok

(Check individual event pages for specific social media links)

### Legal

- **Terms & Conditions:** Available in the footer
- **Privacy Policy:** Available in the footer

---

## Version Information

**Last Updated:** November 18, 2024
**Version:** 1.0
**Platform:** Finnep Event App

---

## Feedback

We value your feedback! If you have suggestions for improving this user manual or the platform, please contact us through the Contact page.

---

*This user manual is continuously updated. Check back regularly for the latest information.*

