# Bobby Gym Management Suite

MASTER TEMPLATE REQUIREMENT

This application is my master gym website template, which I intend to customize and sell to multiple independent gyms.

Build the application so that client customization does not require rewriting individual pages or components.

Create a centralized gym configuration system for:

- Gym name

- Logo

- Favicon

- Primary and secondary brand colours

- Background and text colours

- Fonts

- Hero images and gallery images

- Contact details

- Address and opening hours

- Social media links

- Membership plans and prices

- Website content

- Custom domain configuration

Use reusable UI components and centralized design tokens for colours,

typography, buttons, cards, navigation, and other common elements.

Changing the gym configuration should update the relevant public

website pages and branding consistently.

Keep business logic separate from branding so changing a logo or

colour palette cannot accidentally break memberships, payments,

attendance, or authentication.

Use Apex Fitness Club as the fictional demo gym.

Keep demo records clearly separated from real client data.

Never reuse demo members, payments, credentials, or attendance records

when onboarding a real gym.

Document how I can create a new client deployment, configure its

branding and domain, connect its database, create the owner's account,

and verify that all features work before launch.

Preserve existing working functionality. Do not replace real backend

operations with mock data.PROJECT: BOBBY FYM
PRODUCT: COMPLETE GYM WEBSITE AND MANAGEMENT SYSTEM

Act as a senior full-stack developer, UI/UX designer, database architect,
and application security engineer.

Build a complete, modern, responsive gym website and management
application called "Bobby Gym".

IMPORTANT BUSINESS CONTEXT:

I am building this product as a freelance service.

I want to create one complete, professional demo gym website that
I can later customize and sell to different independent gyms.

When I acquire a client, I want to be able to change the gym's name,
logo, colours, images, website content, membership plans, contact
details, and domain without rewriting the entire application.

The application must be designed using reusable components,
centralized branding settings, and a properly structured backend.

The demo gym's name must be exactly:

BOBBY GYM


The demo should look premium enough to present to a real gym owner
and should have functional features rather than just attractive
screens or fake dashboard buttons.


==================================================
1. TECHNOLOGY AND APPLICATION ARCHITECTURE
==================================================

Use the following technology stack where appropriate:

- React
- TypeScript
- Tailwind CSS
- A reusable component architecture
- Supabase Authentication
- Supabase PostgreSQL database
- Supabase Row Level Security
- Trusted backend functions for sensitive operations
- A secure QR-code generation and scanning solution

Use the existing project setup if one already exists and is working.

Do not unnecessarily recreate or replace the project.

Connect the frontend to a real persistent database.

Do not use hardcoded arrays or browser local storage as a replacement
for real backend operations.

Local temporary UI state is acceptable for interface interactions,
but persistent records must be stored in the database.

If backend credentials or configuration are missing, explain exactly
what must be configured.

Never pretend that an integration is working if it has not been
configured and tested.


==================================================
2. BRAND IDENTITY AND VISUAL DESIGN
==================================================

Create a premium fitness brand identity for BOBBY FYM.

Brand name: Bobby Fym

Brand personality:
- Strong
- Modern
- Premium
- Athletic
- Energetic
- Trustworthy

Default colour palette:

- Primary background: charcoal black
- Secondary background: dark graphite
- Primary text: white
- Secondary text: muted grey
- Accent colour: vibrant lime green
- Borders: subtle dark grey

Suggested starting colours:

- Primary background: #0B0D0B
- Secondary background: #151915
- Accent lime: #B6FF35
- Primary text: #FFFFFF
- Secondary text: #A7ADA4

These colours must be configurable later.

Design requirements:

- Bold athletic typography.
- High-quality fitness and gym photography.
- Strong hero sections.
- Modern cards and dashboards.
- Clean spacing and visual hierarchy.
- Subtle animations and hover effects.
- Consistent buttons and form elements.
- Responsive layouts.
- Mobile-friendly navigation.
- Professional loading, empty, success, and error states.

Avoid making the website look like a generic template.

The public website should feel like a premium fitness brand.

The management dashboard should feel like professional gym
management software.

