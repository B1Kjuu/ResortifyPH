-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resort_id uuid,
  guest_id uuid,
  date_from date,
  date_to date,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text, 'cancelled'::text])),
  created_at timestamp with time zone DEFAULT now(),
  guest_count integer NOT NULL DEFAULT 1,
  updated_at timestamp with time zone DEFAULT now(),
  resort_province text,
  resort_region_code text,
  resort_region_name text,
  cancellation_status text CHECK (cancellation_status = ANY (ARRAY['requested'::text, 'approved'::text, 'rejected'::text])),
  cancellation_requested_at timestamp with time zone,
  cancellation_reason text,
  cancellation_approved_at timestamp with time zone,
  payment_verified_at timestamp with time zone,
  payment_method text,
  payment_reference text,
  verified_by uuid,
  verified_notes text,
  children_count integer NOT NULL DEFAULT 0 CHECK (children_count >= 0),
  pets_count integer NOT NULL DEFAULT 0 CHECK (pets_count >= 0),
  booking_type text CHECK (booking_type IS NULL OR (booking_type = ANY (ARRAY['daytour'::text, 'overnight'::text, '22hrs'::text, 'day_12h'::text, 'overnight_22h'::text]))),
  time_slot_id text,
  check_in_time text,
  check_out_time text,
  total_price numeric,
  downpayment_amount numeric,
  day_type text CHECK (day_type IS NULL OR (day_type = ANY (ARRAY['weekday'::text, 'weekend'::text]))),
  guest_tier_id text,
  resort_time_slot_id uuid,
  resort_guest_tier_id uuid,
  actual_check_in time without time zone,
  actual_check_out time without time zone,
  booked_day_type text CHECK (booked_day_type = ANY (ARRAY['weekday'::text, 'weekend'::text])),
  payment_status text DEFAULT 'unpaid'::text CHECK (payment_status = ANY (ARRAY['unpaid'::text, 'pending'::text, 'verified'::text, 'partial'::text])),
  total_amount numeric,
  amount_paid numeric DEFAULT 0,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_resort_id_fkey FOREIGN KEY (resort_id) REFERENCES public.resorts(id),
  CONSTRAINT bookings_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.profiles(id),
  CONSTRAINT bookings_resort_time_slot_id_fkey FOREIGN KEY (resort_time_slot_id) REFERENCES public.resort_time_slots(id),
  CONSTRAINT bookings_resort_guest_tier_id_fkey FOREIGN KEY (resort_guest_tier_id) REFERENCES public.resort_guest_tiers(id)
);
CREATE TABLE public.chat_message_audit (
  id bigint NOT NULL DEFAULT nextval('chat_message_audit_id_seq'::regclass),
  message_id uuid,
  chat_id uuid,
  sender_id uuid,
  content text,
  attachment_url text,
  attachment_type text,
  attachment_name text,
  attachment_size integer,
  action text NOT NULL CHECK (action = ANY (ARRAY['insert'::text, 'update'::text, 'delete'::text])),
  acted_by uuid,
  acted_at timestamp with time zone NOT NULL DEFAULT now(),
  previous_content text,
  previous_attachment_url text,
  previous_attachment_type text,
  previous_attachment_name text,
  previous_attachment_size integer,
  CONSTRAINT chat_message_audit_pkey PRIMARY KEY (id)
);
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone,
  attachment_url text,
  attachment_type text,
  attachment_name text,
  attachment_size integer,
  deleted_at timestamp with time zone,
  is_hidden boolean DEFAULT false,
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT fk_cm_chat FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT fk_cm_sender FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.chat_participants (
  chat_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['guest'::text, 'owner'::text, 'admin'::text])),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT chat_participants_pkey PRIMARY KEY (chat_id, user_id),
  CONSTRAINT fk_cp_chat FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT fk_cp_user FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.chat_typing (
  chat_id uuid NOT NULL,
  user_id uuid NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_typing_pkey PRIMARY KEY (chat_id, user_id),
  CONSTRAINT chat_typing_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT chat_typing_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.chats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid,
  status text NOT NULL DEFAULT 'open'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  resort_id uuid,
  creator_id uuid,
  CONSTRAINT chats_pkey PRIMARY KEY (id),
  CONSTRAINT fk_chats_booking FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT chats_resort_id_fkey FOREIGN KEY (resort_id) REFERENCES public.resorts(id),
  CONSTRAINT chats_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resort_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT favorites_pkey PRIMARY KEY (id),
  CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT favorites_resort_id_fkey FOREIGN KEY (resort_id) REFERENCES public.resorts(id)
);
CREATE TABLE public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id),
  CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.moderation_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  action text NOT NULL CHECK (action = ANY (ARRAY['in_review'::text, 'resolved'::text, 'rejected'::text])),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT moderation_actions_pkey PRIMARY KEY (id),
  CONSTRAINT moderation_actions_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  metadata jsonb DEFAULT '{}'::jsonb,
  actor_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id)
);
CREATE TABLE public.payment_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  chat_id uuid,
  submitted_by uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL,
  reference_number text,
  receipt_url text,
  notes text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text])),
  verified_by uuid,
  verified_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT payment_submissions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT payment_submissions_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT payment_submissions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id),
  CONSTRAINT payment_submissions_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.payment_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Default'::text,
  payment_method text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  bank_name text,
  additional_notes text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_templates_pkey PRIMARY KEY (id),
  CONSTRAINT payment_templates_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  role text DEFAULT 'guest'::text CHECK (role = ANY (ARRAY['guest'::text, 'owner'::text])),
  created_at timestamp with time zone DEFAULT now(),
  is_admin boolean NOT NULL DEFAULT false,
  email text NOT NULL UNIQUE,
  avatar_url text,
  phone text,
  bio text,
  location text,
  is_suspended boolean DEFAULT false,
  suspended_reason text,
  suspended_at timestamp with time zone,
  last_login_at timestamp with time zone,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  chat_id uuid,
  message_id uuid,
  target_user_id uuid,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT reports_pkey PRIMARY KEY (id)
);
CREATE TABLE public.resort_guest_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL,
  label text NOT NULL,
  min_guests integer NOT NULL CHECK (min_guests >= 1),
  max_guests integer,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT resort_guest_tiers_pkey PRIMARY KEY (id),
  CONSTRAINT resort_guest_tiers_resort_id_fkey FOREIGN KEY (resort_id) REFERENCES public.resorts(id)
);
CREATE TABLE public.resort_pricing_matrix (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL,
  time_slot_id uuid NOT NULL,
  guest_tier_id uuid NOT NULL,
  day_type text NOT NULL CHECK (day_type = ANY (ARRAY['weekday'::text, 'weekend'::text])),
  price numeric NOT NULL CHECK (price >= 0::numeric),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT resort_pricing_matrix_pkey PRIMARY KEY (id),
  CONSTRAINT resort_pricing_matrix_resort_id_fkey FOREIGN KEY (resort_id) REFERENCES public.resorts(id),
  CONSTRAINT resort_pricing_matrix_time_slot_id_fkey FOREIGN KEY (time_slot_id) REFERENCES public.resort_time_slots(id),
  CONSTRAINT resort_pricing_matrix_guest_tier_id_fkey FOREIGN KEY (guest_tier_id) REFERENCES public.resort_guest_tiers(id)
);
CREATE TABLE public.resort_time_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL,
  slot_type text NOT NULL CHECK (slot_type = ANY (ARRAY['daytour'::text, 'overnight'::text, '22hrs'::text])),
  label text NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  crosses_midnight boolean NOT NULL DEFAULT false,
  hours numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT resort_time_slots_pkey PRIMARY KEY (id),
  CONSTRAINT resort_time_slots_resort_id_fkey FOREIGN KEY (resort_id) REFERENCES public.resorts(id)
);
CREATE TABLE public.resorts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid,
  name text,
  description text,
  location text,
  price integer,
  capacity integer,
  amenities ARRAY,
  images ARRAY,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  type text DEFAULT 'city'::text CHECK (type = ANY (ARRAY['beach'::text, 'mountain'::text, 'nature'::text, 'city'::text, 'countryside'::text])),
  bedrooms integer,
  bathrooms integer,
  contact_number text,
  check_in_time time without time zone DEFAULT '14:00:00'::time without time zone,
  check_out_time time without time zone DEFAULT '12:00:00'::time without time zone,
  house_rules text,
  cancellation_policy text DEFAULT 'flexible'::text,
  updated_at timestamp with time zone DEFAULT now(),
  day_tour_price numeric,
  night_tour_price numeric,
  overnight_price numeric,
  additional_guest_fee numeric,
  pool_size text,
  pool_depth text,
  has_pool_heating boolean DEFAULT false,
  has_jacuzzi boolean DEFAULT false,
  parking_slots integer,
  nearby_landmarks text,
  bring_own_items text,
  region_code text,
  region_name text,
  latitude numeric,
  longitude numeric,
  address text,
  registration_number text,
  dti_sec_certificate_url text,
  business_permit_url text,
  gov_id_owner_url text,
  website_url text,
  facebook_url text,
  instagram_url text,
  contact_email_verified boolean NOT NULL DEFAULT false,
  contact_phone_verified boolean NOT NULL DEFAULT false,
  location_verified boolean NOT NULL DEFAULT false,
  verification_notes text,
  pricing_config jsonb,
  downpayment_percentage integer DEFAULT 50 CHECK (downpayment_percentage >= 0 AND downpayment_percentage <= 100),
  allow_split_day boolean DEFAULT true,
  use_advanced_pricing boolean DEFAULT false,
  CONSTRAINT resorts_pkey PRIMARY KEY (id),
  CONSTRAINT resorts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL,
  booking_id uuid NOT NULL,
  guest_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_hidden boolean DEFAULT false,
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_resort_id_fkey FOREIGN KEY (resort_id) REFERENCES public.resorts(id),
  CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT reviews_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.storage_activity (
  id bigint NOT NULL DEFAULT nextval('storage_activity_id_seq'::regclass),
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  bucket_id text NOT NULL,
  object_name text NOT NULL,
  owner uuid,
  size_bytes bigint,
  CONSTRAINT storage_activity_pkey PRIMARY KEY (id)
);
CREATE TABLE public.storage_alerts (
  id bigint NOT NULL DEFAULT nextval('storage_alerts_id_seq'::regclass),
  detected_at timestamp with time zone NOT NULL DEFAULT now(),
  owner uuid,
  bucket_id text,
  object_count integer,
  window_minutes integer,
  note text,
  CONSTRAINT storage_alerts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_presence (
  user_id uuid NOT NULL,
  status text DEFAULT 'offline'::text CHECK (status = ANY (ARRAY['online'::text, 'offline'::text, 'away'::text])),
  last_seen timestamp with time zone DEFAULT now(),
  CONSTRAINT user_presence_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE auth.audit_log_entries (
  instance_id uuid,
  id uuid NOT NULL,
  payload json,
  created_at timestamp with time zone,
  ip_address character varying NOT NULL DEFAULT ''::character varying,
  CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.flow_state (
  id uuid NOT NULL,
  user_id uuid,
  auth_code text NOT NULL,
  code_challenge_method USER-DEFINED NOT NULL,
  code_challenge text NOT NULL,
  provider_type text NOT NULL,
  provider_access_token text,
  provider_refresh_token text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  authentication_method text NOT NULL,
  auth_code_issued_at timestamp with time zone,
  CONSTRAINT flow_state_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.identities (
  provider_id text NOT NULL,
  user_id uuid NOT NULL,
  identity_data jsonb NOT NULL,
  provider text NOT NULL,
  last_sign_in_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  email text DEFAULT lower((identity_data ->> 'email'::text)),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT identities_pkey PRIMARY KEY (id),
  CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.instances (
  id uuid NOT NULL,
  uuid uuid,
  raw_base_config text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  CONSTRAINT instances_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.mfa_amr_claims (
  session_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  authentication_method text NOT NULL,
  id uuid NOT NULL,
  CONSTRAINT mfa_amr_claims_pkey PRIMARY KEY (id),
  CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id)
);
CREATE TABLE auth.mfa_challenges (
  id uuid NOT NULL,
  factor_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL,
  verified_at timestamp with time zone,
  ip_address inet NOT NULL,
  otp_code text,
  web_authn_session_data jsonb,
  CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id),
  CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id)
);
CREATE TABLE auth.mfa_factors (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  friendly_name text,
  factor_type USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  secret text,
  phone text,
  last_challenged_at timestamp with time zone UNIQUE,
  web_authn_credential jsonb,
  web_authn_aaguid uuid,
  last_webauthn_challenge_data jsonb,
  CONSTRAINT mfa_factors_pkey PRIMARY KEY (id),
  CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.oauth_authorizations (
  id uuid NOT NULL,
  authorization_id text NOT NULL UNIQUE,
  client_id uuid NOT NULL,
  user_id uuid,
  redirect_uri text NOT NULL CHECK (char_length(redirect_uri) <= 2048),
  scope text NOT NULL CHECK (char_length(scope) <= 4096),
  state text CHECK (char_length(state) <= 4096),
  resource text CHECK (char_length(resource) <= 2048),
  code_challenge text CHECK (char_length(code_challenge) <= 128),
  code_challenge_method USER-DEFINED,
  response_type USER-DEFINED NOT NULL DEFAULT 'code'::auth.oauth_response_type,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::auth.oauth_authorization_status,
  authorization_code text UNIQUE CHECK (char_length(authorization_code) <= 255),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '00:03:00'::interval),
  approved_at timestamp with time zone,
  nonce text CHECK (char_length(nonce) <= 255),
  CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id),
  CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id),
  CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.oauth_client_states (
  id uuid NOT NULL,
  provider_type text NOT NULL,
  code_verifier text,
  created_at timestamp with time zone NOT NULL,
  CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.oauth_clients (
  id uuid NOT NULL,
  client_secret_hash text,
  registration_type USER-DEFINED NOT NULL,
  redirect_uris text NOT NULL,
  grant_types text NOT NULL,
  client_name text CHECK (char_length(client_name) <= 1024),
  client_uri text CHECK (char_length(client_uri) <= 2048),
  logo_uri text CHECK (char_length(logo_uri) <= 2048),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  client_type USER-DEFINED NOT NULL DEFAULT 'confidential'::auth.oauth_client_type,
  CONSTRAINT oauth_clients_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.oauth_consents (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  scopes text NOT NULL CHECK (char_length(scopes) <= 2048),
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone,
  CONSTRAINT oauth_consents_pkey PRIMARY KEY (id),
  CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id)
);
CREATE TABLE auth.one_time_tokens (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  token_type USER-DEFINED NOT NULL,
  token_hash text NOT NULL CHECK (char_length(token_hash) > 0),
  relates_to text NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.refresh_tokens (
  instance_id uuid,
  id bigint NOT NULL DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass),
  token character varying UNIQUE,
  user_id character varying,
  revoked boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  parent character varying,
  session_id uuid,
  CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id)
);
CREATE TABLE auth.saml_providers (
  id uuid NOT NULL,
  sso_provider_id uuid NOT NULL,
  entity_id text NOT NULL UNIQUE CHECK (char_length(entity_id) > 0),
  metadata_xml text NOT NULL CHECK (char_length(metadata_xml) > 0),
  metadata_url text CHECK (metadata_url = NULL::text OR char_length(metadata_url) > 0),
  attribute_mapping jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  name_id_format text,
  CONSTRAINT saml_providers_pkey PRIMARY KEY (id),
  CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id)
);
CREATE TABLE auth.saml_relay_states (
  id uuid NOT NULL,
  sso_provider_id uuid NOT NULL,
  request_id text NOT NULL CHECK (char_length(request_id) > 0),
  for_email text,
  redirect_to text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  flow_state_id uuid,
  CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id),
  CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id),
  CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id)
);
CREATE TABLE auth.schema_migrations (
  version character varying NOT NULL,
  CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);
