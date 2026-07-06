import { describe, expect, it } from 'vitest';
import {
  gerarAplicacaoControladaScrivener,
  type ArquivoScrivenerAplicacaoControlada,
  type DadosAplicacaoControladaScrivener,
  type NotaOriginalAplicacaoControlada,
} from '../../src/contrarius/scrivener-controlled-apply-model';

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
): ArquivoScrivenerAplicacaoControlada {
  return { caminhoRelativo, conteudo: makeConteudoScrivener(opts) };
}

function makeNota(
  filePath = FILE_PATH,
  conteudo = `# ${TITULO}\n\nConteúdo da nota original.\n`,
): NotaOriginalAplicacaoControlada {
  return { filePath, conteudo };
}

function dadosBase(): DadosAplicacaoControladaScrivener {
  return {
    manifestoJson: makeManifestoComEntrada(),
    arquivosScrivener: [makeArquivoScrivener()],
    notasOriginais: [makeNota()],
    geradoEm: GERADO_EM,
  };
}

function blocoControlado(id: string, sinopse: string): string {
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

// ─── Bloqueios de manifesto ───────────────────────────────────────────────────

describe('manifesto inválido', () => {
  it('JSON inválido bloqueia', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: 'não é json{',
      arquivosScrivener: [],
      notasOriginais: [],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
    expect(r.bloqueios.some((b) => b.codigo === 'MANIFESTO_JSON_INVALIDO')).toBe(true);
    expect(r.alteracoes).toHaveLength(0);
  });

  it('tipo inválido bloqueia', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: JSON.stringify({ tipo: 'outro-tipo', arquivos: [] }),
      arquivosScrivener: [],
      notasOriginais: [],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
    expect(r.bloqueios.some((b) => b.codigo === 'MANIFESTO_TIPO_INVALIDO')).toBe(true);
  });

  it('sem array arquivos bloqueia', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: JSON.stringify({ tipo: MANIFESTO_TIPO }),
      arquivosScrivener: [],
      notasOriginais: [],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
    expect(r.bloqueios.some((b) => b.codigo === 'MANIFESTO_SEM_ARRAY_ARQUIVOS')).toBe(true);
  });
});

// ─── Bloqueios por entrada ────────────────────────────────────────────────────

