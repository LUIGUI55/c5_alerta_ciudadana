# DOCUMENTACIÓN TÉCNICA DE ARQUITECTURA DE SOFTWARE
## PROYECTO: SISTEMA DISTRIBUIDO DE ALERTA CIUDADANA (TIPO C5)

---

### INVENTARIO DEL DOCUMENTO
* [cite_start]**Materia:** Sistemas Distribuidos [cite: 4]
* [cite_start]**Semestre:** Octavo Semestre [cite: 4]
* [cite_start]**Carrera:** Ingeniería en Sistemas Computacionales [cite: 4]
* **Fecha de Emisión:** 15 de Junio de 2026
* **Versión del Artefacto:** 1.0.0

---

## 1. INTRODUCCIÓN Y CONTEXTO DEL PROBLEMA

[cite_start]El presente documento detalla la especificación de diseño, la topología de red y las decisiones arquitectónicas para la implementación del Sistema de Alerta Ciudadana distribuido tipo C5[cite: 10]. [cite_start]El sistema está diseñado para capturar eventos de emergencia emitidos desde dispositivos periféricos de hardware en la capa física y procesarlos a través de una topología de microservicios independientes hasta su correcta visualización en las terminales de los operadores de comando[cite: 11].

[cite_start]La arquitectura responde a un acuerdo de nivel de servicio (SLA) riguroso, el cual exige que el procesamiento y la notificación de las alertas se consoliden en un tiempo menor a 2 segundos de extremo a extremo (end-to-end) [cite: 27][cite_start], garantizando una alta disponibilidad y tolerancia a fallos incluso ante la caída de uno o más nodos de la red distribuidora[cite: 14].

---

## 2. ESPECIFICACIÓN DE MICROSERVICIOS

[cite_start]La infraestructura del backend se encuentra dividida en cinco microservicios desacoplados, ejecutados en entornos contenerizados independientes a través de Docker y Docker Compose[cite: 15, 25]:

1. [cite_start]**Recepción de Alertas (Microservicio 1):** Responsable de la suscripción al Broker MQTT, validación de la integridad del payload entrante y el encolamiento inicial de los mensajes[cite: 16]. [cite_start]Soporta el despliegue de tres instancias concurrentes detrás de un balanceador de carga[cite: 45].
2. [cite_start]**Geolocalización (Microservicio 2):** Encargado del procesamiento analítico de las coordenadas GPS (latitud y longitud), la asignación de la zona geográfica y el mapeo topológico correspondiente[cite: 16].
3. [cite_start]**Asignación de Prioridad (Microservicio 3):** Clasifica automáticamente los incidentes en niveles crítico, alto o medio con base en reglas de negocio lógicas y configurables[cite: 16, 38].
4. [cite_start]**Notificaciones (Microservicio 4):** Despacha la información enriquecida en tiempo real hacia las estaciones de control de los operadores mediante conexiones persistentes WebSockets[cite: 16, 22].
5. [cite_start]**Historial de Incidentes (Microservicio 5):** Administra la persistencia, auditoría y consulta de eventos históricos a través de filtros parametrizados por fechas, zonas y prioridad[cite: 16, 43].

---

## 3. CONTRATOS DE COMUNICACIÓN INTER-SERVICIOS (gRPC)

[cite_start]Para cumplir con el requerimiento no funcional de comunicación mediante gRPC con contratos formalizados[cite: 57], se define el archivo de interfaz `alertas.proto`. Este mecanismo optimiza el rendimiento síncrono del flujo core a través de la serialización binaria sobre HTTP/2:

