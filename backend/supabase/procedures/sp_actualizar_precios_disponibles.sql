create or replace function public.sp_actualizar_precios_disponibles(
  p_tipo_ajuste text,
  p_valor_ajuste numeric
)
returns integer
language plpgsql
as $$
declare
  v_tipo text := upper(trim(coalesce(p_tipo_ajuste, '')));
  v_updated integer := 0;
begin
  if v_tipo not in ('MONTO', 'PORCENTAJE') then
    raise exception 'p_tipo_ajuste invalido. Use MONTO o PORCENTAJE.';
  end if;

  if p_valor_ajuste is null then
    raise exception 'p_valor_ajuste no puede ser null.';
  end if;

  if v_tipo = 'MONTO' then
    update public.lotes
      set precio = greatest(0, coalesce(precio, 0) + p_valor_ajuste)
    where upper(coalesce(condicion, '')) in ('LIBRE', 'DISPONIBLE');
  else
    update public.lotes
      set precio = greatest(0, coalesce(precio, 0) * (1 + (p_valor_ajuste / 100.0)))
    where upper(coalesce(condicion, '')) in ('LIBRE', 'DISPONIBLE');
  end if;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;