describe('bloqueios por entrada', () => {
  it('item sem caminho bloqueia', () => {
    const manifesto = JSON.stringify({
      tipo: MANIFESTO_TIPO,
      arquivos: [{ tipo: 'evento_posicionado', id: ID }],
    });
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: manifesto,
      arquivosScrivener: [],
      notasOriginais: [],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
    expect(r.bloqueios.some((b) => b.codigo === 'ITEM_SEM_CAMINHO')).toBe(true);
  });

  it('arquivo Scrivener ausente bloqueia', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [], // vazio
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
    expect(r.bloqueios.some((b) => b.codigo === 'ARQUIVO_AUSENTE')).toBe(true);
  });

  it('nota original ausente bloqueia', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [], // vazio
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
    expect(r.bloqueios.some((b) => b.codigo === 'NOTA_ORIGINAL_AUSENTE')).toBe(true);
  });

  it('ID divergente bloqueia', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada({ id: 'E-999' }),
      arquivosScrivener: [makeArquivoScrivener()], // id=E-001 no corpo
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
    expect(r.bloqueios.some((b) => b.codigo === 'ID_DIVERGENTE')).toBe(true);
  });

  it('caminho original divergente bloqueia', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada({ filePath: 'outro/caminho.md' }),
      arquivosScrivener: [makeArquivoScrivener()], // caminhoOriginal=FILE_PATH no corpo
      notasOriginais: [makeNota('outro/caminho.md')],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
    expect(r.bloqueios.some((b) => b.codigo === 'CAMINHO_ORIGINAL_DIVERGENTE')).toBe(true);
  });

  it('ordem divergente bloqueia', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada({ ordemNarrativa: 99 }),
      arquivosScrivener: [makeArquivoScrivener()], // ordem=10 no corpo
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
    expect(r.bloqueios.some((b) => b.codigo === 'ORDEM_DIVERGENTE')).toBe(true);
  });

  it('sinopse muito grande bloqueia', () => {
    const sinopseGrande = 'x'.repeat(20001);
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { sinopse: sinopseGrande })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
    expect(r.bloqueios.some((b) => b.codigo === 'SINOPSE_MUITO_LONGA')).toBe(true);
  });

  it('seção sinopse duplicada bloqueia', () => {
    const conteudo =
      `# ${TITULO}\n\n## Sinopse de escrita\n\nTexto A.\n\n## Sinopse de escrita\n\nTexto B.\n`;
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [{ caminhoRelativo: CAMINHO_RELATIVO, conteudo }],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
    expect(r.bloqueios.some((b) => b.codigo === 'SECAO_SINOPSE_DUPLICADA')).toBe(true);
  });

  it('conflito Git na nota bloqueia', () => {
    const notaConflito = `# Titulo\n\n<<<<<<< HEAD\nversao a\n=======\nversao b\n>>>>>>> branch\n`;
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [makeNota(FILE_PATH, notaConflito)],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
    expect(r.bloqueios.some((b) => b.codigo === 'CONFLITO_NA_NOTA')).toBe(true);
  });

  it('START sem END bloqueia', () => {
    const notaIncompleta =
      `# Titulo\n\n<!-- CONTRARIUS:SCRIVENER-SINOPSE:START id="${ID}" -->\n## Sinopse importada do Scrivener\n\ntexto\n`;
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [makeNota(FILE_PATH, notaIncompleta)],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
    expect(r.bloqueios.some((b) => b.codigo === 'BLOCO_START_SEM_END')).toBe(true);
  });

  it('END sem START bloqueia', () => {
    const notaIncompleta =
      `# Titulo\n\ntexto\n\n<!-- CONTRARIUS:SCRIVENER-SINOPSE:END id="${ID}" -->\n`;
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [makeNota(FILE_PATH, notaIncompleta)],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
    expect(r.bloqueios.some((b) => b.codigo === 'BLOCO_END_SEM_START')).toBe(true);
  });

  it('múltiplos blocos para mesmo ID bloqueia', () => {
    const bloco = blocoControlado(ID, 'sinopse');
    const notaDupla = `# Titulo\n\n${bloco}\n${bloco}\n`;
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [makeNota(FILE_PATH, notaDupla)],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
    expect(r.bloqueios.some((b) => b.codigo === 'MULTIPLOS_BLOCOS')).toBe(true);
  });

  it('dois itens apontando à mesma nota bloqueiam ambos', () => {
    const CAMINHO2 = 'Livro1/020-e002.md';
    const manifesto = JSON.stringify({
      tipo: MANIFESTO_TIPO,
      arquivos: [
        makeEntrada({ caminhoRelativo: CAMINHO_RELATIVO, id: ID }),
        makeEntrada({ caminhoRelativo: CAMINHO2, id: 'E-002', filePath: FILE_PATH }),
      ],
    });
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: manifesto,
      arquivosScrivener: [
        makeArquivoScrivener(CAMINHO_RELATIVO),
        { caminhoRelativo: CAMINHO2, conteudo: makeConteudoScrivener({ id: 'E-002', ordem: 20 }) },
      ],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
    const codigosDupla = r.bloqueios
      .filter((b) => b.codigo === 'DOIS_ITENS_MESMA_NOTA')
      .length;
    expect(codigosDupla).toBeGreaterThanOrEqual(1);
  });
});

// ─── Conteúdo suspeito ────────────────────────────────────────────────────────

describe('conteúdo suspeito', () => {
  it.each([['undefined'], ['[object Object]'], ['NaN'], ['Infinity']])(
    'arquivo com "%s" bloqueia',
    (str) => {
      const conteudo = makeConteudoScrivener({ sinopse: `texto ${str} aqui` });
      const r = gerarAplicacaoControladaScrivener({
        manifestoJson: makeManifestoComEntrada(),
        arquivosScrivener: [{ caminhoRelativo: CAMINHO_RELATIVO, conteudo }],
        notasOriginais: [makeNota()],
        geradoEm: GERADO_EM,
      });
      expect(r.podeAplicar).toBe(false);
      expect(r.bloqueios.some((b) => b.codigo === 'CONTEUDO_SUSPEITO')).toBe(true);
    },
  );
});

