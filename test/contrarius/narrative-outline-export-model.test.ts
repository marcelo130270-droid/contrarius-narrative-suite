import { describe, expect, it } from 'vitest';
import {
  gerarMarkdownRoteiroNarrativo,
  type DadosExportacaoRoteiroNarrativo,
  type EventoExportacaoNarrativa,
  type ProblemaExportacaoNarrativa,
} from '../../src/contrarius/narrative-outline-export-model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEvento(
  overrides: Partial<EventoExportacaoNarrativa> = {},
): EventoExportacaoNarrativa {
  return {
    chave: 'evento:05_Eventos/E-001.md:E-001',
    id: 'E-001',
    titulo: 'Evento Um',
    filePath: '05_Eventos/E-001.md',
    livro: 'Livro 1',
    ordemNarrativa: 10,
    capitulo: 'Capítulo 1',
    cena: 'Cena 1',
    ...overrides,
  };
}

function makeProblema(
  overrides: Partial<ProblemaExportacaoNarrativa> = {},
): ProblemaExportacaoNarrativa {
  return {
    nivel: 'aviso',
    mensagem: 'Mensagem de aviso',
    relacionados: [],
    ...overrides,
  };
}

function makeDados(
  overrides: Partial<DadosExportacaoRoteiroNarrativo> = {},
): DadosExportacaoRoteiroNarrativo {
  return {
    titulo: 'Roteiro narrativo',
    filtroLivro: 'Todos os livros',
    busca: '',
    geradoEm: '2026-07-04 10:00',
    eventosPosicionados: [],
    eventosSemOrdem: [],
    problemas: [],
    ...overrides,
  };
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('gerarMarkdownRoteiroNarrativo', () => {
  it('1. exportação vazia', () => {
    const md = gerarMarkdownRoteiroNarrativo(makeDados());
    expect(md).toContain('## Eventos posicionados');
    expect(md).toContain('_Nenhum evento posicionado._');
    expect(md).toContain('## Eventos sem ordem_narrativa');
    expect(md).toContain('_Nenhum evento sem ordem narrativa._');
    expect(md).not.toContain('## Problemas');
  });

  it('2. cabeçalho', () => {
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ titulo: 'Meu Roteiro' }));
    expect(md).toContain('# Meu Roteiro');
  });

  it('3. filtro de livro', () => {
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ filtroLivro: 'Livro Alpha' }));
    expect(md).toContain('- Filtro de livro: Livro Alpha');
  });

  it('4. busca vazia', () => {
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ busca: '' }));
    expect(md).toContain('- Busca ativa: nenhuma');
  });

  it('5. busca ativa', () => {
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ busca: 'minha busca' }));
    expect(md).toContain('- Busca ativa: minha busca');
  });

  it('6. evento posicionado', () => {
    const e = makeEvento({ ordemNarrativa: 10 });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e] }));
    expect(md).toContain('- 10 —');
    expect(md).toContain('`E-001`');
  });

  it('7. agrupamento por livro', () => {
    const e1 = makeEvento({ chave: 'c1', id: 'E-001', livro: 'Livro A', capitulo: 'Cap 1', cena: 'Cena 1', ordemNarrativa: 10 });
    const e2 = makeEvento({ chave: 'c2', id: 'E-002', livro: 'Livro B', capitulo: 'Cap 1', cena: 'Cena 1', ordemNarrativa: 20 });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e1, e2] }));
    expect(md).toContain('### Livro A');
    expect(md).toContain('### Livro B');
    const posA = md.indexOf('### Livro A');
    const posB = md.indexOf('### Livro B');
    expect(posA).toBeLessThan(posB);
  });

  it('8. agrupamento por capítulo', () => {
    const e1 = makeEvento({ chave: 'c1', id: 'E-001', capitulo: 'Capítulo 1', cena: 'Cena 1', ordemNarrativa: 10 });
    const e2 = makeEvento({ chave: 'c2', id: 'E-002', capitulo: 'Capítulo 2', cena: 'Cena 1', ordemNarrativa: 20 });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e1, e2] }));
    expect(md).toContain('#### Capítulo 1');
    expect(md).toContain('#### Capítulo 2');
  });

  it('9. agrupamento por cena', () => {
    const e1 = makeEvento({ chave: 'c1', id: 'E-001', cena: 'Abertura', ordemNarrativa: 10 });
    const e2 = makeEvento({ chave: 'c2', id: 'E-002', cena: 'Clímax', ordemNarrativa: 20 });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e1, e2] }));
    expect(md).toContain('##### Abertura');
    expect(md).toContain('##### Clímax');
  });

  it('10. sem livro', () => {
    const e = makeEvento({ livro: '' });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e] }));
    expect(md).toContain('### Sem livro');
  });

  it('11. sem capítulo', () => {
    const e = makeEvento({ capitulo: '' });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e] }));
    expect(md).toContain('#### Sem capítulo');
  });

  it('12. sem cena', () => {
    const e = makeEvento({ cena: '' });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e] }));
    expect(md).toContain('##### Sem cena');
  });

  it('12b. sem cena com mistura', () => {
    const e1 = makeEvento({ chave: 'c1', id: 'E-001', cena: 'Cena A', ordemNarrativa: 10 });
    const e2 = makeEvento({ chave: 'c2', id: 'E-002', cena: '', ordemNarrativa: 20 });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e1, e2] }));
    expect(md).toContain('##### Cena A');
    expect(md).toContain('##### Sem cena');
  });

  it('13. eventos sem ordem', () => {
    const e = makeEvento({ id: 'E-X', titulo: 'Evento X', ordemNarrativa: null });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosSemOrdem: [e] }));
    expect(md).toContain('## Eventos sem ordem_narrativa');
    expect(md).toContain('`E-X`');
    expect(md).not.toContain('_Nenhum evento sem ordem narrativa._');
  });

  it('14. seção de problemas ausente quando vazia', () => {
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ problemas: [] }));
    expect(md).not.toContain('## Problemas');
  });

  it('14b. seção de problemas presente quando há problemas', () => {
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ problemas: [makeProblema()] }));
    expect(md).toContain('## Problemas');
  });

  it('15. aviso', () => {
    const p = makeProblema({ nivel: 'aviso', mensagem: 'Ordem duplicada' });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ problemas: [p] }));
    expect(md).toContain('- AVISO — Ordem duplicada');
  });

  it('16. erro', () => {
    const p = makeProblema({ nivel: 'erro', mensagem: 'Ciclo detectado' });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ problemas: [p] }));
    expect(md).toContain('- ERRO — Ciclo detectado');
  });

  it('17. link Obsidian com caminho .md', () => {
    const e = makeEvento({ filePath: '05_Eventos/E-001.md', titulo: 'Evento Um' });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e] }));
    expect(md).toContain('[[05_Eventos/E-001|Evento Um]]');
    expect(md).not.toContain('E-001.md|');
  });

  it('18. caminho sem .md', () => {
    const e = makeEvento({ filePath: '05_Eventos/E-001', titulo: 'Evento Um' });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e] }));
    expect(md).toContain('[[05_Eventos/E-001|Evento Um]]');
  });

  it('19. alias com pipe', () => {
    const e = makeEvento({ titulo: 'Evento | Pipe' });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e] }));
    // Separator | between path and alias must be present; alias pipe must be escaped
    expect(md).toContain('[[05_Eventos/E-001|Evento \\| Pipe]]');
    expect(md).toContain('Evento \\| Pipe');
    // No raw (unescaped) pipe in the alias portion
    expect(md).not.toContain('[[05_Eventos/E-001|Evento | Pipe]]');
  });

  it('20. título vazio', () => {
    const e = makeEvento({ titulo: '' });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e] }));
    expect(md).toContain('Evento sem título');
  });

  it('21. id vazio', () => {
    const e = makeEvento({ id: '' });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e] }));
    expect(md).toContain('`sem ID`');
  });

  it('22. caminho vazio', () => {
    const e = makeEvento({ filePath: '', titulo: 'Sem Caminho', id: 'E-X' });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e] }));
    expect(md).toContain('Sem Caminho');
    expect(md).not.toContain('[[');
  });

  it('23. ordem zero', () => {
    const e = makeEvento({ ordemNarrativa: 0 });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e] }));
    expect(md).toContain('- 0 —');
    // Must not render order 0 as "sem ordem" in the bullet
    expect(md).not.toContain('- sem ordem —');
  });

  it('24. ordem negativa', () => {
    const e = makeEvento({ ordemNarrativa: -5 });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e] }));
    expect(md).toContain('- -5 —');
  });

  it('25. Unicode', () => {
    const e = makeEvento({
      titulo: 'Événement Ñoño 世界',
      livro: 'Livré Ação',
      capitulo: 'Capítulo Über',
      cena: 'Cena αβγ',
    });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e] }));
    expect(md).toContain('Événement Ñoño 世界');
    expect(md).toContain('Livré Ação');
    expect(md).toContain('Capítulo Über');
    expect(md).toContain('Cena αβγ');
  });

  it('26. preservação da ordem dos eventos', () => {
    const e1 = makeEvento({ chave: 'c1', id: 'E-Z', titulo: 'Z Evento', ordemNarrativa: 30, cena: 'Cena 1' });
    const e2 = makeEvento({ chave: 'c2', id: 'E-A', titulo: 'A Evento', ordemNarrativa: 10, cena: 'Cena 1' });
    const md = gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: [e1, e2] }));
    const posZ = md.indexOf('E-Z');
    const posA = md.indexOf('E-A');
    expect(posZ).toBeLessThan(posA);
  });

  it('27. entradas não mutadas', () => {
    const posicionados: EventoExportacaoNarrativa[] = [makeEvento()];
    const semOrdem: EventoExportacaoNarrativa[] = [makeEvento({ chave: 'c2', id: 'E-002', ordemNarrativa: null })];
    const problemas: ProblemaExportacaoNarrativa[] = [makeProblema()];
    const copiaPosicionados = [...posicionados];
    const copiaSemOrdem = [...semOrdem];
    const copiaProblemas = [...problemas];

    gerarMarkdownRoteiroNarrativo(makeDados({ eventosPosicionados: posicionados, eventosSemOrdem: semOrdem, problemas }));

    expect(posicionados).toEqual(copiaPosicionados);
    expect(semOrdem).toEqual(copiaSemOrdem);
    expect(problemas).toEqual(copiaProblemas);
  });

  it('28. chamadas repetidas equivalentes', () => {
    const dados = makeDados({
      eventosPosicionados: [makeEvento()],
      eventosSemOrdem: [makeEvento({ chave: 'c2', id: 'E-002', ordemNarrativa: null })],
      problemas: [makeProblema()],
    });
    const r1 = gerarMarkdownRoteiroNarrativo(dados);
    const r2 = gerarMarkdownRoteiroNarrativo(dados);
    expect(r1).toBe(r2);
  });

  it('29. nenhuma string undefined', () => {
    const dados = makeDados({
      eventosPosicionados: [makeEvento()],
      eventosSemOrdem: [makeEvento({ chave: 'c2', id: 'E-002', ordemNarrativa: null })],
      problemas: [makeProblema()],
    });
    const md = gerarMarkdownRoteiroNarrativo(dados);
    expect(md).not.toContain('undefined');
  });

  it('30. nenhuma string [object Object]', () => {
    const dados = makeDados({
      eventosPosicionados: [makeEvento()],
      eventosSemOrdem: [makeEvento({ chave: 'c2', id: 'E-002', ordemNarrativa: null })],
      problemas: [makeProblema()],
    });
    const md = gerarMarkdownRoteiroNarrativo(dados);
    expect(md).not.toContain('[object Object]');
  });

  it('31. arquivo termina com quebra de linha', () => {
    const md = gerarMarkdownRoteiroNarrativo(makeDados());
    expect(md.endsWith('\n')).toBe(true);
  });

  it('31b. termina com quebra de linha mesmo com problemas', () => {
    const md = gerarMarkdownRoteiroNarrativo(
      makeDados({ problemas: [makeProblema()] }),
    );
    expect(md.endsWith('\n')).toBe(true);
  });

  it('31c. termina com quebra de linha com eventos posicionados', () => {
    const md = gerarMarkdownRoteiroNarrativo(
      makeDados({ eventosPosicionados: [makeEvento()] }),
    );
    expect(md.endsWith('\n')).toBe(true);
  });
});
