import React from 'react';

export default function CountrySelector({ countries, selectedCountry, onCountryChange, loading }) {
  return (
    <div className="bg-supabase-surface border border-supabase-border rounded-xl p-6">
      <label className="block text-sm font-medium text-supabase-text-muted mb-3 tracking-wide uppercase text-xs">
        Selecciona un país para iniciar la comparación horaria y climática
      </label>
      
      <select
        value={selectedCountry}
        onChange={onCountryChange}
        disabled={loading}
        className="w-full md:w-80 bg-supabase-bg border border-supabase-border rounded-lg px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-supabase-green transition-colors cursor-pointer disabled:opacity-50"
      >
        <option value="">{loading ? 'Cargando países...' : 'Seleccione un país...'}</option>
        {countries.map((country) => (
          <option key={country.code} value={country.name}>
            {country.name}
          </option>
        ))}
      </select>
    </div>
  );
}