// ─── Sem ação ─────────────────────────────────────────────────────────────────

describe('sem ação', () => {
  it('sinopse ausente → sem ação', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { semSinopse: true })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(true);
    expect(r.semAcao.some((s) => s.codigo === 'SEM_ACAO_SINOPSE')).toBe(true);
    expect(r.alteracoes).toHaveLength(0);
  });

  it('sinopse vazia → sem ação', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { sinopse: '' })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(true);
    expect(r.semAcao.some((s) => s.codigo === 'SEM_ACAO_SINOPSE')).toBe(true);
  });

  it('sinopse com apenas placeholder → sem ação', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { sinopse: PLACEHOLDER })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(true);
    expect(r.semAcao.some((s) => s.codigo === 'SEM_ACAO_SINOPSE')).toBe(true);
  });

  it('sinopse já idêntica no bloco → sem ação', () => {
    const notaComBloco = `# Titulo\n\nConteúdo.\n\n${blocoControlado(ID, SINOPSE_TEXTO)}`;
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [makeNota(FILE_PATH, notaComBloco)],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(true);
    expect(r.semAcao.some((s) => s.codigo === 'SINOPSE_JA_NO_BLOCO')).toBe(true);
    expect(r.alteracoes).toHaveLength(0);
  });

  it('arquivo não importável (tipo desconhecido) → sem ação', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada({ tipo: 'tipo_desconhecido' }),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(true);
    expect(r.semAcao.some((s) => s.codigo === 'NAO_IMPORTAVEL')).toBe(true);
  });
});

// ─── Inserção no fim ──────────────────────────────────────────────────────────

describe('inserção no fim', () => {
  it('insere bloco no fim da nota', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    expect(r.podeAplicar).toBe(true);
    expect(r.alteracoes).toHaveLength(1);
    const alt = r.alteracoes[0];
    expect(alt.tipo).toBe('inserir_bloco_sinopse');
    expect(alt.conteudoAtualizado).toContain(SINOPSE_TEXTO);
    expect(alt.conteudoAtualizado).toContain(`<!-- CONTRARIUS:SCRIVENER-SINOPSE:START id="${ID}" -->`);
    expect(alt.conteudoAtualizado).toContain(`<!-- CONTRARIUS:SCRIVENER-SINOPSE:END id="${ID}" -->`);
    expect(alt.conteudoAtualizado).toContain('## Sinopse importada do Scrivener');
  });

  it('conteúdoAtualizado contém bloco proposto exatamente', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    const alt = r.alteracoes[0];
    expect(alt.conteudoAtualizado).toContain(alt.blocoProposto);
  });

  it('preserva conteúdo original antes do bloco', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    const alt = r.alteracoes[0];
    expect(alt.conteudoAtualizado).toContain('Conteúdo da nota original.');
  });

  it('conteudoAtualizado termina com quebra de linha', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    expect(r.alteracoes[0].conteudoAtualizado.endsWith('\n')).toBe(true);
  });

  it('nota sem quebra final recebe quebra antes do bloco', () => {
    const notaSemQuebra = `# Titulo\n\nConteúdo.`;
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [makeNota(FILE_PATH, notaSemQuebra)],
      geradoEm: GERADO_EM,
    });
    expect(r.alteracoes[0].conteudoAtualizado.endsWith('\n')).toBe(true);
    expect(r.alteracoes[0].conteudoAtualizado).toContain(
      `<!-- CONTRARIUS:SCRIVENER-SINOPSE:START id="${ID}" -->`,
    );
  });
});

// ─── Substituição do bloco ────────────────────────────────────────────────────

