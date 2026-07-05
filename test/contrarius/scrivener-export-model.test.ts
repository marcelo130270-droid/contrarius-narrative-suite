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

function arquivosEvento(
  pacote: ReturnType<typeof gerarPacoteScrivenerMarkdown>,
): ReturnType<typeof gerarPacoteScrivenerMarkdown>['arquivos'] {
  return pacote.arquivos.filter((a) => a.caminhoRelativo !== '00_ROTEIRO.md');
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('gerarPacoteScrivenerMarkdown', () => {
  it('1. pacote vazio', () => {
    const pacote = gerarPacoteScrivenerMarkdown(makeDados());
    expect(pacote.arquivos.length).toBe(1);
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
});
