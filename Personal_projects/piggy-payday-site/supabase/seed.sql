-- Piggy Payday: your existing data, copied from the artifact on 2026-10-22, test entries removed.
-- Run once in Supabase -> SQL Editor, AFTER schema.sql.
insert into public.docs (collection, id, data) values
  ('buckets','gift','{"balance":2,"label":"Gift","totalEarned":2,"totalWithdrawn":0,"updatedAt":"2026-10-11T01:15:43.186Z"}'::jsonb),
  ('buckets','save','{"balance":3.7,"label":"Save","totalEarned":3.7,"totalWithdrawn":0,"updatedAt":"2026-10-11T01:15:43.186Z"}'::jsonb),
  ('buckets','spend','{"balance":6,"label":"Spend","totalEarned":6,"totalWithdrawn":0,"updatedAt":"2026-10-11T01:15:43.186Z"}'::jsonb),
  ('transactions','1ak1t636idi49ynnz0pa','{"amount":1.5,"balanceAfter":1.5,"bucket":"save","note":"","ts":"2026-10-04T19:26:22.993Z","type":"deposit"}'::jsonb),
  ('transactions','47tvsrkwfkd0c3wlkn5v','{"amount":2,"balanceAfter":6,"bucket":"spend","note":"10102026 week","ts":"2026-10-11T01:15:43.186Z","type":"deposit"}'::jsonb),
  ('transactions','tubralegec0n48x4wm67','{"amount":4,"balanceAfter":4,"bucket":"spend","note":"","ts":"2026-10-04T19:26:22.993Z","type":"deposit"}'::jsonb),
  ('transactions','wd2zb8b7g5jk3qsthjn2','{"amount":2.2,"balanceAfter":3.7,"bucket":"save","note":"10102026 week","ts":"2026-10-11T01:15:43.186Z","type":"deposit"}'::jsonb),
  ('transactions','wziibxn0mjuqq2yr4scv','{"amount":2,"balanceAfter":2,"bucket":"gift","note":"10102026 week","ts":"2026-10-11T01:15:43.186Z","type":"deposit"}'::jsonb)
on conflict (collection, id) do nothing;
