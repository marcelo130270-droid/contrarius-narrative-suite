// Pure model — no Obsidian, DOM, Node, filesystem, Date, or side effects

export interface EventoExportacaoScrivener {
  readonly chave: string;
  readonly id: string;
  readonly titulo: string;
  readonly filePath: string;
  readonly livro: string;
  readonly ordemNarrativa: number | null;
  readonly capitulo: string;
  readonly cena: string;
}

export interface ProblemaExportacaoScrivener {
  readonly nivel: 'aviso' | 'erro';
  readonly mensagem: string;
  readonly relacionados: readonly string[];
}

export interface DadosPacoteScrivener {
  readonly titulo: string;
  readonly filtroLivro: string;
  readonly busca: string;
  readonly geradoEm: string;
  readonly eventosPosicionados: readonly EventoExportacaoScrivener[];
  readonly eventosSemOrdem: readonly EventoExportacaoScrivener[];
  readonly problemas: readonly ProblemaExportacaoScrivener[];
}

export interface ArquivoPacoteScrivener {
  readonly caminhoRelativo: string;
  readonly conteudo: string;
}

export interface PacoteScrivener {
  readonly arquivos: readonly ArquivoPacoteScrivener[];
}

// ─── Constantes internas ──────────────────────────────────────────────────────

