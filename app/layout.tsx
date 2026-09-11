import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Evoluciona | Desarrollo de carrera',
  description: 'Experiencia privada de desarrollo de carrera con orientación asistida por IA y validación humana.',
  openGraph: {
    title: 'Evoluciona | Desarrollo de carrera',
    description: 'Tu carrera, con orientación de IA y validación humana.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Evoluciona | Desarrollo de carrera',
    description: 'Tu carrera, con orientación de IA y validación humana.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
