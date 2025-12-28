-- Add verification-related fields to resorts
alter table public.resorts
  add column if not exists registration_number text,
  add column if not exists dti_sec_certificate_url text,
  add column if not exists business_permit_url text,
  add column if not exists gov_id_owner_url text,
  add column if not exists website_url text,
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists contact_email_verified boolean not null default false,
  add column if not exists contact_phone_verified boolean not null default false,
  add column if not exists location_verified boolean not null default false,
  add column if not exists verification_notes text;
