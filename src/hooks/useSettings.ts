import { useState, useEffect } from 'react';
import { FixedCosts } from '../types';

const defaultFixedCosts: FixedCosts = {
  valorDiesel: 6.50,
  mediaKmLitro: 3.5,
  custoPneuKm: 0.15,
  custoDepreciacaoKm: 0.20,
  custoManutencaoKm: 0.30,
  custoSeguroRastreadorKm: 0.10,
  custoAdminKm: 0.25,
  pernoiteMotorista: 120,
  pernoiteAjudante: 80,
  impostoPisCofins: 9.25,
};

export function useSettings() {
  const [settings, setSettings] = useState<FixedCosts>(() => {
    try {
      const saved = localStorage.getItem('routerx_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = { ...defaultFixedCosts };
        // Ensure valid number values are loaded
        for (const key in defaultFixedCosts) {
          const k = key as keyof FixedCosts;
          if (parsed[k] !== undefined && parsed[k] !== null && !isNaN(Number(parsed[k]))) {
            merged[k] = Number(parsed[k]);
          }
        }
        return merged;
      }
    } catch (e) {
      console.warn("Failed to parse settings from local storage", e);
    }
    return defaultFixedCosts;
  });

  const updateSettings = (newSettings: Partial<FixedCosts>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('routerx_settings', JSON.stringify(updated));
      return updated;
    });
  };

  return { settings, updateSettings };
}
