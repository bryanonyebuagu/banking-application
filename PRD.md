# MASTER PRODUCT REQUIREMENTS DOCUMENT

## PROJECT

Build a comprehensive full-stack banking web application for Chaze Bank with a polished, trustworthy and accessible online-banking experience.

This is a private development/portfolio implementation intended to demonstrate the engineering required to build a large modern banking platform.

The application must have a REAL backend, REAL database persistence, REAL authentication for this application, working authorization, working account relationships, a functioning transaction ledger, working simulated transfers, cards, payments, statements, notifications, security controls and administrative functionality.

It must NOT simply be a collection of static screens.

---

# 1. CHAZE BANK UI REQUIREMENT

Chaze Bank is the product and customer-facing identity for this project.

Use established online-banking interaction patterns as design research while keeping all copy, branding, icons and assets original to Chaze Bank.

Pay close attention to:

- overall page composition
- blue/white color usage
- secondary colors
- backgrounds
- typography hierarchy
- font sizing
- font weight
- line heights
- spacing
- padding
- margins
- containers
- maximum widths
- navigation dimensions
- header behavior
- dropdown navigation
- buttons
- button dimensions
- border radii
- shadows
- borders
- forms
- labels
- input sizing
- cards
- tables
- account cards
- transaction rows
- icons
- alerts
- modals
- drawers
- tabs
- breadcrumbs
- pagination
- loading states
- responsive breakpoints
- mobile navigation
- desktop navigation
- footer structure
- dashboard organization
- account-detail organization
- interaction patterns

Do not loosely interpret the reference and then create an unrelated banking design.

Where a public banking-interface reference has been supplied, use it only for general layout and interaction research.

Use only the original Chaze Bank name, wordmark, icons and visual assets.

Create a reusable placeholder:

<BankLogo />

The logo must be isolated so that it can later be replaced without changing the navigation/header architecture.

Use a temporary neutral wordmark such as:

Chaze Bank

Do not hard-code the placeholder throughout the application.

---

# 2. REFERENCE MATERIAL

Create:

/docs/references/

Reference screenshots may be placed here.

Organize them by feature:

/docs/references/public
/docs/references/auth
/docs/references/dashboard
/docs/references/accounts
/docs/references/cards
/docs/references/transfers
/docs/references/payments
/docs/references/statements
/docs/references/security
/docs/references/mobile

When implementing a screen with a supplied reference image:

1. Inspect the reference.
2. Identify its layout.
3. Identify component boundaries.
4. Identify spacing.
5. Identify typography.
6. Identify colors.
7. Identify responsive behavior.
8. Reproduce those observable characteristics.
9. Compare the implementation against the reference.
10. Correct significant visual differences.

Maintain consistency across screens.

---

# 3. TECHNOLOGY STACK

## Frontend

Use:

- Next.js
- React
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod
- TanStack Query where appropriate

Use:

- Server Components where appropriate
- Client Components where interactivity requires them

Avoid unnecessary client-side rendering.

---

# 4. BACKEND

Use:

- Next.js server functionality
- TypeScript
- Supabase
- PostgreSQL

Create clear backend/service layers for:

- authentication
- customers
- accounts
- ledger
- transactions
- transfers
- cards
- payments
- statements
- loans
- mortgages
- investments
- notifications
- security
- support
- administration

Do not place important banking business logic directly inside React presentation components.

---

# 5. SUPABASE

Use Supabase as the managed backend platform.

The developer must be able to log into Supabase and inspect:

- authentication users
- profiles
- customers
- accounts
- transactions
- ledger entries
- transfers
- cards
- payments
- loans
- mortgages
- investment records
- notifications
- support tickets
- security events
- audit logs

The application must automatically read/write its data.

The developer should NOT need to manually update database records for normal application functionality.

---

# 6. AUTHENTICATION

Use Supabase Auth.

Implement real authentication belonging to THIS application.

Support:

- signup
- login
- logout
- email verification
- forgot password
- password reset
- persistent sessions
- session expiration
- protected routes
- MFA architecture
- device/session management
- login history
- session revocation

Authentication data must persist correctly.

Passwords must be processed through the authentication provider's secure password system.

Never create a database column containing plaintext passwords.

Never log passwords.

Never return passwords through APIs.

Never expose password hashes to clients.

---

# 7. REGISTRATION

