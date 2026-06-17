# Registro de Decisión de Arquitectura (ADR)
## ADR-003: Configuración de Replicación en Base de Datos y Modelo de Consistencia Eventual

### Estado
Aceptado

### Contexto
El microservicio de Historial de Incidentes debe proveer capacidades de consulta analítica y auditoría, permitiendo realizar filtros complejos por rangos de fechas, zonas geográficas y niveles de prioridad. Ejecutar estas consultas de lectura pesadas sobre la misma instancia de base de datos que procesa las inserciones concurrentes de alertas de pánico en tiempo real genera un riesgo elevado de bloqueo de tablas, aumentando los tiempos de respuesta del núcleo del C5 ante situaciones de emergencia.

### Alternativas Consideradas
1. **Instancia de Base de Datos Única y Centralizada:** Procesamiento concurrente de lecturas y escrituras en el mismo nodo. Conlleva un riesgo alto de cuellos de botella y degradación generalizada del rendimiento bajo carga.
2. **Arquitectura de Base de Datos Distribución Maestro-Réplica:** Segmentación de operaciones donde las escrituras se ejecutan en un nodo primario y las consultas de lectura se desvían a nodos secundarios sincronizados.

### Decisión
Se implementa un clúster de **PostgreSQL con replicación asíncrona Maestro-Réplica**, adoptando formalmente un modelo de **Consistencia Eventual** para el microservicio de consulta histórica.

### Justificación
En sistemas de seguridad pública y atención a emergencias, la disponibilidad de escritura en el nodo primario es la prioridad crítica de la infraestructura. Desviar las consultas analíticas del historial hacia la réplica de lectura descarga por completo al nodo maestro de operaciones costosas. El desfase temporal en la sincronización de la réplica (consistencia eventual) es del orden de milisegundos, un impacto marginal que no afecta la validez de un reporte histórico y que blinda la estabilidad de las operaciones vivas.

### Consecuencias
* **Positivas:** Aislamiento eficiente de las cargas de trabajo de lectura y escritura, optimización de los tiempos de respuesta del sistema central y aseguramiento de la alta disponibilidad para el registro de nuevos incidentes.
* **Negativas:** Existe una ventana temporal infinitesimal donde una consulta inmediata al historial podría no reflejar una alerta procesada hace una fracción de segundo, hasta que concluya el ciclo de replicación asíncrona.