Use realistic demo content, but clearly distinguish demo records
from real customer information.


==================================================
3. PUBLIC GYM WEBSITE
==================================================

Create a complete public-facing website for Bobby Fym.

Required pages and sections:

A. HOME PAGE

Create a powerful hero section with:

- Bobby Fym branding.
- High-quality gym photography.
- A strong fitness headline.
- Supporting description.
- Join Now button.
- Explore Membership Plans button.
- Login button.

Suggested headline:

"YOUR FITNESS. YOUR STRENGTH. YOUR JOURNEY."

Supporting text:

"Train smarter, get stronger, and become the best version of yourself
with Bobby Fym."

Use strong calls to action.

The Join Now button must lead to the actual membership registration
or enquiry flow.

The Explore Plans button must scroll to or open the membership plans.

B. ABOUT US

Include:

- Gym introduction.
- Training philosophy.
- Fitness goals.
- Gym environment.
- Why members should choose Bobby Fym.

C. MEMBERSHIP PLANS

Create configurable membership cards.

Use these initial illustrative demo plans:

1. Monthly Plan
   Price: ₹1,200
   Duration: 1 month

2. Quarterly Plan
   Price: ₹3,000
   Duration: 3 months

3. Half-Yearly Plan
   Price: ₹5,500
   Duration: 6 months

4. Annual Plan
   Price: ₹10,000
   Duration: 12 months

Prices are illustrative demo values and must be editable.

Each plan should support:

- Name.
- Price.
- Duration.
- Benefits.
- Description.
- Active or inactive status.
- Display order.
- Optional promotional label.

The owner must be able to create and edit plans from the dashboard.

The public website must display the actual active plans stored in
the database rather than hardcoded plan cards.

D. FACILITIES

Create a visual gallery showing example facilities such as:

- Strength training.
- Cardio.
- Functional training.
- Free weights.
- Locker rooms.
- Shower facilities.

Allow authorized users to update images and descriptions.

E. TRAINERS

Create trainer profile cards with:

- Name.
- Profile image.
- Specialty.
- Short biography.
- Experience.

Use clearly identified demo profiles.

Allow authorized owners to edit trainer information.

F. TESTIMONIALS

Create a clean testimonials section using clearly identified
demo content.

Allow testimonials to be managed from the dashboard.

Do not present fabricated testimonials as verified real reviews.

G. CONTACT

Include:

- Gym address.
- Phone number.
- Email address.
- Opening hours.
- Social media links.
- Map placeholder or configurable map link.
- Contact enquiry form.

Store enquiries in the database.

Provide validation and a success message after a submission
is successfully saved.

H. FOOTER

Include:

- Logo.
- Navigation links.
- Contact information.
- Social media links.
- Privacy policy link.
- Terms and conditions link.
- Copyright information.


==================================================
4. AUTHENTICATION AND USER ROLES
==================================================

Implement secure authentication using Supabase Auth.

Support these roles:

1. Platform Administrator
2. Gym Owner
3. Receptionist
4. Trainer
5. Member

Create protected application routes.

Users must not be able to access private pages simply by typing
a URL into their browser.

Enforce authorization in backend operations and database policies.

Do not trust role information submitted by the frontend.

Resolve user roles through trusted database records.

Do not store privileged credentials in frontend code.

Provide:

- Login.
- Logout.
- Password reset.
- Appropriate session handling.
- Form validation.
- Useful authentication error messages.

Do not implement a public registration form that automatically
grants administrator or gym-owner privileges.

Provide a secure setup process for creating the first owner account.

Do not hardcode production credentials.


==================================================
5. GYM OWNER DASHBOARD
==================================================

Build a professional owner dashboard.

The layout should include a sidebar, top navigation, profile menu,
responsive content area, and clear navigation.

Dashboard sections:

- Overview
- Members
- Membership Plans
- Memberships
- Payments
- Attendance
- Enquiries
- Trainers
- Staff
- Notifications
- Reports
- Website Settings
- Gym Settings

OVERVIEW CARDS:

Display:

