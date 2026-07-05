import { describe, expect, it } from 'vitest';
import {
  gerarPreviaAplicacaoScrivener,
  type ArquivoScrivenerPreviaAplicacao,
  type DadosPreviaAplicacaoScrivener,
  type NotaOriginalPreviaAplicacao,
} from '../../src/contrarius/scrivener-apply-preview-model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GERADO_EM = '2026-07-05 10:00';
const MANIFESTO_TIPO = 'contrarius-scrivener-export';
const CAMINHO_RELATIVO = 'Livro1/010-e001-titulo.md';
const ID = 'E-001';
const TITULO = 'Título do Evento';
const FILE_PATH = '05_Eventos/E-001.md';
const ORDEM = 10;
const SINOPSE_TEXTO = 'Texto da sinopse aqui.';
const PLACEHOLDER = '[preencher no Scrivener]';

function makeManifesto(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ tipo: MANIFESTO_TIPO, arquivos: [], ...overrides }) + '\n';
}

function makeEntrada(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tipo: 'evento_posicionado',
    caminhoRelativo: CAMINHO_RELATIVO,
    id: ID,
    titulo: TITULO,
    filePath: FILE_PATH,
    ordemNarrativa: ORDEM,
    ...overrides,
  };
}

function makeManifestoComEntrada(overridesEntrada: Record<string, unknown> = {}): string {
  return JSON.stringify({ tipo: MANIFESTO_TIPO, arquivos: [makeEntrada(overridesEntrada)] }) + '\n';
}

interface ConteudoOpts {
  id?: string;
  ordem?: string | number;
  sinopse?: string;
  caminhoOriginal?: string;
  semSinopse?: boolean;
  semOrdem?: boolean;
  semCaminhoOriginal?: boolean;
}

function makeConteudoScrivener(opts: ConteudoOpts = {}): string {
  const id = opts.id ?? ID;
  const ordem = opts.ordem !== undefined ? String(opts.ordem) : String(ORDEM);
  const caminhoOrig = opts.caminhoOriginal ?? FILE_PATH;
  const sinopse = opts.sinopse ?? SINOPSE_TEXTO;

  const linhas: string[] = [`# ${TITULO}`, '', `- ID: ${id}`];
  if (!opts.semOrdem) linhas.push(`- Ordem narrativa: ${ordem}`);
  linhas.push('');
  if (!opts.semSinopse) linhas.push('## Sinopse de escrita', '', sinopse, '');
  linhas.push('## Observações estruturais', '');
  if (!opts.semCaminhoOriginal) linhas.push(`- Caminho original: ${caminhoOrig}`);
  linhas.push('');
  return linhas.join('\n');
}

function makeArquivoScrivener(
  caminhoRelativo = CAMINHO_RELATIVO,
  opts: ConteudoOpts = {},
): ArquivoScrivenerPreviaAplicacao {
  return { caminhoRelativo, conteudo: makeConteudoScrivener(opts) };
}

function makeNota(
  filePath = FILE_PATH,
  conteudo = `# ${TITULO}\n\nConteúdo da nota original.\n`,
): NotaOriginalPreviaAplicacao {
  return { filePath, conteudo };
}

function dadosBase(): DadosPreviaAplicacaoScrivener {
  return {
    manifestoJson: makeManifestoComEntrada(),
    arquivosScrivener: [makeArquivoScrivener()],
    notasOriginais: [makeNota()],
    geradoEm: GERADO_EM,
  };
}