```protobuf
syntax = "proto3";

package alertas;

service AlertaProcesamientoService {
  rpc ProcesarAlerta (AlertaRequest) returns (AlertaResponse);
}

message AlertaRequest {
  string dispositivo_id = 1;
  double latitud = 2;
  double longitud = 3;
  string timestamp = 4;
  string tipo_emergencia = 5;
}

message AlertaResponse {
  string dispositivo_id = 1;
  double latitud = 2;
  double longitud = 3;
  string zona_geografica = 4;
  string prioridad = 5;
  string timestamp = 6;
  string tipo_emergencia = 7;
  bool procesado_exitosamente = 8;
}

## 4. CAPA DE PERSISTENCIA Y MODELO DE CONSISTENCIA

El sistema de almacenamiento distribuye las operaciones relacionales para mitigar la degradación del rendimiento general durante ráfagas de transacciones de emergencia, aislando las cargas transaccionales de las cargas analíticas.

### 4.1 Definición del Esquema de Datos (`incidentes`)

La tabla `incidentes` se encarga de consolidar los eventos históricos recolectados de los dispositivos periféricos y enriquecidos por los microservicios centrales. El script DDL de creación del esquema se define a continuación:

```sql
CREATE TABLE IF NOT EXISTS incidentes (
    alert_id UUID PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    zone VARCHAR(100),
    sector VARCHAR(100),
    emergency_type VARCHAR(50) NOT NULL,
    priority_level VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

### 4.2 Estrategia de Replicación y Enrutamiento de Consultas

La infraestructura de base de datos implementa una topología PostgreSQL configurada en un clúster distribuido de dos nodos, tal como se especifica en los parámetros de orquestación:

* **Enrutamiento de Escrituras (Mutaciones):** Las operaciones transaccionales de inserción o actualización de registros de emergencia se dirigen de forma exclusiva al contenedor `postgres-primary` a través del puerto `5432`. Esto blinda el flujo crítico de inyección contra bloqueos de tablas por solicitudes simultáneas.
* **Enrutamiento de Lecturas (Consultas Analíticas):** El microservicio de Historial de Incidentes desvía la totalidad de sus solicitudes de consulta y reportes históricos al contenedor `postgres-replica` a través del puerto expuesto `5433`.
* **Justificación del Modelo de Consistencia:** Se adopta un modelo de **Consistencia Eventual**. En una infraestructura de misión crítica tipo C5, la disponibilidad y la baja latencia al registrar una alerta toman precedencia sobre la sincronización inmediata del almacenamiento histórico. El desfase temporal implícito en la replicación asíncrona hacia el nodo esclavo ocurre en el orden de los milisegundos, cumpliendo con los requerimientos analíticos sin comprometer el rendimiento del sistema core.

---

## 5. REQUISITOS NO FUNCIONALES Y TOLERANCIA A FALLOS

* **Balanceo de Carga:** El tráfico proveniente del broker MQTT hacia el servicio de Recepción se distribuye equitativamente a través de un proxy Nginx configurado bajo el algoritmo de conexiones mínimas (*least-connections*). Esto asegura que las nuevas peticiones se asignen al nodo con menor carga de procesamiento.
* **Tolerancia a Fallos (Resiliencia):** En caso de indisponibilidad o caída crítica del microservicio de Notificaciones, las alertas validadas no sufren pérdida de datos. El sistema las retiene de manera temporal en una cola estructurada de Redis Queue mediante operaciones atómicas. Una vez restablecido el contenedor del servicio, este drena el buffer de memoria y transmite las notificaciones pendientes a los operadores de forma sincronizada.

---

## 6. ORQUESTACIÓN DE LA INFRAESTRUCTURA (`docker-compose.yaml`)

[cite_start]El entorno completo (servicios de red, brokers, almacenes de memoria y las instancias distribuidas) se inicializa mediante la configuración global descrita a continuación[cite: 25, 61]:

```yaml
version: '3.8'

networks:
  c5_network:
    driver: bridge

volumes:
  pg_primary_data:
  pg_replica_data:

services:
  broker-mosquitto:
    image: eclipse-mosquitto:latest
    container_name: c5_mqtt_broker
    ports:
      - "1883:1883"
    networks:
      - c5_network

  redis-queue:
    image: redis:7-alpine
    container_name: c5_redis_queue
    ports:
      - "6379:6379"
    networks:
      - c5_network

  postgres-primary:
    image: bitnami/postgresql:latest
    container_name: c5_postgres_primary
    environment:
      - POSTGRESQL_REPLICATION_MODE=master
      - POSTGRESQL_REPLICATION_USER=repl_user
      - POSTGRESQL_REPLICATION_PASSWORD=repl_password
      - POSTGRESQL_USERNAME=c5_admin
      - POSTGRESQL_PASSWORD=c5_secret
      - POSTGRESQL_DATABASE=c5_alertas
    ports:
      - "5432:5432"
    networks:
      - c5_network
    volumes:
      - pg_primary_data:/bitnami/postgresql

  postgres-replica:
    image: bitnami/postgresql:latest
    container_name: c5_postgres_replica
    depends_on:
      - postgres-primary
    environment:
      - POSTGRESQL_REPLICATION_MODE=slave
      - POSTGRESQL_MASTER_HOST=postgres-primary
      - POSTGRESQL_MASTER_PORT_NUMBER=5432
      - POSTGRESQL_REPLICATION_USER=repl_user
      - POSTGRESQL_REPLICATION_PASSWORD=repl_password
      - POSTGRESQL_PASSWORD=c5_secret
    ports:
      - "5433:5432"
    networks:
      - c5_network
    volumes:
      - pg_replica_data:/bitnami/postgresql

  recepcion-alerta-1:
    build: ./services/recepcion
    environment:
      - MQTT_BROKER=broker-mosquitto
      - REDIS_HOST=redis-queue
    depends_on:
      - broker-mosquitto
      - redis-queue
    networks:
      - c5_network

  recepcion-alerta-2:
    build: ./services/recepcion
    environment:
      - MQTT_BROKER=broker-mosquitto
      - REDIS_HOST=redis-queue
    depends_on:
      - broker-mosquitto
      - redis-queue
    networks:
      - c5_network

  recepcion-alerta-3:
    build: ./services/recepcion
    environment:
      - MQTT_BROKER=broker-mosquitto
      - REDIS_HOST=redis-queue
    depends_on:
      - broker-mosquitto
      - redis-queue
    networks:
      - c5_network

  nginx-load-balancer:
    image: nginx:alpine
    container_name: c5_nginx_lb
    ports:
      - "8080:80"
    networks:
      - c5_network
    depends_on:
      - recepcion-alerta-1
      - recepcion-alerta-2
      - recepcion-alerta-3

  geolocalizacion:
    build: ./services/geolocalizacion
    networks:
      - c5_network

  prioridad:
    build: ./services/prioridad
    networks:
      - c5_network

  notificaciones:
    build: ./services/notificaciones
    environment:
      - REDIS_HOST=redis-queue
    ports:
      - "8000:8000"
    depends_on:
      - redis-queue
    networks:
      - c5_network

  historial:
    build: ./services/historial
    environment:
      - DB_PRIMARY_HOST=postgres-primary
      - DB_REPLICA_HOST=postgres-replica
    ports:
      - "8081:8081"
    depends_on:
      - postgres-primary
      - postgres-replica
    networks:
      - c5_network
      
      ---

## 7. REGISTRO DE DECISIONES DE ARQUITECTURA (ADR)

### 7.1 ADR-001: Adopción de gRPC para Comunicación Inter-servicios Críticos
* **Estado:** Aceptado
* **Contexto:** Cumplir el SLA de procesamiento menor a 2 segundos bajo alta concurrencia requiere una comunicación de baja latencia entre el núcleo de microservicios transaccionales. El uso de REST/JSON convencional degrada los tiempos debido a la sobrecarga de empaquetado de texto plano.
* **Decisión:** Implementar gRPC sobre HTTP/2 utilizando definiciones contractuales de tipos binarios.
* **Justificación:** La transmisión binaria compacta reduce el tamaño de transferencia por red, y la multiplexación nativa de HTTP/2 suprime el coste del saludo de conexión (*handshake*) repetitivo, asegurando una comunicación síncrona en el orden de los milisegundos.

### 7.2 ADR-002: Implementación de Redis como Buffer de Mensajería para Tolerancia a Fallos
* **Estado:** Aceptado
* **Contexto:** El sistema no debe perder datos de eventos de emergencia en la capa de dispersión si las terminales de los operadores o el microservicio que las atiende se desconectan.
* **Decisión:** Utilizar listas atómicas de Redis (`LPUSH` / `RPOPLPUSH`) como almacenamiento volátil de contingencia.
* **Justificación:** Al procesar información directamente en memoria RAM, se mitiga el impacto de escritura concurrente en disco duro. Redis retiene las estructuras lógicas de las alertas durante periodos de caída de los contenedores de presentación y permite su consumo inmediato en cuanto se reanuda la disponibilidad del servicio.

### 7.3 ADR-003: Configuración de Replicación en Base de Datos y Modelo de Consistencia Eventual
* **Estado:** Aceptado
* **Contexto:** Las consultas analíticas de auditoría pesadas en la tabla de incidentes no deben interferir ni degradar la velocidad de almacenamiento transaccional de los botones de pánico del sistema core.
* **Decisión:** Configuración de PostgreSQL en clúster Maestro-Réplica aislando operaciones de mutación de las operaciones de lectura analítica.
* **Justificación:** Delegar las lecturas pesadas al nodo secundario blinda al nodo maestro contra bloqueos de concurrencia. El desfase temporal de replicación asíncrona es tolerable para fines históricos y garantiza la disponibilidad permanente del canal principal de inyección de emergencias.
