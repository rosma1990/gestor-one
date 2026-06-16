-- ============================================================
--  CONSTANCIAS DE PAGO - FUNCIONES PostgreSQL / Supabase
--  Dialect : PL/pgSQL
--  Generado: 2026-05-09
--
--  DIFERENCIAS CLAVE vs SQL Server:
--    · CREATE OR REPLACE FUNCTION en lugar de CREATE OR ALTER PROCEDURE
--    · Parámetros con prefijo p_ para evitar colisión con columnas
--    · RETURNS TABLE / RETURNS void / RETURNS INT según el caso
--    · RAISE EXCEPTION en lugar de RAISERROR
--    · RETURNING id INTO v_id en lugar de SCOPE_IDENTITY()
--    · $$ ... $$ como delimitador de cuerpo
--    · TINYINT → SMALLINT  |  VARCHAR → TEXT  |  DECIMAL → NUMERIC
--    · GETDATE() → NOW()   |  DATEADD → interval  |  FORMAT → TO_CHAR
--    · No existe TYPE tabla: se usa JSON para pasar detalles manuales
--    · Concatenación con || en lugar de +
--    · CAST(x AS VARCHAR) → x::TEXT
-- ============================================================


-- ============================================================
--  TABLA DE BITÁCORA (crear una sola vez)
-- ============================================================
CREATE TABLE IF NOT EXISTS bitacora_anulacion (
    id_bitacora     SERIAL PRIMARY KEY,
    id_constancia   INT          NOT NULL,
    fecha_anulacion TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    motivo          TEXT         NOT NULL,
    usuario         TEXT         NOT NULL,
    liquido_anulado NUMERIC(18,2) NOT NULL
);


-- ============================================================
--  BLOQUE 1: FUNCIONES DE INGRESO DE DATOS
-- ============================================================

-- ------------------------------------------------------------
-- 1.1  fn_empresa_insert
--      Retorna el id de la empresa creada.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_empresa_insert(
    p_nombre    TEXT,
    p_nit       TEXT,
    p_direccion TEXT,
    p_telefono  TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id INT;
BEGIN
    IF EXISTS (SELECT 1 FROM empresa WHERE nit = p_nit) THEN
        RAISE EXCEPTION 'Ya existe una empresa registrada con ese NIT.';
    END IF;

    INSERT INTO empresa (nombre, nit, direccion, telefono)
    VALUES (p_nombre, p_nit, p_direccion, p_telefono)
    RETURNING id_empresa INTO v_id;

    RETURN v_id;
END;
$$;


-- ------------------------------------------------------------
-- 1.2  fn_departamento_insert
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_departamento_insert(
    p_id_empresa INT,
    p_nombre     TEXT,
    p_codigo     TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM empresa WHERE id_empresa = p_id_empresa) THEN
        RAISE EXCEPTION 'La empresa indicada no existe.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM departamento
        WHERE codigo = p_codigo AND id_empresa = p_id_empresa
    ) THEN
        RAISE EXCEPTION 'Ya existe un departamento con ese código en la empresa.';
    END IF;

    INSERT INTO departamento (id_empresa, nombre, codigo)
    VALUES (p_id_empresa, p_nombre, p_codigo)
    RETURNING id_departamento INTO v_id;

    RETURN v_id;
END;
$$;


-- ------------------------------------------------------------
-- 1.3  fn_empleado_insert
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_empleado_insert(
    p_id_departamento INT,
    p_nombre          TEXT,
    p_apellido        TEXT,
    p_cui             TEXT,
    p_nit             TEXT,
    p_puesto          TEXT,
    p_fecha_ingreso   DATE
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id INT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM departamento WHERE id_departamento = p_id_departamento
    ) THEN
        RAISE EXCEPTION 'El departamento indicado no existe.';
    END IF;

    IF EXISTS (SELECT 1 FROM empleado WHERE cui = p_cui) THEN
        RAISE EXCEPTION 'Ya existe un empleado registrado con ese CUI.';
    END IF;

    INSERT INTO empleado (id_departamento, nombre, apellido, cui, nit,
                          puesto, fecha_ingreso, activo)
    VALUES (p_id_departamento, p_nombre, p_apellido, p_cui, p_nit,
            p_puesto, p_fecha_ingreso, true)
    RETURNING id_empleado INTO v_id;

    RETURN v_id;
END;
$$;


