// Utility functions for color manipulation

/**
 * Converts hex color to RGB
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * Generates a darker shade of the color
 */
export const darkenColor = (hex: string, percent: number = 20): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = Math.max(0, Math.floor(rgb.r * (1 - percent / 100)));
  const g = Math.max(0, Math.floor(rgb.g * (1 - percent / 100)));
  const b = Math.max(0, Math.floor(rgb.b * (1 - percent / 100)));

  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
};

/**
 * Generates a lighter shade of the color
 */
export const lightenColor = (hex: string, percent: number = 20): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * (percent / 100)));
  const g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * (percent / 100)));
  const b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * (percent / 100)));

  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
};

/**
 * Generates color variations for gradients
 */
export const getColorVariations = (baseColor: string) => {
  return {
    primary: baseColor,
    dark: darkenColor(baseColor, 15),
    darker: darkenColor(baseColor, 30),
    light: lightenColor(baseColor, 10),
    lighter: lightenColor(baseColor, 20),
    // For gradients - slightly different shades
    gradientStart: baseColor,
    gradientMiddle: lightenColor(baseColor, 5),
    gradientEnd: darkenColor(baseColor, 10),
  };
};

