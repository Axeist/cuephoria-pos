-- Ensure regular stations remain visible on public booking by default.
-- We now use `stations.event_enabled` as the "public booking visibility" flag for ALL stations:
-- - Regular stations: default TRUE
-- - Event stations: default FALSE (enabled manually from Stations page)

update public.stations
set event_enabled = true
where category is null;

