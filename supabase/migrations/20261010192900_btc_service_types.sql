-- Enum values must be committed before they are used by later migrations.
alter type public.service_type add value if not exists 'intercity';
alter type public.service_type add value if not exists 'carpool';