- Total members.
- Active members.
- Active memberships.
- Expired memberships.
- Memberships expiring soon.
- Collections for the selected period.
- Pending dues.
- Today's attendance.

Include:

- Recent member registrations.
- Recent payments.
- Recent attendance.
- Upcoming membership expirations.
- Recent activity.

Dashboard figures must be calculated from actual database records.

Use clear empty states when no records exist.

Do not fabricate live statistics.

Allow authorized users to click dashboard statistics to view
the relevant underlying records.


==================================================
6. MEMBER MANAGEMENT
==================================================

Create a complete member management system.

The owner and authorized staff should be able to:

- Add members manually.
- View member details.
- Search members.
- Filter members.
- Edit permitted member information.
- Archive members.
- View membership history.
- View payment history.
- View attendance history.
- View outstanding dues.
- Assign membership plans.
- Record membership renewals.

Member fields should include:

- Unique member identifier.
- Full name.
- Email.
- Phone number.
- Profile image, where available.
- Registration date.
- Emergency contact, if needed.
- Account status.
- Notes accessible only to authorized staff.

Validate required fields and prevent accidental duplicate records.

Do not use email alone as the only mechanism for identifying
a person who may already exist in the gym's member directory.

Provide a member details page with organized tabs for:

- Overview.
- Memberships.
- Payments.
- Attendance.
- Account information.

Respect data privacy and role permissions.


==================================================
7. MEMBERSHIP MANAGEMENT
==================================================

Create a complete membership lifecycle system.

Features:

- Assign plans to members.
- Create memberships.
- Record start dates.
- Calculate expiry dates.
- Renew memberships.
- View membership history.
- View active memberships.
- View expired memberships.
- View upcoming expirations.
- Support partial and unpaid fee obligations.
- Support optional membership pauses.
- Support cancellation records.
- Support configurable grace periods.

Membership durations should be calculated consistently.

Do not assume that every month has exactly 30 days.

Store dates and timestamps consistently.

Use a documented timezone policy and display dates in the gym's
configured timezone.

Keep these concepts separate:

- Membership status.
- Payment status.
- Member account status.

An active membership must not automatically mean that its fees
have been paid.

Retain historical membership records when a member renews.

Do not overwrite previous membership history unnecessarily.


==================================================
8. PAYMENT MANAGEMENT SYSTEM
==================================================

IMPORTANT:

Build the payment management page now.

Do not integrate a real online payment gateway in this version.

Actual online payment processing will be discussed with gym owners
and implemented in a later phase.

A. OWNER PAYMENT DASHBOARD

Create a dedicated Payments section.

Display:

- Total collected.
- Collections today.
- Collections this month.
- Pending dues.
- Partially paid memberships.
- Recent payments.

Allow authorized users to filter payment records by:

- Date range.
- Member.
- Payment method.
- Payment status.

B. MANUAL PAYMENT RECORDING

Allow authorized staff to record payments received through:

- Cash.
- UPI.
- Bank transfer.
- Other configured manual methods.

Payment form fields:

- Member.
- Relevant membership or fee obligation.
- Amount received.
- Payment date.
- Payment method.
- Transaction reference, if applicable.
- Receipt number.
- Optional notes.

Use Indian rupees for display.

Store financial amounts as integer paise to avoid floating-point
rounding errors.

Validate amounts and prevent duplicate payment submissions.

An authorized staff member may record a payment as received only
after confirming that the payment actually occurred.

Selecting UPI as a payment method does not verify a transaction.

C. PAYMENT HISTORY

Show:

- Payment reference.
- Member.
- Amount.
- Payment method.
- Date.
- Status.
- Responsible staff member.

Allow authorized users to view payment details.

Create printable receipts with:

- Bobby Fym logo.
- Gym contact details.
- Receipt number.
- Member name.
- Amount.
- Payment method.
- Payment date.
- Relevant membership.
- Payment reference.

Clearly distinguish a manually recorded receipt from a
provider-verified online payment receipt.

D. OUTSTANDING DUES

Calculate outstanding balances using the relevant fee obligation
and valid payment records.

Support:

- Fully paid.
- Partially paid.
- Unpaid.
- Overdue.

