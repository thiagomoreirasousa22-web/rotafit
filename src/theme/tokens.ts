// Paletas do RotaFit. "light" usa Milano Red + Lemon Chiffon; "dark" é inspirado
// no Flamengo (rubro-negro). Os dois alimentam o estilo Liquid Glass: cada
// superfície de vidro é a cor "glass" com transparência, mais um brilho no topo.
export interface ThemeTokens {
  mode: 'light' | 'dark';
  background: string;
  backgroundAlt: string;
  surface: string;
  glass: string; // cor de base do vidro (recebe opacidade no componente)
  glassBorder: string;
  glassHighlight: string; // brilho no topo do vidro
  text: string;
  muted: string;
  primary: string; // Milano Red nos dois temas
  primarySoft: string;
  secondary: string; // Lemon Chiffon (claro) / vermelho vivo (escuro)
  onPrimary: string;
  border: string;
  success: string;
  danger: string;
  statusBar: 'dark' | 'light';
}
export const lightTheme: ThemeTokens = {
  mode: 'light',
  background: '#F8F7F4', // Fundo neutro
  backgroundAlt: '#F0EEEA',
  surface: '#FFFFFF',
  glass: '#FFFFFF',
  glassBorder: 'rgba(27, 29, 27, 0.10)',
  glassHighlight: 'rgba(255, 255, 255, 0.75)',
  text: '#171818',
  muted: '#595E5C',
  primary: '#B81104', // Milano Red
  primarySoft: '#FCE9E5',
  secondary: '#FFFACD',
  onPrimary: '#FFFFFF',
  border: '#E5E3DF',
  success: '#1E7D32',
  danger: '#B81104',
  statusBar: 'dark',
};
export const darkTheme: ThemeTokens = {
  mode: 'dark',
  background: '#0B0B0D', // preto Flamengo
  backgroundAlt: '#141617',
  surface: '#181A1B',
  glass: '#202223',
  glassBorder: 'rgba(255,255,255,0.12)',
  glassHighlight: 'rgba(255, 255, 255, 0.10)',
  text: '#F6F5F3',
  muted: '#A7A9A8',
  primary: '#E6141E', // vermelho Flamengo
  primarySoft: 'rgba(230, 20, 30, 0.18)',
  secondary: '#111111',
  onPrimary: '#FFFFFF',
  border: 'rgba(255, 255, 255, 0.10)',
  success: '#34D399',
  danger: '#FF4D5E',
  statusBar: 'light',
};
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 };
