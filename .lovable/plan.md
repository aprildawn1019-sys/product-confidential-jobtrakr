

## Plan: Insert Sample Demo Data for Dashboard Screenshot

The dashboard reads from the database via the store. We'll insert realistic sample data directly into the database tables so the dashboard looks populated and impressive.

### Data to Insert

**Jobs (8-10 jobs across pipeline stages)**
- Mix of statuses: saved, applied, screening, interviewing, offer
- Varied priorities (high/medium/low) and match scores (1-5)
- Real-sounding companies: Google, Stripe, Figma, Notion, Vercel, Airbnb, Shopify, Linear
- Product/engineering roles with salaries

**Contacts (4-6 contacts with follow-ups)**
- Linked to job companies
- Some with follow-up dates (overdue, today, upcoming) to populate the Follow-up Reminders panel
- Varied relationship warmth levels

**Interviews (3-4 upcoming)**
- Different types: phone, technical, behavioral, onsite
- Scheduled status with dates in the near future

**Target Companies (3-4)**
- Mix of priorities: dream, strong, interested
- Active statuses

### Technical Approach

1. **Script**: Run a SQL insert script via `psql` to populate `jobs`, `contacts`, `interviews`, `job_contacts`, and `target_companies` tables
2. **User ID**: Query for the existing user ID first, or use a placeholder that matches the authenticated user
3. **No schema changes** needed — all tables already exist with the right columns

### Important Notes
- The `jobs` table uses `urgency` (not `priority`) as the column name — the frontend maps it
- The `jobs` table uses `fit_score` for match scores
- Contact follow-up dates use `follow_up_date` column
- All tables have RLS requiring `user_id = auth.uid()`, so data must be tied to a real user

