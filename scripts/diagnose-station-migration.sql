-- Diagnose legacy station migration issues for a branch (location).
-- Replace :location_id with your Cuephoria Lite location UUID.

-- 1. Stations at this branch
SELECT
  s.id,
  s.name,
  s.type,
  s.location_id,
  s.organization_id,
  s.is_occupied,
  s.team_name,
  s.max_players,
  (SELECT count(*) FROM sessions sess WHERE sess.station_id = s.id AND sess.end_time IS NULL) AS active_sessions
FROM stations s
WHERE s.location_id = :'location_id'
ORDER BY s.name;

-- 2. Legacy controllers vs migration target (same location required)
SELECT
  legacy.id AS legacy_id,
  legacy.name AS legacy_name,
  legacy.is_occupied,
  legacy.organization_id AS legacy_org,
  target.id AS target_id,
  target.name AS target_name,
  target.organization_id AS target_org,
  legacy.location_id = target.location_id AS same_location,
  legacy.organization_id IS NOT DISTINCT FROM target.organization_id AS same_org
FROM stations legacy
CROSS JOIN stations target
WHERE legacy.location_id = :'location_id'
  AND target.location_id = :'location_id'
  AND (
    legacy.team_name IS NOT NULL
    OR legacy.name ILIKE '%controller%'
  )
  AND target.team_name IS NULL
  AND target.name NOT ILIKE '%controller%';

-- 3. RPC installed + grants
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'migrate_station_data';

-- 4. FK blockers (rows still pointing at legacy station ids)
-- Replace legacy UUIDs before running:
-- SELECT 'sessions' AS src, count(*) FROM sessions WHERE station_id IN (...);
-- SELECT 'bookings' AS src, count(*) FROM bookings WHERE station_id IN (...);
-- SELECT 'slot_blocks' AS src, count(*) FROM slot_blocks WHERE station_id IN (...);
-- SELECT 'cafe_orders' AS src, count(*) FROM cafe_orders WHERE station_id IN (...);
