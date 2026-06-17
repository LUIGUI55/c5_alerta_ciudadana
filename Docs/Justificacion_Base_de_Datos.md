## Modelo de Consistencia Elegido: Consistencia Eventual (Eventual Consistency) mediante Replicación Asíncrona.

### Justificación Técnica:
Para el Sistema C5, se priorizó la Disponibilidad y la Tolerancia a Particiones (Teorema CAP) sobre la consistencia fuerte. En un escenario de emergencias masivas (ej. desastres naturales), el microservicio de Historial debe ser capaz de insertar cientos de alertas por segundo en el nodo Primario sin bloqueos.

Si utilizáramos Consistencia Fuerte (Replicación Síncrona), el nodo Primario tendría que esperar a que la Réplica confirme la escritura de cada alerta antes de responderle al Motor de Prioridad. Si la red interna presenta latencia, esto crearía un cuello de botella, bloqueando la cola de Redis y retrasando el sistema.

Al elegir Consistencia Eventual, el Primario escribe la alerta instantáneamente y la Réplica se actualiza milisegundos después en segundo plano. Esto es ideal porque:

* Velocidad Operativa: El Feed Táctico del operador es alimentado en tiempo real por WebSockets directamente desde la memoria (Redis), por lo que la latencia de la base de datos no afecta la operación de emergencia en vivo.

* Segregación de Carga: El panel de "Auditoría de Incidentes" (que ejecuta búsquedas y filtros pesados) ataca exclusivamente a la Réplica. Aunque exista una ventana de inconsistencia de un par de milisegundos, para propósitos de auditoría e historial, una consistencia eventual es más que suficiente y protege al nodo Primario de ser saturado por consultas SELECT complejas.