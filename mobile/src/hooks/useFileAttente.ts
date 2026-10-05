import { useEffect, useState } from 'react';
import { ecouterFile, lireFile } from '../lib/fileAttente';
import type { ElementFile } from '../lib/types';

export function useFileAttente(): ElementFile[] {
  const [file, setFile] = useState<ElementFile[]>([]);
  useEffect(() => {
    let actif = true;
    lireFile().then((f) => actif && setFile(f));
    const arreter = ecouterFile(setFile);
    return () => {
      actif = false;
      arreter();
    };
  }, []);
  return file;
}
