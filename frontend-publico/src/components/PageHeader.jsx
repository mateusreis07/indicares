import logoMppa from '../assets/logo-mppa.png';
import logoSoftplan from '../assets/logo-softplan.png';

// Cartão branco atrás das logos para garantir contraste com o fundo roxo
const LOGO_CARD_STYLE = {
  background: 'white',
  borderRadius: '16px',
  padding: '12px 20px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '80px',
  minWidth: '210px',
  boxSizing: 'border-box'
};

// Cabeçalho roxo compartilhado pelas páginas do painel público
export default function PageHeader({ title, children }) {
  return (
    <div style={{ backgroundColor: 'var(--accent-primary)', color: 'white', padding: '48px 40px', borderRadius: '0 0 32px 32px', textAlign: 'center', margin: '-32px -40px 32px -40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
      <div style={LOGO_CARD_STYLE}>
        <img src={logoMppa} alt="Ministério Público do Estado do Pará" style={{ height: '56px', width: 'auto', display: 'block' }} />
      </div>
      <div style={{ flex: 1, minWidth: '280px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '2px', margin: '0', textTransform: 'uppercase' }}>
          {title}
        </h1>
        <p style={{ opacity: 0.8, fontSize: '1.1rem', marginTop: '8px' }}>
          Time de Experiência N1 - MPPA
        </p>
        {children}
      </div>
      <div style={LOGO_CARD_STYLE}>
        {/* A imagem tem muita margem: object-fit recorta só a palavra */}
        <img src={logoSoftplan} alt="Softplan" style={{ width: '170px', height: '50px', objectFit: 'cover', objectPosition: 'center 48%', display: 'block' }} />
      </div>
    </div>
  );
}
