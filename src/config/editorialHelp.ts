export interface HelpContent {
  title: string;
  description: string;
  whyExists: string;
  conditions?: string[];
  missing?: string[];
  nextStep?: string;
  details?: string;
  permissions?: string;
  restrictions?: string;
  significance?: string;
  whenToUse?: string;
  howToResolve?: string;
}

export interface EditorialHelpConfig {
  editorialStatus: Record<string, HelpContent>;
  authorizationLevel: Record<string, HelpContent>;
  creditPreference: Record<string, HelpContent>;
  indicators: Record<string, HelpContent>;
}

export const editorialHelp: EditorialHelpConfig = {
  editorialStatus: {
    received: {
      title: 'Recibido',
      description: 'El aporte ha ingresado al sistema a través del portal web y está en la bandeja de entrada para su primera evaluación.',
      conditions: [
        'Aporte enviado por el aportante desde el formulario público.',
        'Consentimiento digital aceptado en la web.'
      ],
      missing: [
        'Verificación de legibilidad y contenido de los archivos.',
        'Revisión inicial del título y descripción.',
        'Asignación al flujo editorial correspondiente.'
      ],
      nextStep: 'En revisión o Datos incompletos (según corresponda).',
      whyExists: 'Funciona como el punto de entrada oficial para todo nuevo material, garantizando que nada se pierda antes de comenzar el trabajo del equipo.'
    },
    incomplete: {
      title: 'Datos incompletos',
      description: 'El aporte fue recibido, pero carece de información crítica o los archivos están dañados o ausentes.',
      conditions: [
        'Inspección preliminar realizada por un editor.',
        'Detección de omisiones graves (ej. foto borrosa, descripción incomprensible, falta de datos de contacto).'
      ],
      missing: [
        'Comunicación con el aportante para subsanar los datos faltantes.',
        'Recepción de nuevos archivos por canales alternativos si es necesario.'
      ],
      nextStep: 'En revisión (una vez completada la información necesaria).',
      whyExists: 'Evita que el equipo editorial gaste tiempo procesando o validando aportes que no cuentan con el mínimo de datos para ser legibles o útiles.'
    },
    in_review: {
      title: 'En revisión',
      description: 'El equipo editorial está evaluando el contenido del aporte para determinar los siguientes pasos del proceso de catalogación.',
      conditions: [
        'Aporte con datos mínimos completos.',
        'Firma o consentimiento verificado en el sistema.'
      ],
      missing: [
        'Lectura y análisis del testimonio escrito.',
        'Inspección detallada de archivos multimedia.',
        'Definición de si requiere transcripción de audio/video.'
      ],
      nextStep: 'En transcripción (si tiene archivos de audio o video) o En validación histórica (para fotos y documentos).',
      whyExists: 'Asegura que cada aporte sea examinado individualmente para planificar adecuadamente el trabajo posterior de transcripción y validación.'
    },
    in_transcription: {
      title: 'En transcripción',
      description: 'El material audiovisual o de audio está en proceso de ser convertido a formato de texto escrito por un voluntario.',
      conditions: [
        'El aporte contiene testimonios orales, entrevistas en audio o grabaciones de video.',
        'Se asignó un transcriptor voluntario al aporte.'
      ],
      missing: [
        'Redacción del borrador completo del texto de la grabación.',
        'Revisión y formato del texto según las pautas de transcripción.'
      ],
      nextStep: 'Transcripto.',
      whyExists: 'Permite hacer accesible la oralidad, facilitando la lectura de los testimonios y la búsqueda de palabras clave dentro de las memorias.'
    },
    transcribed: {
      title: 'Transcripto',
      description: 'La grabación oral ha sido completamente volcada a texto y guardada en la ficha para su posterior validación.',
      conditions: [
        'Transcripción en texto ingresada y guardada en la base de datos.',
        'Revisión ortográfica básica realizada.'
      ],
      missing: [
        'Validación de los nombres, fechas y lugares mencionados en el texto.',
        'Ajuste final del estilo de transcripción.'
      ],
      nextStep: 'En validación histórica.',
      whyExists: 'Marca la finalización exitosa del proceso de transcripción y habilita el inicio del análisis histórico del contenido.'
    },
    in_historical_validation: {
      title: 'En validación histórica',
      description: 'Se está investigando y contextualizando la información vertida en el aporte para enriquecer su valor documental.',
      conditions: [
        'Aporte con transcripción lista (si aplica) o metadatos analizados.'
      ],
      missing: [
        'Cotejo de datos con registros históricos locales.',
        'Redacción de notas explicativas de contexto (sin alterar el testimonio original).'
      ],
      nextStep: 'Validado.',
      whyExists: 'La validación histórica aporta contexto de época a las memorias orales y documentos, facilitando su comprensión por las futuras generaciones.'
    },
    validated: {
      title: 'Validado',
      description: 'El aporte cuenta con su contextualización histórica completa y ha sido aprobado para definir su destino final.',
      conditions: [
        'Contextualización finalizada y guardada.',
        'Fechas, lugares e identidades verificadas en la medida de lo posible.'
      ],
      missing: [
        'Definición de los canales de salida definitivos por el editor responsable.'
      ],
      nextStep: 'Aprobado para archivo, Aprobado para libro, o Aprobado para e-book.',
      whyExists: 'Certifica que el aporte ha completado todo el análisis de contenido y está listo para integrarse a los canales de divulgación.'
    },
    approved_archive: {
      title: 'Aprobado para archivo',
      description: 'El aporte ha sido seleccionado para incorporarse de forma permanente al fondo documental del archivo digital.',
      conditions: [
        'Validación histórica completada.',
        'Nivel de autorización compatible con consulta pública o interna en archivo.'
      ],
      missing: [
        'Indexación definitiva en el catálogo general de consulta.'
      ],
      nextStep: 'Archivado.',
      whyExists: 'Garantiza la preservación a perpetuidad de testimonios de valor patrimonial que conformarán la base de consulta de Memoria Viva.'
    },
    approved_book: {
      title: 'Aprobado para libro',
      description: 'El material ha sido elegido por su alto interés general para formar parte de la publicación física/impresa del proyecto.',
      conditions: [
        'Nivel de autorización A o B (que permite publicación impresa).',
        'Criterio de relevancia narrativa o documental sobresaliente.'
      ],
      missing: [
        'Diseño gráfico y maquetación de la página.',
        'Corrección de estilo adaptada al soporte de papel.'
      ],
      nextStep: 'Archivado.',
      whyExists: 'Identifica los aportes clave que conformarán el libro físico, facilitando la selección de materiales por el equipo de diseño editorial.'
    },
    approved_ebook: {
      title: 'Aprobado para e-book',
      description: 'El aporte se integrará en el volumen digital recopilatorio para su distribución electrónica.',
      conditions: [
        'Nivel de autorización compatible con distribución digital.',
        'Formato multimedia adecuado o testimonio adaptable.'
      ],
      missing: [
        'Maquetación del archivo e-pub/pdf digital interactivo.'
      ],
      nextStep: 'Archivado.',
      whyExists: 'Organiza la selección de contenidos para la publicación digital, asegurando la trazabilidad del consentimiento para este medio.'
    },
    restricted: {
      title: 'Restringido',
      description: 'El aporte se mantendrá resguardado por contener información de alta sensibilidad o por solicitud explícita.',
      conditions: [
        'Nivel de autorización restrictivo (ej. Nivel D) o decisión del comité editorial por cuestiones de privacidad.'
      ],
      missing: [
        'Configuración de permisos de visualización estricta.',
        'Establecimiento de fechas de revisión de la restricción si aplica.'
      ],
      nextStep: 'Archivado (en modo protegido).',
      whyExists: 'Permite resguardar material que corre riesgo de pérdida física pero cuya difusión pública inmediata no es oportuna o no está autorizada.'
    },
    rejected: {
      title: 'Rechazado',
      description: 'El aporte no cumple con los criterios del archivo (contenido fuera de tema, ofensivo o duplicado).',
      conditions: [
        'Evaluación editorial que constata incompatibilidad insalvable con el proyecto.'
      ],
      missing: [
        'Registro interno del motivo del rechazo para constancia administrativa.'
      ],
      nextStep: 'Archivado (marcado como inactivo/rechazado).',
      whyExists: 'Protege la integridad del archivo evitando la acumulación de spam, material fraudulento o ajeno a la memoria histórica local.'
    },
    archived: {
      title: 'Archivado',
      description: 'El ciclo editorial ha concluido. El aporte se encuentra en su destino final y preservado de forma permanente.',
      conditions: [
        'Flujo de validación terminado.',
        'Publicación o indexación ejecutada según el destino aprobado.'
      ],
      missing: [],
      nextStep: 'Ninguno (Proceso finalizado).',
      whyExists: 'Representa el cierre de la bitácora editorial de la contribución, indicando que el aporte ya fue procesado e incorporado plenamente.'
    }
  },
  authorizationLevel: {
    A: {
      title: 'Nivel A: Público (Web y Catálogos)',
      description: 'Autorización máxima para publicación, difusión y visualización pública en internet.',
      details: 'El material puede mostrarse abiertamente en la web de Memoria Viva, redes sociales, exhibiciones, catálogos públicos y ser indexado por buscadores.',
      permissions: 'Publicación digital completa, inclusión en el libro del proyecto, e-books y folletos informativos.',
      restrictions: 'Ninguna limitación para la difusión institucional o comunitaria sin fines comerciales.',
      whyExists: 'Permite compartir libremente las memorias locales con toda la comunidad, maximizando el alcance de la recuperación patrimonial.'
    },
    B: {
      title: 'Nivel B: Educativo y Académico',
      description: 'El material se reserva exclusivamente para entornos formativos y de investigación.',
      details: 'No se publica libremente en la web abierta. Queda disponible para su uso por parte de docentes en escuelas locales, tesis académicas y talleres comunitarios.',
      permissions: 'Uso en aulas, bibliotecas escolares y consultas de investigadores acreditados.',
      restrictions: 'Prohibida su publicación masiva en internet, redes sociales o libros de distribución comercial sin consentimiento adicional.',
      whyExists: 'Ofrece una opción intermedia para aportantes que desean que su historia sirva para educar pero prefieren evitar la exposición pública masiva en internet.'
    },
    C: {
      title: 'Nivel C: Interno (Solo consulta en Archivo)',
      description: 'El material se custodia en el archivo físico y digital, pudiendo consultarse solo de forma presencial o privada.',
      details: 'Queda registrado en la base de datos interna. No se publica en internet ni en libros. Se permite su consulta en las instalaciones del archivo a historiadores bajo acuerdo.',
      permissions: 'Preservación física y digital, catalogación interna, consulta privada bajo solicitud.',
      restrictions: 'Prohibida la copia digital, distribución o publicación por cualquier medio público.',
      whyExists: 'Resguarda documentos y fotos de gran interés histórico cuya difusión abierta está limitada por derechos de terceros o temores familiares.'
    },
    D: {
      title: 'Nivel D: Restringido (Solo preservación)',
      description: 'Nivel de máxima confidencialidad. El material se almacena exclusivamente para evitar su destrucción o pérdida.',
      details: 'Se resguarda digitalmente de manera encriptada. No se procesa editorialmente, no se transcribe y no se pone a disposición del público ni de investigadores.',
      permissions: 'Preservación de archivos (copias de seguridad).',
      restrictions: 'Totalmente restringido para consulta externa, exhibición o transcripción.',
      whyExists: 'Sirve como un "cofre de resguardo de emergencia" para testimonios sensibles que corren riesgo de desaparecer, a la espera de futuras autorizaciones.'
    }
  },
  creditPreference: {
    full_name: {
      title: 'Nombre completo',
      description: 'El material se publicará atribuyendo el crédito con el nombre y apellido completos del aportante.',
      significance: 'Representa la voluntad explícita del aportante de ser reconocido públicamente como autor o custodio de la memoria.',
      whyExists: 'Respeta el derecho moral de atribución del aportante, valorando su identidad como parte de la historia viva de la localidad.'
    },
    initials: {
      title: 'Iniciales',
      description: 'El aporte se publicará mencionando únicamente las iniciales del aportante (ej. "Aporte de J. P.").',
      significance: 'Representa la voluntad del aportante de conservar una autoría simbólica pero resguardando su identidad directa ante búsquedas generales.',
      whyExists: 'Permite un nivel de privacidad adecuado para vecinos que desean colaborar pero prefieren mantener un bajo perfil en publicaciones públicas.'
    },
    family: {
      title: 'Familia aportante',
      description: 'El aporte se presentará como una donación de su grupo familiar (ej. "Donación Familia Pérez" o asociado al barrio/institución).',
      significance: 'Representa la voluntad del aportante de enmarcar la memoria como un legado colectivo e histórico familiar.',
      whyExists: 'Reconoce que gran parte del patrimonio archivístico (fotos, cartas) pertenece y representa a familias enteras y no a una sola persona.'
    },
    anonymous: {
      title: 'Anónimo',
      description: 'El aporte se publicará omitiendo cualquier dato que identifique al aportante en las plataformas públicas.',
      significance: 'Representa la voluntad expresa del aportante de mantener el anonimato absoluto de cara al público general.',
      whyExists: 'Es una garantía fundamental para recopilar testimonios históricos sensibles o conflictivos, asegurando la tranquilidad de quien los aporta.'
    }
  },
  indicators: {
    missing_files: {
      title: 'Faltan archivos',
      description: 'El aporte fue recibido, pero tiene archivos multimedia pendientes de subida o de gran tamaño.',
      whenToUse: 'Se activa automáticamente si algún archivo superó el límite de carga web (50 MB) o si falta subir material físico convenido.',
      howToResolve: 'Contactar al aportante para coordinar el envío del material (por WhatsApp o de manera física) y luego cargarlo mediante el panel de control del aporte.',
      whyExists: 'Evita que los aportes incompletos queden estancados de forma silenciosa, alertando al equipo para que coordine la entrega manual.'
    },
    pending_transcription: {
      title: 'Transcripción pendiente',
      description: 'La grabación oral o de video requiere ser volcada a texto para continuar el flujo editorial.',
      whenToUse: 'Corresponde a aportes multimedia (audio o video) que aún no disponen de una transcripción guardada.',
      howToResolve: 'Asignar el aporte a un voluntario del equipo de transcripción y registrar el texto una vez finalizado.',
      whyExists: 'Asegura que todos los archivos orales cuenten con una versión en texto que facilite la accesibilidad y búsqueda.'
    },
    pending_historical_validation: {
      title: 'Validación histórica pendiente',
      description: 'El material debe ser investigado y contextualizado por el equipo histórico antes de su publicación.',
      whenToUse: 'Aportes cuyos datos no han sido revisados históricamente ni cuentan con nota de contexto.',
      howToResolve: 'Verificar fechas, personajes y sucesos históricos citados e incorporar una nota introductoria aclaratoria.',
      whyExists: 'Garantiza el rigor histórico del catálogo y proporciona herramientas para la comprensión de las memorias por el público general.'
    }
  }
};

// Mapeos de valores de Base de Datos / UI a claves estables del archivo de configuración
export const statusToKeyMap: Record<string, string> = {
  'Recibido': 'received',
  'Datos incompletos': 'incomplete',
  'En revisión': 'in_review',
  'En transcripción': 'in_transcription',
  'Transcripto': 'transcribed',
  'En validación histórica': 'in_historical_validation',
  'Validado': 'validated',
  'Aprobado para archivo': 'approved_archive',
  'Aprobado para libro': 'approved_book',
  'Aprobado para e-book': 'approved_ebook',
  'Restringido': 'restricted',
  'Rechazado': 'rejected',
  'Archivado': 'archived'
};

export const levelToKeyMap: Record<string, string> = {
  'A': 'A',
  'B': 'B',
  'C': 'C',
  'D': 'D'
};

export const creditToKeyMap: Record<string, string> = {
  'Nombre completo': 'full_name',
  'Iniciales': 'initials',
  'Familia aportante': 'family',
  'Anónimo': 'anonymous'
};
