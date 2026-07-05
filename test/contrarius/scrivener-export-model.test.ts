import { describe, expect, it } from 'vitest';
import {
  gerarPacoteScrivenerMarkdown,
  type DadosPacoteScrivener,
  type EventoExportacaoScrivener,
  type ProblemaExportacaoScrivener,
} from '../../src/contrarius/scrivener-export-model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEvento(
  overrides: Partial<EventoExportacaoScrivener> = {},
): EventoExportacaoScrivener {
  return {
    chave: 'evento:05_Eventos/E-001.md:E-001',
    id: 'E-001',
    titulo: 'Cena inicial em Acre',
    filePath: '05_Eventos/E-001.md',
    livro: 'Livro 1',
    ordemNarrativa: 10,
    capitulo: 'Capítulo 1',
    cena: 'Abertura',
    ...overrides,
  };
}

function makeProblema(
  overrides: Partial<ProblemaExportacaoScrivener> = {},
): ProblemaExportacaoScrivener {
  return {
    nivel: 'aviso',
    mensagem: 'Mensagem de aviso',
    relacionados: [],
    ...overrides,
  };
}

function makeDados(
  overrides: Partial<DadosPacoteScrivener> = {},
): DadosPacoteScrivener {
  return {
    titulo: 'Pacote Scrivener',
    filtroLivro: 'Todos os livros',
    busca: '',
    geradoEm: '2026-07-05 10:00',
    eventosPosicionados: [],
    eventosSemOrdem: [],
    problemas: [],
    ...overrides,
  };
}

function roteiro(pacote: ReturnType<typeof gerarPacoteScrivenerMarkdown>): string {
  const f = pacote.arquivos.find((a) => a.caminhoRelativo === '00_ROTEIRO.md');
  return f?.conteudo ?? '';
}

const ARQUIVOS_CONTROLE = new Set([
  '00_ROTEIRO.md',
  'contrarius-manifest.json',
  'README_IMPORTACAO_SCRIVENER.md',
]);

function arquivosEvento(
  pacote: ReturnType<typeof gerarPacoteScrivenerMarkdown>,
): ReturnType<typeof gerarPacoteScrivenerMarkdown>['arquivos'] {
  return pacote.arquivos.filter((a) => !ARQUIVOS_CONTROLE.has(a.caminhoRelativo));
}

interface ArquivoManifestoEntry {
  tipo: string;
  caminhoRelativo: string;
  chave: string;
  id: string;
  titulo: string;
  filePath: string;
  livro: string;
  capitulo: string;
  cena: string;
  ordemNarrativa: number | null;
}

interface ProblemaManifestoEntry {
  nivel: string;
  mensagem: string;
  relacionados: string[];
}

interface ManifestoParseado {
  tipo: string;
  versao: number;
  titulo: string;
  filtroLivro: string;
  busca: string;
  geradoEm: string;
  totais: {
    eventosPosicionados: number;
    eventosSemOrdem: number;
    problemas: number;
  };
  arquivos: ArquivoManifestoEntry[];
  problemas: ProblemaManifestoEntry[];
}

function parseManifesto(
  pacote: ReturnType<typeof gerarPacoteScrivenerMarkdown>,
): ManifestoParseado {
  const f = pacote.arquivos.find((a) => a.caminhoRelativo === 'contrarius-manifest.json');
  return JSON.parse(f?.conteudo ?? '{}') as ManifestoParseado;
}

