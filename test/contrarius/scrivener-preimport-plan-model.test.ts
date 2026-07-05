import { describe, expect, it } from 'vitest';
import {
  gerarPlanoPreImportacaoScrivener,
  type ArquivoScrivenerPreImportacao,
  type DadosPlanoPreImportacaoScrivener,
  type NotaOriginalPreImportacao,
} from '../../src/contrarius/scrivener-preimport-plan-model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GERADO_EM = '2026-07-05 10:00';

function makeManifesto(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify(
    { tipo: 'contrarius-scrivener-export', arquivos: [], ...overrides },
    null,
    2,
  ) + '\n';
}

function makeEntrada(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tipo: 'evento_posicionado',
    caminhoRelativo: 'Livro1/010-e001-titulo.md',
    id: 'E-001',
    titulo: 'Título do Evento',
    filePath: '05_Eventos/E-001.md',
    ordemNarrativa: 10,
    ...overrides,
  };
}

function makeManifestoComEntrada(overridesEntrada: Record<string, unknown> = {}): string {
  return JSON.stringify(
    { tipo: 'contrarius-scrivener-export', arquivos: [makeEntrada(overridesEntrada)] },
    null,
    2,
  ) + '\n';
}

function makeArquivoScrivener(
  caminhoRelativo = 'Livro1/010-e001-titulo.md',
  overrides: Partial<{
    id: string;
    ordem: string;
    caminhoOriginal: string;
    sinopse: string;
    observacoes: string;
  }> = {},
): ArquivoScrivenerPreImportacao {
  const id = overrides.id ?? 'E-001';
  const ordem = overrides.ordem ?? '10';
  const caminhoOrig = overrides.caminhoOriginal ?? '05_Eventos/E-001.md';
  const sinopse = overrides.sinopse ?? 'Conteúdo da sinopse.';
  const obs = overrides.observacoes ?? 'Observações aqui.';
  const conteudo = [
    '# Título do Evento',
    '',
    `- ID: ${id}`,
    `- Ordem narrativa: ${ordem}`,
    '',
    '## Sinopse de escrita',
    '',
    sinopse,
    '',
    '## Observações estruturais',
    '',
    obs,
    `- Caminho original: ${caminhoOrig}`,
    '',
  ].join('\n');
  return { caminhoRelativo, conteudo };
}

function makeNota(
  filePath = '05_Eventos/E-001.md',
  conteudo = '# Título do Evento\n\nConteúdo da nota original.\n',
): NotaOriginalPreImportacao {
  return { filePath, conteudo };
}