-- ------------------------------------------------------------
-- 1.4  fn_cuenta_bancaria_insert
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_cuenta_bancaria_insert(
    p_id_empleado   INT,
    p_banco         TEXT,
    p_numero_cuenta TEXT,
    p_principal     SMALLINT   -- 1 = principal, 0 = secundaria
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM empleado WHERE id_empleado = p_id_empleado) THEN
        RAISE EXCEPTION 'El empleado indicado no existe.';
    END IF;

    -- Si se marca como principal, quitar el flag de la cuenta anterior
    IF p_principal = 1 THEN
        UPDATE cuenta_bancaria_empleado
        SET principal = false
        WHERE id_empleado = p_id_empleado AND principal = true;
    END IF;

    INSERT INTO cuenta_bancaria_empleado (id_empleado, banco, numero_cuenta, principal, activa)
    VALUES (p_id_empleado, p_banco, p_numero_cuenta, p_principal = 1, true)
    RETURNING id_cuenta INTO v_id;

    RETURN v_id;
END;
$$;


-- ------------------------------------------------------------
-- 1.5  fn_periodo_pago_insert
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_periodo_pago_insert(
    p_id_empresa   INT,
    p_mes          TEXT,
    p_anio         INT,
    p_tipo         TEXT,        -- QUINCENAL | MENSUAL
    p_fecha_inicio DATE,
    p_fecha_fin    DATE
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM empresa WHERE id_empresa = p_id_empresa) THEN
        RAISE EXCEPTION 'La empresa indicada no existe.';
    END IF;

    IF p_fecha_fin < p_fecha_inicio THEN
        RAISE EXCEPTION 'La fecha de fin no puede ser menor a la fecha de inicio.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM periodo_pago
        WHERE id_empresa   = p_id_empresa
          AND fecha_inicio = p_fecha_inicio
          AND fecha_fin    = p_fecha_fin
    ) THEN
        RAISE EXCEPTION 'Ya existe un período de pago para ese rango de fechas.';
    END IF;

    INSERT INTO periodo_pago (id_empresa, mes, anio, tipo, fecha_inicio, fecha_fin, cerrado)
    VALUES (p_id_empresa, p_mes, p_anio, p_tipo, p_fecha_inicio, p_fecha_fin, false)
    RETURNING id_periodo INTO v_id;

    RETURN v_id;
END;
$$;


