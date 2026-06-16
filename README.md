# Sistema de Alerta Ciudadana Distribuido (Infraestructura Tipo C5)

Este repositorio contiene el diseño, documentación e implementación de un Sistema de Alerta Ciudadana distribuido tipo C5, estructurado para simular la infraestructura de control de emergencias de centros de comando reales. El sistema procesa alertas emitidas por dispositivos físicos (tarjetas ESP32 con botón de pánico), valida y enriquece los datos a través de una malla de microservicios independientes y notifica a las estaciones de trabajo de los operadores en tiempo real.

## Estructura del Repositorio
* `/services`: Contiene el código fuente y las configuraciones de los 5 microservicios independientes.
* `/esp32`: Firmware en C++ diseñado para el control de los dispositivos de hardware periféricos.
* `/Docs`: Diagrama de arquitectura del sistema y Registros de Decisiones de Arquitectura (ADR).

## Requisitos del Entorno
Para el despliegue correcto de la infraestructura distribuida, el sistema anfitrión debe contar con:
* Docker Engine
* Docker Compose CLI

## Instrucciones de Despliegue Automatizado

De conformidad con los requisitos de reproducibilidad, el entorno completo (servicios de red, brokers, almacenes de memoria RAM, bases de datos duplicadas y microservicios lógicos) se inicializa mediante un único comando ejecutable en la raíz del proyecto:

```bash
docker-compose up --build -d
