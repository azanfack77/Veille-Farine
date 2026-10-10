import { InputHTMLAttributes, ReactNode, useEffect, useRef, useState } from 'react';

export function EnTetePage({ titre, description, actions }: { titre: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="entete-page">
      <div>
        <h1>{titre}</h1>
        {description ? <p className="description">{description}</p> : null}
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </header>
  );
}

export function Message({ ton, children, onFermer }: { ton: 'erreur' | 'succes' | 'info'; children: ReactNode; onFermer?: () => void }) {
  return (
    <div className={`message message-${ton}`} role={ton === 'erreur' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onFermer ? (
        <button className="fermer" onClick={onFermer} aria-label="Fermer le message">
          ×
        </button>
      ) : null}
    </div>
  );
}

export function Fenetre({
  titre,
  children,
  onFermer,
  pied,
  large,
}: {
  titre: string;
  children: ReactNode;
  onFermer: () => void;
  pied?: ReactNode;
  large?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog ref={ref} className={`fenetre ${large ? 'fenetre-large' : ''}`} onCancel={onFermer} aria-label={titre}>
      <div className="fenetre-entete">
        <h2>{titre}</h2>
        <button className="fermer" onClick={onFermer} aria-label="Fermer">
          ×
        </button>
      </div>
      <div className="fenetre-corps">{children}</div>
      {pied ? <div className="fenetre-pied">{pied}</div> : null}
    </dialog>
  );
}

export function Champ({ libelle, children, aide }: { libelle: string; children: ReactNode; aide?: string }) {
  return (
    <label className="champ">
      <span className="champ-libelle">{libelle}</span>
      {children}
      {aide ? <span className="champ-aide">{aide}</span> : null}
    </label>
  );
}

/** Champ de mot de passe avec un bouton pour afficher ou masquer la saisie. */
export function SaisieMotDePasse(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="saisie-mdp">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="saisie-mdp-oeil"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-pressed={visible}
        title={visible ? 'Masquer' : 'Afficher'}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {visible ? null : <path d="M3 3l18 18" />}
        </svg>
      </button>
    </span>
  );
}

export function Chargement({ texte = 'Chargement…' }: { texte?: string }) {
  return <p className="chargement">{texte}</p>;
}

export function Pagination({
  page,
  total,
  parPage,
  onPage,
}: {
  page: number;
  total: number;
  parPage: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / parPage));
  const debut = total === 0 ? 0 : page * parPage + 1;
  const fin = Math.min(total, (page + 1) * parPage);
  return (
    <div className="pagination">
      <span>
        {debut}–{fin} sur {total}
      </span>
      <button className="bouton bouton-contour petit" disabled={page === 0} onClick={() => onPage(page - 1)}>
        Précédent
      </button>
      <button className="bouton bouton-contour petit" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>
        Suivant
      </button>
    </div>
  );
}
