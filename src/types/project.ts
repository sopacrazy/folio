/** Blocos de conteúdo do editor de projeto — cada um representa uma seção do
    corpo do projeto (a capa, título, slug e tags ficam fora, como campos fixos). */
export type ProjectBlock =
  | { id: string; type: 'image'; url: string }
  | { id: string; type: 'grid'; images: string[] }
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'video'; url: string };

export type ProjectBlockType = ProjectBlock['type'];

/** Aparência de um projeto individual — configurável no painel "Estilos" do
    editor e aplicada só na página pública daquele projeto. */
export interface ProjectStyles {
  theme: 'light' | 'dark';
  width: 'narrow' | 'default' | 'wide';
  accentColor: string;
}

export const DEFAULT_ACCENT_COLOR = '#1769ff';

export const DEFAULT_PROJECT_STYLES: ProjectStyles = {
  theme: 'light',
  width: 'default',
  accentColor: DEFAULT_ACCENT_COLOR,
};

export const ACCENT_COLOR_PRESETS: string[] = [
  DEFAULT_ACCENT_COLOR,
  '#7c3aed',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#ef4444',
];
