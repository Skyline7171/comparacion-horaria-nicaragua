import { useState, useEffect } from 'react';
import CountrySelector from './components/CountrySelector';
import WeatherCard from './components/WeatherCard';
import TimeDifference from './components/TimeDifference';

export default function App() {
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [loadingCountries, setLoadingCountries] = useState(true);
  
  const [comparisonData, setComparisonData] = useState(null);
  const [nicaraguaData, setNicaraguaData] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [error, setError] = useState(null);

  const COUNTRY_SVC_URL = 'http://localhost:5001/api/countries';
  const COMPARATOR_SVC_URL = 'http://localhost:5002/api';

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const resCountries = await fetch(COUNTRY_SVC_URL);
        if (!resCountries.ok) throw new Error('Error al cargar la lista de países');
        setCountries(await resCountries.json());
        setLoadingCountries(false);

        const resNicaragua = await fetch(`${COMPARATOR_SVC_URL}/nicaragua`);
        if (resNicaragua.ok) setNicaraguaData(await resNicaragua.json());
      } catch (err) {
        setError('Error de conexión con los microservicios de backend.');
        setLoadingCountries(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleCountryChange = async (e) => {
    const countryName = e.target.value;
    setSelectedCountry(countryName);
    if (!countryName) {
      setComparisonData(null);
      return;
    }

    setLoadingCompare(true);
    setError(null);

    try {
      const response = await fetch(`${COMPARATOR_SVC_URL}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryName })
      });

      // Si el backend responde con un error controlado
      if (!response.ok) {
        const errorData = await response.json();
        
        // Si el backend nos mandó la estructura de fallback, la usamos en lugar de romper la app
        if (errorData.paisSeleccionado) {
          setComparisonData(errorData);
          setNicaraguaData(errorData.nicaragua);
          return; // Salimos de la función limpiamente sin disparar el catch
        }
        
        // Si es un error crítico real (ej. un 500), entonces sí lanzamos el error
        throw new Error(errorData.error || 'Error al realizar la comparación');
      }

      // Si todo salió bien (status 200)
      const data = await response.json();
      setComparisonData(data);
      setNicaraguaData(data.nicaragua);

    } catch (err) {
      // Este bloque solo se ejecutará si el backend está totalmente caído (Error 500 o de red)
      setError(err.message);
      setComparisonData(null);
    } finally {
      setLoadingCompare(false);
    }
  };

  return (
    <div className="min-h-screen bg-supabase-bg text-neutral-100 flex flex-col items-center p-6">
      
      <header className="w-full max-w-5xl border-b border-supabase-border pb-6 mb-12 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight"><span className="text-supabase-green"></span>Mini Sistema 2</h1>
          <p className="text-sm text-supabase-text-muted mt-1">Arquitectura de Microservicios Desacoplados</p>
        </div>
      </header>

      <main className="w-full max-w-5xl flex flex-col gap-6">
        
        <CountrySelector 
          countries={countries} 
          selectedCountry={selectedCountry} 
          onCountryChange={handleCountryChange} 
          loading={loadingCountries} 
        />

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-sm text-red-400">
            ⚠️ {error}
          </div>
        )}

        <TimeDifference difference={comparisonData?.diferencia} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

          <WeatherCard 
            title="Referencia"
            countryName="Nicaragua"
            flag="https://flagcdn.com/ni.svg" // Bandera de Nicaragua directa
            weather={nicaraguaData?.clima}
            time={nicaraguaData?.hora}
            temperature={nicaraguaData?.temperatura}
            isReference={true}
          />

          <WeatherCard 
            title="Destino"
            countryName={selectedCountry}
            // Buscamos en el array de países el objeto que coincida con el nombre seleccionado para extraer su flag SVG
            flag={countries.find(c => c.name === selectedCountry)?.flag}
            weather={comparisonData?.paisSeleccionado?.clima}
            time={comparisonData?.paisSeleccionado?.hora}
            temperature={comparisonData?.paisSeleccionado?.temperatura}
            isReference={false}
            loading={loadingCompare}
          />
          
        </div>

      </main>
    </div>
  );
}