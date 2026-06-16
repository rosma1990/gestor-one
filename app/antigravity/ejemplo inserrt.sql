-- ============================================================
--  CONSTANCIAS DE PAGO - DATOS DE EJEMPLO
--  Base de datos: SQL Server
--  Generado: 2026-05-09
-- ============================================================

SET DATEFORMAT YMD;
SET NOCOUNT ON;
GO

-- ============================================================
-- 1. EMPRESA
-- ============================================================
INSERT INTO EMPRESA (id_empresa, nombre, nit, direccion, telefono)
VALUES (1, 'Importaciones CRESGO, S.A.', '6906818-6',
        '5a Avenida 12-23 Zona 9, Guatemala, Guatemala',
        '2333-4455');
GO

-- ============================================================
-- 2. DEPARTAMENTO
-- ============================================================
INSERT INTO DEPARTAMENTO (id_departamento, id_empresa, nombre, codigo)
VALUES
(1, 1, 'Administración',    'ADM'),
(2, 1, 'Ventas',            'VEN'),
(3, 1, 'Operaciones',       'OPE'),
(4, 1, 'Recursos Humanos',  'RHH');
GO

-- ============================================================
-- 3. EMPLEADO
-- ============================================================
INSERT INTO EMPLEADO (id_empleado, id_departamento, nombre, apellido,
                      cui, nit, puesto, fecha_ingreso, activo)
VALUES
(1, 1, 'Carlos Alberto', 'Pérez López',
   '2456 78901 0101', '1234567-8', 'Contador General',   '2020-03-15', 1),
(2, 2, 'María José',     'González Ruiz',
   '3012 45678 0201', '8765432-1', 'Ejecutiva de Ventas','2021-07-01', 1),
(3, 3, 'Luis Fernando',  'Morales Cifuentes',
   '1589 23456 0301', '5544332-0', 'Bodeguero',          '2019-01-10', 1),
(4, 4, 'Ana Lucía',      'Herrera Méndez',
   '4123 67890 0401', '9988776-5', 'Asistente RH',       '2022-09-05', 1);
GO

-- ============================================================
-- 4. CUENTA_BANCARIA_EMPLEADO
-- ============================================================
INSERT INTO CUENTA_BANCARIA_EMPLEADO
    (id_cuenta, id_empleado, banco, numero_cuenta, principal, activa)
VALUES
(1, 1, 'Banco Industrial',     '00-00000-1', 1, 1),
(2, 2, 'Banco Industrial',     '00-11111-2', 1, 1),
(3, 2, 'BAC Credomatic',       '204-001234-5', 0, 1),  -- cuenta secundaria
(4, 3, 'Banrural',             '4010-056789-0', 1, 1),
(5, 4, 'G&T Continental',      '902-334455-6', 1, 1);
GO

-- ============================================================
-- 5. PERIODO_PAGO
-- ============================================================
INSERT INTO PERIODO_PAGO
    (id_periodo, id_empresa, mes, anio, tipo, fecha_inicio, fecha_fin, cerrado)
VALUES
(1, 1, 'Abril',  2026, 'QUINCENAL', '2026-04-01', '2026-04-15', 1),
(2, 1, 'Abril',  2026, 'QUINCENAL', '2026-04-16', '2026-04-30', 1),
(3, 1, 'Mayo',   2026, 'QUINCENAL', '2026-05-01', '2026-05-15', 0),
(4, 1, 'Mayo',   2026, 'QUINCENAL', '2026-05-16', '2026-05-31', 0);
GO

-- ============================================================
-- 6. CONSTANTE_SISTEMA
-- ============================================================
INSERT INTO CONSTANTE_SISTEMA (id_constante, clave, valor, descripcion, vigente_desde)
VALUES
(1, 'FACTOR_IGSS',    0.0483,  'Cuota laboral IGSS empleado (4.83%)',              '2024-01-01'),
(2, 'MONTO_BON_BASE', 250.00,  'Bonificación incentivo Dto. 37-2001 mensual',      '2024-01-01'),
(3, 'MONTO_BOL_ORN',  150.00,  'Boleto de ornato anual municipio Guatemala',       '2026-01-01'),
(4, 'FACTOR_ISR',     0.05,    'Tasa ISR sobre renta sobre el excedente Q30,000',  '2024-01-01'),
(5, 'BASE_EXENTA_ISR',48000.00,'Renta anual exenta ISR (Q48,000)',                 '2024-01-01');
GO

