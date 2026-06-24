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
const whitelist = ['http://localhost:5173', 'https://mini-sistema-2.netlify.app'];
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
    const diferenciaHorasAbsolutas = Math.abs(diferenciaSegundos / 3600);

    // Separamos las horas de los minutos de forma matemática
    const horasEnteras = Math.floor(diferenciaHorasAbsolutas);
    const minutosRestantes = Math.round((diferenciaHorasAbsolutas - horasEnteras) * 60);

    let textoTiempo = "";
    if (minutosRestantes > 0) {
        const textoHoras = horasEnteras === 1 ? '1 hora' : `${horasEnteras} horas`;
        const textoMinutos = minutosRestantes === 1 ? '1 minuto' : `${minutosRestantes} minutos`;
        textoTiempo = `${textoHoras} y ${textoMinutos}`;
    } else {
        textoTiempo = horasEnteras === 1 ? '1 hora' : `${horasEnteras} horas`;
    }

    // Evaluamos la dirección del huso horario respecto a Nicaragua
    if (diferenciaSegundos === 0) {
        return { horas: 0, mensaje: "Misma hora que Nicaragua" };
    } else if (diferenciaSegundos > 0) {
        return { 
            horas: diferenciaSegundos / 3600, 
            mensaje: `${textoTiempo} adelante` 
        };
    } else {
        return { 
            horas: diferenciaSegundos / 3600, 
            mensaje: `${textoTiempo} atrás` 
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
            clima: `${data.weather[0].description} (Managua)`,
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

    const { countryName, countryCode, capital } = req.body;

    if (!countryName || !countryCode) {
        return res.status(400).json({ error: 'El nombre y el código del país son requeridos.' });
    }

    try {
        const codigoLimpio = countryCode.toLowerCase();
        
        // Si hay una capital válida, buscamos "{Capital},{ISO}". Si no, "{País_En},{ISO}"
        const tieneCapitalValida = capital && capital !== 'Unknown' && capital.trim() !== '';
        const terminoBusqueda = tieneCapitalValida ? capital : countryName;

        const urlNicaragua = `https://api.openweathermap.org/data/2.5/weather?q=Managua,NI&units=metric&lang=es&appid=${API_KEY}`;
        
        const urlDestino = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(terminoBusqueda)},${codigoLimpio}&units=metric&lang=es&appid=${API_KEY}`;

        const [resNi, resDestino] = await Promise.all([fetch(urlNicaragua), fetch(urlDestino)]);

        if (!resNi.ok) throw new Error('Error interno al consultar datos de referencia (Nicaragua)');
        
        const dataNi = await resNi.json();

        if (!resDestino.ok) {
            // Si incluso por la capital da 404 (ej. territorios ultra pequeños), se dispara nuestro catch defensivo
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

        const dataDestino = await resDestino.json();

        const horaPais = obtenerHoraPorOffset(dataDestino.timezone);
        const horaNicaragua = obtenerHoraPorOffset(dataNi.timezone);
        const comparacionHoraria = calcularDiferencia(dataDestino.timezone, dataNi.timezone);

        res.json({
            paisSeleccionado: {
                nombre: countryName,
                // Opcional: puedes concatenar la capital en el clima para que el usuario sepa de dónde viene el dato, ej: "Despejado (Seúl)"
                temperatura: `${Math.round(dataDestino.main.temp)}°C`,
                clima: tieneCapitalValida ? `${dataDestino.weather[0].description} (${capital})` : dataDestino.weather[0].description,
                hora: horaPais
            },
            nicaragua: {
                nombre: "Nicaragua",
                temperatura: `${Math.round(dataNi.main.temp)}°C`,
                clima: `${dataNi.weather[0].description} (Managua)`,
                hora: obtenerHoraPorOffset(dataNi.timezone)
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