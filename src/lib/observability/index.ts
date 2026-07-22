// Capa Mínima de Observabilidad Segura
// Archivo: src/lib/observability/index.ts

export interface ObservabilityContext {
  [key: string]: unknown;
}

export class ObservabilityService {
  private static formatLog(level: "ERROR" | "INFO" | "PERF" | "SECURITY", message: string, data?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const payload = {
      timestamp,
      level,
      message,
      ...(data ? { details: data } : {}),
    };
    return `[OBSERVABILITY] ${JSON.stringify(payload)}`;
  }

  /**
   * Captura y registra errores de la aplicación sin stack traces sensibles para el cliente,
   * guardando el contexto del fallo en el servidor.
   */
  static captureError(error: unknown, context?: ObservabilityContext): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(
      this.formatLog("ERROR", errorMessage, {
        ...context,
        // Registrar stack trace de forma privada sólo en consola de servidor
        ...(errorStack ? { stack: errorStack } : {}),
      })
    );
  }

  /**
   * Registra eventos funcionales y de uso del portal (ej. filtros aplicados, búsquedas vacías).
   */
  static captureEvent(name: string, properties?: ObservabilityContext): void {
    console.log(this.formatLog("INFO", `Event: ${name}`, properties));
  }

  /**
   * Registra métricas de rendimiento (ej. latencia de carga, tiempos de respuesta de consulta).
   */
  static capturePerformance(metricName: string, value: number): void {
    console.log(this.formatLog("PERF", `Performance metric: ${metricName}`, { valueMs: value }));
  }

  /**
   * Registra eventos de seguridad (ej. intentos de acceder a borradores, fallos de RLS o parámetros inválidos).
   */
  static captureSecurityEvent(event: string, details?: ObservabilityContext): void {
    console.warn(this.formatLog("SECURITY", `Security warning: ${event}`, details));
  }
}
