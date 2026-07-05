import { describe, expect, it } from 'vitest';
import {
  compararPacoteScrivenerRetornado,
  type ArquivoPacoteScrivenerRetornado,
  type DadosComparacaoPacoteScrivener,
} from '../../src/contrarius/scrivener-return-compare-model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeManifesto(overrides: Record<string, unknown> = {}): string {
  return (
    JSON.stringify(
      { tipo: 'contrarius-scrivener-export', arquivos: [], ...overrides },
      null,
      2,
    ) + '\n'
  );
}

function makeDados(
  manifestoJson: string,
  arquivos: readonly ArquivoPacoteScrivenerRetornado[] = [],
  geradoEm = '2026-07-05 10:00',
): DadosComparacaoPacoteScrivener {
  return { manifestoJson, arquivos, geradoEm };
}

function makeManifestoComEvento(
  caminho = 'Livro1/010-evento.md',
  overridesEntrada: Record<string, unknown> = {},
): string {
  return (
    JSON.stringify(
      {
        tipo: 'contrarius-scrivener-export',
        arquivos: [
          {
            caminhoRelativo: caminho,
            id: 'E-001',
            titulo: 'Evento Teste',
            filePath: '05_Eventos/E-001.md',
            ordemNarrativa: 10,
            ...overridesEntrada,
          },
        ],
      },
      null,
      2,
    ) + '\n'
  );
}

