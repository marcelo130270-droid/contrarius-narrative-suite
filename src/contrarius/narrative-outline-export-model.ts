// Pure model — no Obsidian, DOM, Node, filesystem, Date, or side effects

export interface EventoExportacaoNarrativa {
  readonly chave: string;
  readonly id: string;
  readonly titulo: string;
  readonly filePath: string;
  readonly livro: string;
  readonly ordemNarrativa: number | null;
  readonly capitulo: string;
  readonly cena: string;
}

export interface ProblemaExportacaoNarrativa {
  readonly nivel: 'aviso' | 'erro';
  readonly mensagem: string;
  readonly relacionados: readonly string[];
}

export interface DadosExportacaoRoteiroNarrativo {
  readonly titulo: string;
  readonly filtroLivro: string;
  readonly busca: string;
  readonly geradoEm: string;
  readonly eventosPosicionados: readonly EventoExportacaoNarrativa[];
  readonly eventosSemOrdem: readonly EventoExportacaoNarrativa[];
  readonly problemas: readonly ProblemaExportacaoNarrativa[];
}

// ─── Constantes internas ──────────────────────────────────────────────────────

const SEM_LIVRO_EXPORT = 'Sem livro';
const SEM_CAPITULO_EXPORT = 'Sem capítulo';
const SEM_CENA_EXPORT = 'Sem cena';
const CHAVE_SEM_LIVRO_EXPORT = '__export_sem_livro__';
const CHAVE_SEM_CAPITULO_EXPORT = '__export_sem_capitulo__';

// ─── Auxiliares de texto ──────────────────────────────────────────────────────

