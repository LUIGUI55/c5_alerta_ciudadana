## Modelo de Consistencia Elegido: Consistencia Eventual (Eventual Consistency) mediante Replicación Asíncrona.

### Justificación Técnica:
Para el Sistema C5, se priorizó la Disponibilidad y la Tolerancia a Particiones (Teorema CAP) sobre la consistencia fuerte. En un escenario de emergencias masivas (ej. desastres naturales), el microservicio de Historial debe ser capaz de insertar cientos de alertas por segundo en el nodo Primario sin bloqueos.

Si utilizáramos Consistencia Fuerte (Replicación Síncrona), el nodo Primario tendría que esperar a que la Réplica confirme la escritura de cada alerta antes de responderle al Motor de Prioridad. Si la red interna presenta latencia, esto crearía un cuello de botella, bloqueando la cola de Redis y retrasando el sistema.

Al elegir Consistencia Eventual, el Primario escribe la alerta instantáneamente y la Réplica se actualiza milisegundos después en segundo plano. Esto es ideal porque:

* Velocidad Operativa: El Feed Táctico del operador es alimentado en tiempo real por WebSockets directamente desde la memoria (Redis), por lo que la latencia de la base de datos no afecta la operación de emergencia en vivo.

* Segregación de Carga: El panel de "Auditoría de Incidentes" (que ejecuta búsquedas y filtros pesados) ataca exclusivamente a la Réplica. Aunque exista una ventana de inconsistencia de un par de milisegundos, para propósitos de auditoría e historial, una consistencia eventual es más que suficiente y protege al nodo Primario de ser saturado por consultas SELECT complejas.

La conexión entre el nodo primario (maestro) y la réplica en PostgreSQL no ocurre a través de un mecanismo interno muy robusto llamado Streaming Replication (Replicación por flujo continuo) basado en los registros WAL (Write-Ahead Logs).

En este modelo, la relación es del tipo "Pull" (Tirar): no es el maestro quien empuja los datos a la fuerza, sino que es la réplica quien busca activamente al maestro, se conecta a él y le pide que le envíe los cambios.

## 1. ¿Cómo sabe la réplica quién es el maestro?
La réplica lo sabe gracias a una cadena de conexión explícita. Cuando PostgreSQL arranca en "modo réplica", busca en sus archivos de configuración internos un parámetro llamado **primary_conninfo**.

En nuestro archivo Docker Compose, le pasamos esta información a la réplica a través de las variables de entorno de Bitnami:

* POSTGRESQL_MASTER_HOST=postgres-primary

* POSTGRESQL_MASTER_PORT_NUMBER=5432

Gracias al DNS interno de Docker, la réplica resuelve el nombre postgres-primary hacia la IP privada del contenedor maestro y sabe exactamente a qué puerta tocar. Detrás de escena, el contenedor de Bitnami toma estas variables y construye la cadena primary_conninfo en el archivo de configuración de PostgreSQL.

## 2. El usuario especial de replicación
Para que la conexión sea segura, el maestro no permite que cualquiera lea sus registros internos. Exige que el contenedor que se conecta tenga privilegios específicos de REPLICATION.

En el contenedor del Maestro, configuramos:

* POSTGRESQL_REPLICATION_USER=repl_user

* POSTGRESQL_REPLICATION_PASSWORD=repl_password

Al arrancar, el maestro crea este usuario y modifica su archivo de seguridad interno (pg_hba.conf) para permitir que la réplica se conecte usando esas credenciales.

En el contenedor de la Réplica, le damos las mismas llaves para que pueda entrar:

* POSTGRESQL_REPLICATION_USER=repl_user

* POSTGRESQL_REPLICATION_PASSWORD=repl_password

## 3. El ciclo de vida de la conexión (Paso a Paso)
Cuando ejecutamos el docker-compose up, esto es lo que sucede físicamente en la red de los contenedores:

* Arranque del Maestro: El contenedor postgres-primary arranca, crea la base de datos c5_auditoria, crea el usuario repl_user y se queda escuchando en el puerto 5432.

* Arranque de la Réplica: El contenedor postgres-replica arranca. Al ver que su variable **POSTGRESQL_REPLICATION_MODE** dice slave, se pone en modo de recuperación (Standby).

* El Saludo (Handshake): La réplica usa el usuario repl_user y la contraseña repl_password para iniciar sesión en el host postgres-primary:5432.

* Flujo de Datos (Streaming): Una vez autenticada, la réplica le dice al maestro: "Soy una réplica, envíame tu flujo de transacciones".

* Replicación Continua: A partir de ese momento, cada vez que el microservicio de Historial hace un INSERT en el maestro, el maestro guarda el cambio en su disco (en un archivo llamado WAL) e inmediatamente manda una copia de ese archivo por la red hacia la réplica. La réplica lo recibe, lo aplica en su propio disco, y así ambas bases de datos se mantienen sincronizadas casi en tiempo real.