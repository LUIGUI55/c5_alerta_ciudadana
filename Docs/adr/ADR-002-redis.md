# Registro de Decisión de Arquitectura (ADR)
## ADR-002: Implementación de Redis como Buffer de Mensajería para Tolerancia a Fallos

### Estado
Aceptado

### Contexto
El instrumento de evaluación establece como requisito no funcional estricto la tolerancia a fallos en la capa de distribución. Específicamente, si el microservicio de Notificaciones interrumpe su operación o sufre una caída crítica, las alertas ciudadanas entrantes no deben perderse bajo ninguna circunstancia. El sistema debe ser capaz de encolar dichos eventos y despacharlos de forma inmediata y ordenada en el momento en que el servicio de notificaciones restablezca su disponibilidad.

### Alternativas Consideradas
1. **Persistencia transaccional directa en Base de Datos Relacional:** Inserción y consulta constante (*polling*) desde el servicio de notificaciones. Esta opción genera una alta carga de operaciones de entrada/salida (I/O) en disco y degrada el rendimiento del sistema central.
2. **Mecanismo de encolamiento en memoria con Redis:** Uso de estructuras de datos indexadas en memoria intermedia para actuar como un amortiguador (*buffer*) de alta velocidad antes de la distribución hacia los clientes.

### Decisión
Se adopta **Redis** implementando el patrón productor-consumidor mediante operaciones atómicas de listas (`LPUSH` y `RPOPLPUSH`) como el componente intermedio de contingencia y tránsito de alertas.

### Justificación
Al operar completamente en memoria RAM, Redis procesa flujos de datos con latencias de microsegundos, evitando saturar el almacenamiento persistente principal. Ante la desconexión intencional o accidental del contenedor de notificaciones, la cola de Redis retiene de forma segura los objetos estructurados de las alertas. Al inicializar nuevamente el servicio dependiente, este reanuda el consumo del buffer de manera natural, garantizando resiliencia absoluta y cero pérdida de información en la demostración del sistema.

### Consecuencias
* **Positivas:** Cumplimiento íntegro de los requerimientos de tolerancia a fallos, desacoplamiento completo entre el procesamiento lógico del backend y la capa de presentación WebSockets, y protección de la integridad de los datos de emergencia.
* **Negativas:** Introducción de un componente adicional a la infraestructura de orquestación, incrementando marginalmente el consumo de memoria RAM del servidor anfitrión.
