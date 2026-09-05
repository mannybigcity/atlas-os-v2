-- Trial and checkout provisioning use service_role to create organizations
-- and memberships. Without explicit grants, membership lookup fails with
-- permission denied and workspace creation never runs.

grant select, insert on table public.organizations to service_role;
grant select, insert on table public.organization_memberships to service_role;