function makeDados(
  manifestoJson: string,
  arquivosScrivener: readonly ArquivoScrivenerPreImportacao[] = [],
  notasOriginais: readonly NotaOriginalPreImportacao[] = [],
  geradoEm = GERADO_EM,
): DadosPlanoPreImportacaoScrivener {
  return { manifestoJson, arquivosScrivener, notasOriginais, geradoEm };
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('gerarPlanoPreImportacaoScrivener', () => {
  // 1. manifesto inválido
  it('1. manifesto inválido gera bloqueio MANIFESTO_JSON_INVALIDO', () => {
    const r = gerarPlanoPreImportacaoScrivener(makeDados('not json'));
    expect(r.bloqueados.some((b) => b.codigo === 'MANIFESTO_JSON_INVALIDO')).toBe(true);
  });

  // 2. tipo inválido
  it('2. tipo inválido gera bloqueio MANIFESTO_TIPO_INVALIDO e validoParaPreImportacao false', () => {
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(JSON.stringify({ tipo: 'outro', arquivos: [] }) + '\n'),
    );
    expect(r.bloqueados.some((b) => b.codigo === 'MANIFESTO_TIPO_INVALIDO')).toBe(true);
    expect(r.validoParaPreImportacao).toBe(false);
  });

  // 3. manifesto sem array arquivos
  it('3. manifesto sem array "arquivos" gera bloqueio MANIFESTO_SEM_ARRAY_ARQUIVOS', () => {
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(JSON.stringify({ tipo: 'contrarius-scrivener-export', arquivos: 'errado' }) + '\n'),
    );
    expect(r.bloqueados.some((b) => b.codigo === 'MANIFESTO_SEM_ARRAY_ARQUIVOS')).toBe(true);
    expect(r.validoParaPreImportacao).toBe(false);
  });

  // 4. arquivo Scrivener ausente
  it('4. arquivo Scrivener ausente gera bloqueio ARQUIVO_AUSENTE', () => {
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), []),
    );
    expect(r.bloqueados.some((b) => b.codigo === 'ARQUIVO_AUSENTE')).toBe(true);
  });

  // 5. nota original ausente
  it('5. nota original ausente gera bloqueio NOTA_ORIGINAL_AUSENTE', () => {
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [makeArquivoScrivener()], []),
    );
    expect(r.bloqueados.some((b) => b.codigo === 'NOTA_ORIGINAL_AUSENTE')).toBe(true);
  });

  // 6. ID divergente
  it('6. ID divergente gera bloqueio ID_DIVERGENTE', () => {
    const arq = makeArquivoScrivener(undefined, { id: 'E-999' });
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    expect(r.bloqueados.some((b) => b.codigo === 'ID_DIVERGENTE')).toBe(true);
  });

  // 7. caminho original divergente
  it('7. caminho original divergente gera bloqueio CAMINHO_ORIGINAL_DIVERGENTE', () => {
    const arq = makeArquivoScrivener(undefined, { caminhoOriginal: '05_Eventos/outro.md' });
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    expect(r.bloqueados.some((b) => b.codigo === 'CAMINHO_ORIGINAL_DIVERGENTE')).toBe(true);
  });

  // 8. ordem divergente
  it('8. ordem divergente gera bloqueio ORDEM_DIVERGENTE', () => {
    const arq = makeArquivoScrivener(undefined, { ordem: '99' });
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    expect(r.bloqueados.some((b) => b.codigo === 'ORDEM_DIVERGENTE')).toBe(true);
  });

  // 9. sinopse maior que limite
  it('9. sinopse maior que 20000 caracteres gera bloqueio SINOPSE_MUITO_LONGA', () => {
    const sinopseLonga = 'A'.repeat(20001);
    const arq = makeArquivoScrivener(undefined, { sinopse: sinopseLonga });
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    expect(r.bloqueados.some((b) => b.codigo === 'SINOPSE_MUITO_LONGA')).toBe(true);
  });

  // 10. pacote contém undefined
  it('10. arquivo Scrivener com "undefined" gera bloqueio CONTEUDO_SUSPEITO', () => {
    const arq: ArquivoScrivenerPreImportacao = {
      caminhoRelativo: 'Livro1/010-e001-titulo.md',
      conteudo: '# Evento\n\n- ID: E-001\n- Ordem narrativa: undefined\n',
    };
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    expect(r.bloqueados.some((b) => b.codigo === 'CONTEUDO_SUSPEITO')).toBe(true);
  });

  // 11. pacote contém [object Object]
  it('11. arquivo Scrivener com "[object Object]" gera bloqueio CONTEUDO_SUSPEITO', () => {
    const arq: ArquivoScrivenerPreImportacao = {
      caminhoRelativo: 'Livro1/010-e001-titulo.md',
      conteudo: '# Evento\n\n- ID: E-001\n[object Object]\n',
    };
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    expect(r.bloqueados.some((b) => b.codigo === 'CONTEUDO_SUSPEITO')).toBe(true);
  });

  // 12. pacote contém NaN
  it('12. arquivo Scrivener com "NaN" gera bloqueio CONTEUDO_SUSPEITO', () => {
    const arq: ArquivoScrivenerPreImportacao = {
      caminhoRelativo: 'Livro1/010-e001-titulo.md',
      conteudo: '# Evento\n\n- ID: E-001\n- Ordem narrativa: NaN\n',
    };
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    expect(r.bloqueados.some((b) => b.codigo === 'CONTEUDO_SUSPEITO')).toBe(true);
  });

  // 13. pacote contém Infinity
  it('13. arquivo Scrivener com "Infinity" gera bloqueio CONTEUDO_SUSPEITO', () => {
    const arq: ArquivoScrivenerPreImportacao = {
      caminhoRelativo: 'Livro1/010-e001-titulo.md',
      conteudo: '# Evento\n\n- ID: E-001\n- Ordem narrativa: Infinity\n',
    };
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    expect(r.bloqueados.some((b) => b.codigo === 'CONTEUDO_SUSPEITO')).toBe(true);
  });

  // 14. sem seção Sinopse
  it('14. arquivo sem seção Sinopse gera revisão SEM_SECAO_SINOPSE', () => {
    const arq: ArquivoScrivenerPreImportacao = {
      caminhoRelativo: 'Livro1/010-e001-titulo.md',
      conteudo: '# Título\n\n- ID: E-001\n- Ordem narrativa: 10\n\n## Observações estruturais\n\nobs.\n- Caminho original: 05_Eventos/E-001.md\n',
    };
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    expect(r.revisoes.some((rv) => rv.codigo === 'SEM_SECAO_SINOPSE')).toBe(true);
  });

  // 15. seção Sinopse duplicada
  it('15. seção Sinopse duplicada gera revisão SECAO_SINOPSE_DUPLICADA', () => {
    const arq: ArquivoScrivenerPreImportacao = {
      caminhoRelativo: 'Livro1/010-e001-titulo.md',
      conteudo: [
        '# Título',
        '',
        '- ID: E-001',
        '- Ordem narrativa: 10',
        '',
        '## Sinopse de escrita',
        '',
        'Primeira sinopse.',
        '',
        '## Sinopse de escrita',
        '',
        'Segunda sinopse.',
        '',
        '## Observações estruturais',
        '',
        '- Caminho original: 05_Eventos/E-001.md',
        '',
      ].join('\n'),
    };
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    expect(r.revisoes.some((rv) => rv.codigo === 'SECAO_SINOPSE_DUPLICADA')).toBe(true);
  });

  // 16. sem Observações estruturais
  it('16. arquivo sem seção Observações gera revisão SEM_SECAO_OBSERVACOES', () => {
    const arq: ArquivoScrivenerPreImportacao = {
      caminhoRelativo: 'Livro1/010-e001-titulo.md',
      conteudo: '# Título\n\n- ID: E-001\n- Ordem narrativa: 10\n\n## Sinopse de escrita\n\nTexto.\n',
    };
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    expect(r.revisoes.some((rv) => rv.codigo === 'SEM_SECAO_OBSERVACOES')).toBe(true);
  });

  // 17. tipo desconhecido no manifesto
  it('17. tipo desconhecido gera revisão TIPO_DESCONHECIDO', () => {
    const entrada = makeEntrada({ tipo: 'tipo_inventado' });
    const manifesto = JSON.stringify(
      { tipo: 'contrarius-scrivener-export', arquivos: [entrada] },
      null,
      2,
    ) + '\n';
    const arq = makeArquivoScrivener();
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(manifesto, [arq], [makeNota()]),
    );
    expect(r.revisoes.some((rv) => rv.codigo === 'TIPO_DESCONHECIDO')).toBe(true);
  });

  // 18. Evento sem ordem
  it('18. Evento sem ordemNarrativa gera revisão EVENTO_SEM_ORDEM', () => {
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(
        makeManifestoComEntrada({ ordemNarrativa: null }),
        [makeArquivoScrivener(undefined, { ordem: 'sem ordem' })],
        [makeNota()],
      ),
    );
    expect(r.revisoes.some((rv) => rv.codigo === 'EVENTO_SEM_ORDEM')).toBe(true);
  });

  // 19. sinopse já existe na nota original
  it('19. sinopse idêntica à nota original gera revisão SINOPSE_JA_NA_NOTA', () => {
    const sinopse = 'Conteúdo da sinopse.';
    const arq = makeArquivoScrivener(undefined, { sinopse });
    const nota = makeNota('05_Eventos/E-001.md', `# Título\n\n${sinopse}\n`);
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [nota]),
    );
    expect(r.revisoes.some((rv) => rv.codigo === 'SINOPSE_JA_NA_NOTA')).toBe(true);
  });

  // 20. marcador de conflito na nota original
  it('20. marcador de conflito na nota gera revisão MARCADOR_CONFLITO', () => {
    const arq = makeArquivoScrivener();
    const nota = makeNota('05_Eventos/E-001.md', '# Título\n\n<<<<<<< HEAD\nalgo\n=======\noutro\n>>>>>>> branch\n');
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [nota]),
    );
    expect(r.revisoes.some((rv) => rv.codigo === 'MARCADOR_CONFLITO')).toBe(true);
  });

  // 21. candidato com sinopse preenchida
  it('21. candidato com sinopse preenchida aparece em candidatos', () => {
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [makeArquivoScrivener()], [makeNota()]),
    );
    expect(r.candidatos.some((c) => c.codigo === 'CANDIDATO_SINOPSE')).toBe(true);
    expect(r.candidatos.some((c) => c.caminhoScrivener === 'Livro1/010-e001-titulo.md')).toBe(true);
  });

  // 22. sem ação com placeholder
  it('22. sinopse com placeholder gera item sem ação SEM_ACAO_SINOPSE', () => {
    const arq = makeArquivoScrivener(undefined, { sinopse: '[preencher no Scrivener]' });
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    expect(r.semAcao.some((s) => s.codigo === 'SEM_ACAO_SINOPSE')).toBe(true);
    expect(r.candidatos.length).toBe(0);
  });

  // 23. sem ação com sinopse vazia
  it('23. sinopse vazia gera item sem ação SEM_ACAO_SINOPSE', () => {
    const arq = makeArquivoScrivener(undefined, { sinopse: '' });
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    expect(r.semAcao.some((s) => s.codigo === 'SEM_ACAO_SINOPSE')).toBe(true);
  });

  // 24. extração preserva quebras internas
  it('24. extração preserva quebras internas da sinopse', () => {
    const sinopse = 'Linha 1.\n\nLinha 2.';
    const arq = makeArquivoScrivener(undefined, { sinopse });
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    const candidato = r.candidatos.find((c) => c.codigo === 'CANDIDATO_SINOPSE');
    expect(candidato?.sinopseExtraida).toBe(sinopse);
  });

  // 25. extração termina antes de próximo ##
  it('25. extração termina antes do próximo ## heading', () => {
    const arq: ArquivoScrivenerPreImportacao = {
      caminhoRelativo: 'Livro1/010-e001-titulo.md',
      conteudo: [
        '# Título',
        '',
        '- ID: E-001',
        '- Ordem narrativa: 10',
        '',
        '## Sinopse de escrita',
        '',
        'Apenas esta linha.',
        '',
        '## Observações estruturais',
        '',
        'Esta linha NÃO deve aparecer na sinopse.',
        '- Caminho original: 05_Eventos/E-001.md',
        '',
      ].join('\n'),
    };
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    const candidato = r.candidatos.find((c) => c.codigo === 'CANDIDATO_SINOPSE');
    expect(candidato?.sinopseExtraida).toBe('Apenas esta linha.');
    expect(candidato?.sinopseExtraida).not.toContain('Esta linha NÃO deve aparecer');
  });

  // 26. relatório com candidatos
  it('26. relatório inclui seção Candidatos quando há candidatos', () => {
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [makeArquivoScrivener()], [makeNota()]),
    );
    expect(r.relatorioMarkdown).toContain('## Candidatos à importação de sinopse');
  });

  // 27. relatório com bloqueados
  it('27. relatório inclui seção Bloqueados quando há bloqueios', () => {
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [], []),
    );
    expect(r.relatorioMarkdown).toContain('## Bloqueados');
  });

  // 28. relatório com revisões
  it('28. relatório inclui seção Revisar manualmente quando há revisões', () => {
    const arq: ArquivoScrivenerPreImportacao = {
      caminhoRelativo: 'Livro1/010-e001-titulo.md',
      conteudo: '# Título\n\n- ID: E-001\n- Ordem narrativa: 10\n\n## Observações estruturais\n\n- Caminho original: 05_Eventos/E-001.md\n',
    };
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    expect(r.relatorioMarkdown).toContain('## Revisar manualmente');
  });

  // 29. relatório com sem ação
  it('29. relatório inclui seção Sem ação quando há itens sem ação', () => {
    const arq = makeArquivoScrivener(undefined, { sinopse: '[preencher no Scrivener]' });
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [arq], [makeNota()]),
    );
    expect(r.relatorioMarkdown).toContain('## Sem ação');
  });

  // 30. relatório declara que nenhuma nota foi alterada
  it('30. relatório declara que nenhuma nota do Vault foi alterada', () => {
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [makeArquivoScrivener()], [makeNota()]),
    );
    expect(r.relatorioMarkdown).toContain('Nenhuma nota do Vault foi alterada por este plano.');
  });

  // 31. validoParaPreImportacao false para bloqueio global
  it('31. validoParaPreImportacao é false para bloqueio global de manifesto', () => {
    expect(gerarPlanoPreImportacaoScrivener(makeDados('invalid json')).validoParaPreImportacao).toBe(false);
    expect(gerarPlanoPreImportacaoScrivener(makeDados(JSON.stringify({ tipo: 'outro' }) + '\n')).validoParaPreImportacao).toBe(false);
    const semArray = JSON.stringify({ tipo: 'contrarius-scrivener-export', arquivos: 42 }) + '\n';
    expect(gerarPlanoPreImportacaoScrivener(makeDados(semArray)).validoParaPreImportacao).toBe(false);
  });

  // 32. validoParaPreImportacao true com bloqueio de item
  it('32. validoParaPreImportacao permanece true com bloqueio de item individual', () => {
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [], []),
    );
    expect(r.validoParaPreImportacao).toBe(true);
    expect(r.bloqueados.length).toBeGreaterThan(0);
  });

  // 33. Unicode
  it('33. preserva Unicode em títulos, IDs e sinopse', () => {
    const titulo = 'Título com ções e ünicode 汉字';
    const sinopse = 'Sinopse com acentuação: ãõç e emojis possíveis.';
    const entrada = makeEntrada({ titulo, id: 'E-ÃÕÇ' });
    const manifesto = JSON.stringify(
      { tipo: 'contrarius-scrivener-export', arquivos: [entrada] },
      null,
      2,
    ) + '\n';
    const arq = makeArquivoScrivener('Livro1/010-e001-titulo.md', { id: 'E-ÃÕÇ', sinopse });
    const nota = makeNota('05_Eventos/E-001.md');
    const r = gerarPlanoPreImportacaoScrivener(makeDados(manifesto, [arq], [nota]));
    const candidato = r.candidatos.find((c) => c.codigo === 'CANDIDATO_SINOPSE');
    expect(candidato?.sinopseExtraida).toBe(sinopse);
    expect(r.relatorioMarkdown).toContain(titulo);
  });

  // 34. entrada não mutada
  it('34. entrada não é mutada após chamada', () => {
    const arquivos: ArquivoScrivenerPreImportacao[] = [makeArquivoScrivener()];
    const notas: NotaOriginalPreImportacao[] = [makeNota()];
    const dados = makeDados(makeManifestoComEntrada(), arquivos, notas);
    const arquivosAntes = [...dados.arquivosScrivener];
    const notasAntes = [...dados.notasOriginais];
    gerarPlanoPreImportacaoScrivener(dados);
    expect(dados.arquivosScrivener.length).toBe(arquivosAntes.length);
    expect(dados.notasOriginais.length).toBe(notasAntes.length);
    expect(dados.arquivosScrivener[0].caminhoRelativo).toBe(arquivosAntes[0].caminhoRelativo);
  });

  // 35. resultado novo
  it('35. cada chamada retorna objetos distintos', () => {
    const dados = makeDados(makeManifestoComEntrada(), [makeArquivoScrivener()], [makeNota()]);
    const r1 = gerarPlanoPreImportacaoScrivener(dados);
    const r2 = gerarPlanoPreImportacaoScrivener(dados);
    expect(r1).not.toBe(r2);
    expect(r1.itens).not.toBe(r2.itens);
    expect(r1.candidatos).not.toBe(r2.candidatos);
  });

  // 36. chamadas repetidas equivalentes
  it('36. chamadas repetidas com mesma entrada produzem resultado estruturalmente equivalente', () => {
    const dados = makeDados(makeManifestoComEntrada(), [makeArquivoScrivener()], [makeNota()]);
    const r1 = gerarPlanoPreImportacaoScrivener(dados);
    const r2 = gerarPlanoPreImportacaoScrivener(dados);
    expect(r1.validoParaPreImportacao).toBe(r2.validoParaPreImportacao);
    expect(r1.candidatos.length).toBe(r2.candidatos.length);
    expect(r1.bloqueados.length).toBe(r2.bloqueados.length);
    expect(r1.relatorioMarkdown).toBe(r2.relatorioMarkdown);
  });

  // 37. sem undefined no relatório
  it('37. relatorioMarkdown não contém a string "undefined"', () => {
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [makeArquivoScrivener()], [makeNota()]),
    );
    expect(r.relatorioMarkdown).not.toContain('undefined');
  });

  // 38. sem [object Object] no relatório
  it('38. relatorioMarkdown não contém "[object Object]"', () => {
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [makeArquivoScrivener()], [makeNota()]),
    );
    expect(r.relatorioMarkdown).not.toContain('[object Object]');
  });

  // 39. sem NaN no relatório
  it('39. relatorioMarkdown não contém "NaN"', () => {
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [makeArquivoScrivener()], [makeNota()]),
    );
    expect(r.relatorioMarkdown).not.toContain('NaN');
  });

  // 40. sem Infinity no relatório
  it('40. relatorioMarkdown não contém "Infinity"', () => {
    const r = gerarPlanoPreImportacaoScrivener(
      makeDados(makeManifestoComEntrada(), [makeArquivoScrivener()], [makeNota()]),
    );
    expect(r.relatorioMarkdown).not.toContain('Infinity');
  });

  // 41. relatório termina com quebra de linha
  it('41. relatorioMarkdown termina com quebra de linha', () => {
    const casos = [
      makeDados(makeManifestoComEntrada(), [makeArquivoScrivener()], [makeNota()]),
      makeDados('not json'),
      makeDados(makeManifesto(), []),
    ];
    for (const dados of casos) {
      const r = gerarPlanoPreImportacaoScrivener(dados);
      expect(r.relatorioMarkdown.endsWith('\n')).toBe(true);
    }
  });

  // 42. sem stack trace
  it('42. mensagens de erro não contêm stack trace', () => {
    const r = gerarPlanoPreImportacaoScrivener(makeDados('not json'));
    for (const item of r.itens) {
      expect(item.mensagem).not.toMatch(/\s+at\s+/);
      expect(item.mensagem).not.toContain('Error:');
    }
    expect(r.relatorioMarkdown).not.toMatch(/\s+at\s+/);
  });
});
