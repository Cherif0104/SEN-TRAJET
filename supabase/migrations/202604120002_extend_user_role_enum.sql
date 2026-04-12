DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'super_admin'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'super_admin';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'commercial'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'commercial';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'trainer'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'trainer';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'regional_manager'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'regional_manager';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'partner_manager'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'partner_manager';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'partner_operator'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'partner_operator';
  END IF;
END
$$;
