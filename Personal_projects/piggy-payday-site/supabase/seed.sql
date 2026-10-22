-- Piggy Payday: your existing data, copied from the artifact on 2026-10-22.
-- Run once in Supabase -> SQL Editor, AFTER schema.sql.
insert into public.docs (collection, id, data) values
  ('buckets','gift','{"balance":2,"label":"Gift","totalEarned":7,"totalWithdrawn":5,"updatedAt":"2026-10-11T01:15:43.186Z"}'::jsonb),
  ('buckets','save','{"balance":3.7,"label":"Save","totalEarned":6.7,"totalWithdrawn":3,"updatedAt":"2026-10-11T01:15:43.186Z"}'::jsonb),
  ('buckets','spend','{"balance":6,"label":"Spend","totalEarned":8,"totalWithdrawn":2,"updatedAt":"2026-10-11T01:15:43.186Z"}'::jsonb),
  ('transactions','1ak1t636idi49ynnz0pa','{"amount":1.5,"balanceAfter":1.5,"bucket":"save","note":"","ts":"2026-10-04T19:26:22.993Z","type":"deposit"}'::jsonb),
  ('transactions','1r5uebco8fybr8ap0bu3','{"amount":1,"balanceAfter":0,"bucket":"save","note":"","ts":"2026-09-18T23:56:20.860Z","type":"withdraw"}'::jsonb),
  ('transactions','2yophwt6ozwljlfxzdpn','{"amount":3,"balanceAfter":3,"bucket":"gift","note":"","ts":"2026-09-18T23:56:04.715Z","type":"deposit"}'::jsonb),
  ('transactions','3y8799als48mb1r579rt','{"amount":1,"balanceAfter":1,"bucket":"spend","note":"","ts":"2026-09-19T02:08:11.061Z","type":"deposit"}'::jsonb),
  ('transactions','47tvsrkwfkd0c3wlkn5v','{"amount":2,"balanceAfter":6,"bucket":"spend","note":"10102026 week","ts":"2026-10-11T01:15:43.186Z","type":"deposit"}'::jsonb),
  ('transactions','5ce3kytmlpenlx8cwwk4','{"amount":2,"balanceAfter":0,"bucket":"gift","note":"","ts":"2026-09-19T02:08:32.554Z","type":"withdraw"}'::jsonb),
  ('transactions','84qc87m53sv5cwfqdypn','{"amount":2,"balanceAfter":2,"bucket":"save","note":"","ts":"2026-09-19T02:08:11.061Z","type":"deposit"}'::jsonb),
  ('transactions','acj5r878iu4vkr94cuw6','{"amount":2,"balanceAfter":2,"bucket":"gift","note":"","ts":"2026-09-19T02:08:11.061Z","type":"deposit"}'::jsonb),
  ('transactions','e3o5av90kou7k0b6mbf4','{"amount":1,"balanceAfter":1,"bucket":"spend","note":"","ts":"2026-09-18T23:56:04.715Z","type":"deposit"}'::jsonb),
  ('transactions','grd8dyn3tdk39s6z5iha','{"amount":2,"balanceAfter":0,"bucket":"save","note":"","ts":"2026-09-19T02:08:44.014Z","type":"withdraw"}'::jsonb),
  ('transactions','idxnnjq5g2u9g4pf70lj','{"amount":1,"balanceAfter":0,"bucket":"spend","note":"","ts":"2026-09-18T23:56:17.218Z","type":"withdraw"}'::jsonb),
  ('transactions','nw5lyt9ln4hp3axafwac','{"amount":1,"balanceAfter":0,"bucket":"spend","note":"","ts":"2026-09-19T02:08:38.375Z","type":"withdraw"}'::jsonb),
  ('transactions','qvjhr23a377lq052xkxj','{"amount":1,"balanceAfter":1,"bucket":"save","note":"","ts":"2026-09-18T23:56:04.715Z","type":"deposit"}'::jsonb),
  ('transactions','tubralegec0n48x4wm67','{"amount":4,"balanceAfter":4,"bucket":"spend","note":"","ts":"2026-10-04T19:26:22.993Z","type":"deposit"}'::jsonb),
  ('transactions','wd2zb8b7g5jk3qsthjn2','{"amount":2.2,"balanceAfter":3.7,"bucket":"save","note":"10102026 week","ts":"2026-10-11T01:15:43.186Z","type":"deposit"}'::jsonb),
  ('transactions','wpmwm1g5pk0qg7do21hg','{"amount":3,"balanceAfter":0,"bucket":"gift","note":"","ts":"2026-09-18T23:56:12.885Z","type":"withdraw"}'::jsonb),
  ('transactions','wziibxn0mjuqq2yr4scv','{"amount":2,"balanceAfter":2,"bucket":"gift","note":"10102026 week","ts":"2026-10-11T01:15:43.186Z","type":"deposit"}'::jsonb)
on conflict (collection, id) do nothing;
