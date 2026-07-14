-- MIGRACIÓN ADICIONAL: AGREGAR COLUMNA DE DESCRIPCIÓN A SELECT_OPTIONS Y MANEJO DINÁMICO DE DEFAULT
-- Archivo: supabase/migrations/202607142210_add_select_options_description.sql

ALTER TABLE public.select_options ADD COLUMN IF NOT EXISTS description TEXT;

-- Quitar cualquier default hardcodeado previo para evitar dependencias de UUIDs fijos entre entornos
ALTER TABLE public.contributions ALTER COLUMN publication_status_option_id DROP DEFAULT;

-- Crear función de trigger para asignar dinámicamente el estado por defecto 'not_evaluated' al insertar un aporte
CREATE OR REPLACE FUNCTION public.set_default_publication_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.publication_status_option_id IS NULL THEN
        SELECT id INTO NEW.publication_status_option_id
        FROM public.select_options
        WHERE category = 'publication_status' AND code = 'not_evaluated'
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear disparador
DROP TRIGGER IF EXISTS trg_set_default_publication_status ON public.contributions;
CREATE TRIGGER trg_set_default_publication_status
BEFORE INSERT ON public.contributions
FOR EACH ROW
EXECUTE FUNCTION public.set_default_publication_status();


-- Actualizar las descripciones de las semillas de indicadores editoriales
UPDATE public.select_options 
SET description = 'Archivos no subidos por el aportante o tamaño superior a 50 MB.'
WHERE id = '8c71a3bb-8c3b-4171-a472-ee1d8bb09cc1';

UPDATE public.select_options 
SET description = 'Descripción vacía o incoherente, o datos de catálogo faltantes.'
WHERE id = '8c71a3bb-8c3b-4171-a472-ee1d8bb09cc2';

UPDATE public.select_options 
SET description = 'Aporte contiene audio o video sin texto transcrito.'
WHERE id = '8c71a3bb-8c3b-4171-a472-ee1d8bb09cc3';

UPDATE public.select_options 
SET description = 'Fechas, lugares o personas en el testimonio no corroborados.'
WHERE id = '8c71a3bb-8c3b-4171-a472-ee1d8bb09cc4';

UPDATE public.select_options 
SET description = 'Dudas sobre la procedencia, coherencia o detalles del material.'
WHERE id = '8c71a3bb-8c3b-4171-a472-ee1d8bb09cc5';

UPDATE public.select_options 
SET description = 'Mención de datos personales protegidos o hechos conflictivos locales.'
WHERE id = '8c71a3bb-8c3b-4171-a472-ee1d8bb09cc6';

UPDATE public.select_options 
SET description = 'Archivos dañados, audios con mucho ruido o videos desincronizados.'
WHERE id = '8c71a3bb-8c3b-4171-a472-ee1d8bb09cc7';

UPDATE public.select_options 
SET description = 'Falta firma física o convenio de cesión no verificado.'
WHERE id = '8c71a3bb-8c3b-4171-a472-ee1d8bb09cc8';


-- Actualizar las descripciones de las semillas de estados de publicación
UPDATE public.select_options 
SET description = 'Aporte recibido, pendiente de revisión editorial y legal.'
WHERE id = 'd3c1a3bb-8c3b-4171-a472-ee1d8bb09cc1';

UPDATE public.select_options 
SET description = 'Rechazado en revisión o restricción legal insalvable.'
WHERE id = 'd3c1a3bb-8c3b-4171-a472-ee1d8bb09cc2';

UPDATE public.select_options 
SET description = 'Validación completa y consentimiento firmado de nivel A o B.'
WHERE id = 'd3c1a3bb-8c3b-4171-a472-ee1d8bb09cc3';

UPDATE public.select_options 
SET description = 'Aporte aprobado y fecha de publicación establecida.'
WHERE id = 'd3c1a3bb-8c3b-4171-a472-ee1d8bb09cc4';

UPDATE public.select_options 
SET description = 'Material expuesto públicamente (lógica no activa en esta etapa).'
WHERE id = 'd3c1a3bb-8c3b-4171-a472-ee1d8bb09cc5';

UPDATE public.select_options 
SET description = 'Aporte anteriormente publicado que fue removido por solicitud o revisión.'
WHERE id = 'd3c1a3bb-8c3b-4171-a472-ee1d8bb09cc6';