function normalizarChaveGrupoExport(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

function caminhoSemMd(filePath: string): string {
  return filePath.endsWith('.md') ? filePath.slice(0, -3) : filePath;
}

function escaparAlias(s: string): string {
  return s.replace(/\|/g, '\\|');
}

function tituloEventoSeguro(titulo: string): string {
  return titulo.trim() !== '' ? titulo : 'Evento sem título';
}

function idEventoSeguro(id: string): string {
  return id.trim() !== '' ? id : 'sem ID';
}

function linkEventoObsidian(evento: EventoExportacaoNarrativa): string {
  const titulo = tituloEventoSeguro(evento.titulo);
  const id = idEventoSeguro(evento.id);
  const path = evento.filePath.trim();

  if (path === '') {
    return `${titulo} (\`${id}\`)`;
  }

  return `[[${caminhoSemMd(path)}|${escaparAlias(titulo)}]] (\`${id}\`)`;
}

function ordemNarrativaStr(ordem: number | null): string {
  if (ordem === null) return 'sem ordem';
  if (!Number.isFinite(ordem)) return 'sem ordem';
  return String(ordem);
}

function linhaPosicionado(evento: EventoExportacaoNarrativa): string {
  return `- ${ordemNarrativaStr(evento.ordemNarrativa)} — ${linkEventoObsidian(evento)}`;
}

function linhaSemOrdem(evento: EventoExportacaoNarrativa): string {
  return `- ${linkEventoObsidian(evento)}`;
}

// ─── Agrupamento interno ──────────────────────────────────────────────────────

interface GrupoCenaInterna {
  titulo: string;
  itens: EventoExportacaoNarrativa[];
}

interface GrupoCapituloInterna {
  titulo: string;
  cenaOrdem: string[];
  cenaMap: Map<string, GrupoCenaInterna>;
  semCena: EventoExportacaoNarrativa[];
}

interface GrupoLivroInterna {
  titulo: string;
  capOrdem: string[];
  capMap: Map<string, GrupoCapituloInterna>;
}

function agruparPosicionados(
  eventos: readonly EventoExportacaoNarrativa[],
): { livroOrdem: string[]; livroMap: Map<string, GrupoLivroInterna> } {
  const livroOrdem: string[] = [];
  const livroMap = new Map<string, GrupoLivroInterna>();

  for (const evento of eventos) {
    const livroTrim = evento.livro.trim();
    const livroChave =
      livroTrim !== '' ? normalizarChaveGrupoExport(livroTrim) : CHAVE_SEM_LIVRO_EXPORT;
    const livroTitulo = livroTrim !== '' ? livroTrim : SEM_LIVRO_EXPORT;

    let livroGrupo: GrupoLivroInterna | undefined = livroMap.get(livroChave);
    if (livroGrupo === undefined) {
      livroGrupo = { titulo: livroTitulo, capOrdem: [], capMap: new Map() };
      livroOrdem.push(livroChave);
      livroMap.set(livroChave, livroGrupo);
    }

    const capTrim = evento.capitulo.trim();
    const capNorm =
      capTrim !== '' ? normalizarChaveGrupoExport(capTrim) : CHAVE_SEM_CAPITULO_EXPORT;
    const capChave = `${livroChave}:${capNorm}`;
    const capTitulo = capTrim !== '' ? capTrim : SEM_CAPITULO_EXPORT;

    let capGrupo: GrupoCapituloInterna | undefined = livroGrupo.capMap.get(capChave);
    if (capGrupo === undefined) {
      capGrupo = { titulo: capTitulo, cenaOrdem: [], cenaMap: new Map(), semCena: [] };
      livroGrupo.capOrdem.push(capChave);
      livroGrupo.capMap.set(capChave, capGrupo);
    }

    const cenaTrim = evento.cena.trim();
    if (cenaTrim === '') {
      capGrupo.semCena.push(evento);
    } else {
      const cenaNorm = normalizarChaveGrupoExport(cenaTrim);
      const cenaChave = `${capChave}:${cenaNorm}`;

      let cenaGrupo: GrupoCenaInterna | undefined = capGrupo.cenaMap.get(cenaChave);
      if (cenaGrupo === undefined) {
        cenaGrupo = { titulo: cenaTrim, itens: [] };
        capGrupo.cenaOrdem.push(cenaChave);
        capGrupo.cenaMap.set(cenaChave, cenaGrupo);
      }
      cenaGrupo.itens.push(evento);
    }
  }

  return { livroOrdem, livroMap };
}

// ─── API pública ──────────────────────────────────────────────────────────────

export function gerarMarkdownRoteiroNarrativo(
  dados: DadosExportacaoRoteiroNarrativo,
): string {
  const lines: string[] = [];

  // Cabeçalho
  lines.push(`# ${dados.titulo}`);
  lines.push('');
  lines.push(`- Filtro de livro: ${dados.filtroLivro}`);
  lines.push(`- Busca ativa: ${dados.busca.trim() !== '' ? dados.busca : 'nenhuma'}`);
  lines.push(`- Gerado em: ${dados.geradoEm}`);
  lines.push('');

  // Eventos posicionados
  lines.push('## Eventos posicionados');
  lines.push('');

  if (dados.eventosPosicionados.length === 0) {
    lines.push('_Nenhum evento posicionado._');
    lines.push('');
  } else {
    const { livroOrdem, livroMap } = agruparPosicionados(dados.eventosPosicionados);

    for (const livroChave of livroOrdem) {
      const livro = livroMap.get(livroChave)!;
      lines.push(`### ${livro.titulo}`);
      lines.push('');

      for (const capChave of livro.capOrdem) {
        const cap = livro.capMap.get(capChave)!;
        lines.push(`#### ${cap.titulo}`);
        lines.push('');

        for (const cenaChave of cap.cenaOrdem) {
          const cena = cap.cenaMap.get(cenaChave)!;
          lines.push(`##### ${cena.titulo}`);
          lines.push('');
          for (const evento of cena.itens) {
            lines.push(linhaPosicionado(evento));
          }
          lines.push('');
        }

        if (cap.semCena.length > 0) {
          lines.push(`##### ${SEM_CENA_EXPORT}`);
          lines.push('');
          for (const evento of cap.semCena) {
            lines.push(linhaPosicionado(evento));
          }
          lines.push('');
        }
      }
    }
  }

  // Eventos sem ordem_narrativa (sempre presente)
  lines.push('## Eventos sem ordem_narrativa');
  lines.push('');

  if (dados.eventosSemOrdem.length === 0) {
    lines.push('_Nenhum evento sem ordem narrativa._');
    lines.push('');
  } else {
    for (const evento of dados.eventosSemOrdem) {
      lines.push(linhaSemOrdem(evento));
    }
    lines.push('');
  }

  // Problemas (apenas se houver)
  if (dados.problemas.length > 0) {
    lines.push('## Problemas');
    lines.push('');
    for (const problema of dados.problemas) {
      const nivel = problema.nivel === 'erro' ? 'ERRO' : 'AVISO';
      lines.push(`- ${nivel} — ${problema.mensagem}`);
      if (problema.relacionados.length > 0) {
        lines.push(`  - Relacionados: ${[...problema.relacionados].join(', ')}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
