import { db } from './src/db/index.ts';
import { users, projects, projectImages } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('Seeding database...');
  
  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.username, 'admin')
  });

  if (existingAdmin) {
    console.log('Database already seeded!');
    process.exit(0);
  }

  // 1. Create admin user
  const adminPasswordHash = await bcrypt.hash('admin', 10);
  const adminId = uuidv4();
  
  await db.insert(users).values({
    id: adminId,
    username: 'admin',
    email: 'admin@admin.com',
    passwordHash: adminPasswordHash,
    fullName: 'Administrador',
    bio: 'Administrador do sistema',
    category: 'Dev',
    avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=256&auto=format&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
    createdAt: new Date()
  });

  // 2. Create fake users
  const usersData = [
    {
      id: uuidv4(),
      username: 'johndoe',
      email: 'john@example.com',
      passwordHash: adminPasswordHash,
      fullName: 'John Doe',
      bio: 'Sou um designer apaixonado por criar interfaces limpas e funcionais.',
      category: 'UI/UX',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop',
      coverUrl: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2564&auto=format&fit=crop',
      createdAt: new Date()
    },
    {
      id: uuidv4(),
      username: 'aliceart',
      email: 'alice@example.com',
      passwordHash: adminPasswordHash,
      fullName: 'Alice Art',
      bio: 'Ilustradora digital e concept artist.',
      category: 'Ilustração',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=256&auto=format&fit=crop',
      coverUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=2564&auto=format&fit=crop',
      createdAt: new Date()
    },
    {
      id: uuidv4(),
      username: 'bobdev',
      email: 'bob@example.com',
      passwordHash: adminPasswordHash,
      fullName: 'Bob Dev',
      bio: 'Desenvolvedor front-end focado em React e animações.',
      category: 'Dev',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop',
      coverUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2564&auto=format&fit=crop',
      createdAt: new Date()
    },
    {
      id: uuidv4(),
      username: 'mariaphoto',
      email: 'maria@example.com',
      passwordHash: adminPasswordHash,
      fullName: 'Maria Fotografia',
      bio: 'Fotógrafa de paisagens e retratos.',
      category: 'Fotografia',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
      coverUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=2564&auto=format&fit=crop',
      createdAt: new Date()
    }
  ];

  await db.insert(users).values(usersData);

  // 3. Create fake projects
  const projectsData = [
    {
      id: uuidv4(),
      userId: usersData[0].id,
      title: 'App Financeiro Minimalista',
      description: 'Um conceito para um aplicativo financeiro focado na simplicidade e na experiência do usuário. O objetivo foi criar uma interface sem distrações para acompanhar gastos e gerenciar orçamentos pessoais.\n\nProcesso:\n1. Pesquisa de mercado\n2. Wireframes\n3. Prototipagem\n4. Testes com usuários',
      category: 'UI/UX',
      coverUrl: 'https://images.unsplash.com/photo-1616423641402-897db67462ee?q=80&w=1200&auto=format&fit=crop',
      tools: JSON.stringify(['Figma', 'Illustrator']),
      createdAt: new Date()
    },
    {
      id: uuidv4(),
      userId: usersData[1].id,
      title: 'Série Floresta Mágica',
      description: 'Uma série de ilustrações explorando um universo fantástico de florestas encantadas e criaturas mágicas.',
      category: 'Ilustração',
      coverUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200&auto=format&fit=crop',
      tools: JSON.stringify(['Procreate', 'Photoshop']),
      createdAt: new Date()
    },
    {
      id: uuidv4(),
      userId: usersData[2].id,
      title: 'E-commerce React',
      description: 'Uma loja virtual moderna e performática construída inteiramente com React e Tailwind CSS.',
      category: 'Dev',
      coverUrl: 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?q=80&w=1200&auto=format&fit=crop',
      tools: JSON.stringify(['React', 'Tailwind', 'Vite']),
      createdAt: new Date()
    },
    {
      id: uuidv4(),
      userId: adminId,
      title: 'Portsy Plataforma',
      description: 'A própria plataforma Portsy desenvolvida para conectar criadores.',
      category: 'Dev',
      coverUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop',
      tools: JSON.stringify(['React', 'Node.js', 'Express']),
      createdAt: new Date()
    },
    {
      id: uuidv4(),
      userId: usersData[3].id,
      title: 'Retratos Urbanos',
      description: 'Ensaio fotográfico no centro da cidade explorando luz e sombra.',
      category: 'Fotografia',
      coverUrl: 'https://images.unsplash.com/photo-1554046920-90dcac82485e?q=80&w=1200&auto=format&fit=crop',
      tools: JSON.stringify(['Lightroom']),
      createdAt: new Date()
    },
    {
      id: uuidv4(),
      userId: usersData[0].id,
      title: 'Dashboard Analytics',
      description: 'Dashboard para acompanhamento de métricas de SaaS.',
      category: 'UI/UX',
      coverUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop',
      tools: JSON.stringify(['Figma']),
      createdAt: new Date()
    }
  ];

  await db.insert(projects).values(projectsData);

  console.log('Database seeded successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
