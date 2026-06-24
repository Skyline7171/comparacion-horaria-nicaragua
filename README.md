El proyecto fue diseñado bajo una arquitectura desacoplada de microservicios. Para el frontend, se desarrolló una interfaz SPA
utilizando React.js, la cual se encuentra desplegada de forma estática en Netlify. Por otro lado, el backend está compuesto por
microservicios independientes construidos sobre Node.js con el framework Express, alojados mediante Web Services en Render. 
El sistema orquesta e integra dos APIs externas principales: REST Countries v5 para la sincronización y normalización de la data
geopolítica de los países, y OpenWeatherMap para el consumo asíncrono de variables climáticas y husos horarios en tiempo real.

Nota: Existen regiones geográficas atípicas o zonas extremas (como la Antártida) de las cuales OpenWeatherMap no posee registros climáticos o estaciones meteorológicas activas. Este comportamiento representa una limitación directa del proveedor del servicio externo y es ajeno a la lógica de control del sistema.

Dado que la especificación de requerimientos del proyecto define el alcance únicamente a nivel de "país", se adoptó como criterio técnico estandarizar las consultas meteorológicas y horarias tomando como referencia la capital de cada nación. Esto mitiga ambigüedades geográficas en países con múltiples husos horarios o extensiones territoriales masivas.