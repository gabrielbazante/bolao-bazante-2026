-- supabase/migrations/0006_seed_phases.sql

insert into public.phases (id, code, name, order_idx, points_result, points_exact, status) values
  (1, 'group',  'Fase de Grupos', 1, 1,  2,  'locked'),
  (2, 'r32',    '32avos',         2, 2,  4,  'locked'),
  (3, 'r16',    'Oitavas',        3, 3,  6,  'locked'),
  (4, 'qf',     'Quartas',        4, 7,  14, 'locked'),
  (5, 'sf',     'Semi',           5, 15, 30, 'locked'),
  (6, 'third',  '3º lugar',       6, 13, 26, 'locked'),
  (7, 'final',  'Final',          7, 25, 50, 'locked');

-- bracket_rules for FIFA 2026 (48 teams, 12 groups, 2 first + 8 best thirds = 32 → R32)
-- NOTE: third-placed cross-pairings (e.g. "3CDEF") must be validated against the
-- official FIFA 2026 bracket before going live. The format below follows the public
-- regulation announcement; FIFA may publish the canonical pairing closer to the tournament.

insert into public.bracket_rules (target_phase, target_fixture, slot, source) values
  ('r32', 1,  'home', '1A'),  ('r32', 1,  'away', '3CDEF'),
  ('r32', 2,  'home', '1C'),  ('r32', 2,  'away', '3DEFI'),
  ('r32', 3,  'home', '1E'),  ('r32', 3,  'away', '3ABDF'),
  ('r32', 4,  'home', '1G'),  ('r32', 4,  'away', '3ABCH'),
  ('r32', 5,  'home', '1I'),  ('r32', 5,  'away', '3HJKL'),
  ('r32', 6,  'home', '1K'),  ('r32', 6,  'away', '3GHJL'),
  ('r32', 7,  'home', '1B'),  ('r32', 7,  'away', '2A'),
  ('r32', 8,  'home', '1D'),  ('r32', 8,  'away', '2C'),
  ('r32', 9,  'home', '1F'),  ('r32', 9,  'away', '2E'),
  ('r32', 10, 'home', '1H'),  ('r32', 10, 'away', '2G'),
  ('r32', 11, 'home', '1J'),  ('r32', 11, 'away', '2I'),
  ('r32', 12, 'home', '1L'),  ('r32', 12, 'away', '2K'),
  ('r32', 13, 'home', '2B'),  ('r32', 13, 'away', '2D'),
  ('r32', 14, 'home', '2F'),  ('r32', 14, 'away', '2H'),
  ('r32', 15, 'home', '2J'),  ('r32', 15, 'away', '2L'),
  ('r32', 16, 'home', '3GHIK'),('r32', 16, 'away', '3FGIJ'),
  ('r16', 1, 'home', 'W_R32_1'), ('r16', 1, 'away', 'W_R32_2'),
  ('r16', 2, 'home', 'W_R32_3'), ('r16', 2, 'away', 'W_R32_4'),
  ('r16', 3, 'home', 'W_R32_5'), ('r16', 3, 'away', 'W_R32_6'),
  ('r16', 4, 'home', 'W_R32_7'), ('r16', 4, 'away', 'W_R32_8'),
  ('r16', 5, 'home', 'W_R32_9'), ('r16', 5, 'away', 'W_R32_10'),
  ('r16', 6, 'home', 'W_R32_11'),('r16', 6, 'away', 'W_R32_12'),
  ('r16', 7, 'home', 'W_R32_13'),('r16', 7, 'away', 'W_R32_14'),
  ('r16', 8, 'home', 'W_R32_15'),('r16', 8, 'away', 'W_R32_16'),
  ('qf', 1, 'home', 'W_R16_1'), ('qf', 1, 'away', 'W_R16_2'),
  ('qf', 2, 'home', 'W_R16_3'), ('qf', 2, 'away', 'W_R16_4'),
  ('qf', 3, 'home', 'W_R16_5'), ('qf', 3, 'away', 'W_R16_6'),
  ('qf', 4, 'home', 'W_R16_7'), ('qf', 4, 'away', 'W_R16_8'),
  ('sf', 1, 'home', 'W_QF_1'), ('sf', 1, 'away', 'W_QF_2'),
  ('sf', 2, 'home', 'W_QF_3'), ('sf', 2, 'away', 'W_QF_4'),
  ('third', 1, 'home', 'L_SF_1'), ('third', 1, 'away', 'L_SF_2'),
  ('final', 1, 'home', 'W_SF_1'), ('final', 1, 'away', 'W_SF_2');
