/** Blocos de conteúdo do editor de projeto — cada um representa uma seção do
    corpo do projeto (a capa, título, slug e tags ficam fora, como campos fixos). */
export type ProjectBlock =
  | { id: string; type: 'image'; url: string }
  | { id: string; type: 'grid'; images: string[] }
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'video'; url: string };

export type ProjectBlockType = ProjectBlock['type'];
