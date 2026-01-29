-- Seed opcional (dev). Substitua <USER_ID> pelo id real do usuário.

insert into assets (user_id, ticker, name, type, sector, notes, status)
values
  ('<USER_ID>', 'HGLG11', 'CSHG Logística', 'tijolo', 'Logística', 'Tese: logística premium.', 'ok'),
  ('<USER_ID>', 'MXRF11', 'Maxi Renda', 'papel', 'Papéis', 'Tese: renda recorrente.', 'atencao');

insert into positions (user_id, asset_id, quantity, avg_price, start_date, costs)
select '<USER_ID>', id, 100, 160.5, '2023-01-10', 20
from assets where ticker = 'HGLG11'
union all
select '<USER_ID>', id, 200, 10.2, '2023-02-12', 15
from assets where ticker = 'MXRF11';

insert into incomes (user_id, asset_id, month, amount)
select '<USER_ID>', id, '2024-11', 120 from assets where ticker = 'HGLG11'
union all
select '<USER_ID>', id, '2024-11', 180 from assets where ticker = 'MXRF11';

insert into valuations (user_id, asset_id, date, price, vp_per_share, p_vp)
select '<USER_ID>', id, '2024-11-30', 167.5, 155.3, 1.08 from assets where ticker = 'HGLG11'
union all
select '<USER_ID>', id, '2024-11-30', 10.5, 10.1, 1.04 from assets where ticker = 'MXRF11';

insert into settings (user_id, goal_amount, alert_max_asset_pct, alert_income_drop_pct)
values ('<USER_ID>', 100000, 0.2, 0.2);