const EVENTO_COMPLETO = [
  '# Evento Teste',
  '',
  '- ID: E-001',
  '- Ordem narrativa: 10',
  '',
  '## Sinopse de escrita',
  '',
  'Texto da sinopse.',
  '',
  '## Observações estruturais',
  '',
  'Observações aqui.',
  '',
].join('\n');

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('compararPacoteScrivenerRetornado', () => {
  it('1. manifesto inválido gera erro MANIFESTO_JSON_INVALIDO', () => {
    const r = compararPacoteScrivenerRetornado(makeDados('not json'));
    expect(r.erros.some((e) => e.codigo === 'MANIFESTO_JSON_INVALIDO')).toBe(true);
  });

  it('2. tipo inválido gera erro MANIFESTO_TIPO_INVALIDO e validoParaAnalise false', () => {
    const r = compararPacoteScrivenerRetornado(
      makeDados(JSON.stringify({ tipo: 'outro', arquivos: [] }) + '\n'),
    );
    expect(r.validoParaAnalise).toBe(false);
    expect(r.erros.some((e) => e.codigo === 'MANIFESTO_TIPO_INVALIDO')).toBe(true);
  });

  it('3. manifesto sem array arquivos gera erro MANIFESTO_SEM_ARRAY_ARQUIVOS', () => {
    const r = compararPacoteScrivenerRetornado(
      makeDados(JSON.stringify({ tipo: 'contrarius-scrivener-export' }) + '\n'),
    );
    expect(r.validoParaAnalise).toBe(true);
    expect(r.erros.some((e) => e.codigo === 'MANIFESTO_SEM_ARRAY_ARQUIVOS')).toBe(true);
  });

  it('4. pacote válido mínimo sem eventos gera aviso PACOTE_VAZIO', () => {
    const r = compararPacoteScrivenerRetornado(makeDados(makeManifesto()));
    expect(r.validoParaAnalise).toBe(true);
    expect(r.avisos.some((a) => a.codigo === 'PACOTE_VAZIO')).toBe(true);
  });

  it('5. arquivo listado ausente gera erro ARQUIVO_AUSENTE', () => {
    const r = compararPacoteScrivenerRetornado(makeDados(makeManifestoComEvento('ev.md'), []));
    expect(r.erros.some((e) => e.codigo === 'ARQUIVO_AUSENTE')).toBe(true);
  });

  it('6. caminho duplicado nos arquivos lidos gera erro CAMINHO_DUPLICADO_ARQUIVOS', () => {
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifesto(), [
        { caminhoRelativo: 'ev.md', conteudo: '# X\n' },
        { caminhoRelativo: 'ev.md', conteudo: '# X\n' },
      ]),
    );
    expect(r.erros.some((e) => e.codigo === 'CAMINHO_DUPLICADO_ARQUIVOS')).toBe(true);
  });

  it('7. caminho duplicado no manifesto gera erro CAMINHO_DUPLICADO_MANIFESTO', () => {
    const manifestoJson =
      JSON.stringify({
        tipo: 'contrarius-scrivener-export',
        arquivos: [
          { caminhoRelativo: 'ev.md', id: 'E-001', titulo: 'T', filePath: 'f', ordemNarrativa: 1 },
          { caminhoRelativo: 'ev.md', id: 'E-002', titulo: 'T', filePath: 'f', ordemNarrativa: 2 },
        ],
      }) + '\n';
    const r = compararPacoteScrivenerRetornado(
      makeDados(manifestoJson, [{ caminhoRelativo: 'ev.md', conteudo: '# T\n' }]),
    );
    expect(r.erros.some((e) => e.codigo === 'CAMINHO_DUPLICADO_MANIFESTO')).toBe(true);
  });

  it('8. conteúdo vazio gera erro CONTEUDO_VAZIO', () => {
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [{ caminhoRelativo: 'ev.md', conteudo: '' }]),
    );
    expect(r.erros.some((e) => e.codigo === 'CONTEUDO_VAZIO')).toBe(true);
  });

  it('9. sem quebra final gera erro SEM_QUEBRA_FINAL', () => {
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [
        { caminhoRelativo: 'ev.md', conteudo: '# Evento Teste' },
      ]),
    );
    expect(r.erros.some((e) => e.codigo === 'SEM_QUEBRA_FINAL')).toBe(true);
  });

  it('10. ID divergente gera erro ID_DIVERGENTE', () => {
    const conteudo = [
      '# Evento Teste',
      '',
      '- ID: OUTRO-ID',
      '- Ordem narrativa: 10',
      '',
      '## Sinopse de escrita',
      '',
      'Texto.',
      '',
      '## Observações estruturais',
      '',
      'Obs.',
      '',
    ].join('\n');
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [{ caminhoRelativo: 'ev.md', conteudo }]),
    );
    expect(r.erros.some((e) => e.codigo === 'ID_DIVERGENTE')).toBe(true);
  });

  it('11. caminho original divergente gera erro CAMINHO_ORIGINAL_DIVERGENTE', () => {
    const conteudo = [
      '# Evento Teste',
      '',
      '- ID: E-001',
      '- Ordem narrativa: 10',
      '',
      '## Sinopse de escrita',
      '',
      'Texto.',
      '',
      '## Observações estruturais',
      '',
      '- Caminho original: OUTRO_CAMINHO.md',
      '',
    ].join('\n');
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [{ caminhoRelativo: 'ev.md', conteudo }]),
    );
    expect(r.erros.some((e) => e.codigo === 'CAMINHO_ORIGINAL_DIVERGENTE')).toBe(true);
  });

  it('12. ordem narrativa divergente gera erro ORDEM_DIVERGENTE', () => {
    const conteudo = [
      '# Evento Teste',
      '',
      '- ID: E-001',
      '- Ordem narrativa: 99',
      '',
      '## Sinopse de escrita',
      '',
      'Texto.',
      '',
      '## Observações estruturais',
      '',
      'Obs.',
      '',
    ].join('\n');
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [{ caminhoRelativo: 'ev.md', conteudo }]),
    );
    expect(r.erros.some((e) => e.codigo === 'ORDEM_DIVERGENTE')).toBe(true);
  });

  it('13. arquivo Markdown extra gera aviso ARQUIVO_EXTRA', () => {
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifesto(), [{ caminhoRelativo: 'extra.md', conteudo: '# Extra\n' }]),
    );
    expect(r.avisos.some((a) => a.codigo === 'ARQUIVO_EXTRA')).toBe(true);
  });

  it('14. título H1 diferente gera aviso TITULO_H1_DIVERGENTE', () => {
    const conteudo = [
      '# Título Diferente',
      '',
      '- ID: E-001',
      '- Ordem narrativa: 10',
      '',
      '## Sinopse de escrita',
      '',
      'Texto.',
      '',
      '## Observações estruturais',
      '',
      'Obs.',
      '',
    ].join('\n');
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [{ caminhoRelativo: 'ev.md', conteudo }]),
    );
    expect(r.avisos.some((a) => a.codigo === 'TITULO_H1_DIVERGENTE')).toBe(true);
  });

  it('15. placeholder presente gera aviso PLACEHOLDER_PRESENTE', () => {
    const conteudo = [
      '# Evento Teste',
      '',
      '- ID: E-001',
      '- Ordem narrativa: 10',
      '',
      '## Sinopse de escrita',
      '',
      '[preencher no Scrivener]',
      '',
      '## Observações estruturais',
      '',
      'Obs.',
      '',
    ].join('\n');
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [{ caminhoRelativo: 'ev.md', conteudo }]),
    );
    expect(r.avisos.some((a) => a.codigo === 'PLACEHOLDER_PRESENTE')).toBe(true);
  });

  it('16. sinopse preenchida gera info SINOPSE_PREENCHIDA', () => {
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [
        { caminhoRelativo: 'ev.md', conteudo: EVENTO_COMPLETO },
      ]),
    );
    expect(r.infos.some((i) => i.codigo === 'SINOPSE_PREENCHIDA')).toBe(true);
  });

  it('17. sem seção Sinopse gera aviso SEM_SECAO_SINOPSE', () => {
    const conteudo = [
      '# Evento Teste',
      '',
      '- ID: E-001',
      '- Ordem narrativa: 10',
      '',
      '## Observações estruturais',
      '',
      'Obs.',
      '',
    ].join('\n');
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [{ caminhoRelativo: 'ev.md', conteudo }]),
    );
    expect(r.avisos.some((a) => a.codigo === 'SEM_SECAO_SINOPSE')).toBe(true);
  });

  it('18. sem seção Observações estruturais gera aviso SEM_SECAO_OBSERVACOES', () => {
    const conteudo = [
      '# Evento Teste',
      '',
      '- ID: E-001',
      '- Ordem narrativa: 10',
      '',
      '## Sinopse de escrita',
      '',
      'Texto.',
      '',
    ].join('\n');
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [{ caminhoRelativo: 'ev.md', conteudo }]),
    );
    expect(r.avisos.some((a) => a.codigo === 'SEM_SECAO_OBSERVACOES')).toBe(true);
  });

  it('19. evento sem ordem narrativa no manifesto gera aviso EVENTO_SEM_ORDEM', () => {
    const manifestoJson =
      JSON.stringify({
        tipo: 'contrarius-scrivener-export',
        arquivos: [{ caminhoRelativo: 'ev.md', id: 'E-001', titulo: 'Evento Teste', filePath: 'f' }],
      }) + '\n';
    const r = compararPacoteScrivenerRetornado(
      makeDados(manifestoJson, [{ caminhoRelativo: 'ev.md', conteudo: EVENTO_COMPLETO }]),
    );
    expect(r.avisos.some((a) => a.codigo === 'EVENTO_SEM_ORDEM')).toBe(true);
  });

  it('20. pacote vazio (arquivos: []) gera aviso PACOTE_VAZIO', () => {
    const r = compararPacoteScrivenerRetornado(makeDados(makeManifesto({ arquivos: [] })));
    expect(r.avisos.some((a) => a.codigo === 'PACOTE_VAZIO')).toBe(true);
  });

  it('21. quantidade de eventos analisados gera info QUANTIDADE_EVENTOS com contagem correta', () => {
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [
        { caminhoRelativo: 'ev.md', conteudo: EVENTO_COMPLETO },
      ]),
    );
    const info = r.infos.find((i) => i.codigo === 'QUANTIDADE_EVENTOS');
    expect(info).toBeDefined();
    expect(info?.mensagem).toContain('1');
  });

  it('22. quantidade de extras gera info QUANTIDADE_EXTRAS com contagem correta', () => {
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifesto(), [
        { caminhoRelativo: 'extra1.md', conteudo: '# Extra\n' },
        { caminhoRelativo: 'extra2.md', conteudo: '# Extra\n' },
      ]),
    );
    const info = r.infos.find((i) => i.codigo === 'QUANTIDADE_EXTRAS');
    expect(info).toBeDefined();
    expect(info?.mensagem).toContain('2');
  });

  it('23. relatório com erros inclui seção ## Erros', () => {
    const r = compararPacoteScrivenerRetornado(makeDados('invalid json'));
    expect(r.relatorioMarkdown).toContain('## Erros');
  });

  it('24. relatório com avisos inclui seção ## Avisos', () => {
    const r = compararPacoteScrivenerRetornado(makeDados(makeManifesto()));
    expect(r.relatorioMarkdown).toContain('## Avisos');
  });

  it('25. relatório inclui seção ## Informações', () => {
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [
        { caminhoRelativo: 'ev.md', conteudo: EVENTO_COMPLETO },
      ]),
    );
    expect(r.relatorioMarkdown).toContain('## Informações');
  });

  it('26. validoParaAnalise false para manifesto JSON inválido', () => {
    const r = compararPacoteScrivenerRetornado(makeDados('{invalid}'));
    expect(r.validoParaAnalise).toBe(false);
  });

  it('27. validoParaAnalise true com erro de arquivo individual', () => {
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [{ caminhoRelativo: 'ev.md', conteudo: '' }]),
    );
    expect(r.validoParaAnalise).toBe(true);
    expect(r.erros.length).toBeGreaterThan(0);
  });

  it('28. Unicode preservado nas mensagens e no relatório', () => {
    const manifestoJson =
      JSON.stringify({
        tipo: 'contrarius-scrivener-export',
        arquivos: [
          {
            caminhoRelativo: 'Ação/010-evento.md',
            id: 'E-001',
            titulo: 'Evento Ação',
            filePath: 'f',
            ordemNarrativa: 10,
          },
        ],
      }) + '\n';
    const conteudo = [
      '# Evento Ação',
      '',
      '- ID: E-001',
      '- Ordem narrativa: 10',
      '',
      '## Sinopse de escrita',
      '',
      'Árvore e maçã.',
      '',
      '## Observações estruturais',
      '',
      'Über.',
      '',
    ].join('\n');
    const r = compararPacoteScrivenerRetornado(
      makeDados(manifestoJson, [{ caminhoRelativo: 'Ação/010-evento.md', conteudo }]),
    );
    expect(r.relatorioMarkdown).toContain('Ação/010-evento.md');
    expect(r.relatorioMarkdown).not.toContain('undefined');
  });

  it('29. entrada não mutada após chamada', () => {
    const arquivos: ArquivoPacoteScrivenerRetornado[] = [
      { caminhoRelativo: 'ev.md', conteudo: EVENTO_COMPLETO },
    ];
    const dados: DadosComparacaoPacoteScrivener = {
      manifestoJson: makeManifestoComEvento('ev.md'),
      arquivos,
      geradoEm: '2026-07-05 10:00',
    };
    const comprimentoOriginal = arquivos.length;
    compararPacoteScrivenerRetornado(dados);
    expect(arquivos.length).toBe(comprimentoOriginal);
    expect(dados.geradoEm).toBe('2026-07-05 10:00');
    expect(dados.arquivos).toBe(arquivos);
  });

  it('30. resultado é objeto novo a cada chamada', () => {
    const dados = makeDados(makeManifesto());
    const r1 = compararPacoteScrivenerRetornado(dados);
    const r2 = compararPacoteScrivenerRetornado(dados);
    expect(r1).not.toBe(r2);
    expect(r1.itens).not.toBe(r2.itens);
  });

  it('31. chamadas repetidas com mesma entrada produzem resultado equivalente', () => {
    const dados = makeDados(makeManifestoComEvento('ev.md'), [
      { caminhoRelativo: 'ev.md', conteudo: EVENTO_COMPLETO },
    ]);
    const r1 = compararPacoteScrivenerRetornado(dados);
    const r2 = compararPacoteScrivenerRetornado(dados);
    expect(r1.validoParaAnalise).toBe(r2.validoParaAnalise);
    expect(r1.erros.length).toBe(r2.erros.length);
    expect(r1.avisos.length).toBe(r2.avisos.length);
    expect(r1.infos.length).toBe(r2.infos.length);
    expect(r1.relatorioMarkdown).toBe(r2.relatorioMarkdown);
  });

  it('32. relatório não contém a string "undefined"', () => {
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [
        { caminhoRelativo: 'ev.md', conteudo: EVENTO_COMPLETO },
      ]),
    );
    expect(r.relatorioMarkdown).not.toContain('undefined');
  });

  it('33. relatório não contém "[object Object]"', () => {
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [
        { caminhoRelativo: 'ev.md', conteudo: EVENTO_COMPLETO },
      ]),
    );
    expect(r.relatorioMarkdown).not.toContain('[object Object]');
  });

  it('34. relatório não contém "NaN"', () => {
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [
        { caminhoRelativo: 'ev.md', conteudo: EVENTO_COMPLETO },
      ]),
    );
    expect(r.relatorioMarkdown).not.toContain('NaN');
  });

  it('35. relatório não contém "Infinity"', () => {
    const r = compararPacoteScrivenerRetornado(
      makeDados(makeManifestoComEvento('ev.md'), [
        { caminhoRelativo: 'ev.md', conteudo: EVENTO_COMPLETO },
      ]),
    );
    expect(r.relatorioMarkdown).not.toContain('Infinity');
  });

  it('36. relatório termina com quebra de linha', () => {
    const r = compararPacoteScrivenerRetornado(makeDados(makeManifesto()));
    expect(r.relatorioMarkdown.endsWith('\n')).toBe(true);
  });

  it('37. sem stack trace no relatório ou nas mensagens de erro', () => {
    const r = compararPacoteScrivenerRetornado(makeDados('not json'));
    const textos = [r.relatorioMarkdown, ...r.erros.map((e) => e.mensagem)].join('\n');
    expect(textos).not.toMatch(/at \w+.*\(/);
    expect(textos).not.toContain('Error:');
  });
});