CREATE TABLE auth.sessions (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  factor_id uuid,
  aal USER-DEFINED,
  not_after timestamp with time zone,
  refreshed_at timestamp without time zone,
  user_agent text,
  ip inet,
  tag text,
  oauth_client_id uuid,
  refresh_token_hmac_key text,
  refresh_token_counter bigint,
  scopes text CHECK (char_length(scopes) <= 4096),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id)
);
CREATE TABLE auth.sso_domains (
  id uuid NOT NULL,
  sso_provider_id uuid NOT NULL,
  domain text NOT NULL CHECK (char_length(domain) > 0),
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  CONSTRAINT sso_domains_pkey PRIMARY KEY (id),
  CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id)
);
CREATE TABLE auth.sso_providers (
  id uuid NOT NULL,
  resource_id text CHECK (resource_id = NULL::text OR char_length(resource_id) > 0),
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  disabled boolean,
  CONSTRAINT sso_providers_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.users (
  instance_id uuid,
  id uuid NOT NULL,
  aud character varying,
  role character varying,
  email character varying,
  encrypted_password character varying,
  email_confirmed_at timestamp with time zone,
  invited_at timestamp with time zone,
  confirmation_token character varying,
  confirmation_sent_at timestamp with time zone,
  recovery_token character varying,
  recovery_sent_at timestamp with time zone,
  email_change_token_new character varying,
  email_change character varying,
  email_change_sent_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  phone text DEFAULT NULL::character varying UNIQUE,
  phone_confirmed_at timestamp with time zone,
  phone_change text DEFAULT ''::character varying,
  phone_change_token character varying DEFAULT ''::character varying,
  phone_change_sent_at timestamp with time zone,
  confirmed_at timestamp with time zone DEFAULT LEAST(email_confirmed_at, phone_confirmed_at),
  email_change_token_current character varying DEFAULT ''::character varying,
  email_change_confirm_status smallint DEFAULT 0 CHECK (email_change_confirm_status >= 0 AND email_change_confirm_status <= 2),
  banned_until timestamp with time zone,
  reauthentication_token character varying DEFAULT ''::character varying,
  reauthentication_sent_at timestamp with time zone,
  is_sso_user boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone,
  is_anonymous boolean NOT NULL DEFAULT false,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE realtime.messages (
  topic text NOT NULL,
  extension text NOT NULL,
  payload jsonb,
  event text,
  private boolean DEFAULT false,
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  inserted_at timestamp without time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at)
);
CREATE TABLE realtime.messages_2025_12_28 (
  topic text NOT NULL,
  extension text NOT NULL,
  payload jsonb,
  event text,
  private boolean DEFAULT false,
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  inserted_at timestamp without time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT messages_2025_12_28_pkey PRIMARY KEY (id, inserted_at)
);
CREATE TABLE realtime.messages_2025_12_29 (
  topic text NOT NULL,
  extension text NOT NULL,
  payload jsonb,
  event text,
  private boolean DEFAULT false,
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  inserted_at timestamp without time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT messages_2025_12_29_pkey PRIMARY KEY (id, inserted_at)
);
CREATE TABLE realtime.messages_2025_12_30 (
  topic text NOT NULL,
  extension text NOT NULL,
  payload jsonb,
  event text,
  private boolean DEFAULT false,
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  inserted_at timestamp without time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT messages_2025_12_30_pkey PRIMARY KEY (id, inserted_at)
);
CREATE TABLE realtime.messages_2025_12_31 (
  topic text NOT NULL,
  extension text NOT NULL,
  payload jsonb,
  event text,
  private boolean DEFAULT false,
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  inserted_at timestamp without time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT messages_2025_12_31_pkey PRIMARY KEY (id, inserted_at)
);
CREATE TABLE realtime.messages_2026_01_01 (
  topic text NOT NULL,
  extension text NOT NULL,
  payload jsonb,
  event text,
  private boolean DEFAULT false,
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  inserted_at timestamp without time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT messages_2026_01_01_pkey PRIMARY KEY (id, inserted_at)
);
CREATE TABLE realtime.messages_2026_01_02 (
  topic text NOT NULL,
  extension text NOT NULL,
  payload jsonb,
  event text,
  private boolean DEFAULT false,
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  inserted_at timestamp without time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT messages_2026_01_02_pkey PRIMARY KEY (id, inserted_at)
);
CREATE TABLE realtime.messages_2026_01_03 (
  topic text NOT NULL,
  extension text NOT NULL,
  payload jsonb,
  event text,
  private boolean DEFAULT false,
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  inserted_at timestamp without time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT messages_2026_01_03_pkey PRIMARY KEY (id, inserted_at)
);
CREATE TABLE realtime.schema_migrations (
  version bigint NOT NULL,
  inserted_at timestamp without time zone,
  CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);
CREATE TABLE realtime.subscription (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  subscription_id uuid NOT NULL,
  entity regclass NOT NULL,
  filters ARRAY NOT NULL DEFAULT '{}'::realtime.user_defined_filter[],
  claims jsonb NOT NULL,
  claims_role regrole NOT NULL DEFAULT realtime.to_regrole((claims ->> 'role'::text)),
  created_at timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT subscription_pkey PRIMARY KEY (id)
);

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE storage.buckets (
  id text NOT NULL,
  name text NOT NULL,
  owner uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  public boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types ARRAY,
  owner_id text,
  type USER-DEFINED NOT NULL DEFAULT 'STANDARD'::storage.buckettype,
  CONSTRAINT buckets_pkey PRIMARY KEY (id)
);
CREATE TABLE storage.buckets_analytics (
  name text NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'ANALYTICS'::storage.buckettype,
  format text NOT NULL DEFAULT 'ICEBERG'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deleted_at timestamp with time zone,
  CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id)
);
CREATE TABLE storage.buckets_vectors (
  id text NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'VECTOR'::storage.buckettype,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id)
);
CREATE TABLE storage.migrations (
  id integer NOT NULL,
  name character varying NOT NULL UNIQUE,
  hash character varying NOT NULL,
  executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT migrations_pkey PRIMARY KEY (id)
);
CREATE TABLE storage.objects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bucket_id text,
  name text,
  owner uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_accessed_at timestamp with time zone DEFAULT now(),
  metadata jsonb,
  path_tokens ARRAY DEFAULT string_to_array(name, '/'::text),
  version text,
  owner_id text,
  user_metadata jsonb,
  level integer,
  CONSTRAINT objects_pkey PRIMARY KEY (id),
  CONSTRAINT objects_bucketId_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id)
);
CREATE TABLE storage.prefixes (
  bucket_id text NOT NULL,
  name text NOT NULL,
  level integer NOT NULL DEFAULT storage.get_level(name),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id, level, name),
  CONSTRAINT prefixes_bucketId_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id)
);
CREATE TABLE storage.s3_multipart_uploads (
  id text NOT NULL,
  in_progress_size bigint NOT NULL DEFAULT 0,
  upload_signature text NOT NULL,
  bucket_id text NOT NULL,
  key text NOT NULL,
  version text NOT NULL,
  owner_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_metadata jsonb,
  CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id),
  CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id)
);
CREATE TABLE storage.s3_multipart_uploads_parts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  upload_id text NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  part_number integer NOT NULL,
  bucket_id text NOT NULL,
  key text NOT NULL,
  etag text NOT NULL,
  owner_id text,
  version text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id),
  CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id),
  CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id)
);
CREATE TABLE storage.vector_indexes (
  id text NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bucket_id text NOT NULL,
  data_type text NOT NULL,
  dimension integer NOT NULL,
  distance_metric text NOT NULL,
  metadata_configuration jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT vector_indexes_pkey PRIMARY KEY (id),
  CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id)
);