-- APPLIED to the Inventory Management project (qunnxsxeevoeflqfrzwz) on 2026-06-14.
-- Read-only, customer-facing availability. Dedupes products (each SKU appears ~2x)
-- and restricts to the six retail branches. The sales service reads this with a
-- read-only key on the Inventory project.
create or replace view public.view_branch_availability as
with dedup_products as (
  select distinct on (sku) sku, name, category, description, unit_of_measure
  from products where is_active and sku is not null
  order by sku, updated_at desc nulls last
)
select dp.sku, dp.name as product_name, dp.category, ib.location_code,
  case ib.location_code
    when 'FERRY' then 'Ferry (Kingston)' when 'GROVE' then 'Grove Road (Kingston)'
    when 'ASH' then 'Ashenheim Road (Kingston)' when 'OCHO-RIOS' then 'Ocho Rios'
    when 'MOBAY' then 'Montego Bay' when 'MANDVILLE' then 'Mandeville (Manchester)'
  end as branch_name,
  ib.quantity_available
from inventory_balances ib
join dedup_products dp on dp.sku = ib.sku
where ib.location_code in ('FERRY','GROVE','ASH','OCHO-RIOS','MOBAY','MANDVILLE')
  and ib.quantity_available > 0;
