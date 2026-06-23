import React from 'react';

export default function TimeDifference({ difference }) {
  if (!difference) return null;

  return (
    <div className="w-full text-center my-2 animate-fade-in">
      <p className="text-sm text-supabase-green font-medium bg-supabase-green/5 border border-supabase-green/10 rounded-lg py-2 px-4 inline-block font-mono">
        {difference}
      </p>
    </div>
  );
}