function blocoControladoProposto(id: string, sinopse: string): string {
  return [
    `<!-- CONTRARIUS:SCRIVENER-SINOPSE:START id="${id}" -->`,
    '## Sinopse importada do Scrivener',
    '',
    sinopse,
    '',
    `<!-- CONTRARIUS:SCRIVENER-SINOPSE:END id="${id}" -->`,
    '',
  ].join('\n');
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('gerarPreviaAplicacaoScrivener', () => {
  it('1. manifesto inválido', () => {
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: 'NOT JSON {{{',
      arquivosScrivener: [],
      notasOriginais: [],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.validoParaAplicacaoFutura).toBe(false);
    expect(r.bloqueados.some((b) => b.codigo === 'MANIFESTO_JSON_INVALIDO')).toBe(true);
  });

  it('2. tipo inválido', () => {
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifesto({ tipo: 'outro-tipo' }),
      arquivosScrivener: [],
      notasOriginais: [],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.validoParaAplicacaoFutura).toBe(false);
    expect(r.bloqueados.some((b) => b.codigo === 'MANIFESTO_TIPO_INVALIDO')).toBe(true);
  });

  it('3. manifesto sem array arquivos', () => {
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: JSON.stringify({ tipo: MANIFESTO_TIPO, arquivos: 'nao-array' }),
      arquivosScrivener: [],
      notasOriginais: [],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.validoParaAplicacaoFutura).toBe(false);
    expect(r.bloqueados.some((b) => b.codigo === 'MANIFESTO_SEM_ARRAY_ARQUIVOS')).toBe(true);
  });

  it('4. arquivo Scrivener ausente', () => {
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.bloqueados.some((b) => b.codigo === 'ARQUIVO_AUSENTE')).toBe(true);
  });

  it('5. nota original ausente', () => {
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.bloqueados.some((b) => b.codigo === 'NOTA_ORIGINAL_AUSENTE')).toBe(true);
  });

  it('6. ID divergente', () => {
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada({ id: 'E-001' }),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { id: 'E-999' })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.bloqueados.some((b) => b.codigo === 'ID_DIVERGENTE')).toBe(true);
  });

  it('7. caminho original divergente', () => {
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada({ filePath: FILE_PATH }),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { caminhoOriginal: 'outro/caminho.md' })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.bloqueados.some((b) => b.codigo === 'CAMINHO_ORIGINAL_DIVERGENTE')).toBe(true);
  });

  it('8. ordem divergente', () => {
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada({ ordemNarrativa: 10 }),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { ordem: '99' })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.bloqueados.some((b) => b.codigo === 'ORDEM_DIVERGENTE')).toBe(true);
  });

  it('9. sinopse maior que limite', () => {
    const longaSinopse = 'a'.repeat(20001);
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { sinopse: longaSinopse })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.bloqueados.some((b) => b.codigo === 'SINOPSE_MUITO_LONGA')).toBe(true);
  });

  it('10. conflito na nota original', () => {
    const notaConflito = makeNota(
      FILE_PATH,
      '# Título\n\n<<<<<<< HEAD\nlinhaA\n=======\nlinhaB\n>>>>>>> branch\n',
    );
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [notaConflito],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.bloqueados.some((b) => b.codigo === 'CONFLITO_NA_NOTA')).toBe(true);
  });

  it('11. bloco START sem END', () => {
    const notaStartSemEnd = makeNota(
      FILE_PATH,
      [
        '# Título',
        '',
        `<!-- CONTRARIUS:SCRIVENER-SINOPSE:START id="${ID}" -->`,
        '## Sinopse importada do Scrivener',
        '',
        'Texto',
        '',
      ].join('\n'),
    );
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [notaStartSemEnd],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.bloqueados.some((b) => b.codigo === 'BLOCO_START_SEM_END')).toBe(true);
  });

  it('12. bloco END sem START', () => {
    const notaEndSemStart = makeNota(
      FILE_PATH,
      [
        '# Título',
        '',
        'Texto',
        '',
        `<!-- CONTRARIUS:SCRIVENER-SINOPSE:END id="${ID}" -->`,
        '',
      ].join('\n'),
    );
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [notaEndSemStart],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.bloqueados.some((b) => b.codigo === 'BLOCO_END_SEM_START')).toBe(true);
  });

  it('13. múltiplos blocos para mesmo ID', () => {
    const notaMultiplos = makeNota(
      FILE_PATH,
      [
        '# Título',
        '',
        `<!-- CONTRARIUS:SCRIVENER-SINOPSE:START id="${ID}" -->`,
        '## Sinopse importada do Scrivener',
        '',
        'Texto1',
        '',
        `<!-- CONTRARIUS:SCRIVENER-SINOPSE:END id="${ID}" -->`,
        '',
        `<!-- CONTRARIUS:SCRIVENER-SINOPSE:START id="${ID}" -->`,
        '## Sinopse importada do Scrivener',
        '',
        'Texto2',
        '',
        `<!-- CONTRARIUS:SCRIVENER-SINOPSE:END id="${ID}" -->`,
        '',
      ].join('\n'),
    );
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [notaMultiplos],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.bloqueados.some((b) => b.codigo === 'MULTIPLOS_BLOCOS')).toBe(true);
  });

  it('14. pacote contém "undefined"', () => {
    const arquivo: ArquivoScrivenerPreviaAplicacao = {
      caminhoRelativo: CAMINHO_RELATIVO,
      conteudo: makeConteudoScrivener() + 'valor: undefined\n',
    };
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [arquivo],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.bloqueados.some((b) => b.codigo === 'CONTEUDO_SUSPEITO')).toBe(true);
  });

  it('15. pacote contém "[object Object]"', () => {
    const arquivo: ArquivoScrivenerPreviaAplicacao = {
      caminhoRelativo: CAMINHO_RELATIVO,
      conteudo: makeConteudoScrivener() + 'valor: [object Object]\n',
    };
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [arquivo],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.bloqueados.some((b) => b.codigo === 'CONTEUDO_SUSPEITO')).toBe(true);
  });

  it('16. pacote contém "NaN"', () => {
    const arquivo: ArquivoScrivenerPreviaAplicacao = {
      caminhoRelativo: CAMINHO_RELATIVO,
      conteudo: makeConteudoScrivener() + 'valor: NaN\n',
    };
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [arquivo],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.bloqueados.some((b) => b.codigo === 'CONTEUDO_SUSPEITO')).toBe(true);
  });

  it('17. pacote contém "Infinity"', () => {
    const arquivo: ArquivoScrivenerPreviaAplicacao = {
      caminhoRelativo: CAMINHO_RELATIVO,
      conteudo: makeConteudoScrivener() + 'valor: Infinity\n',
    };
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [arquivo],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.bloqueados.some((b) => b.codigo === 'CONTEUDO_SUSPEITO')).toBe(true);
  });

  it('18. sem ação com sinopse ausente', () => {
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { semSinopse: true })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.semAcao.some((s) => s.codigo === 'SEM_ACAO_SINOPSE')).toBe(true);
    expect(r.insercoes).toHaveLength(0);
  });

  it('19. sem ação com sinopse vazia', () => {
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { sinopse: '' })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.semAcao.some((s) => s.codigo === 'SEM_ACAO_SINOPSE')).toBe(true);
    expect(r.insercoes).toHaveLength(0);
  });

  it('20. sem ação com placeholder', () => {
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { sinopse: PLACEHOLDER })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.semAcao.some((s) => s.codigo === 'SEM_ACAO_SINOPSE')).toBe(true);
    expect(r.insercoes).toHaveLength(0);
  });

  it('21. sem ação quando sinopse já está no bloco controlado', () => {
    const bloco = blocoControladoProposto(ID, SINOPSE_TEXTO);
    const notaComBloco = makeNota(FILE_PATH, `# ${TITULO}\n\n${bloco}\n`);
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [notaComBloco],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.semAcao.some((s) => s.codigo === 'SINOPSE_JA_NO_BLOCO')).toBe(true);
    expect(r.insercoes).toHaveLength(0);
    expect(r.substituicoes).toHaveLength(0);
  });

  it('22. inserir bloco quando não existe bloco controlado', () => {
    const r = gerarPreviaAplicacaoScrivener(dadosBase());
    expect(r.insercoes).toHaveLength(1);
    expect(r.insercoes[0].tipo).toBe('inserir_bloco_sinopse');
    expect(r.insercoes[0].codigo).toBe('INSERIR_BLOCO');
  });

  it('23. substituir bloco quando bloco existente difere', () => {
    const notaComBlocoAntigo = makeNota(
      FILE_PATH,
      [
        '# Título',
        '',
        `<!-- CONTRARIUS:SCRIVENER-SINOPSE:START id="${ID}" -->`,
        '## Sinopse importada do Scrivener',
        '',
        'Texto antigo diferente.',
        '',
        `<!-- CONTRARIUS:SCRIVENER-SINOPSE:END id="${ID}" -->`,
        '',
      ].join('\n'),
    );
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [notaComBlocoAntigo],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.substituicoes).toHaveLength(1);
    expect(r.substituicoes[0].tipo).toBe('substituir_bloco_sinopse');
  });

  it('24. bloco proposto contém START', () => {
    const r = gerarPreviaAplicacaoScrivener(dadosBase());
    expect(r.insercoes[0].blocoProposto).toContain(
      `<!-- CONTRARIUS:SCRIVENER-SINOPSE:START id="${ID}" -->`,
    );
  });

  it('25. bloco proposto contém END', () => {
    const r = gerarPreviaAplicacaoScrivener(dadosBase());
    expect(r.insercoes[0].blocoProposto).toContain(
      `<!-- CONTRARIUS:SCRIVENER-SINOPSE:END id="${ID}" -->`,
    );
  });

  it('26. bloco proposto contém título correto', () => {
    const r = gerarPreviaAplicacaoScrivener(dadosBase());
    expect(r.insercoes[0].blocoProposto).toContain('## Sinopse importada do Scrivener');
  });

  it('27. bloco proposto preserva Unicode', () => {
    const sinopseUnicode = 'Sinopse com àáâãä çẽñ 日本語 🌟.';
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { sinopse: sinopseUnicode })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.insercoes[0].blocoProposto).toContain(sinopseUnicode);
  });

  it('28. extração preserva quebras internas', () => {
    const sinopseMultilinhas = 'Primeira linha.\nSegunda linha.\nTerceira linha.';
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { sinopse: sinopseMultilinhas })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.insercoes[0].sinopseExtraida).toBe(sinopseMultilinhas);
  });

  it('29. extração termina antes de próximo ##', () => {
    const conteudo = [
      `# ${TITULO}`,
      '',
      `- ID: ${ID}`,
      `- Ordem narrativa: ${ORDEM}`,
      '',
      '## Sinopse de escrita',
      '',
      'Sinopse válida.',
      '',
      '## Outra seção',
      '',
      'Não deve ser incluído.',
      '',
      '## Observações estruturais',
      '',
      `- Caminho original: ${FILE_PATH}`,
      '',
    ].join('\n');
    const arquivo: ArquivoScrivenerPreviaAplicacao = { caminhoRelativo: CAMINHO_RELATIVO, conteudo };
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [arquivo],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.insercoes[0].sinopseExtraida).toBe('Sinopse válida.');
    expect(r.insercoes[0].sinopseExtraida).not.toContain('Não deve ser incluído.');
  });

  it('30. seção Sinopse duplicada bloqueia item', () => {
    const conteudo = [
      `# ${TITULO}`,
      '',
      `- ID: ${ID}`,
      `- Ordem narrativa: ${ORDEM}`,
      '',
      '## Sinopse de escrita',
      '',
      'Sinopse 1.',
      '',
      '## Sinopse de escrita',
      '',
      'Sinopse 2.',
      '',
      '## Observações estruturais',
      '',
      `- Caminho original: ${FILE_PATH}`,
      '',
    ].join('\n');
    const arquivo: ArquivoScrivenerPreviaAplicacao = { caminhoRelativo: CAMINHO_RELATIVO, conteudo };
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [arquivo],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.bloqueados.some((b) => b.codigo === 'SECAO_SINOPSE_DUPLICADA')).toBe(true);
  });

  it('31. relatório com inserções', () => {
    const r = gerarPreviaAplicacaoScrivener(dadosBase());
    expect(r.relatorioMarkdown).toContain('## Inserções propostas');
    expect(r.relatorioMarkdown).toContain('Inserções: 1');
  });

  it('32. relatório com substituições', () => {
    const notaComBlocoAntigo = makeNota(
      FILE_PATH,
      [
        '# Título',
        '',
        `<!-- CONTRARIUS:SCRIVENER-SINOPSE:START id="${ID}" -->`,
        '## Sinopse importada do Scrivener',
        '',
        'Texto antigo.',
        '',
        `<!-- CONTRARIUS:SCRIVENER-SINOPSE:END id="${ID}" -->`,
        '',
      ].join('\n'),
    );
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [notaComBlocoAntigo],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.relatorioMarkdown).toContain('## Substituições propostas');
    expect(r.relatorioMarkdown).toContain('Substituições: 1');
  });

  it('33. relatório com bloqueados', () => {
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.relatorioMarkdown).toContain('## Bloqueados');
    expect(r.relatorioMarkdown).toContain('Bloqueados: 1');
  });

  it('34. relatório com sem ação', () => {
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { semSinopse: true })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.relatorioMarkdown).toContain('## Sem ação');
    expect(r.relatorioMarkdown).toContain('Sem ação: 1');
  });

  it('35. relatório declara que nenhuma nota foi alterada', () => {
    const r = gerarPreviaAplicacaoScrivener(dadosBase());
    expect(r.relatorioMarkdown).toContain('Nenhuma nota do Vault foi alterada por esta prévia.');
  });

  it('36. relatório declara que não é importação', () => {
    const r = gerarPreviaAplicacaoScrivener(dadosBase());
    expect(r.relatorioMarkdown).toContain('Esta prévia não é uma importação.');
  });

  it('37. validoParaAplicacaoFutura false para bloqueio global', () => {
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: 'INVALIDO',
      arquivosScrivener: [],
      notasOriginais: [],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.validoParaAplicacaoFutura).toBe(false);
  });

  it('38. validoParaAplicacaoFutura true com bloqueio de item', () => {
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.validoParaAplicacaoFutura).toBe(true);
    expect(r.bloqueados).toHaveLength(1);
  });

  it('39. entrada não mutada', () => {
    const arquivosScrivener = [makeArquivoScrivener()];
    const notasOriginais = [makeNota()];
    const conteudoOriginalArq = arquivosScrivener[0].conteudo;
    const conteudoOriginalNota = notasOriginais[0].conteudo;
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener,
      notasOriginais,
      geradoEm: GERADO_EM,
    };
    gerarPreviaAplicacaoScrivener(dados);
    expect(arquivosScrivener[0].conteudo).toBe(conteudoOriginalArq);
    expect(notasOriginais[0].conteudo).toBe(conteudoOriginalNota);
    expect(arquivosScrivener[0].caminhoRelativo).toBe(CAMINHO_RELATIVO);
  });

  it('40. resultado novo a cada chamada', () => {
    const dados = dadosBase();
    const r1 = gerarPreviaAplicacaoScrivener(dados);
    const r2 = gerarPreviaAplicacaoScrivener(dados);
    expect(r1).not.toBe(r2);
    expect(r1.operacoes).not.toBe(r2.operacoes);
    expect(r1.insercoes).not.toBe(r2.insercoes);
  });

  it('41. chamadas repetidas equivalentes', () => {
    const dados = dadosBase();
    const r1 = gerarPreviaAplicacaoScrivener(dados);
    const r2 = gerarPreviaAplicacaoScrivener(dados);
    expect(r1.relatorioMarkdown).toBe(r2.relatorioMarkdown);
    expect(r1.insercoes.length).toBe(r2.insercoes.length);
    expect(r1.validoParaAplicacaoFutura).toBe(r2.validoParaAplicacaoFutura);
  });

  it('42. sem "undefined" no relatório', () => {
    const r = gerarPreviaAplicacaoScrivener(dadosBase());
    expect(r.relatorioMarkdown).not.toContain('undefined');
    for (const op of r.operacoes) {
      expect(op.mensagem).not.toContain('undefined');
    }
  });

  it('43. sem "[object Object]" no relatório', () => {
    const r = gerarPreviaAplicacaoScrivener(dadosBase());
    expect(r.relatorioMarkdown).not.toContain('[object Object]');
  });

  it('44. sem "NaN" no relatório', () => {
    const r = gerarPreviaAplicacaoScrivener(dadosBase());
    expect(r.relatorioMarkdown).not.toContain('NaN');
  });

  it('45. sem "Infinity" no relatório', () => {
    const r = gerarPreviaAplicacaoScrivener(dadosBase());
    expect(r.relatorioMarkdown).not.toContain('Infinity');
  });

  it('46. relatório termina com quebra de linha', () => {
    const r = gerarPreviaAplicacaoScrivener(dadosBase());
    expect(r.relatorioMarkdown.endsWith('\n')).toBe(true);
  });

  it('47. sem stack trace no relatório', () => {
    const dados: DadosPreviaAplicacaoScrivener = {
      manifestoJson: 'INVALIDO',
      arquivosScrivener: [],
      notasOriginais: [],
      geradoEm: GERADO_EM,
    };
    const r = gerarPreviaAplicacaoScrivener(dados);
    expect(r.relatorioMarkdown).not.toMatch(/at\s+\w+.*:\d+:\d+/);
    expect(r.relatorioMarkdown).not.toContain('Error:');
  });
});
