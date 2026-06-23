const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Configuración de Seguridad de Cabeceras
app.use(helmet());
app.use(express.json());

// Configuración Estricta de CORS
const whitelist = ['http://localhost:5173']; // Acórdate de agregar la URL de Render/Netlify en producción
const corsOptions = {
    origin: function (origin, callback) {
        // Permitir peticiones sin origen (como Postman o curl para pruebas locales)
        if (!origin || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Bloqueado por políticas de seguridad CORS'));
        }
    },
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Endpoint para obtener la lista de países sanitizada
app.get('/api/countries', async (req, res) => {
    try {
        const token = 'Bearer rc_live_9f08179844b84d8488cad9761127150f';
        const headers = { 'Authorization': token };

        // Página 1 (0-100), Página 2 (100-200), Página 3 (200-300)
        const urls = [
            'https://api.restcountries.com/countries/v5?limit=100&offset=0',
            'https://api.restcountries.com/countries/v5?limit=100&offset=100',
            'https://api.restcountries.com/countries/v5?limit=100&offset=200'
        ];

        const requests = urls.map(url => fetch(url, { headers }));
        const responses = await Promise.all(requests);

        // Validamos que todas las respuestas de la API externa hayan sido exitosas
        if (responses.some(response => !response.ok)) {
            throw new Error('Una o más peticiones al servicio externo fallaron');
        }

        const dataResults = await Promise.all(responses.map(res => res.json()));

        // Unificamos los arreglos de las 3 páginas en uno solo
        let allCountries = [];
        dataResults.forEach(result => {
            if (result.data && Array.isArray(result.data.objects)) {
                allCountries = allCountries.concat(result.data.objects);
            }
        });

        const cleanCountries = allCountries
            .map(country => {
                // Extraemos el código de dos letras. Si viene vacío, usamos el parent o una alternativa segura
                const code = country.codes?.alpha_2 || country.parent?.alpha_2 || "";
                
                // GUARDAMOS EL NOMBRE EN INGLÉS PARA LA API DEL CLIMA (ej: "New Zealand")
                const nameEn = country.names?.common || "Unknown";
                
                // GUARDAMOS EL NOMBRE EN ESPAÑOL PARA LA INTERFAZ DE REACT (Tu variable 'name' original)
                const nameEs = country.names?.translations?.spa?.common || country.names?.common || "Desconocido";
                
                // Usamos la URL oficial de la bandera que provee la API, si viene vacía usamos flagcdn como respaldo
                const flag = country.flag?.url_svg || country.flag?.url_png || `https://flagcdn.com/${code.toLowerCase()}.svg`;

                return {
                    code: code,
                    name: nameEn,  // Ahora viaja el nombre en inglés en el campo base 'name'
                    nameEs: nameEs, // Añadimos la traducción explícita para el selector
                    flag: flag
                };
            })
            // Modificamos el filtro para usar el nombre en español que usará el usuario
            .filter(c => c.nameEs !== "Desconocido")
            // Ordenamos alfabéticamente de la A a la Z basándonos en los nombres en español
            .sort((a, b) => a.nameEs.localeCompare(b.nameEs));

        res.json(cleanCountries);

    } catch (error) {
        console.error(`[Error Country-Service]: ${error.message}`);
        res.status(500).json({ error: 'Hubo un problema al recopilar la lista completa de países.' });
    }
});

// Inicialización del servicio
app.listen(PORT, () => {
    console.log(`Country Service corriendo de forma segura en http://localhost:${PORT}`);
});