const INVALIDOS_WINDOWS = /[<>:"/\\|?*\x00-\x1f]/g;

// ─── Sanitização de segmentos de caminho ──────────────────────────────────────

function sanitizarSegmento(s: string): string {
  return s
    .replace(INVALIDOS_WINDOWS, '-')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

function segmentoComFallback(s: string, fallback: string): string {
  const san = sanitizarSegmento(s.trim());
  return san !== '' ? san : sanitizarSegmento(fallback) || fallback;
}

function slugSimples(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function slugEvento(evento: EventoExportacaoScrivener): string {
  const idSlug = slugSimples(evento.id.trim() !== '' ? evento.id : 'sem-id');
  const tituloSlug = slugSimples(evento.titulo.trim() !== '' ? evento.titulo : 'sem-titulo');
  const combined = [idSlug, tituloSlug].filter((s) => s !== '').join('-');
  return combined !== '' ? combined : 'evento';
}

function padOrdem(ordem: number): string {
  const neg = ordem < 0;
  const abs = Math.abs(Math.trunc(ordem));
  const padded = String(abs).padStart(3, '0');
  return neg ? `-${padded}` : padded;
}

// ─── Resolução de duplicatas ──────────────────────────────────────────────────

function resolverDuplicata(caminho: string, usados: Set<string>): string {
  if (!usados.has(caminho)) {
    usados.add(caminho);
    return caminho;
  }
  const dot = caminho.lastIndexOf('.');
  const semExt = dot > 0 ? caminho.slice(0, dot) : caminho;
  const ext = dot > 0 ? caminho.slice(dot) : '';
  let n = 2;
  let candidato: string;
  do {
    candidato = `${semExt}-${String(n).padStart(2, '0')}${ext}`;
    n++;
  } while (usados.has(candidato));
  usados.add(candidato);
  return candidato;
}

// ─── Auxiliares de texto ──────────────────────────────────────────────────────

function tituloSeguro(titulo: string): string {
  return titulo.trim() !== '' ? titulo.trim() : 'Evento sem título';
}

function idSeguro(id: string): string {
  return id.trim() !== '' ? id.trim() : 'sem ID';
}

function caminhoSemMd(filePath: string): string {
  return filePath.endsWith('.md') ? filePath.slice(0, -3) : filePath;
}

function escaparAlias(s: string): string {
  return s.replace(/\|/g, '\\|');
}

function notaOriginalLink(evento: EventoExportacaoScrivener): string {
  const path = evento.filePath.trim();
  const titulo = tituloSeguro(evento.titulo);
  if (path === '') return 'caminho não informado';
  return `[[${caminhoSemMd(path)}|${escaparAlias(titulo)}]]`;
}

function ordemNarrativaTexto(ordem: number | null): string {
  if (ordem === null || !Number.isFinite(ordem)) return 'sem ordem';
  return String(ordem);
}

// ─── Geração de caminhos de arquivo ──────────────────────────────────────────

function caminhoEventoPosicionado(
  evento: EventoExportacaoScrivener,
  usados: Set<string>,
): string {
  const livroSeg = segmentoComFallback(evento.livro, 'Sem livro');
  const capSeg = segmentoComFallback(evento.capitulo, 'Sem capitulo');
  const ordem = evento.ordemNarrativa;
  const prefixo =
    ordem !== null && Number.isFinite(ordem) ? padOrdem(ordem) : '000';
  const slug = slugEvento(evento);
  const base = `${livroSeg}/${capSeg}/${prefixo}-${slug}`;
  return resolverDuplicata(`${base}.md`, usados);
}

function caminhoEventoSemOrdem(
  evento: EventoExportacaoScrivener,
  usados: Set<string>,
): string {
  const slug = slugEvento(evento);
  const base = `_sem_ordem/${slug !== '' ? slug : 'evento'}`;
  return resolverDuplicata(`${base}.md`, usados);
}

// ─── Conteúdo dos arquivos ────────────────────────────────────────────────────

function gerarConteudoEvento(
  evento: EventoExportacaoScrivener,
  ordemTexto: string,
): string {
  const titulo = tituloSeguro(evento.titulo);
  const id = idSeguro(evento.id);
  const livro = evento.livro.trim() !== '' ? evento.livro.trim() : 'Sem livro';
  const capitulo = evento.capitulo.trim() !== '' ? evento.capitulo.trim() : 'Sem capítulo';
  const cena = evento.cena.trim() !== '' ? evento.cena.trim() : 'Sem cena';
  const nota = notaOriginalLink(evento);

  const lines = [
    `# ${titulo}`,
    '',
    `- ID: ${id}`,
    `- Ordem narrativa: ${ordemTexto}`,
    `- Livro: ${livro}`,
    `- Capítulo: ${capitulo}`,
    `- Cena: ${cena}`,
    `- Nota original: ${nota}`,
    '',
    '## Sinopse de escrita',
    '',
    '[preencher no Scrivener]',
    '',
    '## Observações estruturais',
    '',
    `- Chave interna: ${evento.chave}`,
    `- Caminho original: ${evento.filePath}`,
    '',
  ];
  return lines.join('\n');
}

interface MetaArquivoEvento {
  readonly caminho: string;
  readonly evento: EventoExportacaoScrivener;
  readonly posicionado: boolean;
}

function gerarIndice(
  dados: DadosPacoteScrivener,
  metaArquivos: readonly MetaArquivoEvento[],
): string {
  const posicionados = metaArquivos.filter((a) => a.posicionado);
  const semOrdem = metaArquivos.filter((a) => !a.posicionado);

  const lines: string[] = [
    `# ${dados.titulo}`,
    '',
    `- Filtro de livro: ${dados.filtroLivro}`,
    `- Busca ativa: ${dados.busca.trim() !== '' ? dados.busca.trim() : 'nenhuma'}`,
    `- Gerado em: ${dados.geradoEm}`,
    `- Eventos posicionados: ${dados.eventosPosicionados.length}`,
    `- Eventos sem ordem: ${dados.eventosSemOrdem.length}`,
    '',
    '## Índice — Eventos posicionados',
    '',
  ];

  if (posicionados.length === 0) {
    lines.push('_Nenhum evento posicionado._');
  } else {
    for (const { caminho, evento } of posicionados) {
      lines.push(`- [${tituloSeguro(evento.titulo)}](${caminho})`);
    }
  }
  lines.push('');

  lines.push('## Índice — Eventos sem ordem');
  lines.push('');
  if (semOrdem.length === 0) {
    lines.push('_Nenhum evento sem ordem narrativa._');
  } else {
    for (const { caminho, evento } of semOrdem) {
      lines.push(`- [${tituloSeguro(evento.titulo)}](${caminho})`);
    }
  }
  lines.push('');

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

// ─── API pública ──────────────────────────────────────────────────────────────

export function gerarPacoteScrivenerMarkdown(
  dados: DadosPacoteScrivener,
): PacoteScrivener {
  const usados = new Set<string>();
  const arquivosEventos: ArquivoPacoteScrivener[] = [];
  const metaArquivos: MetaArquivoEvento[] = [];

  for (const evento of dados.eventosPosicionados) {
    const caminho = caminhoEventoPosicionado(evento, usados);
    const ordemTexto = ordemNarrativaTexto(evento.ordemNarrativa);
    const conteudo = gerarConteudoEvento(evento, ordemTexto);
    arquivosEventos.push({ caminhoRelativo: caminho, conteudo });
    metaArquivos.push({ caminho, evento, posicionado: true });
  }

  for (const evento of dados.eventosSemOrdem) {
    const caminho = caminhoEventoSemOrdem(evento, usados);
    const conteudo = gerarConteudoEvento(evento, 'sem ordem');
    arquivosEventos.push({ caminhoRelativo: caminho, conteudo });
    metaArquivos.push({ caminho, evento, posicionado: false });
  }

  const indiceConteudo = gerarIndice(dados, metaArquivos);

  return {
    arquivos: [
      { caminhoRelativo: '00_ROTEIRO.md', conteudo: indiceConteudo },
      ...arquivosEventos,
    ],
  };
}
