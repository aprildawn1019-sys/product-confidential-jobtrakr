
The user wants to remove fake/seed data before launch. Let me think about what's likely in this app:

1. The app uses Supabase with RLS - data is per-user
2. Memory mentions "fictional records in docs/images/hero.png" - so there's likely demo data somewhere
3. Need to check: hardcoded seed data in code, demo records in DB, any onboarding sample data, marketing screenshots

Let me explore to identify all sources of fake data before presenting a removal plan.