describe('substituição do bloco existente', () => {
  it('substitui bloco com sinopse diferente', () => {
    const sinopseAntiga = 'Sinopse antiga.';
    const notaComBloco = `# Titulo\n\nTexto.\n\n${blocoControlado(ID, sinopseAntiga)}`;
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [makeNota(FILE_PATH, notaComBloco)],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(true);
    expect(r.alteracoes).toHaveLength(1);
    const alt = r.alteracoes[0];
    expect(alt.tipo).toBe('substituir_bloco_sinopse');
    expect(alt.conteudoAtualizado).toContain(SINOPSE_TEXTO);
    expect(alt.conteudoAtualizado).not.toContain(sinopseAntiga);
  });

  it('preserva texto antes do bloco na substituição', () => {
    const notaComBloco = `# Titulo\n\nTexto externo antes.\n\n${blocoControlado(ID, 'antiga')}`;
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [makeNota(FILE_PATH, notaComBloco)],
      geradoEm: GERADO_EM,
    });
    expect(r.alteracoes[0].conteudoAtualizado).toContain('Texto externo antes.');
  });

  it('preserva texto após o bloco na substituição', () => {
    const notaComBloco =
      `# Titulo\n\n${blocoControlado(ID, 'antiga')}\nTexto externo depois.\n`;
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [makeNota(FILE_PATH, notaComBloco)],
      geradoEm: GERADO_EM,
    });
    expect(r.alteracoes[0].conteudoAtualizado).toContain('Texto externo depois.');
  });

  it('substituição termina com quebra de linha', () => {
    const notaComBloco = `# Titulo\n\n${blocoControlado(ID, 'antiga')}`;
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [makeNota(FILE_PATH, notaComBloco)],
      geradoEm: GERADO_EM,
    });
    expect(r.alteracoes[0].conteudoAtualizado.endsWith('\n')).toBe(true);
  });
});

// ─── Preservação de frontmatter ───────────────────────────────────────────────

describe('preservação de frontmatter', () => {
  it('frontmatter YAML é preservado na inserção', () => {
    const notaComFrontmatter =
      `---\nid: ${ID}\ntitulo: ${TITULO}\n---\n\nConteúdo.\n`;
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [makeNota(FILE_PATH, notaComFrontmatter)],
      geradoEm: GERADO_EM,
    });
    const atualizado = r.alteracoes[0].conteudoAtualizado;
    expect(atualizado).toContain('---\nid:');
    expect(atualizado).toContain(`id: ${ID}`);
  });

  it('frontmatter YAML é preservado na substituição', () => {
    const notaComFrontmatter =
      `---\nid: ${ID}\n---\n\nConteúdo.\n\n${blocoControlado(ID, 'antiga')}\n`;
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [makeNota(FILE_PATH, notaComFrontmatter)],
      geradoEm: GERADO_EM,
    });
    const atualizado = r.alteracoes[0].conteudoAtualizado;
    expect(atualizado).toContain('---\nid:');
    expect(atualizado.startsWith('---')).toBe(true);
  });
});

// ─── Estrutura do bloco proposto ──────────────────────────────────────────────

describe('estrutura do bloco proposto', () => {
  it('blocoProposto contém START com ID correto', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    expect(r.alteracoes[0].blocoProposto).toContain(
      `<!-- CONTRARIUS:SCRIVENER-SINOPSE:START id="${ID}" -->`,
    );
  });

  it('blocoProposto contém END com ID correto', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    expect(r.alteracoes[0].blocoProposto).toContain(
      `<!-- CONTRARIUS:SCRIVENER-SINOPSE:END id="${ID}" -->`,
    );
  });

  it('blocoProposto contém título da seção', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    expect(r.alteracoes[0].blocoProposto).toContain('## Sinopse importada do Scrivener');
  });

  it('blocoProposto contém a sinopse extraída', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    expect(r.alteracoes[0].blocoProposto).toContain(SINOPSE_TEXTO);
  });
});

// ─── Extração de sinopse ──────────────────────────────────────────────────────

