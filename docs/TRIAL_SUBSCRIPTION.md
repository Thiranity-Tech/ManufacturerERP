# Desktop trial and subscription control

The Windows EXE connects to the same Supabase project as the web app. Access is enforced by Supabase Row Level Security, so copying the EXE does not bypass a disabled subscription.

## One-time setup

1. Run `supabase/schema.sql`, then `supabase/subscriptions.sql` in the Supabase SQL Editor.
2. Build the Windows installer with `npm install` followed by `npm run dist`.
3. Send the installer or portable EXE from the generated `release` folder to the trial customer.

A new workspace receives a 30-day `trial` automatically. After the end date, Supabase refuses data reads and writes and the EXE shows the subscription-ended screen.

## Access administration

Find the organization UUID in the Supabase Table Editor (`organizations`), then run one of the following in SQL Editor.

```sql
-- Give or renew access for 30 days
update public.organization_subscriptions
set status = 'active', access_ends_at = now() + interval '30 days', updated_at = now()
where organization_id = 'ORG_UUID';

-- Stop access immediately
update public.organization_subscriptions
set status = 'suspended', updated_at = now()
where organization_id = 'ORG_UUID';
```

The customer needs an internet connection for Supabase authentication and data access.