Create a polished multi-step banking registration experience.

Collect:

- email
- password
- password confirmation
- first name
- middle name
- last name
- date of birth
- phone
- address
- city
- state
- postal code
- country
- employment information
- income range

Persist appropriate profile information.

Passwords belong exclusively to Supabase Auth.

---

# 8. IDENTITY VERIFICATION SIMULATOR

Create a realistic KYC/identity-verification architecture.

The UI may model fields such as:

- SSN/ITIN
- government identification
- identity number
- verification questions

However, development/demo environments must accept only synthetic test identity information.

Do not collect real SSNs, BVNs, CVVs, bank passwords or equivalent credentials belonging to real people.

The important engineering requirement is that the COMPLETE verification workflow exists.

Statuses:

- Not Started
- Pending
- Verified
- Failed
- Manual Review

Create a provider abstraction:

IdentityVerificationProvider

so that a legitimate regulated KYC provider can later replace the simulator without rebuilding the frontend.

---

# 9. PUBLIC WEBSITE

Implement the complete banking website structure.

Navigation should cover:

- Personal
- Business
- Commercial
- Wealth Management

Personal banking:

- Checking
- Savings
- Credit Cards
- Home Loans
- Auto
- Investing
- Education
- Security
- Help

Create:

- Homepage
- Checking
- Savings
- Credit Cards
- Mortgage
- Auto financing
- Investing
- Business banking
- Security
- Help center
- FAQ
- Contact

Navigation must work on desktop and mobile.

---

# 10. CUSTOMER DATABASE

Create customer records containing appropriate fields such as:

customer_id
auth_user_id
first_name
middle_name
last_name
email
phone
date_of_birth
address
city
state
postal_code
country
customer_since
verification_status
account_status
created_at
updated_at

Connect customer records to Supabase authentication identities.

---

# 11. CHAZE BANK ACCOUNTS

Support:

- Checking
- Savings

Each account contains:

account_id
customer_id
account_type
account_name
masked_account_number
routing_identifier
ledger_balance
available_balance
currency
status
opened_at
created_at
updated_at

Statuses:

- Active
- Frozen
- Restricted
- Closed

Use synthetic banking identifiers.

---

# 12. ONLINE BANKING DASHBOARD

Build a detailed Chaze Bank online-banking dashboard using the approved design system and supplied product requirements.

Include:

- customer greeting
- account overview
- checking
- savings
- credit cards
- loans
- investments
- balances
- recent transactions
- upcoming payments
- alerts
- quick actions

Quick actions:

- Transfer Money
- Pay Bills
- Send Money
- Deposit
- Manage Cards
- View Statements
- Open Account

Everything that appears interactive must either work or clearly indicate that the feature is unavailable in the current development phase.

Do not create fake working buttons.

---

# 13. FINANCIAL LEDGER

Do not treat balances as arbitrary numbers.

Build a proper ledger.

Support:

- deposits
- withdrawals
- internal transfers
- simulated external transfers
- card purchases
- refunds
- bill payments
- interest
- fees
- adjustments
- reversals

Ledger entries must provide an auditable history of balance-changing operations.

Financial operations must be atomic.

Do not directly modify balances from frontend code.

---

# 14. TRANSACTIONS

Transaction fields should include:

transaction_id
account_id
transaction_type
amount
currency
merchant
description
category
status
created_at
posted_at

Statuses:

- Pending
- Posted
- Failed
- Reversed

Implement:

- transaction history
- search
- date filtering
- amount filtering
- category filtering
- merchant filtering
- transaction details
- pagination

---

# 15. TRANSFERS

Support:

- Checking → Savings
- Savings → Checking
- Own account → another simulated account
- Saved simulated recipient
- Scheduled transfer
- Recurring transfer

Workflow:

1. Select source.
2. Select destination.
3. Enter amount.
4. Select date.
5. Add memo.
6. Review.
7. Complete authentication/security step when required.
8. Confirm.
9. Execute transaction.
10. Display receipt.

Implement:

- authorization
- ownership checks
- sufficient-funds checks
- transaction isolation
- idempotency
- duplicate-request protection
- audit logging

---

# 16. BILL PAY

Create:

- Payees
- Add Payee
- Edit Payee
- Delete Payee
- One-Time Payment
- Scheduled Payment
- Recurring Payment
- Payment History

Statuses:

