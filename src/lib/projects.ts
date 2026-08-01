import { getProjects as getMockProjects } from '../mockData';

/**
 * Feed combinado: projetos reais (DynamoDB) + projetos de demonstração (mock).
 * Os projetos de demonstração (Ana, João, Mel...) ainda só existem nos dados
 * mock — misturamos os dois pra manter a vitrine rica enquanto convivem com
 * publicações de verdade. Cada item é marcado com `source` pra que a UI saiba
 * quais projetos podem receber curtidas de verdade (só os reais).
 *
 * `token`, quando informado, é enviado pro backend pra que o feed já venha
 * com `likedByMe` correto pro usuário logado (sem isso, todo card nasceria
 * "descurtido" até o primeiro clique, mesmo que já tivesse sido curtido antes).
 */
export async function fetchProjectFeed(token?: string | null): Promise<any[]> {
  let realProjects: any[] = [];
  try {
    const res = await fetch('/api/projects', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (res.ok) realProjects = await res.json();
  } catch {
    // API indisponível — segue só com os projetos mock.
  }

  const taggedReal = realProjects.map((p) => ({ ...p, source: 'real' as const }));
  const taggedMock = getMockProjects().map((p) => ({ ...p, source: 'mock' as const }));
  return [...taggedReal, ...taggedMock].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
