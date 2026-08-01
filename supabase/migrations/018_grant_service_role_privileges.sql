-- Grant table/function privileges to service_role.
--
-- Hosted Supabase projects ship with ALTER DEFAULT PRIVILEGES configured, so
-- any table created through the dashboard implicitly grants to anon,
-- authenticated, and service_role. A database initialised locally
-- (`supabase start`) has no such defaults, so every query from the app's admin
-- client fails with "42501 permission denied for table ...".
--
-- Granting explicitly makes the schema portable: identical behaviour whether
-- the migrations are applied to a fresh local stack or a hosted project.
--
-- Only service_role is granted. Every app query goes through
-- createAdminClient() (service role), and RLS from migration 016 is what keeps
-- anon out of the public REST API — so anon deliberately gets nothing here.

grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Cover objects created by any later migration.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
alter default privileges in schema public
  grant execute on functions to service_role;