- Scheduled
- Processing
- Completed
- Failed
- Cancelled

---

# 17. CREDIT CARDS

Create simulated credit-card accounts.

Display:

- card artwork
- masked card number
- cardholder
- available credit
- credit limit
- current balance
- statement balance
- minimum payment
- payment due date

Actions:

- Pay Card
- Lock Card
- Unlock Card
- Replace Card
- Report Lost/Stolen
- Manage Limits
- Manage Alerts
- View Transactions

Use synthetic card information.

Do not store real CVVs.

---

# 18. CARD TRANSACTIONS

Support:

- Pending Purchase
- Posted Purchase
- Refund
- Reversal

Display:

- merchant
- amount
- date
- category
- location
- status

---

# 19. CHECK DEPOSIT

Build a simulated check-deposit workflow.

Flow:

Select account
→ Enter amount
→ Upload test check image
→ Review
→ Submit
→ Processing status

Statuses:

- Submitted
- Reviewing
- Accepted
- Rejected

Do not process actual checks.

---

# 20. STATEMENTS

Generate statements using actual simulator ledger data.

Allow:

- account selection
- statement period
- statement viewing
- PDF generation
- download

Include:

- customer name
- masked account
- statement period
- opening balance
- deposits
- withdrawals
- fees
- interest
- closing balance
- transaction table

---

# 21. LOANS

Support simulated:

- Personal Loans
- Auto Loans

Store:

- principal
- outstanding balance
- interest rate
- term
- monthly payment
- next payment
- payment history

Create loan overview and payment screens.

---

# 22. MORTGAGES

Create:

- mortgage dashboard
- principal balance
- interest rate
- escrow
- monthly payment
- due date
- payment history
- amortization information

Create a simulated mortgage-application workflow.

---

# 23. INVESTMENTS

Create simulated investment accounts.

Display:

- portfolio value
- cash
- holdings
- allocation
- gains/losses
- historical performance
- investment transactions

Do not connect to actual brokerage accounts or execute securities trades.

---

# 24. SPENDING ANALYTICS

Categorize transactions into:

- Dining
- Groceries
- Shopping
- Transportation
- Travel
- Entertainment
- Utilities
- Subscriptions
- Housing
- Healthcare
- Other

Display:

- monthly spending
- monthly income
- expenses
- cash flow
- category breakdown
- historical trends

Charts must use actual simulator data rather than hardcoded screenshots.

---

# 25. NOTIFICATIONS

Create persistent notifications.

Examples:

- Deposit received
- Transfer completed
- Payment scheduled
- Payment completed
- Card locked
- New login
- Password changed
- Security alert

Implement:

- read/unread
- mark all read
- notification preferences
- notification history

---

# 26. SECURITY CENTER

Create:

- password management
- MFA
- trusted devices
- active sessions
- login history
- security events
- account alerts

Actions:

- Change Password
- Enable/Disable MFA
- Sign Out Other Sessions
- Remove Device
- Review Security Event

---

# 27. PROFILE & SETTINGS

Create:

- Personal Information
- Contact Information
- Addresses
- Account Preferences
- Security
- Notifications
- Privacy
- Documents
- Account Nicknames

---

# 28. SUPPORT

Implement:

- Help Center
- FAQ
- Search
- Support Articles
- Secure Messages
- Support Tickets

Statuses:

- Open
- In Progress
- Waiting for Customer
- Resolved
- Closed

---

# 29. ADMINISTRATION SYSTEM

Build a completely separate protected staff interface.

Roles:

- Customer
- Support Agent
- Fraud Analyst
- Operations
- Administrator

Staff functionality:

- Customer Search
- Customer Profile
- Account Lookup
- Transaction Lookup
- Transfer Lookup
- Payment Lookup
- Card Management
- Account Restrictions
- Support Tickets
- Verification Review
- Security Events
- Audit Logs

Authorization must be server-side.

A normal customer must never gain administrative access by modifying frontend state.

---

# 30. AUDIT LOGGING

Create immutable audit events.

Fields:

audit_id
actor_id
actor_role
action
resource_type
resource_id
timestamp
metadata

Privileged operations must generate audit events.

---

# 31. DATABASE

Create normalized PostgreSQL tables including:

profiles
customers
addresses
accounts
ledger_entries
transactions
transfers
transfer_recipients
cards
card_transactions
payees
payments
loans
loan_payments
mortgages
mortgage_payments
investment_accounts
investment_holdings
investment_transactions
notifications
statements
support_tickets
support_messages
devices
login_events
security_events
verification_records
audit_logs

Use:

- UUID primary keys
- foreign keys
- unique constraints
- check constraints
- indexes
- created_at
- updated_at where appropriate

Create migrations for all schema changes.

---

# 32. ROW LEVEL SECURITY

Enable Supabase RLS.

Customer A must NEVER access Customer B's:

- profile
- accounts
- balances
- transactions
- cards
- transfers
- statements
- messages
- security information

Do not rely on hidden UI elements for authorization.

Enforce access at the server/database level.

---

# 33. APPLICATION SECURITY

Implement:

- server-side authorization
- RLS
- secure sessions
- secure cookies where applicable
- CSRF protection where applicable
- XSS mitigation
- rate limiting
- schema validation
- SQL injection protection
- login throttling
- security event logging
- appropriate secrets management

Never expose service-role keys or private server environment variables to browser code.

---

# 34. RESPONSIVE DESIGN

Support:

- Large desktop
- Laptop
- Tablet
- Mobile

Deliver polished responsive behavior across the supplied viewport requirements.

Avoid:

- horizontal overflow
- broken tables
- clipped content
- inaccessible navigation

---

# 35. ACCESSIBILITY

Implement:

- semantic HTML
- labels
- keyboard navigation
- focus management
- accessible validation
- screen-reader support
- ARIA where appropriate
- sufficient contrast

---

# 36. APPLICATION STATES

Every asynchronous feature must account for:

- Initial
- Loading
- Success
- Empty
- Validation Error
- Server Error
- Unauthorized
- Forbidden
- Not Found

Use appropriate skeletons/spinners/error states.

---

# 37. TEST DATA

Create a seed system.

Generate multiple synthetic customers with:

- authentication accounts
- profiles
- checking accounts
- savings accounts
- simulated credit cards
- transactions
- transfers
- payments
- statements
- loans
- mortgage records
- investments
- notifications
- support messages

Seed data should make the application immediately demonstrable.

---

# 38. TESTING

Implement:

- unit tests
- integration tests
- authentication tests
- authorization tests
- RLS tests
- ledger tests
- transfer tests
- payment tests
- card tests
- admin-permission tests
- end-to-end tests

Explicitly attempt authorization attacks during testing.

Example:

Authenticate as Customer A.

Request Customer B's account ID directly through the API.

EXPECTED:

Access denied.

Repeat equivalent tests against:

transactions
cards
transfers
statements
profile information

---

# 39. PROJECT DOCUMENTATION

At repository root create:

AGENTS.md
PRD.md
ARCHITECTURE.md
DATABASE.md
DESIGN_SYSTEM.md
SECURITY.md

Create:

/docs/references/

Create focused project skills where supported for:

- banking backend/ledger development
- banking UI implementation
- Supabase/PostgreSQL development

AGENTS.md must instruct future coding sessions to read and respect the project's existing architecture before making substantial changes.

---

# 40. DESIGN SYSTEM

DESIGN_SYSTEM.md must document the design tokens extracted from the supplied/reference banking interface.

Document:

- colors
- typography
- heading hierarchy
- body typography
- spacing
- container widths
- borders
- radii
- shadows
- button variants
- form controls
- cards
- tables
- navigation
- breakpoints
- responsive rules

Implement these as reusable tokens/components.

Do not scatter arbitrary one-off CSS values throughout the application.

---

# 41. COMPONENT SYSTEM

Build reusable primitives such as:

Button
Input
Select
Checkbox
Radio
Modal
Drawer
Tabs
Alert
Toast
Card
Table
Pagination
Skeleton
Spinner
EmptyState
ErrorState
BankLogo

Build banking-specific components such as:

AccountCard
BalanceDisplay
TransactionRow
TransactionTable
CardPreview
TransferForm
PaymentCard
StatementRow
SecurityAlert
NotificationItem

Reuse existing components before creating another implementation.

---

# 42. PROJECT STRUCTURE

Use a scalable structure.

Separate:

- routes/pages
- UI components
- banking components
- server functionality
- database access
- services
- validation schemas
- types
- authentication
- authorization
- hooks
- utilities
- configuration

Avoid giant page components.

---

