import { Link } from 'react-router';
import { Facebook, Heart, Instagram, Linkedin, Twitter } from 'lucide-react';

const columns = [
  {
    title: 'Explorar',
    links: [
      { label: 'Descobrir', to: '/descobrir' },
      { label: 'Criadores', to: '/criadores' },
      { label: 'Vagas', to: null },
    ],
  },
  {
    title: 'Folio',
    links: [
      { label: 'Sobre', to: null },
      { label: 'Blog', to: null },
      { label: 'Central de ajuda', to: null },
    ],
  },
];

const socialLinks = [
  { label: 'Instagram', icon: Instagram },
  { label: 'Twitter', icon: Twitter },
  { label: 'Facebook', icon: Facebook },
  { label: 'LinkedIn', icon: Linkedin },
];

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="flex items-center gap-2 text-lg font-bold text-white w-fit">
              <Heart className="w-4 h-4 fill-primary text-primary" /> Folio
            </Link>
            <p className="text-sm mt-2 max-w-[22ch]">A rede social de portfólios para criadores.</p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-3">{col.title}</h3>
              <ul className="space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link to={link.to} className="hover:text-white transition-colors">
                        {link.label}
                      </Link>
                    ) : (
                      <span className="cursor-default select-none">{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-3">Social</h3>
            <ul className="space-y-2 text-sm">
              {socialLinks.map(({ label, icon: Icon }) => (
                <li key={label}>
                  <span className="flex items-center gap-2 cursor-default select-none">
                    <Icon className="w-4 h-4" /> {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <span>© {new Date().getFullYear()} Folio. Todos os direitos reservados.</span>
          <div className="flex items-center gap-4">
            <span className="cursor-default select-none hover:text-white transition-colors">Termos</span>
            <span className="cursor-default select-none hover:text-white transition-colors">Privacidade</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
