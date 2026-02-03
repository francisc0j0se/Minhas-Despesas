CREATE OR REPLACE FUNCTION public.update_fixed_expense_and_preserve_history(
    p_expense_id uuid,
    p_new_name text,
    p_new_amount numeric,
    p_new_category text,
    p_new_day_of_month integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    current_user_id uuid := auth.uid();
    old_amount numeric;
    start_date date;
    end_date date;
    current_month integer := EXTRACT(month FROM CURRENT_DATE);
    current_year integer := EXTRACT(year FROM CURRENT_DATE);
BEGIN
    -- 1. Obter o valor antigo e a data de criação
    SELECT amount, date_trunc('month', created_at) INTO old_amount, start_date
    FROM public.fixed_expenses
    WHERE id = p_expense_id AND user_id = current_user_id;

    IF old_amount IS NULL THEN
        RAISE EXCEPTION 'Despesa fixa não encontrada ou não pertence ao usuário.';
    END IF;

    -- 2. Se o valor mudou, preservar o valor antigo para meses passados sem override
    IF old_amount IS DISTINCT FROM p_new_amount THEN
        -- Define o fim do período histórico (mês anterior ao atual)
        end_date := date_trunc('month', CURRENT_DATE) - interval '1 day';

        -- Se a data de criação for anterior ao mês atual
        IF start_date < date_trunc('month', CURRENT_DATE) THEN
            
            -- Itera sobre os meses entre a criação e o mês anterior ao atual
            INSERT INTO public.expense_overrides (user_id, fixed_expense_id, month, year, amount)
            SELECT
                current_user_id,
                p_expense_id,
                EXTRACT(month FROM series_date)::integer,
                EXTRACT(year FROM series_date)::integer,
                old_amount
            FROM
                generate_series(start_date, end_date, '1 month') AS series_date
            WHERE
                -- Garante que não estamos criando overrides para meses que já têm um override
                NOT EXISTS (
                    SELECT 1 FROM public.expense_overrides eo
                    WHERE eo.fixed_expense_id = p_expense_id
                    AND eo.user_id = current_user_id
                    AND eo.month = EXTRACT(month FROM series_date)::integer
                    AND eo.year = EXTRACT(year FROM series_date)::integer
                );
        END IF;
    END IF;

    -- 3. Atualizar a despesa fixa com os novos valores
    UPDATE public.fixed_expenses
    SET
        name = p_new_name,
        amount = p_new_amount,
        category = p_new_category,
        day_of_month = p_new_day_of_month
    WHERE
        id = p_expense_id AND user_id = current_user_id;

END;
$function$;