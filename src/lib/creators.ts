import { getCreators as getMockCreators } from '../mockData';

/**
 * Criadores combinados: usuários reais (DynamoDB) + criadores de demonstração
 * (mock). Sem `search`, lista todo mundo (usado pela página Criadores); com
 * `search`, filtra por username/nome dos dois lados (usado pela busca do
 * Descobrir).
 */
export async function fetchCreators(search?: string): Promise<any[]> {
  let realCreators: any[] = [];
  try {
    const url = search ? `/api/users?search=${encodeURIComponent(search)}` : '/api/users';
    const res = await fetch(url);
    if (res.ok) realCreators = await res.json();
  } catch {
    // API indisponível — segue só com os criadores mock.
  }

  let mockCreators = getMockCreators();
  if (search) {
    const q = search.toLowerCase();
    mockCreators = mockCreators.filter(
      (u) => u.username.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q)
    );
  }

  return [
    ...realCreators.map((u) => ({ ...u, source: 'real' as const })),
    ...mockCreators.map((u) => ({ ...u, source: 'mock' as const })),
  ];
}