-- ------------------------------------------------------------
-- 1.6  fn_constante_sistema_insert
--      Cierra la vigencia de la constante anterior al insertar una nueva.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_constante_sistema_insert(
    p_clave         TEXT,
    p_valor         NUMERIC(18,6),
    p_descripcion   TEXT,
    p_vigente_desde DATE
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id INT;
BEGIN
    -- Cerrar la vigencia de la constante anterior para la misma clave
    UPDATE constante_sistema
    SET vigente_hasta = p_vigente_desde - INTERVAL '1 day'
    WHERE clave          = p_clave
      AND vigente_hasta IS NULL;

    INSERT INTO constante_sistema (clave, valor, descripcion, vigente_desde)
    VALUES (p_clave, p_valor, p_descripcion, p_vigente_desde)
    RETURNING id_constante INTO v_id;

    RETURN v_id;
END;
$$;


-- ------------------------------------------------------------
-- 1.7  fn_concepto_pago_insert
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_concepto_pago_insert(
    p_codigo               TEXT,
    p_nombre               TEXT,
    p_tipo                 TEXT,         -- INGRESO | DESCUENTO
    p_naturaleza           TEXT,         -- FIJO | VARIABLE | CALCULADO
    p_origen               TEXT,         -- MANUAL | FORMULA | CONSTANTE
    p_orden_display        INT,
    p_vigente_desde        DATE,
    p_formula              TEXT     DEFAULT NULL,
    p_referencia_constante TEXT     DEFAULT NULL,
    p_mostrar_en_cero      SMALLINT DEFAULT 1
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id INT;
BEGIN
    IF EXISTS (
        SELECT 1 FROM concepto_pago
        WHERE codigo = p_codigo AND vigente_hasta IS NULL
    ) THEN
        RAISE EXCEPTION 'Ya existe un concepto activo con ese código.';
    END IF;

    IF p_tipo NOT IN ('INGRESO', 'DESCUENTO') THEN
        RAISE EXCEPTION 'El tipo debe ser INGRESO o DESCUENTO.';
    END IF;

    INSERT INTO concepto_pago (
        codigo, nombre, tipo, naturaleza, origen,
        formula, referencia_constante, mostrar_en_cero,
        orden_display, activo, vigente_desde, vigente_hasta
    )
    VALUES (
        p_codigo, p_nombre, p_tipo, p_naturaleza, p_origen,
        p_formula, p_referencia_constante, (p_mostrar_en_cero = 1),
        p_orden_display, true, p_vigente_desde, NULL
    )
    RETURNING id_concepto INTO v_id;

    RETURN v_id;
END;
$$;


-- ============================================================
--  BLOQUE 2: GENERACIÓN DE CONSTANCIA DE PAGO
--
--  p_detalles_manuales: arreglo JSON con los montos manuales.
--  Formato esperado:
--  '[{"codigo":"SAL_ORD","monto":5000},{"codigo":"OTR_ING","monto":300}]'
-- ============================================================
CREATE OR REPLACE FUNCTION fn_generar_constancia(
    p_id_empleado       INT,
    p_id_periodo        INT,
    p_id_empresa        INT,
    p_renta_acreditada  NUMERIC(18,2) DEFAULT 0,
    p_monto_retenido    NUMERIC(18,2) DEFAULT 0,
    p_detalles_manuales JSONB         DEFAULT '[]'
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id_constancia INT;
    v_fecha_inicio  DATE;
    v_fecha_fin     DATE;
    v_mes           TEXT;
    v_anio          INT;
    v_correlativo   INT;
    v_num_constancia TEXT;
    v_texto_concepto TEXT;
    v_sal_ord       NUMERIC(18,2);
    v_factor_igss   NUMERIC(18,6);
    v_monto_igss    NUMERIC(18,2);
    v_total_ing     NUMERIC(18,2);
    v_total_des     NUMERIC(18,2);
    v_detalle       JSONB;
BEGIN

    -- ── Validaciones ──────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM empleado WHERE id_empleado = p_id_empleado AND activo = true
    ) THEN
        RAISE EXCEPTION 'El empleado no existe o está inactivo.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM periodo_pago WHERE id_periodo = p_id_periodo
    ) THEN
        RAISE EXCEPTION 'El período no existe.';
    END IF;

    -- ── Si ya existe una constancia vigente para este empleado en este período, la eliminamos para sobreescribirla ──
    DELETE FROM constancia_pago cp
    WHERE cp.id_empleado = p_id_empleado
      AND cp.id_periodo  = p_id_periodo
      AND cp.anulada     = false;

    -- ── Datos del período ─────────────────────────────────────
    SELECT fecha_inicio, fecha_fin, mes, anio
    INTO v_fecha_inicio, v_fecha_fin, v_mes, v_anio
    FROM periodo_pago
    WHERE id_periodo = p_id_periodo;

    -- ── Número de constancia correlativo por empresa/año ──────
    SELECT COALESCE(MAX(
        (SUBSTRING(numero_constancia FROM '[0-9]+$'))::INT
    ), 0) + 1
    INTO v_correlativo
    FROM constancia_pago
    WHERE id_empresa = p_id_empresa
      AND EXTRACT(YEAR FROM fecha_emision) = v_anio;

    v_num_constancia := 'CRESGO-' || v_anio::TEXT || '-' ||
                        LPAD(v_correlativo::TEXT, 4, '0');

    v_texto_concepto :=
        'Salario ordinario correspondiente al período del ' ||
        TO_CHAR(v_fecha_inicio, 'DD-MM-YYYY') || ' al ' ||
        TO_CHAR(v_fecha_fin,    'DD-MM-YYYY') ||
        ', el cual se detalla a continuación, aceptando los descuentos ' ||
        'que en este pago se me realizan dándolos por válidos y buenos.';

    -- ── Encabezado de la constancia ───────────────────────────
    INSERT INTO constancia_pago (
        id_empleado, id_periodo, id_empresa, numero_constancia,
        fecha_emision, texto_concepto, anulada
    )
    VALUES (
        p_id_empleado, p_id_periodo, p_id_empresa, v_num_constancia,
        NOW(), v_texto_concepto, false
    )
    RETURNING id_constancia INTO v_id_constancia;

    -- ── Insertar detalles manuales (vienen en el JSON) ────────
    INSERT INTO detalle_constancia (
        id_constancia, id_concepto, monto,
        base_calculo, factor_aplicado, origen_valor, orden_display
    )
    SELECT
        v_id_constancia,
        cp.id_concepto,
        (elem->>'monto')::NUMERIC(18,2),
        NULL, NULL, 'MANUAL',
        cp.orden_display
    FROM jsonb_array_elements(p_detalles_manuales) AS elem
    JOIN concepto_pago cp
      ON cp.codigo        = elem->>'codigo'
     AND cp.activo        = true
     AND cp.vigente_hasta IS NULL;

    -- ── Conceptos CONSTANTE (valor desde constante_sistema) ───
    INSERT INTO detalle_constancia (
        id_constancia, id_concepto, monto,
        base_calculo, factor_aplicado, origen_valor, orden_display
    )
    SELECT
        v_id_constancia,
        cp.id_concepto,
        cs.valor,
        NULL, NULL, 'CONSTANTE',
        cp.orden_display
    FROM concepto_pago cp
    JOIN constante_sistema cs
      ON cs.clave = cp.referencia_constante
     AND cs.vigente_desde = (
            SELECT MAX(vigente_desde)
            FROM constante_sistema
            WHERE clave          = cp.referencia_constante
              AND vigente_desde <= v_fecha_inicio
         )
    WHERE cp.origen        = 'CONSTANTE'
      AND cp.activo        = true
      AND cp.vigente_hasta IS NULL
      AND NOT EXISTS (
            SELECT 1 FROM detalle_constancia
            WHERE id_constancia = v_id_constancia
              AND id_concepto   = cp.id_concepto
      );

    -- ── Concepto FORMULA: IGSS = SAL_ORD * FACTOR_IGSS ───────
    SELECT dc.monto
    INTO v_sal_ord
    FROM detalle_constancia dc
    JOIN concepto_pago cp ON cp.id_concepto = dc.id_concepto
    WHERE dc.id_constancia = v_id_constancia
      AND cp.codigo        = 'SAL_ORD';

    SELECT valor
    INTO v_factor_igss
    FROM constante_sistema
    WHERE clave          = 'FACTOR_IGSS'
      AND vigente_desde  = (
            SELECT MAX(vigente_desde)
            FROM constante_sistema
            WHERE clave = 'FACTOR_IGSS' AND vigente_desde <= v_fecha_inicio
          );

    v_monto_igss := ROUND(COALESCE(v_sal_ord, 0) * COALESCE(v_factor_igss, 0), 2);

    INSERT INTO detalle_constancia (
        id_constancia, id_concepto, monto,
        base_calculo, factor_aplicado, origen_valor, orden_display
    )
    SELECT
        v_id_constancia,
        cp.id_concepto,
        v_monto_igss,
        v_sal_ord,
        v_factor_igss,
        'FORMULA',
        cp.orden_display
    FROM concepto_pago cp
    WHERE cp.codigo        = 'IGSS'
      AND cp.activo        = true
      AND cp.vigente_hasta IS NULL
      AND NOT EXISTS (
            SELECT 1 FROM detalle_constancia
            WHERE id_constancia = v_id_constancia
              AND id_concepto   = cp.id_concepto
      );

    -- ── Rellenar en cero los conceptos faltantes con mostrar_en_cero=1 ──
    INSERT INTO detalle_constancia (
        id_constancia, id_concepto, monto,
        base_calculo, factor_aplicado, origen_valor, orden_display
    )
    SELECT
        v_id_constancia,
        cp.id_concepto,
        0.00,
        NULL, NULL, 'OMITIDO',
        cp.orden_display
    FROM concepto_pago cp
    WHERE cp.mostrar_en_cero = true
      AND cp.activo          = true
      AND cp.vigente_hasta  IS NULL
      AND NOT EXISTS (
            SELECT 1 FROM detalle_constancia
            WHERE id_constancia = v_id_constancia
              AND id_concepto   = cp.id_concepto
      );

    -- ── Resumen ───────────────────────────────────────────────
    SELECT COALESCE((
        SELECT dc.monto
        FROM detalle_constancia dc
        JOIN concepto_pago cp ON cp.id_concepto = dc.id_concepto
        WHERE dc.id_constancia = v_id_constancia AND cp.codigo = 'TOT_ING'
    ), 0.00) INTO v_total_ing;

    SELECT COALESCE((
        SELECT dc.monto
        FROM detalle_constancia dc
        JOIN concepto_pago cp ON cp.id_concepto = dc.id_concepto
        WHERE dc.id_constancia = v_id_constancia AND cp.codigo = 'TOT_DES'
    ), 0.00) INTO v_total_des;

    INSERT INTO resumen_constancia (
        id_constancia, total_ingresos, total_descuentos, liquido_recibir
    )
    VALUES (
        v_id_constancia, v_total_ing, v_total_des, v_total_ing - v_total_des
    );

    -- ── Retención ISR ─────────────────────────────────────────
    INSERT INTO retencion_isr (
        id_constancia, renta_acreditada, monto_retenido, anio_fiscal
    )
    VALUES (
        v_id_constancia, p_renta_acreditada, p_monto_retenido, v_anio
    );

    RETURN v_id_constancia;

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;


-- ============================================================
--  BLOQUE 3: DOCUMENTO COMPLETO DE UNA CONSTANCIA
--  Retorna 4 result sets via SETOF + llamadas separadas.
--  En PostgreSQL una función retorna UN result set, por lo que
--  se crean 4 funciones especializadas (patrón habitual en PG).
-- ============================================================

-- 3.1 Encabezado
CREATE OR REPLACE FUNCTION fn_doc_encabezado(p_id_constancia INT)
RETURNS TABLE (
    empresa_nombre   TEXT,
    empresa_nit      TEXT,
    empleado_nombre  TEXT,
    empleado_cui     TEXT,
    empleado_nit     TEXT,
    empleado_puesto  TEXT,
    numero_constancia TEXT,
    fecha_emision    TIMESTAMPTZ,
    texto_concepto   TEXT,
    periodo_inicio   TEXT,
    periodo_fin      TEXT,
    banco_deposito   TEXT,
    cuenta_deposito  TEXT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        emp.nombre,
        emp.nit,
        e.nombre || ' ' || e.apellido,
        e.cui,
        e.nit,
        e.puesto,
        cp.numero_constancia,
        cp.fecha_emision,
        cp.texto_concepto,
        TO_CHAR(pp.fecha_inicio, 'DD-MM-YYYY'),
        TO_CHAR(pp.fecha_fin,    'DD-MM-YYYY'),
        cb.banco,
        cb.numero_cuenta
    FROM constancia_pago cp
    JOIN empleado            e   ON e.id_empleado  = cp.id_empleado
    JOIN empresa             emp ON emp.id_empresa = cp.id_empresa
    JOIN periodo_pago        pp  ON pp.id_periodo  = cp.id_periodo
    LEFT JOIN cuenta_bancaria_empleado cb
                                 ON cb.id_empleado = e.id_empleado
                                AND cb.principal   = true
                                AND cb.activa      = true
    WHERE cp.id_constancia = p_id_constancia;
$$;

-- 3.2 Ingresos
CREATE OR REPLACE FUNCTION fn_doc_ingresos(p_id_constancia INT)
RETURNS TABLE (
    concepto      TEXT,
    monto         NUMERIC(18,2),
    orden_display INT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        con.nombre,
        dc.monto,
        dc.orden_display
    FROM detalle_constancia dc
    JOIN concepto_pago con ON con.id_concepto = dc.id_concepto
    WHERE dc.id_constancia = p_id_constancia
      AND con.tipo         = 'INGRESO'
    ORDER BY dc.orden_display;
$$;

-- 3.3 Descuentos
CREATE OR REPLACE FUNCTION fn_doc_descuentos(p_id_constancia INT)
RETURNS TABLE (
    concepto      TEXT,
    monto         NUMERIC(18,2),
    orden_display INT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        con.nombre,
        dc.monto,
        dc.orden_display
    FROM detalle_constancia dc
    JOIN concepto_pago con ON con.id_concepto = dc.id_concepto
    WHERE dc.id_constancia = p_id_constancia
      AND con.tipo         = 'DESCUENTO'
    ORDER BY dc.orden_display;
$$;

-- 3.4 Resumen + ISR
CREATE OR REPLACE FUNCTION fn_doc_resumen(p_id_constancia INT)
RETURNS TABLE (
    total_ingresos   NUMERIC(18,2),
    total_descuentos NUMERIC(18,2),
    liquido_recibir  NUMERIC(18,2),
    renta_acreditada NUMERIC(18,2),
    monto_retenido   NUMERIC(18,2),
    anio_fiscal      INT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        r.total_ingresos,
        r.total_descuentos,
        r.liquido_recibir,
        i.renta_acreditada,
        i.monto_retenido,
        i.anio_fiscal
    FROM resumen_constancia r
    JOIN retencion_isr i ON i.id_constancia = r.id_constancia
    WHERE r.id_constancia = p_id_constancia;
$$;


-- ============================================================
--  BLOQUE 4: REPORTE DE NÓMINA POR PERÍODO
-- ============================================================
CREATE OR REPLACE FUNCTION fn_reporte_nomina(
    p_id_periodo INT,
    p_id_empresa INT
)
RETURNS TABLE (
    id_fila         BIGINT,
    nombre_empleado TEXT,
    valor_uno       INT,
    liquido_recibir NUMERIC(18,2),
    comentario      TEXT
)
LANGUAGE sql STABLE
AS $$
    WITH periodo AS (
        SELECT fecha_inicio, mes, anio
        FROM periodo_pago
        WHERE id_periodo = p_id_periodo
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY e.apellido, e.nombre),
        e.nombre || ' ' || e.apellido,
        1,
        r.liquido_recibir,
        CASE
            WHEN EXTRACT(DAY FROM p.fecha_inicio) <= 15
            THEN 'Primera quincena de ' || p.mes || ' ' || p.anio::TEXT
            ELSE 'Segunda quincena de ' || p.mes || ' ' || p.anio::TEXT
        END
    FROM constancia_pago cp
    JOIN empleado           e ON e.id_empleado   = cp.id_empleado
    JOIN resumen_constancia r ON r.id_constancia = cp.id_constancia
    CROSS JOIN periodo p
    WHERE cp.id_periodo = p_id_periodo
      AND cp.id_empresa = p_id_empresa
      AND cp.anulada    = false
    ORDER BY e.apellido, e.nombre;
$$;


-- ============================================================
--  BLOQUE 5: ANULACIÓN DE CONSTANCIA
-- ============================================================
CREATE OR REPLACE FUNCTION fn_anular_constancia(
    p_id_constancia INT,
    p_motivo        TEXT,
    p_usuario       TEXT
)
RETURNS TABLE (
    numero_constancia TEXT,
    empleado          TEXT,
    periodo           TEXT,
    liquido_anulado   NUMERIC(18,2),
    motivo            TEXT,
    anulado_por       TEXT,
    fecha_anulacion   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_liquido NUMERIC(18,2);
BEGIN

    -- ── Validaciones ──────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM constancia_pago WHERE id_constancia = p_id_constancia
    ) THEN
        RAISE EXCEPTION 'La constancia indicada no existe.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM constancia_pago
        WHERE id_constancia = p_id_constancia AND anulada = true
    ) THEN
        RAISE EXCEPTION 'La constancia ya se encuentra anulada.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM constancia_pago cp
        JOIN periodo_pago pp ON pp.id_periodo = cp.id_periodo
        WHERE cp.id_constancia = p_id_constancia
          AND pp.cerrado       = true
    ) THEN
        RAISE EXCEPTION 'No se puede anular una constancia de un período ya cerrado.';
    END IF;

    IF TRIM(COALESCE(p_motivo, '')) = '' THEN
        RAISE EXCEPTION 'Debe indicar el motivo de la anulación.';
    END IF;

    -- ── Capturar líquido para bitácora ────────────────────────
    SELECT liquido_recibir
    INTO v_liquido
    FROM resumen_constancia
    WHERE id_constancia = p_id_constancia;

    -- ── Marcar como anulada ───────────────────────────────────
    UPDATE constancia_pago
    SET anulada = true
    WHERE id_constancia = p_id_constancia;

    -- ── Registrar en bitácora ─────────────────────────────────
    INSERT INTO bitacora_anulacion (
        id_constancia, fecha_anulacion, motivo, usuario, liquido_anulado
    )
    VALUES (
        p_id_constancia, NOW(), p_motivo, p_usuario, COALESCE(v_liquido, 0)
    );

    -- ── Retornar resumen de la operación ─────────────────────
    RETURN QUERY
    SELECT
        cp.numero_constancia,
        e.nombre || ' ' || e.apellido,
        pp.mes   || ' ' || pp.anio::TEXT,
        v_liquido,
        p_motivo,
        p_usuario,
        NOW()
    FROM constancia_pago cp
    JOIN empleado     e  ON e.id_empleado  = cp.id_empleado
    JOIN periodo_pago pp ON pp.id_periodo  = cp.id_periodo
    WHERE cp.id_constancia = p_id_constancia;

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;


-- ============================================================
--  BLOQUE 6: CIERRE DE PERÍODO
--
--  Retorna 2 result sets en PostgreSQL mediante 2 funciones:
--    fn_cerrar_periodo        → ejecuta el cierre y devuelve resumen
--    fn_cerrar_periodo_detalle → devuelve el detalle por empleado
--  Llamar fn_cerrar_periodo primero; si no lanza excepción,
--  llamar fn_cerrar_periodo_detalle para obtener el listado.
-- ============================================================

-- 6.1  Función principal de cierre
CREATE OR REPLACE FUNCTION fn_cerrar_periodo(
    p_id_periodo INT,
    p_id_empresa INT,
    p_usuario    TEXT,
    p_forzar     SMALLINT DEFAULT 0
)
RETURNS TABLE (
    periodo                  TEXT,
    quincena                 TEXT,
    fecha_inicio             TEXT,
    fecha_fin                TEXT,
    total_constancias        BIGINT,
    suma_ingresos            NUMERIC(18,2),
    suma_descuentos          NUMERIC(18,2),
    suma_liquido             NUMERIC(18,2),
    cerrado_por              TEXT,
    fecha_cierre             TIMESTAMPTZ,
    empleados_sin_constancia INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
#variable_conflict use_column
DECLARE
    v_sin_constancia INT;
    v_fecha_inicio   DATE;
BEGIN

    -- ── Validar existencia ────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM periodo_pago
        WHERE id_periodo = p_id_periodo AND id_empresa = p_id_empresa
    ) THEN
        RAISE EXCEPTION 'El período indicado no existe para esta empresa.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM periodo_pago
        WHERE id_periodo = p_id_periodo AND cerrado = true
    ) THEN
        RAISE EXCEPTION 'El período ya se encuentra cerrado.';
    END IF;

    -- ── Empleados sin constancia ──────────────────────────────
    SELECT COUNT(*)::INT
    INTO v_sin_constancia
    FROM empleado e
    JOIN departamento d ON d.id_departamento = e.id_departamento
    WHERE d.id_empresa = p_id_empresa
      AND e.activo     = true
      AND NOT EXISTS (
            SELECT 1 FROM constancia_pago cp
            WHERE cp.id_empleado = e.id_empleado
              AND cp.id_periodo  = p_id_periodo
              AND cp.anulada     = false
      );

    -- ── Si hay faltantes y no se fuerza, listar y lanzar error
    IF v_sin_constancia > 0 AND p_forzar = 0 THEN
        RAISE EXCEPTION 'Existen % empleado(s) sin constancia. Use p_forzar = 1 para cerrar de todas formas. Consulte fn_empleados_sin_constancia(%, %) para ver el detalle.',
            v_sin_constancia, p_id_periodo, p_id_empresa;
    END IF;

    -- ── Cerrar período ────────────────────────────────────────
    UPDATE periodo_pago
    SET cerrado = true
    WHERE id_periodo = p_id_periodo;

    -- ── Retornar resumen consolidado ──────────────────────────
    RETURN QUERY
    SELECT
        pp.mes || ' ' || pp.anio::TEXT,
        CASE WHEN EXTRACT(DAY FROM pp.fecha_inicio) <= 15
             THEN 'Primera quincena'
             ELSE 'Segunda quincena'
        END,
        TO_CHAR(pp.fecha_inicio, 'DD/MM/YYYY'),
        TO_CHAR(pp.fecha_fin,    'DD/MM/YYYY'),
        COUNT(cp.id_constancia),
        SUM(r.total_ingresos),
        SUM(r.total_descuentos),
        SUM(r.liquido_recibir),
        p_usuario,
        NOW(),
        v_sin_constancia
    FROM periodo_pago pp
    JOIN constancia_pago    cp ON cp.id_periodo   = pp.id_periodo
                               AND cp.anulada      = false
    JOIN resumen_constancia  r ON r.id_constancia = cp.id_constancia
    WHERE pp.id_periodo = p_id_periodo
    GROUP BY pp.mes, pp.anio, pp.fecha_inicio, pp.fecha_fin;

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

-- 6.2  Detalle por empleado al cierre
CREATE OR REPLACE FUNCTION fn_cerrar_periodo_detalle(
    p_id_periodo INT
)
RETURNS TABLE (
    id_fila          BIGINT,
    empleado         TEXT,
    numero_constancia TEXT,
    total_ingresos   NUMERIC(18,2),
    total_descuentos NUMERIC(18,2),
    liquido_recibir  NUMERIC(18,2),
    banco            TEXT,
    numero_cuenta    TEXT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        ROW_NUMBER() OVER (ORDER BY e.apellido, e.nombre),
        e.nombre || ' ' || e.apellido,
        cp.numero_constancia,
        r.total_ingresos,
        r.total_descuentos,
        r.liquido_recibir,
        cb.banco,
        cb.numero_cuenta
    FROM constancia_pago cp
    JOIN empleado              e  ON e.id_empleado   = cp.id_empleado
    JOIN resumen_constancia    r  ON r.id_constancia = cp.id_constancia
    LEFT JOIN cuenta_bancaria_empleado cb
                                  ON cb.id_empleado  = e.id_empleado
                                 AND cb.principal     = true
                                 AND cb.activa        = true
    WHERE cp.id_periodo = p_id_periodo
      AND cp.anulada    = false
    ORDER BY e.apellido, e.nombre;
$$;

-- 6.3  Helper: empleados sin constancia en un período (para consulta previa al cierre)
CREATE OR REPLACE FUNCTION fn_empleados_sin_constancia(
    p_id_periodo INT,
    p_id_empresa INT
)
RETURNS TABLE (
    empleado_pendiente TEXT,
    departamento       TEXT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        e.nombre || ' ' || e.apellido,
        d.nombre
    FROM empleado e
    JOIN departamento d ON d.id_departamento = e.id_departamento
    WHERE d.id_empresa = p_id_empresa
      AND e.activo     = true
      AND NOT EXISTS (
            SELECT 1 FROM constancia_pago cp
            WHERE cp.id_empleado = e.id_empleado
              AND cp.id_periodo  = p_id_periodo
              AND cp.anulada     = false
      )
    ORDER BY d.nombre, e.apellido;
$$;


-- ============================================================
--  EJEMPLOS DE USO
-- ============================================================

-- Ejemplo 1: Insertar empresa
SELECT fn_empresa_insert(
    'Importaciones CRESGO, S.A.',
    '6906818-6',
    '5a Avenida 12-23 Zona 9, Guatemala',
    '2333-4455'
);

-- Ejemplo 2: Generar constancia (JSON con detalles manuales)
SELECT fn_generar_constancia(
    1,   -- id_empleado
    2,   -- id_periodo
    1,   -- id_empresa
    350000.00,
    0.00,
    '[
        {"codigo":"SAL_ORD",  "monto":5000},
        {"codigo":"BON_INC",  "monto":350},
        {"codigo":"ANT_SAL",  "monto":0},
        {"codigo":"OTR_ING",  "monto":300},
        {"codigo":"ANT_EMP",  "monto":500},
        {"codigo":"PARQUEO",  "monto":0},
        {"codigo":"SEG_MED",  "monto":0},
        {"codigo":"OTR_DES",  "monto":0},
        {"codigo":"EMBARGO",  "monto":0},
        {"codigo":"BOL_ORN",  "monto":0}
    ]'::JSONB
);

-- Ejemplo 3: Consultar documento (4 llamadas separadas)
SELECT * FROM fn_doc_encabezado(1);
SELECT * FROM fn_doc_ingresos(1);
SELECT * FROM fn_doc_descuentos(1);
SELECT * FROM fn_doc_resumen(1);

-- Ejemplo 4: Reporte de nómina
SELECT * FROM fn_reporte_nomina(2, 1);

-- Ejemplo 5: Anular una constancia
SELECT * FROM fn_anular_constancia(
    1,
    'Error en monto de salario ordinario, se generará constancia corregida.',
    'admin.rh'
);

-- Ejemplo 6: Ver empleados sin constancia antes de cerrar
SELECT * FROM fn_empleados_sin_constancia(2, 1);

-- Ejemplo 7: Cerrar período (sin forzar)
SELECT * FROM fn_cerrar_periodo(2, 1, 'admin.rh', 0);

-- Ejemplo 8: Forzar cierre
SELECT * FROM fn_cerrar_periodo(2, 1, 'admin.rh', 1);

-- Ejemplo 9: Detalle por empleado tras el cierre
SELECT * FROM fn_cerrar_periodo_detalle(2);


-- ============================================================
--  BLOQUE 7: BITÁCORA DE EDICIÓN DE PLANILLAS
-- ============================================================
CREATE TABLE IF NOT EXISTS bitacora_edicion_planilla (
    id_bitacora     SERIAL PRIMARY KEY,
    id_periodo      INT          NOT NULL,
    fecha_cambio    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    detalles        TEXT         NOT NULL,
    usuario         TEXT         NOT NULL DEFAULT 'Sistema'
);

