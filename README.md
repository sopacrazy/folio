# Estrutura Proposta do Projeto: Portsy

Seguindo suas diretrizes, estruturei as bases do projeto dividindo a stack logicamente em um monorepo para facilitar o desenvolvimento.

## 📂 Árvore de Diretórios (Proposta)

```text
/
├── server.ts                 # Ponto de entrada do Backend (Express + Vite Middleware)
├── /uploads                  # Armazenamento local de imagens do MVP
├── /src
│   ├── /db                   # Banco de Dados (Drizzle ORM)
│   │   ├── schema.ts         # Tabelas: Users, Projects, Likes, Follows, etc.
│   │   └── index.ts          # Conexão com o banco
│   │
│   ├── /server               # Código Backend
│   │   ├── /routes           # Rotas REST da API
│   │   ├── /controllers      # Lógica de negócio
│   │   ├── /middlewares      # Autenticação JWT e upload (Multer)
│   │   └── /utils            # Funções utilitárias do backend
│   │
│   ├── /client               # Código Frontend (React)
│   │   ├── /components       # Componentes visuais
│   │   │   ├── /ui           # UI Base (Botões, Inputs, Modais)
│   │   │   ├── /project      # ProjectCard, ProjectGallery
│   │   │   └── /layout       # Header, Navegação Superior
│   │   ├── /pages            # Telas Principais
│   │   │   ├── Home.tsx      # Feed Principal (Explore)
│   │   │   ├── Profile.tsx   # Perfil Público do Criador
│   │   │   ├── Project.tsx   # Detalhes do Projeto (estilo Behance)
│   │   │   └── Editor.tsx    # Criar/Editar Projeto
│   │   ├── /hooks            # Custom Hooks (ex: useAuth)
│   │   └── /store            # Estado global (ex: Zustand ou Context para Auth)
│   │
│   └── /shared               # Tipagens e Interfaces compartilhadas (TypeScript)
│       └── types.ts          
└── vite.config.ts            # Configuração do compilador frontend
```

## 🗄️ Banco de Dados e Stack

- **Banco de Dados (Relacional):** Configurei o schema localmente utilizando o Drizzle ORM. Para o MVP de desenvolvimento utilizaremos o driver `sqlite`, mas quando você for realizar o deploy no seu servidor Linux próprio, bastará trocar a linha de configuração do driver no Drizzle para `mysql2` e ele aplicará o schema em um banco MySQL nativo (zero vendor lock-in).
- **Backend:** Node.js com Express para lidar com a API, rodando em paralelo ao frontend. O schema (veja `src/db/schema.ts`) já contempla os relacionamentos principais de uma rede social (Projetos, Galeria de Imagens com ordem definida, Likes, Comentários, e Followers).
- **Frontend:** Preparado com React + Vite e Tailwind CSS, preparado para construirmos o layout clean do Ko-fi com os componentes expansivos do Behance.
- **Armazenamento:** Configurado diretório `/uploads` via Express estático.