Do not count cancelled, failed, or refunded amounts incorrectly.

Record refunds and financial corrections as auditable operations.

Do not silently delete financial history.

Prevent staff from creating payments for members belonging
to another gym.

E. MEMBER PAYMENT PAGE

Create a My Fees page inside the member portal.

Members should see:

- Current membership plan.
- Membership start date.
- Membership expiry date.
- Total membership fee.
- Total amount paid.
- Outstanding balance.
- Payment history.
- Payment references.
- Available receipts.
- Renewal information.

Members may only access their own financial records.

For now, show this message when a balance remains outstanding:

"Please contact Bobby Fym reception to complete your payment."

Allow the owner to customize this message.

Do not request card details.

Do not create a fake online payment flow.

Do not show a payment as successful unless the underlying payment
record supports that status.

F. FUTURE ONLINE PAYMENT INTEGRATION

Keep payment functionality modular so a payment gateway can be
connected later.

Do not expose payment-provider credentials in the frontend.

When a gateway is added later, use trusted backend verification
and provider webhooks to update payment status.

Do not treat a browser redirect or frontend success message as
proof that money was received.


==================================================
9. MEMBER PORTAL
==================================================

Create a dedicated, mobile-friendly member portal.

Members must be able to:

- Log in.
- View their profile.
- View membership details.
- Check expiry dates.
- View membership status.
- View payment history.
- View outstanding dues.
- View attendance history.
- View their digital membership card.
- Access their personal QR pass.
- Submit renewal enquiries.
- Update permitted profile fields.

Create a clean dashboard showing:

- Membership summary.
- Next expiry date.
- Attendance summary.
- Payment summary.
- Recent activity.

Members must only be able to see their own data.

A member must never be able to access another member's details
by changing an identifier in a URL or request.


==================================================
10. MEMBER REGISTRATION AND ONBOARDING
==================================================

Create a public Join Now flow.

The prospective member should be able to:

1. Enter their name.
2. Enter their phone number.
3. Enter their email.
4. Select a membership plan.
5. Review the selected plan.
6. Submit their registration or enquiry.

Save the enquiry in the database.

Show a confirmation only after the submission succeeds.

Provide an Enquiries section in the owner dashboard.

The owner should be able to:

- View enquiries.
- Search enquiries.
- Review the requested plan.
- Approve or reject an enquiry.
- Convert an approved enquiry into a member record.
- Assign a membership.
- Record an initial payment, if applicable.

Prevent duplicate members when converting enquiries.

Also support manually created members who receive an invitation
to activate their account later.

Link an invited account to the correct existing member record.


==================================================
11. QR-CODE ATTENDANCE SYSTEM
==================================================

Implement real QR-based attendance.

Do not build only a visual placeholder.

A. MEMBER QR PASS

Provide each member with a digital membership card containing
a secure QR credential.

The QR code should not expose:

- Private member information.
- Payment details.
- Authentication tokens.
- Predictable member identifiers.

Use a secure, revocable credential or signed, short-lived token
validated by a trusted backend.

B. STAFF SCANNER

Create a mobile-friendly attendance scanner.

Authorized staff should be able to:

- Open the scanner.
- Scan a member QR code.
- Submit the credential for server-side verification.
- View the validation result.
- Record attendance.
- See the member's name and relevant membership status.

C. SERVER-SIDE VALIDATION

Validate:

- Credential authenticity.
- Credential expiry or revocation.
- Member identity.
- Gym association.
- Membership rules.
- Staff authorization.
- Duplicate check-in rules.

Prevent forged QR codes and cross-gym check-ins.

Do not rely on frontend checks alone.

D. ATTENDANCE RECORDS

Record:

- Member.
- Gym.
- Check-in timestamp.
- Attendance method.
- Staff user, where applicable.
- Relevant correction or override details.

Prevent accidental duplicate check-ins.

Provide manual check-in as a fallback.

Create attendance history and daily attendance views.

Do not allow an ordinary member to create or edit attendance
records for themselves.


==================================================
12. STAFF MANAGEMENT AND PERMISSIONS
==================================================

