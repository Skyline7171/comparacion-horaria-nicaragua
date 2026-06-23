import React from 'react';

export default function WeatherCard({ title, countryName, flag, weather, time, temperature, isReference, loading }) {
  return (
    <div className={`bg-supabase-surface border ${isReference ? 'border-supabase-green/20 hover:border-supabase-green/40' : 'border-supabase-border'} rounded-xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300`}>
      
      {/* Spinner de carga si el componente está consultando el microservicio */}
      {loading && (
        <div className="absolute inset-0 bg-supabase-surface/80 flex items-center justify-center rounded-xl z-10 backdrop-blur-sm">
          <div className="h-5 w-5 border-2 border-supabase-green border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className="absolute top-0 right-0 w-24 h-24 bg-supabase-green/5 rounded-full blur-2xl pointer-events-none"></div>
      
      <div>
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs font-mono uppercase tracking-widest text-supabase-text-muted bg-supabase-bg px-2 py-0.5 rounded-md border border-supabase-border">
            {isReference ? 'Referencia Local' : 'Comparando'}
          </span>
          
          {/* Renderizado de la bandera dinámica en lugar de un emoji fijo */}
          {flag ? (
            <img 
              src={flag} 
              alt={`Bandera de ${countryName}`} 
              className="h-5 w-7 object-cover rounded shadow-md border border-supabase-border"
              onError={(e) => {
                // Respaldo por si falla la URL de la bandera externa
                e.target.src = "https://flagcdn.com/un.svg"; 
              }}
            />
          ) : (
            <span className="text-xl">🌍</span>
          )}
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-1">{countryName || '---'}</h2>
        <p className="text-sm text-supabase-text-muted capitalize">{weather || 'Cargando datos...'}</p>
      </div>
      
      <div className="mt-12 flex justify-between items-baseline border-t border-supabase-border/50 pt-4">
        <span className="text-4xl font-light tracking-tight font-mono text-neutral-100">{time || '--:--'}</span>
        <span className="text-4xl font-semibold text-supabase-green tracking-tighter">{temperature || '--°C'}</span>
      </div>
    </div>
  );
}