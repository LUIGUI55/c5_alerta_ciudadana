# Registro de Decisión de Arquitectura (ADR)
## ADR-001: Adopción de gRPC para Comunicación Inter-servicios Críticos

### Estado
Aceptado

### Contexto
El sistema de Alerta Ciudadana distribuido tipo C5 requiere procesar las alertas entrantes en un tiempo menor a 2 segundos de extremo a extremo (end-to-end). Los microservicios de Recepción de alertas, Geolocalización y Asignación de Prioridad deben interactuar de forma síncrona y secuencial. El uso de interfaces REST tradicionales sobre HTTP/1.1 con payloads en formato JSON introduce una latencia significativa debido al tamaño del texto plano y al proceso repetitivo de saludo (handshake) en conexiones TCP, lo que compromete el cumplimiento del acuerdo de nivel de servicio (SLA) bajo escenarios de alta concurrencia.

### Alternativas Consideradas
1. **API REST sobre HTTP/1.1 con JSON:** Estándar convencional de fácil implementación, pero ineficiente en rendimiento de red debido al tamaño de las cadenas de texto y la falta de tipado estricto en tiempo de compilación.
2. **gRPC sobre HTTP/2 con Protocol Buffers:** Protocolo de llamadas a procedimientos remotos de alto rendimiento que utiliza serialización binaria y mantiene conexiones persistentes.

### Decisión
Se determina la implementación de **gRPC sobre HTTP/2** utilizando Protocol Buffers como el estándar de comunicación síncrona para el núcleo de procesamiento de alertas del sistema.

### Justificación
La serialización binaria de Protocol Buffers reduce drásticamente el tamaño del payload en tránsito. Al operar sobre HTTP/2, se habilita la multiplexación, lo que permite reutilizar una única conexión TCP para múltiples solicitudes concurrentes. Esto elimina la latencia de red asociada a la creación de conexiones y asegura que el enriquecimiento de datos de la alerta ocurra en milisegundos, garantizando el cumplimiento del requisito de procesamiento menor a 2 segundos.

### Consecuencias
* **Positivas:** Reducción crítica de la latencia de comunicación, optimización del ancho de banda y establecimiento de un contrato de interfaz estricto y fuertemente tipado (`alertas.proto`) que previene errores de integración entre servicios.
* **Negativas:** Incremento en la complejidad de la configuración inicial debido a la necesidad de compilar los archivos de definición de buffers (`protoc`). Los endpoints no pueden ser validados directamente en un navegador web sin herramientas de depuración especializadas.