-- ============================================================
-- 7. CONCEPTO_PAGO
--    tipo        : INGRESO | DESCUENTO
--    naturaleza  : FIJO | VARIABLE | CALCULADO
--    origen      : MANUAL | FORMULA | CONSTANTE
--    mostrar_en_cero: 1 = siempre aparece en el documento impreso
-- ============================================================
INSERT INTO CONCEPTO_PAGO
    (id_concepto, codigo, nombre, tipo, naturaleza, origen,
     formula, referencia_constante, mostrar_en_cero, orden_display,
     activo, vigente_desde, vigente_hasta)
VALUES
-- INGRESOS
(1,  'SAL_ORD',   'Salario Ordinario',             'INGRESO',   'FIJO',      'MANUAL',    NULL,                    NULL,            1, 1,  1, '2024-01-01', NULL),
(2,  'BON_INC',   'Bonificación Incentivo D.37-2001','INGRESO', 'FIJO',      'CONSTANTE', NULL,                    'MONTO_BON_BASE',1, 2,  1, '2024-01-01', NULL),
(3,  'ANT_SAL',   'Anticipo sobre salario',         'INGRESO',  'VARIABLE',  'MANUAL',    NULL,                    NULL,            1, 3,  1, '2024-01-01', NULL),
(4,  'OTR_ING',   'Otros ingresos',                 'INGRESO',  'VARIABLE',  'MANUAL',    NULL,                    NULL,            1, 4,  1, '2024-01-01', NULL),

-- DESCUENTOS CALCULADOS
(5,  'IGSS',      'Cuota Laboral IGSS',             'DESCUENTO','CALCULADO', 'FORMULA',   'SAL_ORD * FACTOR_IGSS', 'FACTOR_IGSS',   1, 5,  1, '2024-01-01', NULL),
(6,  'ISR',       'ISR Empleados 2026',             'DESCUENTO','CALCULADO', 'FORMULA',   'RENTA_ANUAL * FACTOR_ISR / 12', 'FACTOR_ISR', 1, 6, 1, '2024-01-01', NULL),

-- DESCUENTOS VARIABLES
(7,  'ANT_EMP',   'Anticipo a empleado',            'DESCUENTO','VARIABLE',  'MANUAL',    NULL,                    NULL,            1, 7,  1, '2024-01-01', NULL),
(8,  'PARQUEO',   'Parqueos',                       'DESCUENTO','FIJO',      'MANUAL',    NULL,                    NULL,            1, 8,  1, '2024-01-01', NULL),
(9,  'SEG_MED',   'Seguro médico',                  'DESCUENTO','FIJO',      'MANUAL',    NULL,                    NULL,            1, 9,  1, '2024-01-01', NULL),
(10, 'OTR_DES',   'Otros descuentos',               'DESCUENTO','VARIABLE',  'MANUAL',    NULL,                    NULL,            1, 10, 1, '2024-01-01', NULL),
(11, 'EMBARGO',   'Embargos',                       'DESCUENTO','VARIABLE',  'MANUAL',    NULL,                    NULL,            1, 11, 1, '2024-01-01', NULL),

-- DESCUENTOS FIJOS CON CONSTANTE
(12, 'BOL_ORN',   'Boleto de ornato 2026',          'DESCUENTO','FIJO',      'CONSTANTE', NULL,                    'MONTO_BOL_ORN', 1, 12, 1, '2026-01-01', NULL);
GO

-- ============================================================
-- 8. CONSTANCIA_PAGO
-- ============================================================
INSERT INTO CONSTANCIA_PAGO
    (id_constancia, id_empleado, id_periodo, id_empresa,
     numero_constancia, fecha_emision, texto_concepto, anulada)