Allow the gym owner to invite staff and manage their access.

Supported roles:

OWNER:
- Manage gym settings.
- Manage members.
- Manage plans.
- Manage memberships.
- Manage payments.
- Manage attendance.
- View reports.
- Manage permitted staff accounts.

RECEPTIONIST:
- View and manage permitted member records.
- Process permitted membership operations.
- Record manual payments.
- Check members in.
- View permitted reports.

TRAINER:
- Access only the member information needed for their duties.
- View permitted attendance information.
- Have no default access to financial records.

MEMBER:
- Access only their own profile, membership, payments,
  attendance, and permitted portal functions.

PLATFORM ADMINISTRATOR:
- Manage platform-level gym onboarding and configuration.

Enforce permissions in backend operations and database policies.

Do not rely on hiding buttons in the user interface.

Prevent unauthorized users from elevating their own roles.

Provide the ability to revoke staff access securely.


==================================================
13. NOTIFICATIONS AND REMINDERS
==================================================

Create a notification system.

Support reminders for:

- Membership expiring soon.
- Membership expired.
- Fees due.
- Membership renewal.
- New registration enquiry.
- Payment recorded.
- Important gym announcements.

Allow the owner to configure the number of days before expiry
for reminders.

Include an in-app notification centre.

Prepare the architecture for email notifications.

WhatsApp and SMS integrations may be added later.

Do not claim that an email, WhatsApp message, or SMS has been sent
unless a configured provider has actually accepted or delivered it
according to that provider's response.

For scheduled reminders, use an appropriate trusted backend
scheduler or scheduled function.

Do not depend on a browser being open for scheduled reminders.

Prevent duplicate reminders where practical.

Clearly identify integrations that still require external accounts,
credentials, or paid services.


==================================================
14. REPORTS AND ANALYTICS
==================================================

Create a Reports section.

Include:

- Total members.
- Active members.
- New registrations.
- Membership expirations.
- Membership renewals.
- Total collections.
- Collections by date range.
- Outstanding dues.
- Attendance by day.
- Attendance trends.
- Membership plan popularity.

Provide date-range filters.

Allow authorized users to export permitted data to CSV.

Use actual database records.

Calculate revenue from valid payment records, not from membership
prices or membership assignments.

Do not include failed, cancelled, or otherwise invalid payments
in collected revenue.

Clearly document the meaning of each financial statistic.

Keep reports responsive and easy to understand.


==================================================
15. TRAINERS AND FACILITIES MANAGEMENT
==================================================

Create dashboard sections to manage trainer profiles and facilities.

Trainer fields:

- Name.
- Photograph.
- Specialty.
- Experience.
- Biography.
- Active status.

Facility fields:

- Name.
- Description.
- Image.
- Display order.
- Active status.

Allow authorized owners to create, edit, reorder, and deactivate
these records.

The public website should display the active records.

Use appropriate image upload handling and storage permissions.


==================================================
16. CENTRALIZED WEBSITE CUSTOMIZATION
==================================================

This feature is essential to my business model.

Create a centralized gym configuration system.

Store configurable settings such as:

- Gym name.
- Logo.
- Favicon.
- Primary colour.
- Secondary colour.
- Accent colour.
- Background colour.
- Text colour.
- Typography settings.
- Hero image.
- Gallery images.
- Contact details.
- Phone number.
- Email.
- Address.
- Opening hours.
- Social media links.
- Website text.
- Membership plans.
- Trainer profiles.
- Facilities.
- Public enquiry settings.
- Member payment message.
- Domain mapping.

Create a settings interface for authorized gym owners.

Use centralized design tokens and reusable components.

Changing the configured branding should update the website consistently.

Do not hardcode Bobby Fym's branding separately in every page.

Separate branding from the application's business logic.

A future client should be onboarded by changing configuration
rather than manually rewriting components.

For this demo, use Bobby Fym as the default gym configuration.


==================================================
17. CUSTOM DOMAIN ARCHITECTURE
==================================================

My long-term plan is for every client gym to have its own domain.

Examples:

bobbyfym.example
anothergym.example

These are illustrative examples, not purchased domains.

