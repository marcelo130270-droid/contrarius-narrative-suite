export const ROTULO_SEM_CAPITULO = 'Sem capítulo';
export const ROTULO_SEM_CENA = 'Sem cena';
export const ROTULO_SEM_LIVRO_ROTEIRO = 'Sem livro';

const CHAVE_INTERNA_SEM_LIVRO = '__sem_livro__';
const CHAVE_INTERNA_SEM_CAPITULO = '__sem_capitulo__';

export interface EntradaRoteiroNarrativo {
  readonly chave: string;
  readonly id: string;
  readonly titulo: string;
  readonly filePath: string;
  readonly livro: string;
  readonly livroChave: string;
  readonly ordemNarrativa: number | null;
  readonly capitulo: string;
  readonly cena: string;
}

export interface ItemRoteiroNarrativo {
  readonly chave: string;
  readonly id: string;
  readonly titulo: string;
  readonly filePath: string;
  readonly ordemNarrativa: number | null;
  readonly capitulo: string;
  readonly cena: string;
}

export interface CenaRoteiroNarrativo {
  readonly chave: string;
  readonly titulo: string;
  readonly itens: readonly ItemRoteiroNarrativo[];
  readonly total: number;
}

export interface CapituloRoteiroNarrativo {
  readonly chave: string;
  readonly titulo: string;
  readonly cenas: readonly CenaRoteiroNarrativo[];
  readonly itensSemCena: readonly ItemRoteiroNarrativo[];
  readonly total: number;
}

export interface LivroRoteiroNarrativo {
  readonly chave: string;
  readonly titulo: string;
  readonly capitulos: readonly CapituloRoteiroNarrativo[];
  readonly total: number;
}

export interface RoteiroNarrativo {
  readonly livros: readonly LivroRoteiroNarrativo[];
  readonly total: number;
}

function normalizarChaveGrupo(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

function toItem(entrada: EntradaRoteiroNarrativo): ItemRoteiroNarrativo {
  return {
    chave: entrada.chave,
    id: entrada.id,
    titulo: entrada.titulo,
    filePath: entrada.filePath,
    ordemNarrativa: entrada.ordemNarrativa,
    capitulo: entrada.capitulo,
    cena: entrada.cena,
  };
}

export function construirRoteiroNarrativo(
  entradas: readonly EntradaRoteiroNarrativo[],
): RoteiroNarrativo {
  const livroOrdem: string[] = [];
  const livroTitulos = new Map<string, string>();

  const capOrdem = new Map<string, string[]>();
  const capTitulos = new Map<string, string>();

  const cenaOrdem = new Map<string, string[]>();
  const cenaTitulos = new Map<string, string>();
  const cenaItens = new Map<string, ItemRoteiroNarrativo[]>();
  const semCenaItens = new Map<string, ItemRoteiroNarrativo[]>();

  for (const entrada of entradas) {
    const livroChave =
      entrada.livroChave.trim() !== '' ? entrada.livroChave : CHAVE_INTERNA_SEM_LIVRO;
    const livroTitulo =
      entrada.livro.trim() !== '' ? entrada.livro : ROTULO_SEM_LIVRO_ROTEIRO;

    if (!livroTitulos.has(livroChave)) {
      livroOrdem.push(livroChave);
      livroTitulos.set(livroChave, livroTitulo);
    }

    const capNorm = normalizarChaveGrupo(entrada.capitulo);
    const capChavePart = capNorm !== '' ? capNorm : CHAVE_INTERNA_SEM_CAPITULO;
    const capChave = `${livroChave}:${capChavePart}`;
    const capTitulo =
      entrada.capitulo.trim() !== '' ? entrada.capitulo.trim() : ROTULO_SEM_CAPITULO;

    if (!capTitulos.has(capChave)) {
      const caps = capOrdem.get(livroChave);
      if (caps !== undefined) {
        caps.push(capChave);
      } else {
        capOrdem.set(livroChave, [capChave]);
      }
      capTitulos.set(capChave, capTitulo);
    }

    const item = toItem(entrada);
    const cenaTrim = entrada.cena.trim();

    if (cenaTrim === '') {
      const list = semCenaItens.get(capChave);
      if (list !== undefined) {
        list.push(item);
      } else {
        semCenaItens.set(capChave, [item]);
      }
    } else {
      const cenaNorm = normalizarChaveGrupo(cenaTrim);
      const cenaChave = `${capChave}:${cenaNorm}`;

      if (!cenaTitulos.has(cenaChave)) {
        const cenas = cenaOrdem.get(capChave);
        if (cenas !== undefined) {
          cenas.push(cenaChave);
        } else {
          cenaOrdem.set(capChave, [cenaChave]);
        }
        cenaTitulos.set(cenaChave, cenaTrim);
      }

      const list = cenaItens.get(cenaChave);
      if (list !== undefined) {
        list.push(item);
      } else {
        cenaItens.set(cenaChave, [item]);
      }
    }
  }

  let total = 0;
  const livros: LivroRoteiroNarrativo[] = [];

  for (const livroChave of livroOrdem) {
    let livroTotal = 0;
    const capitulos: CapituloRoteiroNarrativo[] = [];
    const caps = capOrdem.get(livroChave) ?? [];

    for (const capChave of caps) {
      const cenaChaves = cenaOrdem.get(capChave) ?? [];
      const cenas: CenaRoteiroNarrativo[] = cenaChaves.map((cenaChave) => {
        const itens = cenaItens.get(cenaChave) ?? [];
        return {
          chave: cenaChave,
          titulo: cenaTitulos.get(cenaChave)!,
          itens,
          total: itens.length,
        };
      });

      const semCena = semCenaItens.get(capChave) ?? [];
      const capTotal = cenas.reduce((acc, c) => acc + c.total, 0) + semCena.length;
      livroTotal += capTotal;

      capitulos.push({
        chave: capChave,
        titulo: capTitulos.get(capChave)!,
        cenas,
        itensSemCena: semCena,
        total: capTotal,
      });
    }

    total += livroTotal;
    livros.push({
      chave: livroChave,
      titulo: livroTitulos.get(livroChave)!,
      capitulos,
      total: livroTotal,
    });
  }

  return { livros, total };
}