describe('extração de sinopse', () => {
  it('extrai sinopse com múltiplas linhas', () => {
    const sinopseMultilinha = 'Linha um.\n\nLinha dois.\n\nLinha três.';
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { sinopse: sinopseMultilinha })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    });
    expect(r.alteracoes[0].sinopseExtraida).toBe(sinopseMultilinha);
  });

  it('para extração antes do próximo ## heading', () => {
    const conteudo =
      `# T\n\n- ID: ${ID}\n- Ordem narrativa: ${ORDEM}\n- Caminho original: ${FILE_PATH}\n\n` +
      `## Sinopse de escrita\n\nSinopse aqui.\n\n## Outra seção\n\nNão deve ser extraído.\n`;
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [{ caminhoRelativo: CAMINHO_RELATIVO, conteudo }],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    });
    expect(r.alteracoes[0].sinopseExtraida).toBe('Sinopse aqui.');
    expect(r.alteracoes[0].sinopseExtraida).not.toContain('Outra seção');
  });

  it('lida com Unicode na sinopse', () => {
    const sinopseUnicode = 'Çá está o açúcar: ñoño, ümlaüt, 日本語, العربية';
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { sinopse: sinopseUnicode })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    });
    expect(r.alteracoes[0].sinopseExtraida).toBe(sinopseUnicode);
    expect(r.alteracoes[0].conteudoAtualizado).toContain(sinopseUnicode);
  });
});

// ─── podeAplicar ─────────────────────────────────────────────────────────────

describe('podeAplicar', () => {
  it('false quando há bloqueios', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: 'invalido',
      arquivosScrivener: [],
      notasOriginais: [],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
  });

  it('true quando não há bloqueios', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    expect(r.podeAplicar).toBe(true);
  });

  it('true mesmo com apenas sem ação', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { semSinopse: true })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(true);
    expect(r.semAcao).toHaveLength(1);
    expect(r.alteracoes).toHaveLength(0);
  });

  it('false quando há um bloqueio mesmo com outras entradas válidas', () => {
    const CAMINHO2 = 'Livro1/020-e002.md';
    const manifesto = JSON.stringify({
      tipo: MANIFESTO_TIPO,
      arquivos: [
        makeEntrada({ caminhoRelativo: CAMINHO_RELATIVO }),
        makeEntrada({ caminhoRelativo: CAMINHO2, id: 'E-002', filePath: 'inexistente.md' }),
      ],
    });
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: manifesto,
      arquivosScrivener: [
        makeArquivoScrivener(CAMINHO_RELATIVO),
        { caminhoRelativo: CAMINHO2, conteudo: makeConteudoScrivener({ id: 'E-002', ordem: 20, caminhoOriginal: 'inexistente.md' }) },
      ],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    });
    expect(r.podeAplicar).toBe(false);
  });
});

// ─── Relatório ────────────────────────────────────────────────────────────────

describe('relatório', () => {
  it('título correto', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    expect(r.relatorioMarkdown).toContain('# Aplicação controlada Scrivener');
  });

  it('declara frontmatter não alterado', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    expect(r.relatorioMarkdown).toContain(
      'Nenhum frontmatter deve ser alterado por esta aplicação.',
    );
  });

  it('contém resumo', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    expect(r.relatorioMarkdown).toContain('## Resumo');
    expect(r.relatorioMarkdown).toContain('- Alterações:');
    expect(r.relatorioMarkdown).toContain('- Bloqueios:');
    expect(r.relatorioMarkdown).toContain('- Sem ação:');
  });

  it('declara bloqueio quando há bloqueios', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: 'invalido',
      arquivosScrivener: [],
      notasOriginais: [],
      geradoEm: GERADO_EM,
    });
    expect(r.relatorioMarkdown).toContain('BLOQUEADA');
  });

  it('não declara bloqueio quando não há bloqueios', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    expect(r.relatorioMarkdown).not.toContain('BLOQUEADA');
  });

  it('seção de alterações presente quando há alterações', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    expect(r.relatorioMarkdown).toContain('## Alterações');
    expect(r.relatorioMarkdown).toContain(TITULO);
  });

  it('seção de bloqueios presente quando há bloqueios', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [], // arquivo ausente
      notasOriginais: [],
      geradoEm: GERADO_EM,
    });
    expect(r.relatorioMarkdown).toContain('## Bloqueios');
  });

  it('seção sem ação presente quando há sem ação', () => {
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener(CAMINHO_RELATIVO, { semSinopse: true })],
      notasOriginais: [makeNota()],
      geradoEm: GERADO_EM,
    });
    expect(r.relatorioMarkdown).toContain('## Sem ação');
  });

  it('termina com quebra de linha', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    expect(r.relatorioMarkdown.endsWith('\n')).toBe(true);
  });

  it('sem strings proibidas no relatório', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    for (const str of ['undefined', 'NaN', 'Infinity', '[object Object]']) {
      expect(r.relatorioMarkdown).not.toContain(str);
    }
  });

  it('sem stack trace no relatório', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    expect(r.relatorioMarkdown).not.toMatch(/at \w+/);
    expect(r.relatorioMarkdown).not.toContain('Error:');
  });
});

