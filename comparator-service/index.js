const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002;
const API_KEY = process.env.WEATHER_API_KEY;

// Validación de Configuración Crítica al arrancar
if (!API_KEY) {
    console.error("Falta la variable WEATHER_API_KEY en el archivo .env");
    process.exit(1);
}

app.use(helmet());
app.use(express.json());

// Configuración de CORS con lista blanca (Seguridad Académica)
const whitelist = ['http://localhost:5173'];
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Bloqueado por políticas de seguridad CORS'));
        }
    },
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Función auxiliar para calcular la hora exacta usando el offset en segundos
function obtenerHoraPorOffset(offsetSegundos) {
    const ahora = new Date();
    // Obtener la hora UTC actual en milisegundos
    const utcMilisegundos = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
    // Aplicar el desfase del país destino
    const horaDestino = new Date(utcMilisegundos + (offsetSegundos * 1000));
    
    return horaDestino.toLocaleTimeString('es-NI', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Función para calcular la diferencia horaria exacta
function calcularDiferencia(offsetPais, offsetNicaragua) {
    const diferenciaSegundos = offsetPais - offsetNicaragua;
    const diferenciaHoras = diferenciaSegundos / 3600;

    if (diferenciaHoras === 0) {
        return { horas: 0, mensaje: "Misma hora que Nicaragua" };
    } else if (diferenciaHoras > 0) {
        return { 
            horas: diferenciaHoras, 
            mensaje: `${diferenciaHoras} ${diferenciaHoras === 1 ? 'hora adelante' : 'horas adelante'}` 
        };
    } else {
        const horasAbsolutas = Math.abs(diferenciaHoras);
        return { 
            horas: diferenciaHoras, 
            mensaje: `${horasAbsolutas} ${horasAbsolutas === 1 ? 'hora atrás' : 'horas atrás'}` 
        };
    }
}

// Obtener datos fijos de Nicaragua (Hora y Clima)
app.get('/api/nicaragua', async (req, res) => {
    try {
        // Consultamos el clima de Nicaragua (Managua) a la API externa
        const url = `https://api.openweathermap.org/data/2.5/weather?q=Managua,NI&units=metric&lang=es&appid=${API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) throw new Error('No se pudo obtener el clima de Nicaragua');

        const data = await response.json();

        res.json({
            pais: "Nicaragua",
            temperatura: `${Math.round(data.main.temp)}°C`,
            clima: data.weather[0].description,
            hora: obtenerHoraPorOffset(data.timezone),
            offset: data.timezone
        });
    } catch (error) {
        console.error(`[Error Comparator - Nicaragua]: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener los datos en tiempo real de Nicaragua.' });
    }
});

// Comparar país seleccionado con Nicaragua
app.post('/api/compare', async (req, res) => {
    const { countryName } = req.body;

    // Validación estricta de entrada para evitar inyecciones o datos basura
    if (!countryName || typeof countryName !== 'string' || countryName.trim().length === 0) {
        return res.status(400).json({ error: 'El nombre del país es obligatorio y debe ser un texto válido.' });
    }

    try {
        // Peticiones en paralelo para optimizar tiempo de respuesta
        const urlNicaragua = `https://api.openweathermap.org/data/2.5/weather?q=Managua,NI&units=metric&appid=${API_KEY}`;
        const urlDestino = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(countryName)}&units=metric&lang=es&appid=${API_KEY}`;

        const [resNi, resDestino] = await Promise.all([fetch(urlNicaragua), fetch(urlDestino)]);

        if (!resNi.ok) throw new Error('Error interno al consultar datos de referencia (Nicaragua)');
        
        const dataNi = await resNi.json();

        if (!resDestino.ok) {
            if (resDestino.status === 404) {
                return res.status(200).json({
                    paisSeleccionado: {
                        nombre: countryName,
                        temperatura: "--°C",
                        clima: "Datos climáticos no disponibles",
                        hora: "No disponible"
                    },
                    nicaragua: {
                        nombre: "Nicaragua",
                        temperatura: `${Math.round(dataNi.main.temp)}°C`,
                        clima: dataNi.weather[0].description,
                        hora: obtenerHoraPorOffset(dataNi.timezone)
                    },
                    diferencia: "Zona horaria no registrada"
                });
            }
            throw new Error('Error al consultar el servicio del clima externo');
        }

        // Si el destino sí tuvo éxito, parseamos sus datos con normalidad
        const dataDestino = await resDestino.json();

        // Cálculos lógicos y matemáticos
        const horaPais = obtenerHoraPorOffset(dataDestino.timezone);
        const horaNicaragua = obtenerHoraPorOffset(dataNi.timezone);
        const comparacionHoraria = calcularDiferencia(dataDestino.timezone, dataNi.timezone);

        // Respuesta consolidada con éxito completo (Status 200)
        res.json({
            paisSeleccionado: {
                nombre: countryName,
                temperatura: `${Math.round(dataDestino.main.temp)}°C`,
                clima: dataDestino.weather[0].description,
                hora: horaPais
            },
            nicaragua: {
                nombre: "Nicaragua",
                temperatura: `${Math.round(dataNi.main.temp)}°C`,
                clima: dataNi.weather[0].description,
                hora: horaNicaragua
            },
            diferencia: comparacionHoraria.mensaje
        });

    } catch (error) {
        console.error(`[Error Comparator - Compare]: ${error.message}`);
        res.status(500).json({ error: 'Error interno del microservicio al realizar la comparación.' });
    }
});

app.listen(PORT, () => {
    console.log(`Comparator Service corriendo de forma segura en http://localhost:${PORT}`);
});