function readmeConteudo(pacote: ReturnType<typeof gerarPacoteScrivenerMarkdown>): string {
  const f = pacote.arquivos.find((a) => a.caminhoRelativo === 'README_IMPORTACAO_SCRIVENER.md');
  return f?.conteudo ?? '';
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('gerarPacoteScrivenerMarkdown', () => {
  it('1. pacote vazio', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados());
    expect(pacote.arquivos.length).toBe(3);
    expect(pacote.arquivos[0].caminhoRelativo).toBe('00_ROTEIRO.md');
  });

  it('2. cria 00_ROTEIRO.md', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados());
    const caminhos = pacote.arquivos.map((a) => a.caminhoRelativo);
    expect(caminhos).toContain('00_ROTEIRO.md');
  });

  it('3. cabeçalho com filtro', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ filtroLivro: 'Livro Alpha' }));
    expect(roteiro(pacote)).toContain('- Filtro de livro: Livro Alpha');
  });

  it('4. busca vazia', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ busca: '' }));
    expect(roteiro(pacote)).toContain('- Busca ativa: nenhuma');
  });

  it('5. busca ativa', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ busca: 'minha busca' }));
    expect(roteiro(pacote)).toContain('- Busca ativa: minha busca');
  });

  it('6. contagens', () => {
    const e1 = makeEvento({ chave: 'c1' });
    const e2 = makeEvento({ chave: 'c2', ordemNarrativa: null });
    const pacote = gerarPacoteScrivenerMarkdown(
      makeDados({ eventosPosicionados: [e1], eventosSemOrdem: [e2] }),
    );
    const idx = roteiro(pacote);
    expect(idx).toContain('- Eventos posicionados: 1');
    expect(idx).toContain('- Eventos sem ordem: 1');
  });

  it('7. evento posicionado gera arquivo', () => {
    const pacote = gerarPacoteScrivenerMarkdown(
      makeDados({ eventosPosicionados: [makeEvento()] }),
    );
    expect(arquivosEvento(pacote).length).toBe(1);
  });

  it('8. evento sem ordem gera arquivo em _sem_ordem', () => {
    const e = makeEvento({ ordemNarrativa: null });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosSemOrdem: [e] }));
    const arq = arquivosEvento(pacote)[0];
    expect(arq?.caminhoRelativo.startsWith('_sem_ordem/')).toBe(true);
  });

  it('9. estrutura livro/capítulo', () => {
    const e = makeEvento({ livro: 'Livro A', capitulo: 'Cap 1', ordemNarrativa: 5 });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [e] }));
    const arq = arquivosEvento(pacote)[0];
    expect(arq?.caminhoRelativo).toMatch(/^Livro-A\/Cap-1\//);
  });

  it('10. slug seguro', () => {
    const e = makeEvento({ id: 'E-001', titulo: 'Cena: "Teste"' });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [e] }));
    const caminho = arquivosEvento(pacote)[0]?.caminhoRelativo ?? '';
    expect(caminho).not.toMatch(/[<>:"|?*]/);
  });

  it('11. remove caracteres inválidos Windows', () => {
    const e = makeEvento({ livro: 'Livro:1|Dois', capitulo: 'Cap*1' });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [e] }));
    const caminho = arquivosEvento(pacote)[0]?.caminhoRelativo ?? '';
    expect(caminho).not.toMatch(/[<>:"|?*\\]/);
    expect(caminho).toContain('Livro');
  });

  it('12. preserva Unicode', () => {
    const e = makeEvento({ livro: 'Livré Ação', capitulo: 'Capítulo Ü' });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [e] }));
    const caminho = arquivosEvento(pacote)[0]?.caminhoRelativo ?? '';
    expect(caminho).toContain('Livré-Ação');
    expect(caminho).toContain('Capítulo-Ü');
  });

  it('13. desduplica nomes', () => {
    const e1 = makeEvento({ chave: 'c1', id: 'E-001', titulo: 'Duplicado', ordemNarrativa: 10 });
    const e2 = makeEvento({ chave: 'c2', id: 'E-001', titulo: 'Duplicado', ordemNarrativa: 10 });
    const pacote = gerarPacoteScrivenerMarkdown(
      makeDados({ eventosPosicionados: [e1, e2] }),
    );
    const caminhos = arquivosEvento(pacote).map((a) => a.caminhoRelativo);
    expect(new Set(caminhos).size).toBe(caminhos.length);
    expect(caminhos.some((c) => c.endsWith('-02.md'))).toBe(true);
  });

  it('14. ordem zero', () => {
    const e = makeEvento({ ordemNarrativa: 0 });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [e] }));
    const arq = arquivosEvento(pacote)[0];
    expect(arq?.caminhoRelativo).toContain('000-');
    expect(arq?.conteudo).toContain('- Ordem narrativa: 0');
  });

  it('15. ordem negativa', () => {
    const e = makeEvento({ ordemNarrativa: -5 });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [e] }));
    const arq = arquivosEvento(pacote)[0];
    expect(arq).toBeDefined();
    expect(arq?.conteudo).toContain('- Ordem narrativa: -5');
  });

  it('16. ordem null', () => {
    const e = makeEvento({ ordemNarrativa: null });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosSemOrdem: [e] }));
    const arq = arquivosEvento(pacote)[0];
    expect(arq?.conteudo).toContain('- Ordem narrativa: sem ordem');
  });

  it('17. título vazio', () => {
    const e = makeEvento({ titulo: '' });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [e] }));
    const arq = arquivosEvento(pacote)[0];
    expect(arq?.conteudo).toContain('# Evento sem título');
  });

  it('18. id vazio', () => {
    const e = makeEvento({ id: '' });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [e] }));
    const arq = arquivosEvento(pacote)[0];
    expect(arq?.conteudo).toContain('- ID: sem ID');
  });

  it('19. caminho vazio', () => {
    const e = makeEvento({ filePath: '' });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [e] }));
    const arq = arquivosEvento(pacote)[0];
    expect(arq?.conteudo).toContain('caminho não informado');
    expect(arq?.conteudo).not.toContain('[[');
  });

  it('20. wikilink sem .md', () => {
    const e = makeEvento({ filePath: '05_Eventos/E-001.md' });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [e] }));
    const arq = arquivosEvento(pacote)[0];
    expect(arq?.conteudo).toContain('[[05_Eventos/E-001|');
    expect(arq?.conteudo).not.toContain('E-001.md|');
  });

  it('21. alias com pipe escapado', () => {
    const e = makeEvento({ titulo: 'Evento | Pipe' });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [e] }));
    const arq = arquivosEvento(pacote)[0];
    expect(arq?.conteudo).toContain('Evento \\| Pipe');
    expect(arq?.conteudo).not.toContain('[[05_Eventos/E-001|Evento | Pipe]]');
  });

  it('22. problemas no índice', () => {
    const p = makeProblema({ mensagem: 'Erro grave' });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ problemas: [p] }));
    expect(roteiro(pacote)).toContain('## Problemas');
    expect(roteiro(pacote)).toContain('Erro grave');
  });

  it('23. aviso', () => {
    const p = makeProblema({ nivel: 'aviso', mensagem: 'Ordem duplicada' });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ problemas: [p] }));
    expect(roteiro(pacote)).toContain('- AVISO — Ordem duplicada');
  });

  it('24. erro', () => {
    const p = makeProblema({ nivel: 'erro', mensagem: 'Ciclo detectado' });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ problemas: [p] }));
    expect(roteiro(pacote)).toContain('- ERRO — Ciclo detectado');
  });

  it('25. links relativos no índice', () => {
    const e = makeEvento({ titulo: 'Evento Um' });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [e] }));
    const idx = roteiro(pacote);
    expect(idx).toMatch(/\[Evento Um\]\([^)]+\.md\)/);
  });

  it('26. caminhos usam /', () => {
    const e = makeEvento();
    const pacote = gerarPacoteScrivenerMarkdown(
      makeDados({ eventosPosicionados: [e], eventosSemOrdem: [makeEvento({ chave: 'c2', ordemNarrativa: null })] }),
    );
    for (const arq of pacote.arquivos) {
      expect(arq.caminhoRelativo).not.toContain('\\');
    }
  });

  it('27. caminhos não começam com /', () => {
    const e1 = makeEvento({ chave: 'c1' });
    const e2 = makeEvento({ chave: 'c2', ordemNarrativa: null });
    const pacote = gerarPacoteScrivenerMarkdown(
      makeDados({ eventosPosicionados: [e1], eventosSemOrdem: [e2] }),
    );
    for (const arq of pacote.arquivos) {
      expect(arq.caminhoRelativo.startsWith('/')).toBe(false);
    }
  });

  it('28. arquivos terminam com quebra de linha', () => {
    const e1 = makeEvento({ chave: 'c1' });
    const e2 = makeEvento({ chave: 'c2', ordemNarrativa: null });
    const pacote = gerarPacoteScrivenerMarkdown(
      makeDados({
        eventosPosicionados: [e1],
        eventosSemOrdem: [e2],
        problemas: [makeProblema()],
      }),
    );
    for (const arq of pacote.arquivos) {
      expect(arq.conteudo.endsWith('\n')).toBe(true);
    }
  });

  it('29. entradas não mutadas', () => {
    const posicionados: EventoExportacaoScrivener[] = [makeEvento({ chave: 'c1' })];
    const semOrdem: EventoExportacaoScrivener[] = [makeEvento({ chave: 'c2', ordemNarrativa: null })];
    const problemas: ProblemaExportacaoScrivener[] = [makeProblema()];
    const copiaPosicionados = [...posicionados];
    const copiaSemOrdem = [...semOrdem];
    const copiaProblemas = [...problemas];

    gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: posicionados, eventosSemOrdem: semOrdem, problemas }));

    expect(posicionados).toEqual(copiaPosicionados);
    expect(semOrdem).toEqual(copiaSemOrdem);
    expect(problemas).toEqual(copiaProblemas);
  });

  it('30. chamadas repetidas equivalentes', () => {
    const dados = makeDados({
      eventosPosicionados: [makeEvento({ chave: 'c1' })],
      eventosSemOrdem: [makeEvento({ chave: 'c2', ordemNarrativa: null })],
      problemas: [makeProblema()],
    });
    const r1 = gerarPacoteScrivenerMarkdown(dados);
    const r2 = gerarPacoteScrivenerMarkdown(dados);
    expect(r1.arquivos.length).toBe(r2.arquivos.length);
    for (let i = 0; i < r1.arquivos.length; i++) {
      expect(r1.arquivos[i]?.caminhoRelativo).toBe(r2.arquivos[i]?.caminhoRelativo);
      expect(r1.arquivos[i]?.conteudo).toBe(r2.arquivos[i]?.conteudo);
    }
  });

  it('31. nenhuma string undefined', () => {
    const dados = makeDados({
      eventosPosicionados: [makeEvento({ chave: 'c1' })],
      eventosSemOrdem: [makeEvento({ chave: 'c2', ordemNarrativa: null })],
      problemas: [makeProblema()],
    });
    const pacote = gerarPacoteScrivenerMarkdown(dados);
    for (const arq of pacote.arquivos) {
      expect(arq.conteudo).not.toContain('undefined');
      expect(arq.caminhoRelativo).not.toContain('undefined');
    }
  });

  it('32. nenhuma string [object Object]', () => {
    const dados = makeDados({
      eventosPosicionados: [makeEvento({ chave: 'c1' })],
      eventosSemOrdem: [makeEvento({ chave: 'c2', ordemNarrativa: null })],
      problemas: [makeProblema()],
    });
    const pacote = gerarPacoteScrivenerMarkdown(dados);
    for (const arq of pacote.arquivos) {
      expect(arq.conteudo).not.toContain('[object Object]');
    }
  });

  it('33. placeholder de sinopse presente', () => {
    const e = makeEvento();
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [e] }));
    const arq = arquivosEvento(pacote)[0];
    expect(arq?.conteudo).toContain('[preencher no Scrivener]');
  });

  it('34. eventos preservam ordem recebida', () => {
    const e1 = makeEvento({ chave: 'c1', id: 'E-Z', titulo: 'Z Evento', ordemNarrativa: 30 });
    const e2 = makeEvento({ chave: 'c2', id: 'E-A', titulo: 'A Evento', ordemNarrativa: 10 });
    const pacote = gerarPacoteScrivenerMarkdown(
      makeDados({ eventosPosicionados: [e1, e2] }),
    );
    const eventos = arquivosEvento(pacote);
    const posZ = eventos[0]?.caminhoRelativo ?? '';
    const posA = eventos[1]?.caminhoRelativo ?? '';
    expect(posZ).toContain('e-z');
    expect(posA).toContain('e-a');
  });

  // ─── Manifesto e README (Fase 3C.3) ─────────────────────────────────────────

  it('M1. pacote inclui contrarius-manifest.json', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados());
    const caminhos = pacote.arquivos.map((a) => a.caminhoRelativo);
    expect(caminhos).toContain('contrarius-manifest.json');
  });

  it('M2. manifesto é JSON parseável', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados());
    expect(() => parseManifesto(pacote)).not.toThrow();
  });

  it('M3. manifesto tem tipo', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados());
    expect(parseManifesto(pacote).tipo).toBe('contrarius-scrivener-export');
  });

  it('M4. manifesto tem versao', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados());
    expect(parseManifesto(pacote).versao).toBe(1);
  });

  it('M5. manifesto tem totais corretos', () => {
    const dados = makeDados({
      eventosPosicionados: [makeEvento({ chave: 'c1' }), makeEvento({ chave: 'c2' })],
      eventosSemOrdem: [makeEvento({ chave: 'c3', ordemNarrativa: null })],
      problemas: [makeProblema()],
    });
    const m = parseManifesto(gerarPacoteScrivenerMarkdown(dados));
    expect(m.totais.eventosPosicionados).toBe(2);
    expect(m.totais.eventosSemOrdem).toBe(1);
    expect(m.totais.problemas).toBe(1);
  });

  it('M6. manifesto inclui evento posicionado', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [makeEvento()] }));
    const m = parseManifesto(pacote);
    expect(m.arquivos.some((a) => a.tipo === 'evento_posicionado')).toBe(true);
  });

  it('M7. manifesto inclui evento sem ordem', () => {
    const e = makeEvento({ ordemNarrativa: null });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosSemOrdem: [e] }));
    const m = parseManifesto(pacote);
    expect(m.arquivos.some((a) => a.tipo === 'evento_sem_ordem')).toBe(true);
  });

  it('M8. manifesto preserva ordem dos eventos', () => {
    const e1 = makeEvento({ chave: 'c1', id: 'E-Z', titulo: 'Z Evento', ordemNarrativa: 30 });
    const e2 = makeEvento({ chave: 'c2', id: 'E-A', titulo: 'A Evento', ordemNarrativa: 10 });
    const m = parseManifesto(
      gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [e1, e2] })),
    );
    expect(m.arquivos[0]?.id).toBe('E-Z');
    expect(m.arquivos[1]?.id).toBe('E-A');
  });

  it('M9. manifesto usa caminho relativo igual ao arquivo gerado', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [makeEvento()] }));
    const m = parseManifesto(pacote);
    expect(m.arquivos[0]?.caminhoRelativo).toBe(arquivosEvento(pacote)[0]?.caminhoRelativo);
  });

  it('M10. manifesto inclui problemas', () => {
    const p = makeProblema({ mensagem: 'Teste de problema' });
    const m = parseManifesto(gerarPacoteScrivenerMarkdown(makeDados({ problemas: [p] })));
    expect(m.problemas.length).toBe(1);
    expect(m.problemas[0]?.mensagem).toBe('Teste de problema');
  });

  it('M11. manifesto preserva Unicode', () => {
    const e = makeEvento({ titulo: 'Cena em Ação', livro: 'Livré Três' });
    const pacote = gerarPacoteScrivenerMarkdown(makeDados({ eventosPosicionados: [e] }));
    const conteudo =
      pacote.arquivos.find((a) => a.caminhoRelativo === 'contrarius-manifest.json')?.conteudo ?? '';
    expect(conteudo).toContain('Cena em Ação');
    expect(conteudo).toContain('Livré Três');
  });

  it('M12. manifesto usa null para ordem ausente', () => {
    const e = makeEvento({ ordemNarrativa: null });
    const m = parseManifesto(gerarPacoteScrivenerMarkdown(makeDados({ eventosSemOrdem: [e] })));
    expect(m.arquivos[0]?.ordemNarrativa).toBeNull();
  });

  it('M13. manifesto não contém undefined', () => {
    const dados = makeDados({
      eventosPosicionados: [makeEvento({ chave: 'c1' })],
      eventosSemOrdem: [makeEvento({ chave: 'c2', ordemNarrativa: null })],
      problemas: [makeProblema()],
    });
    const pacote = gerarPacoteScrivenerMarkdown(dados);
    const conteudo =
      pacote.arquivos.find((a) => a.caminhoRelativo === 'contrarius-manifest.json')?.conteudo ?? '';
    expect(conteudo).not.toContain('undefined');
  });

  it('M14. manifesto não contém [object Object]', () => {
    const dados = makeDados({
      eventosPosicionados: [makeEvento({ chave: 'c1' })],
      eventosSemOrdem: [makeEvento({ chave: 'c2', ordemNarrativa: null })],
      problemas: [makeProblema()],
    });
    const pacote = gerarPacoteScrivenerMarkdown(dados);
    const conteudo =
      pacote.arquivos.find((a) => a.caminhoRelativo === 'contrarius-manifest.json')?.conteudo ?? '';
    expect(conteudo).not.toContain('[object Object]');
  });

  it('M15. pacote inclui README_IMPORTACAO_SCRIVENER.md', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados());
    expect(pacote.arquivos.map((a) => a.caminhoRelativo)).toContain(
      'README_IMPORTACAO_SCRIVENER.md',
    );
  });

  it('M16. README diz que notas originais não foram alteradas', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados());
    expect(readmeConteudo(pacote)).toContain('não foram alteradas');
  });

  it('M17. README menciona manifesto', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados());
    expect(readmeConteudo(pacote)).toContain('contrarius-manifest.json');
  });

  it('M18. README menciona placeholder Scrivener', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados());
    expect(readmeConteudo(pacote)).toContain('[preencher no Scrivener]');
  });

  it('M19. README traz contagens', () => {
    const dados = makeDados({
      eventosPosicionados: [makeEvento({ chave: 'c1' })],
      eventosSemOrdem: [makeEvento({ chave: 'c2', ordemNarrativa: null })],
    });
    const readme = readmeConteudo(gerarPacoteScrivenerMarkdown(dados));
    expect(readme).toContain('Eventos posicionados: 1');
    expect(readme).toContain('Eventos sem ordem: 1');
  });

  it('M20. 00_ROTEIRO.md aponta para manifesto', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados());
    expect(roteiro(pacote)).toContain('contrarius-manifest.json');
  });

  it('M21. 00_ROTEIRO.md aponta para README', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados());
    expect(roteiro(pacote)).toContain('README_IMPORTACAO_SCRIVENER.md');
  });

  it('M22. todos os arquivos continuam terminando com quebra de linha', () => {
    const pacote = gerarPacoteScrivenerMarkdown(
      makeDados({
        eventosPosicionados: [makeEvento({ chave: 'c1' })],
        eventosSemOrdem: [makeEvento({ chave: 'c2', ordemNarrativa: null })],
        problemas: [makeProblema()],
      }),
    );
    for (const arq of pacote.arquivos) {
      expect(arq.conteudo.endsWith('\n')).toBe(true);
    }
  });

  it('M23. chamadas repetidas continuam equivalentes', () => {
    const dados = makeDados({
      eventosPosicionados: [makeEvento({ chave: 'c1' })],
      eventosSemOrdem: [makeEvento({ chave: 'c2', ordemNarrativa: null })],
      problemas: [makeProblema()],
    });
    const r1 = gerarPacoteScrivenerMarkdown(dados);
    const r2 = gerarPacoteScrivenerMarkdown(dados);
    expect(r1.arquivos.length).toBe(r2.arquivos.length);
    for (let i = 0; i < r1.arquivos.length; i++) {
      expect(r1.arquivos[i]?.caminhoRelativo).toBe(r2.arquivos[i]?.caminhoRelativo);
      expect(r1.arquivos[i]?.conteudo).toBe(r2.arquivos[i]?.conteudo);
    }
  });

  it('M24. entradas continuam não mutadas', () => {
    const posicionados: EventoExportacaoScrivener[] = [makeEvento({ chave: 'c1' })];
    const semOrdem: EventoExportacaoScrivener[] = [
      makeEvento({ chave: 'c2', ordemNarrativa: null }),
    ];
    const problemas: ProblemaExportacaoScrivener[] = [makeProblema()];
    const copiaPosicionados = posicionados.map((e) => ({ ...e }));
    const copiaSemOrdem = semOrdem.map((e) => ({ ...e }));
    const copiaProblemas = problemas.map((p) => ({ ...p }));
    gerarPacoteScrivenerMarkdown(
      makeDados({ eventosPosicionados: posicionados, eventosSemOrdem: semOrdem, problemas }),
    );
    expect(posicionados).toEqual(copiaPosicionados);
    expect(semOrdem).toEqual(copiaSemOrdem);
    expect(problemas).toEqual(copiaProblemas);
  });
});
