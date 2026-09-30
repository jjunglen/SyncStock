// A merchant's brand color, adjusted so it stays visible in both themes.
// Buttons and highlights need at least 3:1 contrast with the page (the
// WCAG level for controls). In dark mode a color that's too dark (navy,
// forest green) is lightened just enough; in light mode one that's too
// pale (pastel yellow) is darkened just enough. Colors that already pass
// are used exactly as chosen.
const MIN_CONTRAST = 3;
const DARK_BG = "#0a0a0a";
const LIGHT_BG = "#ffffff"; // light cards are white — the strictest case

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;

const luminance = (hex) => {
  const [r, g, b] = toRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Blend toward white or black a little at a time until it's visible
const adjustFor = (hex, background, towards) => {
  const target = toRgb(towards);
  let rgb = toRgb(hex);
  for (let step = 0; step < 20 && contrast(toHex(rgb), background) < MIN_CONTRAST; step++) {
    rgb = rgb.map((c, i) => c + (target[i] - c) * 0.1);
  }
  return toHex(rgb);
};

// Black or white text, whichever reads better on the color
export const textOn = (hex) => (contrast(hex, "#0a0a0a") >= contrast(hex, "#ffffff") ? "#0a0a0a" : "#ffffff");

// { dark: { color, text }, light: { color, text } }
export const brandShades = (hex) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex || "")) return null;
  const dark = adjustFor(hex, DARK_BG, "#ffffff");
  const light = adjustFor(hex, LIGHT_BG, "#000000");
  return {
    dark: { color: dark, text: textOn(dark) },
    light: { color: light, text: textOn(light) },
  };
};
