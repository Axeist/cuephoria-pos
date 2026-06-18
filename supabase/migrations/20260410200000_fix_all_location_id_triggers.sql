-- Comprehensive BEFORE INSERT location_id guard for all tables whose
-- application-side callers pre-date the multi-location migration.
-- Strategy: identical to fix_booking_views_location_trigger and
-- fix_cash_summary_location_trigger — intercept every INSERT and
-- back-fill location_id when the caller omits it.
--
-- Tables covered:
--   staff_attendance         (derive from staff_profiles.location_id via staff_id)
--   staff_leave_requests     (derive from staff_profiles.location_id via staff_id)
--   cash_vault               (fall back to main location)
--   cash_bank_deposits       (fall back to main location)
--   cash_vault_transactions  (fall back to main location)
--   customer_offers          (fall back to main location)
--   offers                   (fall back to main location)
--   tournament_history       (derive from tournaments.location_id via tournament_id)
--   tournament_winners       (derive from tournaments.location_id via tournament_id)
--   tournament_winner_images (derive from tournaments.location_id via tournament_id)
--   expenses                 (fall back to main location)

-- ── helpers ──────────────────────────────────────────────────────────────────

-- Reusable inline helper: look up the main location id.
-- Used in every function below that needs a fallback.

-- ── staff_attendance ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.staff_attendance_set_location_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT location_id INTO NEW.location_id
    FROM public.staff_profiles WHERE user_id = NEW.staff_id LIMIT 1;
  IF NEW.location_id IS NULL THEN
    SELECT id INTO NEW.location_id FROM public.locations WHERE slug = 'main' LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS staff_attendance_set_location_id ON public.staff_attendance;
CREATE TRIGGER staff_attendance_set_location_id
  BEFORE INSERT ON public.staff_attendance
  FOR EACH ROW EXECUTE FUNCTION public.staff_attendance_set_location_id();

-- ── staff_leave_requests ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.staff_leave_requests_set_location_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT location_id INTO NEW.location_id
    FROM public.staff_profiles WHERE user_id = NEW.staff_id LIMIT 1;
  IF NEW.location_id IS NULL THEN
    SELECT id INTO NEW.location_id FROM public.locations WHERE slug = 'main' LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS staff_leave_requests_set_location_id ON public.staff_leave_requests;
CREATE TRIGGER staff_leave_requests_set_location_id
  BEFORE INSERT ON public.staff_leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.staff_leave_requests_set_location_id();

-- ── cash_vault ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cash_vault_set_location_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT id INTO NEW.location_id FROM public.locations WHERE slug = 'main' LIMIT 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cash_vault_set_location_id ON public.cash_vault;
CREATE TRIGGER cash_vault_set_location_id
  BEFORE INSERT ON public.cash_vault
  FOR EACH ROW EXECUTE FUNCTION public.cash_vault_set_location_id();

-- ── cash_bank_deposits ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cash_bank_deposits_set_location_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT id INTO NEW.location_id FROM public.locations WHERE slug = 'main' LIMIT 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cash_bank_deposits_set_location_id ON public.cash_bank_deposits;
CREATE TRIGGER cash_bank_deposits_set_location_id
  BEFORE INSERT ON public.cash_bank_deposits
  FOR EACH ROW EXECUTE FUNCTION public.cash_bank_deposits_set_location_id();

-- ── cash_vault_transactions ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cash_vault_transactions_set_location_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT id INTO NEW.location_id FROM public.locations WHERE slug = 'main' LIMIT 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cash_vault_transactions_set_location_id ON public.cash_vault_transactions;
CREATE TRIGGER cash_vault_transactions_set_location_id
  BEFORE INSERT ON public.cash_vault_transactions
  FOR EACH ROW EXECUTE FUNCTION public.cash_vault_transactions_set_location_id();

-- ── customer_offers ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.customer_offers_set_location_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT id INTO NEW.location_id FROM public.locations WHERE slug = 'main' LIMIT 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customer_offers_set_location_id ON public.customer_offers;
CREATE TRIGGER customer_offers_set_location_id
  BEFORE INSERT ON public.customer_offers
  FOR EACH ROW EXECUTE FUNCTION public.customer_offers_set_location_id();

-- ── offers ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.offers_set_location_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT id INTO NEW.location_id FROM public.locations WHERE slug = 'main' LIMIT 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS offers_set_location_id ON public.offers;
CREATE TRIGGER offers_set_location_id
  BEFORE INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.offers_set_location_id();

-- ── tournament_history ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tournament_history_set_location_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT location_id INTO NEW.location_id
    FROM public.tournaments WHERE id = NEW.tournament_id LIMIT 1;
  IF NEW.location_id IS NULL THEN
    SELECT id INTO NEW.location_id FROM public.locations WHERE slug = 'main' LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tournament_history_set_location_id ON public.tournament_history;
CREATE TRIGGER tournament_history_set_location_id
  BEFORE INSERT ON public.tournament_history
  FOR EACH ROW EXECUTE FUNCTION public.tournament_history_set_location_id();

-- ── tournament_winners ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tournament_winners_set_location_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT location_id INTO NEW.location_id
    FROM public.tournaments WHERE id = NEW.tournament_id LIMIT 1;
  IF NEW.location_id IS NULL THEN
    SELECT id INTO NEW.location_id FROM public.locations WHERE slug = 'main' LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tournament_winners_set_location_id ON public.tournament_winners;
CREATE TRIGGER tournament_winners_set_location_id
  BEFORE INSERT ON public.tournament_winners
  FOR EACH ROW EXECUTE FUNCTION public.tournament_winners_set_location_id();

-- ── tournament_winner_images ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tournament_winner_images_set_location_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT location_id INTO NEW.location_id
    FROM public.tournaments WHERE id = NEW.tournament_id LIMIT 1;
  IF NEW.location_id IS NULL THEN
    SELECT id INTO NEW.location_id FROM public.locations WHERE slug = 'main' LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tournament_winner_images_set_location_id ON public.tournament_winner_images;
CREATE TRIGGER tournament_winner_images_set_location_id
  BEFORE INSERT ON public.tournament_winner_images
  FOR EACH ROW EXECUTE FUNCTION public.tournament_winner_images_set_location_id();

-- ── expenses ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.expenses_set_location_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT id INTO NEW.location_id FROM public.locations WHERE slug = 'main' LIMIT 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expenses_set_location_id ON public.expenses;
CREATE TRIGGER expenses_set_location_id
  BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.expenses_set_location_id();
