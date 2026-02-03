CREATE OR REPLACE FUNCTION public.get_monthly_fixed_expenses(p_month integer, p_year integer)
 RETURNS TABLE(id uuid, name text, category text, day_of_month integer, amount numeric, is_override boolean, fixed_expense_id uuid, is_paid boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Verifica se o mês/ano solicitado é futuro em relação à data atual
  IF p_year > EXTRACT(year FROM CURRENT_DATE) OR (p_year = EXTRACT(year FROM CURRENT_DATE) AND p_month > EXTRACT(month FROM CURRENT_DATE)) THEN
    -- Se for futuro, retorna uma tabela vazia
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    fe.id,
    fe.name,
    fe.category,
    fe.day_of_month,
    COALESCE(eo.amount, fe.amount) as amount,
    (eo.id IS NOT NULL) as is_override,
    fe.id as fixed_expense_id,
    COALESCE(mes.is_paid, false) as is_paid
  FROM
    public.fixed_expenses fe
  LEFT JOIN
    public.expense_overrides eo ON fe.id = eo.fixed_expense_id
    AND eo.month = p_month
    AND eo.year = p_year
    AND eo.user_id = auth.uid()
  LEFT JOIN
    public.monthly_expense_status mes ON fe.id = mes.fixed_expense_id
    AND mes.month = p_month
    AND mes.year = p_year
    AND mes.user_id = auth.uid()
  WHERE
    fe.user_id = auth.uid()
  ORDER BY
    is_paid ASC, fe.day_of_month, fe.name;
END;
$function$;