# 43. ENVIRONMENT VARIABLES

Create:

.env.example

Document every required environment variable.

Never commit actual secrets.

Validate required server environment variables during startup.

---

# 44. DEVELOPMENT EXPERIENCE

Provide:

README.md
setup instructions
database migrations
seed scripts
development scripts
testing commands
lint commands
typecheck commands
production build commands

A developer should be able to:

clone repository
→ install dependencies
→ create/configure Supabase
→ configure environment
→ run migrations
→ seed database
→ start application

without manually constructing database tables.

---

# 45. IMPLEMENTATION PROCESS

DO NOT attempt to implement the entire application in one uncontrolled pass.

FIRST:

1. Inspect the repository.
2. Read this PRD.
3. Create AGENTS.md.
4. Create ARCHITECTURE.md.
5. Create DATABASE.md.
6. Create DESIGN_SYSTEM.md.
7. Create SECURITY.md.
8. Establish the folder structure.
9. Establish database architecture.
10. Establish authentication architecture.
11. Establish authorization architecture.
12. Establish component architecture.
13. Establish the implementation roadmap.

STOP.

Show the resulting architecture before beginning application implementation.

---

# 46. IMPLEMENTATION PHASES

After the architecture has been established, implement sequentially:

Phase 1 — Foundation

Phase 2 — Database and migrations

Phase 3 — Authentication

Phase 4 — Registration and simulated verification

Phase 5 — Public banking website

Phase 6 — Online banking dashboard

Phase 7 — Accounts

Phase 8 — Ledger

Phase 9 — Transaction history

Phase 10 — Transfers

Phase 11 — Bill Pay

Phase 12 — Credit Cards

Phase 13 — Check Deposit Simulation

Phase 14 — Statements

Phase 15 — Loans

Phase 16 — Mortgages

Phase 17 — Investments

Phase 18 — Spending Analytics

Phase 19 — Notifications

Phase 20 — Profile and Settings

Phase 21 — Security Center

Phase 22 — Support

Phase 23 — Administration

Phase 24 — Responsive Fidelity

Phase 25 — Accessibility

Phase 26 — Automated Testing

Phase 27 — Security Review

Phase 28 — Final UI Fidelity Review

---

# 47. PHASE COMPLETION RULE

At the end of EVERY implementation phase:

1. Run TypeScript type checking.
2. Run linting.
3. Run relevant automated tests.
4. Run/build the application.
5. Inspect failures.
6. Fix failures.
7. Re-run verification.

Do not continue knowingly with:

- TypeScript errors
- broken imports
- failing tests
- broken builds
- dead buttons
- missing database migrations
- broken responsive layouts
- duplicate implementations

---

# 48. VISUAL FIDELITY REVIEW

After implementing a reference screen:

Compare the implementation against the approved Chaze Bank design system and supplied product requirements.

Check:

- dimensions
- alignment
- spacing
- typography
- colors
- borders
- shadows
- navigation
- component sizing
- responsive behavior
- mobile behavior

Correct meaningful differences before declaring the screen complete.

Do not redesign the reference simply because another design looks more modern.

---

# 49. DATA PERSISTENCE

This is NOT a static prototype.

Data created through the application must persist.

Examples:

Creating a customer
→ persists customer/profile records.

Creating an account
→ persists account records.

Making a simulated transfer
→ persists transfer and ledger records.

Locking a card
→ persists card state.

Creating a support ticket
→ persists ticket/message records.

Changing notification settings
→ persists preferences.

Logging in
→ creates appropriate authentication/session/security activity.

Refreshing the browser must not reset persistent application data.

---

# 50. DEFINITION OF DONE

A test customer must be able to:

Register
Authenticate
Verify email
Complete simulated identity verification
Log in
Log out
Reset password
View dashboard
View checking
View savings
View transactions
Search transactions
Transfer simulated funds
Manage simulated cards
Pay simulated bills
View statements
View loans
View mortgage information
View simulated investments
View spending analytics
Manage profile
Manage security
Manage sessions
Receive notifications
Contact support

Authorized staff must be able to manage the appropriate simulator records through a protected administration system.

All appropriate state must persist in PostgreSQL/Supabase.

The final application should demonstrate the frontend, backend, database, authentication, authorization, financial-ledger, security, responsive-design and software-architecture requirements of a sophisticated banking web application.