// ─── Imutabilidade e equivalência ────────────────────────────────────────────

describe('imutabilidade e equivalência', () => {
  it('não muta a entrada', () => {
    const dados = dadosBase();
    const jsonAntes = JSON.stringify(dados);
    gerarAplicacaoControladaScrivener(dados);
    expect(JSON.stringify(dados)).toBe(jsonAntes);
  });

  it('retorna novo objeto a cada chamada', () => {
    const dados = dadosBase();
    const r1 = gerarAplicacaoControladaScrivener(dados);
    const r2 = gerarAplicacaoControladaScrivener(dados);
    expect(r1).not.toBe(r2);
    expect(r1.alteracoes).not.toBe(r2.alteracoes);
    expect(r1.bloqueios).not.toBe(r2.bloqueios);
    expect(r1.semAcao).not.toBe(r2.semAcao);
  });

  it('chamadas equivalentes retornam resultado equivalente', () => {
    const dados = dadosBase();
    const r1 = gerarAplicacaoControladaScrivener(dados);
    const r2 = gerarAplicacaoControladaScrivener(dados);
    expect(r1.podeAplicar).toBe(r2.podeAplicar);
    expect(r1.alteracoes.length).toBe(r2.alteracoes.length);
    expect(r1.bloqueios.length).toBe(r2.bloqueios.length);
    expect(r1.semAcao.length).toBe(r2.semAcao.length);
    expect(r1.relatorioMarkdown).toBe(r2.relatorioMarkdown);
  });
});

// ─── Campos da alteração ──────────────────────────────────────────────────────

describe('campos da alteração', () => {
  it('idEvento, titulo, caminhoScrivener, filePathOriginal preenchidos', () => {
    const r = gerarAplicacaoControladaScrivener(dadosBase());
    const alt = r.alteracoes[0];
    expect(alt.idEvento).toBe(ID);
    expect(alt.titulo).toBe(TITULO);
    expect(alt.caminhoScrivener).toBe(CAMINHO_RELATIVO);
    expect(alt.filePathOriginal).toBe(FILE_PATH);
  });

  it('conteudoOriginal é o conteúdo da nota antes da alteração', () => {
    const conteudoNota = `# ${TITULO}\n\nConteúdo original.\n`;
    const r = gerarAplicacaoControladaScrivener({
      manifestoJson: makeManifestoComEntrada(),
      arquivosScrivener: [makeArquivoScrivener()],
      notasOriginais: [makeNota(FILE_PATH, conteudoNota)],
      geradoEm: GERADO_EM,
    });
    expect(r.alteracoes[0].conteudoOriginal).toBe(conteudoNota);
  });
});

// ─── Arquivos vazios ──────────────────────────────────────────────────────────

it('manifesto com arquivos vazios retorna podeAplicar true sem alterações', () => {
  const r = gerarAplicacaoControladaScrivener({
    manifestoJson: makeManifesto(),
    arquivosScrivener: [],
    notasOriginais: [],
    geradoEm: GERADO_EM,
  });
  expect(r.podeAplicar).toBe(true);
  expect(r.alteracoes).toHaveLength(0);
  expect(r.bloqueios).toHaveLength(0);
  expect(r.semAcao).toHaveLength(0);
});
