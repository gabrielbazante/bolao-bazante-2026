-- supabase/migrations/0005_ranking_view.sql

create view public.ranking as
select
  p.id,
  p.full_name,
  p.avatar_url,
  coalesce(sum(b.points), 0) + coalesce((select sum(points) from public.champion_picks cp where cp.user_id = p.id), 0) as total_points,
  count(*) filter (where b.points = ph.points_exact and b.points > 0) as exact_count,
  count(*) filter (where b.points > 0) as hit_count,
  exists (select 1 from public.champion_picks cp where cp.user_id = p.id and cp.points > 0) as hit_champion
from public.profiles p
left join public.bets b on b.user_id = p.id
left join public.fixtures f on b.fixture_id = f.id
left join public.phases ph on f.phase_id = ph.id
where p.approved_at is not null
group by p.id, p.full_name, p.avatar_url
order by total_points desc, hit_champion desc, exact_count desc, hit_count desc;

grant select on public.ranking to authenticated;