VALUES
(1, 1, 2, 1,
   'CRESGO-2026-0001',
   '2026-04-29',
   'Salario ordinario correspondiente al período del 16-04-2026 al 30-04-2026, ' +
   'el cual se detalla a continuación, aceptando los descuentos que en este pago ' +
   'se me realizan dándolos por válidos y buenos.',
   0),
(2, 2, 2, 1,
   'CRESGO-2026-0002',
   '2026-04-29',
   'Salario ordinario correspondiente al período del 16-04-2026 al 30-04-2026, ' +
   'el cual se detalla a continuación, aceptando los descuentos que en este pago ' +
   'se me realizan dándolos por válidos y buenos.',
   0),
(3, 3, 2, 1,
   'CRESGO-2026-0003',
   '2026-04-29',
   'Salario ordinario correspondiente al período del 16-04-2026 al 30-04-2026, ' +
   'el cual se detalla a continuación, aceptando los descuentos que en este pago ' +
   'se me realizan dándolos por válidos y buenos.',
   0);
GO

-- ============================================================
-- 9. DETALLE_CONSTANCIA
--    Empleado 1 (Carlos): SAL_ORD=5000, BON_INC=350, ANT_SAL=0,
--                         OTR_ING=300 → Total ingresos=5650
--                         IGSS=241.50, ISR=0, ANT_EMP=500,
--                         resto=0      → Total descuentos=741.50
-- ============================================================

-- Constancia 1 - Carlos Pérez
INSERT INTO DETALLE_CONSTANCIA
    (id_detalle, id_constancia, id_concepto, monto,
     base_calculo, factor_aplicado, origen_valor, orden_display)
VALUES
-- Ingresos
(1,  1, 1,  5000.00, NULL,    NULL,   'MANUAL',    1),  -- SAL_ORD
(2,  1, 2,   350.00, NULL,    NULL,   'CONSTANTE', 2),  -- BON_INC
(3,  1, 3,     0.00, NULL,    NULL,   'MANUAL',    3),  -- ANT_SAL
(4,  1, 4,   300.00, NULL,    NULL,   'MANUAL',    4),  -- OTR_ING
-- Descuentos
(5,  1, 5,   241.50, 5000.00, 0.0483,'FORMULA',   5),  -- IGSS
(6,  1, 6,     0.00, NULL,    NULL,   'FORMULA',   6),  -- ISR
(7,  1, 7,   500.00, NULL,    NULL,   'MANUAL',    7),  -- ANT_EMP
(8,  1, 8,     0.00, NULL,    NULL,   'MANUAL',    8),  -- PARQUEO
(9,  1, 9,     0.00, NULL,    NULL,   'MANUAL',    9),  -- SEG_MED
(10, 1, 10,    0.00, NULL,    NULL,   'MANUAL',    10), -- OTR_DES
(11, 1, 11,    0.00, NULL,    NULL,   'MANUAL',    11), -- EMBARGO
(12, 1, 12,    0.00, NULL,    NULL,   'CONSTANTE', 12); -- BOL_ORN

-- Constancia 2 - María González
INSERT INTO DETALLE_CONSTANCIA
    (id_detalle, id_constancia, id_concepto, monto,
     base_calculo, factor_aplicado, origen_valor, orden_display)
VALUES
(13, 2, 1,  6500.00, NULL,    NULL,   'MANUAL',    1),  -- SAL_ORD
(14, 2, 2,   350.00, NULL,    NULL,   'CONSTANTE', 2),  -- BON_INC
(15, 2, 3,     0.00, NULL,    NULL,   'MANUAL',    3),  -- ANT_SAL
(16, 2, 4,     0.00, NULL,    NULL,   'MANUAL',    4),  -- OTR_ING
(17, 2, 5,   313.95, 6500.00, 0.0483,'FORMULA',   5),  -- IGSS
(18, 2, 6,   120.00, NULL,    NULL,   'FORMULA',   6),  -- ISR
(19, 2, 7,     0.00, NULL,    NULL,   'MANUAL',    7),  -- ANT_EMP
(20, 2, 8,   200.00, NULL,    NULL,   'MANUAL',    8),  -- PARQUEO
(21, 2, 9,   150.00, NULL,    NULL,   'MANUAL',    9),  -- SEG_MED
(22, 2, 10,    0.00, NULL,    NULL,   'MANUAL',    10), -- OTR_DES
(23, 2, 11,    0.00, NULL,    NULL,   'MANUAL',    11), -- EMBARGO
(24, 2, 12,  150.00, NULL,    NULL,   'CONSTANTE', 12); -- BOL_ORN

