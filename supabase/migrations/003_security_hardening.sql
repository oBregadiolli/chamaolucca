-- Chama O Lucca — security hardening (incremental)
-- Project: wjkytzvgbvkcaqjrqsbu

-- @chunk
-- Atomic coupon increment: fails when max_uses reached (race-safe single UPDATE)
create or replace function public.increment_coupon_use(coupon_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coupons
  set uses_count = uses_count + 1,
      updated_at = now()
  where id = coupon_id
    and active = true
    and (expires_at is null or expires_at > now())
    and (max_uses is null or uses_count < max_uses);

  if not found then
    raise exception 'Cupom indisponível ou esgotado';
  end if;
end;
$$;

-- @chunk
-- handle_new_user: never overwrite role on conflict
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    'customer'
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    phone = coalesce(public.profiles.phone, excluded.phone);
  return new;
end;
$$;