Design the application so each configured hostname can resolve
to the correct gym's public website and branding.

Use an explicit, verified domain-to-gym mapping.

Requirements:

- Domain management interface.
- Domain verification status.
- Hostname validation.
- Correct gym configuration loading.
- Unknown-domain handling.
- No private data access based on hostname alone.
- No cross-gym data exposure.

Document the DNS, hosting, and SSL configuration required.

Do not claim that a custom domain has been purchased, connected,
or verified when it has not.

For the initial demo, use the development URL provided by the
development environment.


==================================================
18. DATABASE DESIGN
==================================================

Create a properly structured PostgreSQL schema.

Include tables or equivalent normalized structures for:

- Gyms.
- Gym domains.
- Gym settings.
- User profiles.
- Gym user memberships and roles.
- Members.
- Membership plans.
- Memberships.
- Membership fee obligations.
- Payments.
- Payment allocations, where required.
- Refunds or financial adjustments.
- Attendance.
- QR credentials or credential references.
- Registration enquiries.
- Trainers.
- Facilities.
- Notifications.
- Notification preferences.
- Audit logs.

Use UUIDs for internal identifiers where appropriate.

Every gym-owned record must have a gym identifier.

Use foreign keys and database constraints.

Create appropriate indexes.

Use consistent timestamp and date conventions.

Prevent invalid cross-gym relationships.

Use integer paise for financial amounts.

Keep sensitive data to a minimum.

Use database migrations so the schema can be reproduced reliably.

Avoid creating duplicate or redundant tables when an existing
well-designed structure can support the requirement.


==================================================
19. DATABASE SECURITY AND DATA ISOLATION
==================================================

Security is a requirement, not an optional enhancement.

Implement Row Level Security for all exposed tables.

Create explicit policies for SELECT, INSERT, UPDATE, and DELETE
as appropriate.

Ensure users can only access records permitted by their
authenticated identity, role, and gym association.

Never trust a gym ID supplied by the frontend without validating
the user's authorization for that gym.

Protect payment and membership operations against cross-gym access.

Prevent members from reading other members' records.

Prevent trainers from accessing financial records unless explicitly
authorized by the business's permission model.

Protect audit logs from unauthorized modification.

Keep privileged keys server-side.

Validate sensitive operations on trusted backend endpoints.

Use least-privilege access.

Test unauthorized requests rather than assuming the interface
makes the application secure.

Do not expose private environment variables to the browser.

Do not allow public sign-up to create platform administrators.


==================================================
20. AUDIT LOGS
==================================================

Record important actions, including:

- Member creation and modification.
- Membership creation and renewal.
- Payment creation.
- Refunds and payment corrections.
- Attendance corrections.
- Staff invitations.
- Permission changes.
- Gym configuration changes.

Store relevant information such as:

- Gym.
- Actor.
- Action.
- Target record.
- Timestamp.
- Appropriate change metadata.

Do not record passwords, secret keys, or other sensitive
authentication credentials in audit logs.

Prevent unauthorized users from editing audit records.

Avoid unnecessarily storing sensitive personal information
in log metadata.


==================================================
21. USER EXPERIENCE AND QUALITY
==================================================

Every visible control must have a clear purpose.

Implement functional navigation and buttons.

Provide:

- Loading indicators.
- Empty states.
- Success messages.
- Error messages.
- Form validation.
- Search.
- Filters.
- Pagination where appropriate.
- Confirmation dialogs.
- Responsive tables or mobile-friendly alternatives.
- Accessible labels.
- Keyboard-friendly forms.
- Useful error recovery.

Do not create dead links.

Do not show fake success messages when a database operation fails.

Do not use fake charts or static dashboard numbers to simulate
real application functionality.

Make sure public website pages and management pages use consistent
design systems while serving different purposes.

Optimize image loading and avoid unnecessarily heavy animations.


==================================================
22. DEMO DATA
==================================================

Use Bobby Fym as the initial demo gym.

Create a controlled way to populate the demo with sample records.

Sample records may include:

- Members.
- Membership plans.
- Memberships.
- Payment records.
- Attendance.
- Trainer profiles.
- Facilities.
- Testimonials.
- Enquiries.

Clearly identify sample records as demo data.

Do not use real people's private information.

Do not hardcode credentials into demo records.

Provide setup instructions for creating the first owner account.

Never copy Bobby Fym's members, payments, credentials, or attendance
into a real client's deployment.

Create a repeatable process for setting up a clean client instance.


==================================================
23. TESTING REQUIREMENTS
==================================================

Create a practical test checklist and verify the following.

AUTHENTICATION:
- Owner can log in and log out.
- Unauthorized users cannot access owner pages.
- Password recovery follows the configured authentication process.

MEMBERS:
- Owner can add a member.
- Owner can edit a member.
- Search and filters work.
- Members cannot view other members' private information.

MEMBERSHIPS:
- Plans can be created and edited.
- Membership dates are correct.
- Expiry calculations work.
- Renewals preserve relevant history.

PAYMENTS:
- Authorized staff can record manual payments.
- Payment history is persistent.
- Partial payments reduce outstanding balances correctly.
- Receipts contain accurate information.
- Revenue reports use valid payment records.
- Members cannot view other members' payments.

ATTENDANCE:
- Authorized staff can check in a member.
- QR credentials are validated by the backend.
- Invalid credentials are rejected.
- Duplicate check-ins are handled appropriately.
- Cross-gym attendance is rejected.

SECURITY:
- Users cannot elevate their own privileges.
- Users cannot access another gym's private records.
- Database permissions work independently of the frontend.
- Privileged secrets are not exposed in client code.

WEBSITE:
- Navigation works.
- Forms validate input.
- Membership plans load from the database.
- Website customization works.
- Responsive layouts work on mobile and desktop.

Do not claim tests have passed unless they have actually been run.


==================================================
24. IMPLEMENTATION PLAN
==================================================

Build the complete product in manageable stages within this
same Lovable project.

Do not attempt to generate every feature in one untested operation.

STAGE 1:
- Project structure.
- Design system.
- Public website.
- Database schema.
- Supabase setup.
- Authentication.
- Gym settings.
- Owner dashboard foundation.

STAGE 2:
- Member management.
- Membership plans.
- Membership lifecycle.
- Registration enquiries.

STAGE 3:
- Payment ledger.
- Outstanding dues.
- Receipts.
- Member payment page.

STAGE 4:
- Member portal.
- Staff accounts.
- Role permissions.
- QR attendance.

STAGE 5:
- Notifications.
- Reports.
- Website customization.
- Domain configuration architecture.
- Audit logs.

STAGE 6:
- Security verification.
- Integration testing.
- Responsive design testing.
- Demo data setup.
- Deployment documentation.

Establish the architecture and database relationships from the
beginning, even if individual features are implemented later.

After each stage, verify that previously working functionality
continues to work.

Maintain a checklist of completed, incomplete, and unconfigured
features.

If a requested feature cannot be completed in the current stage,
explain what remains rather than replacing it with a fake feature.


==================================================
25. FINAL DELIVERY REQUIREMENTS
==================================================

At the end of implementation, provide:

1. A summary of implemented features.
2. A summary of database tables and relationships.
3. A summary of security policies.
4. Supabase configuration instructions.
5. Instructions for securely creating the first owner account.
6. Instructions for testing the demo.
7. Instructions for adding demo records.
8. Instructions for changing the logo and colour palette.
9. Instructions for customizing website content and plans.
10. Instructions for preparing a new client deployment.
11. Instructions for configuring a client's custom domain.
12. A list of incomplete features.
13. A list of external integrations that still need configuration.
14. Known limitations and recommended next steps.

Do not mark incomplete functionality as complete.

Do not integrate a live payment gateway in this version.

Do not purchase or configure a real domain automatically.

Do not build unnecessary features outside the stated scope.

Prioritize a secure, maintainable, professional, functional product.

The finished application must serve as the reusable master demo
for my freelance gym website and management business.

PROJECT NAME: BOBBY FYM

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/edd20b84-841b-4d67-a3ae-ad29fa8c699e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