-- Constancia 3 - Luis Morales
INSERT INTO DETALLE_CONSTANCIA
    (id_detalle, id_constancia, id_concepto, monto,
     base_calculo, factor_aplicado, origen_valor, orden_display)
VALUES
(25, 3, 1,  3200.00, NULL,    NULL,   'MANUAL',    1),  -- SAL_ORD
(26, 3, 2,   350.00, NULL,    NULL,   'CONSTANTE', 2),  -- BON_INC
(27, 3, 3,     0.00, NULL,    NULL,   'MANUAL',    3),  -- ANT_SAL
(28, 3, 4,     0.00, NULL,    NULL,   'MANUAL',    4),  -- OTR_ING
(29, 3, 5,   154.56, 3200.00, 0.0483,'FORMULA',   5),  -- IGSS
(30, 3, 6,     0.00, NULL,    NULL,   'FORMULA',   6),  -- ISR
(31, 3, 7,     0.00, NULL,    NULL,   'MANUAL',    7),  -- ANT_EMP
(32, 3, 8,     0.00, NULL,    NULL,   'MANUAL',    8),  -- PARQUEO
(33, 3, 9,    75.00, NULL,    NULL,   'MANUAL',    9),  -- SEG_MED
(34, 3, 10,    0.00, NULL,    NULL,   'MANUAL',    10), -- OTR_DES
(35, 3, 11,    0.00, NULL,    NULL,   'MANUAL',    11), -- EMBARGO
(36, 3, 12,    0.00, NULL,    NULL,   'CONSTANTE', 12); -- BOL_ORN
GO

-- ============================================================
-- 10. RESUMEN_CONSTANCIA
-- ============================================================
INSERT INTO RESUMEN_CONSTANCIA
    (id_resumen, id_constancia, total_ingresos, total_descuentos, liquido_recibir)
VALUES
(1, 1, 5650.00,  741.50, 4908.50),  -- Carlos:  5650 - 741.50
(2, 2, 6850.00,  933.95, 5916.05),  -- María:   6850 - 933.95
(3, 3, 3550.00,  229.56, 3320.44);  -- Luis:    3550 - 229.56
GO

-- ============================================================
-- 11. RETENCION_ISR
-- ============================================================
INSERT INTO RETENCION_ISR
    (id_retencion, id_constancia, renta_acreditada, monto_retenido, anio_fiscal)
VALUES
(1, 1, 350000.00, 0.00,    2026),  -- Carlos: dentro del rango exento
(2, 2, 420000.00, 120.00,  2026),  -- María:  con retención
(3, 3, 210000.00, 0.00,    2026);  -- Luis:   dentro del rango exento
GO

-- ============================================================
-- VERIFICACION RAPIDA
-- ============================================================
SELECT
    e.nombre + ' ' + e.apellido          AS empleado,
    cp.numero_constancia,
    r.total_ingresos,
    r.total_descuentos,
    r.liquido_recibir,
    cb.banco,
    cb.numero_cuenta
FROM CONSTANCIA_PAGO cp
JOIN EMPLEADO             e  ON e.id_empleado  = cp.id_empleado
JOIN RESUMEN_CONSTANCIA   r  ON r.id_constancia = cp.id_constancia
JOIN CUENTA_BANCARIA_EMPLEADO cb
                          ON cb.id_empleado = e.id_empleado
                         AND cb.principal   = 1
ORDER BY cp.numero_constancia;
GO