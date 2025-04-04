import { useState, useEffect } from 'react';

interface SystemConfig {
  registerEnabled: number;
  // 其他系统配置项...
}

/**
 * Hook to fetch system configuration including register enable status
 * @returns System configuration with loading status
 */
export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/system/config');
        const data = await response.json();
        setConfig(data);
      } catch (error) {
        console.error('Failed to fetch system config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading };
}
