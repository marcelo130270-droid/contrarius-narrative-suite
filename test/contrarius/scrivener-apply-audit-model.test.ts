import { describe, expect, it } from 'vitest';
import {
  auditarAplicacaoScrivener,
  type ArquivoScrivenerAuditoriaAplicacao,
  type BackupAuditoriaAplicacao,
  type DadosAuditoriaAplicacaoScrivener,
  type NotaOriginalAuditoriaAplicacao,
} from '../../src/contrarius/scrivener-apply-audit-model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GERADO_EM = '2026-07-06 10:00';
const MANIFESTO_TIPO = 'contrarius-scrivener-export';
const CAMINHO = 'Livro1/010-e001.md';
const ID = 'E-001';
const FILE_PATH = '05_Eventos/E-001.md';
const ORDEM = 10;
const SINOPSE_TEXTO = 'Texto da sinopse aqui.';
const PLACEHOLDER = '[preencher no Scrivener]';

function makeManifesto(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ tipo: MANIFESTO_TIPO, arquivos: [], ...overrides });
}

function makeEntrada(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tipo: 'evento_posicionado',
    caminhoRelativo: CAMINHO,
    id: ID,
    filePath: FILE_PATH,
    ordemNarrativa: ORDEM,
    ...overrides,
  };
}

function makeManifestoComEntrada(overridesEntrada: Record<string, unknown> = {}): string {
  return JSON.stringify({ tipo: MANIFESTO_TIPO, arquivos: [makeEntrada(overridesEntrada)] });
}

interface ConteudoOpts {
  id?: string;
  ordem?: string | number;
  sinopse?: string;
  caminhoOriginal?: string;
  semSinopse?: boolean;
  semOrdem?: boolean;
  semCaminhoOriginal?: boolean;
  semObservacoes?: boolean;
  duplicarSinopse?: boolean;
}

function makeConteudoScrivener(opts: ConteudoOpts = {}): string {
  const id = opts.id ?? ID;
  const ordem = opts.ordem !== undefined ? String(opts.ordem) : String(ORDEM);
  const caminhoOrig = opts.caminhoOriginal ?? FILE_PATH;
  const sinopse = opts.sinopse ?? SINOPSE_TEXTO;

  const linhas: string[] = [`# Título`, '', `- ID: ${id}`];
  if (!opts.semOrdem) linhas.push(`- Ordem narrativa: ${ordem}`);
  linhas.push('');
  if (!opts.semSinopse) {
    linhas.push('## Sinopse de escrita', '', sinopse, '');
    if (opts.duplicarSinopse) linhas.push('## Sinopse de escrita', '', sinopse, '');
  }
  if (!opts.semObservacoes) linhas.push('## Observações estruturais', '');
  if (!opts.semCaminhoOriginal) linhas.push(`- Caminho original: ${caminhoOrig}`);
  linhas.push('');
  return linhas.join('\n');
}

function makeArquivo(
  caminhoRelativo = CAMINHO,
  opts: ConteudoOpts = {},
): ArquivoScrivenerAuditoriaAplicacao {
  return { caminhoRelativo, conteudo: makeConteudoScrivener(opts) };
}

function makeNota(
  filePath = FILE_PATH,
  conteudo = `# Título\n\nConteúdo original.\n`,
): NotaOriginalAuditoriaAplicacao {
  return { filePath, conteudo };
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

function makeNotaComBloco(
  filePath = FILE_PATH,
  sinopse = SINOPSE_TEXTO,
  id = ID,
): NotaOriginalAuditoriaAplicacao {
  return { filePath, conteudo: `# Título\n\nConteúdo original.\n\n${blocoControlado(id, sinopse)}` };
}

function makeBackup(
  filePathOriginal = FILE_PATH,
  caminhoBackup = `BACKUP_ANTES_APLICACAO/${FILE_PATH.replace(/\//g, '_')}`,
): BackupAuditoriaAplicacao {
  return { filePathOriginal, caminhoBackup, conteudo: `# Título\n\nConteúdo antes.\n` };
}

function dadosBase(): DadosAuditoriaAplicacaoScrivener {
  return {
    manifestoJson: makeManifestoComEntrada(),
    arquivosScrivener: [makeArquivo()],
    notasOriginais: [makeNota()],
    backups: [],
    geradoEm: GERADO_EM,
  };
}

const STRINGS_INVALIDAS = ['undefined', '[object Object]', 'NaN', 'Infinity'];

// ─── Testes de erros críticos no manifesto ────────────────────────────────────

describe('manifesto inválido', () => {
  it('json quebrado emite MANIFESTO_JSON_INVALIDO e retorna', () => {
    const r = auditarAplicacaoScrivener({ ...dadosBase(), manifestoJson: '{not json' });
    expect(r.erros.some((e) => e.codigo === 'MANIFESTO_JSON_INVALIDO')).toBe(true);
    expect(r.sucesso).toBe(false);
  });

  it('json não-objeto emite MANIFESTO_JSON_INVALIDO', () => {
    const r = auditarAplicacaoScrivener({ ...dadosBase(), manifestoJson: '"string"' });
    expect(r.erros.some((e) => e.codigo === 'MANIFESTO_JSON_INVALIDO')).toBe(true);
  });
});

describe('tipo inválido', () => {
  it('tipo incorreto emite MANIFESTO_TIPO_INVALIDO e retorna', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      manifestoJson: makeManifesto({ tipo: 'outro' }),
    });
    expect(r.erros.some((e) => e.codigo === 'MANIFESTO_TIPO_INVALIDO')).toBe(true);
    expect(r.sucesso).toBe(false);
  });
});

describe('sem array arquivos', () => {
  it('manifesto sem array "arquivos" emite MANIFESTO_SEM_ARRAY_ARQUIVOS', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      manifestoJson: JSON.stringify({ tipo: MANIFESTO_TIPO, arquivos: 'nao-array' }),
    });
    expect(r.erros.some((e) => e.codigo === 'MANIFESTO_SEM_ARRAY_ARQUIVOS')).toBe(true);
  });
});

// ─── Testes de erros por item ─────────────────────────────────────────────────

describe('item sem caminho', () => {
  it('item sem caminhoRelativo emite ITEM_SEM_CAMINHO', () => {
    const manifesto = JSON.stringify({
      tipo: MANIFESTO_TIPO,
      arquivos: [{ tipo: 'evento_posicionado', id: ID }],
    });
    const r = auditarAplicacaoScrivener({ ...dadosBase(), manifestoJson: manifesto });
    expect(r.erros.some((e) => e.codigo === 'ITEM_SEM_CAMINHO')).toBe(true);
  });
});

describe('arquivo ausente', () => {
  it('arquivo Scrivener listado mas não fornecido emite ARQUIVO_AUSENTE', () => {
    const r = auditarAplicacaoScrivener({ ...dadosBase(), arquivosScrivener: [] });
    expect(r.erros.some((e) => e.codigo === 'ARQUIVO_AUSENTE')).toBe(true);
  });
});

describe('nota ausente', () => {
  it('nota original não fornecida emite NOTA_ORIGINAL_AUSENTE', () => {
    const r = auditarAplicacaoScrivener({ ...dadosBase(), notasOriginais: [] });
    expect(r.erros.some((e) => e.codigo === 'NOTA_ORIGINAL_AUSENTE')).toBe(true);
  });
});

describe('ID divergente', () => {
  it('ID no arquivo Scrivener diferente do manifesto emite ID_DIVERGENTE', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      arquivosScrivener: [makeArquivo(CAMINHO, { id: 'E-999' })],
    });
    expect(r.erros.some((e) => e.codigo === 'ID_DIVERGENTE')).toBe(true);
  });
});

describe('caminho original divergente', () => {
  it('caminho original no arquivo diferente do manifesto emite CAMINHO_ORIGINAL_DIVERGENTE', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      arquivosScrivener: [makeArquivo(CAMINHO, { caminhoOriginal: '05_Eventos/Outro.md' })],
    });
    expect(r.erros.some((e) => e.codigo === 'CAMINHO_ORIGINAL_DIVERGENTE')).toBe(true);
  });
});

describe('ordem divergente', () => {
  it('ordem narrativa no arquivo diferente do manifesto emite ORDEM_DIVERGENTE', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      arquivosScrivener: [makeArquivo(CAMINHO, { ordem: 99 })],
    });
    expect(r.erros.some((e) => e.codigo === 'ORDEM_DIVERGENTE')).toBe(true);
  });
});

describe('Sinopse duplicada', () => {
  it('seção "## Sinopse de escrita" duplicada emite SECAO_SINOPSE_DUPLICADA', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      arquivosScrivener: [makeArquivo(CAMINHO, { duplicarSinopse: true })],
    });
    expect(r.erros.some((e) => e.codigo === 'SECAO_SINOPSE_DUPLICADA')).toBe(true);
  });
});

describe('START sem END', () => {
  it('bloco com START sem END emite BLOCO_START_SEM_END', () => {
    const notaComStartSemEnd = `# Título\n\n<!-- CONTRARIUS:SCRIVENER-SINOPSE:START id="${ID}" -->\n## Sinopse importada do Scrivener\n\nConteúdo.\n`;
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      notasOriginais: [{ filePath: FILE_PATH, conteudo: notaComStartSemEnd }],
    });
    expect(r.erros.some((e) => e.codigo === 'BLOCO_START_SEM_END')).toBe(true);
  });
});

describe('END sem START', () => {
  it('bloco com END sem START emite BLOCO_END_SEM_START', () => {
    const notaComEndSemStart = `# Título\n\nConteúdo.\n\n<!-- CONTRARIUS:SCRIVENER-SINOPSE:END id="${ID}" -->\n`;
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      notasOriginais: [{ filePath: FILE_PATH, conteudo: notaComEndSemStart }],
    });
    expect(r.erros.some((e) => e.codigo === 'BLOCO_END_SEM_START')).toBe(true);
  });
});

describe('múltiplos blocos', () => {
  it('múltiplos blocos controlados para o mesmo ID emite MULTIPLOS_BLOCOS', () => {
    const duplo = blocoControlado(ID, SINOPSE_TEXTO) + '\n' + blocoControlado(ID, SINOPSE_TEXTO);
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      notasOriginais: [{ filePath: FILE_PATH, conteudo: `# Título\n\n${duplo}` }],
    });
    expect(r.erros.some((e) => e.codigo === 'MULTIPLOS_BLOCOS')).toBe(true);
  });
});

describe('bloco divergente', () => {
  it('bloco presente mas conteúdo difere da sinopse emite BLOCO_DIVERGENTE', () => {
    const notaComBlocoDesatualizado = `# Título\n\n${blocoControlado(ID, 'Sinopse antiga.')}`;
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      arquivosScrivener: [makeArquivo(CAMINHO, { sinopse: 'Sinopse nova diferente.' })],
      notasOriginais: [{ filePath: FILE_PATH, conteudo: notaComBlocoDesatualizado }],
    });
    expect(r.erros.some((e) => e.codigo === 'BLOCO_DIVERGENTE')).toBe(true);
  });
});

describe('bloco com placeholder', () => {
  it('bloco presente na nota mas sinopse é placeholder emite BLOCO_PARA_PLACEHOLDER', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      arquivosScrivener: [makeArquivo(CAMINHO, { sinopse: PLACEHOLDER })],
      notasOriginais: [makeNotaComBloco(FILE_PATH, SINOPSE_TEXTO)],
    });
    expect(r.erros.some((e) => e.codigo === 'BLOCO_PARA_PLACEHOLDER')).toBe(true);
  });
});

describe('bloco com sinopse vazia', () => {
  it('bloco presente na nota mas sinopse do Scrivener está vazia emite BLOCO_PARA_SINOPSE_VAZIA', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      arquivosScrivener: [makeArquivo(CAMINHO, { sinopse: '' })],
      notasOriginais: [makeNotaComBloco(FILE_PATH, SINOPSE_TEXTO)],
    });
    expect(r.erros.some((e) => e.codigo === 'BLOCO_PARA_SINOPSE_VAZIA')).toBe(true);
  });
});

describe('strings suspeitas', () => {
  it('arquivo Scrivener contendo "undefined" emite CONTEUDO_SUSPEITO', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      arquivosScrivener: [{ caminhoRelativo: CAMINHO, conteudo: makeConteudoScrivener() + 'undefined' }],
    });
    expect(r.erros.some((e) => e.codigo === 'CONTEUDO_SUSPEITO')).toBe(true);
  });

  it('arquivo Scrivener contendo "[object Object]" emite CONTEUDO_SUSPEITO', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      arquivosScrivener: [{ caminhoRelativo: CAMINHO, conteudo: makeConteudoScrivener() + '[object Object]' }],
    });
    expect(r.erros.some((e) => e.codigo === 'CONTEUDO_SUSPEITO')).toBe(true);
  });

  it('arquivo Scrivener contendo "NaN" emite CONTEUDO_SUSPEITO', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      arquivosScrivener: [{ caminhoRelativo: CAMINHO, conteudo: makeConteudoScrivener() + 'NaN' }],
    });
    expect(r.erros.some((e) => e.codigo === 'CONTEUDO_SUSPEITO')).toBe(true);
  });

  it('arquivo Scrivener contendo "Infinity" emite CONTEUDO_SUSPEITO', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      arquivosScrivener: [{ caminhoRelativo: CAMINHO, conteudo: makeConteudoScrivener() + 'Infinity' }],
    });
    expect(r.erros.some((e) => e.codigo === 'CONTEUDO_SUSPEITO')).toBe(true);
  });
});

// ─── Testes de avisos ─────────────────────────────────────────────────────────

describe('aviso sinopse sem bloco', () => {
  it('sinopse preenchida mas sem bloco na nota emite SINOPSE_SEM_BLOCO', () => {
    const r = auditarAplicacaoScrivener(dadosBase());
    expect(r.avisos.some((a) => a.codigo === 'SINOPSE_SEM_BLOCO')).toBe(true);
    expect(r.sucesso).toBe(true);
  });
});

describe('aviso bloco sem backup', () => {
  it('bloco na nota mas sem backup emite BLOCO_SEM_BACKUP', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      notasOriginais: [makeNotaComBloco()],
      backups: [],
    });
    expect(r.avisos.some((a) => a.codigo === 'BLOCO_SEM_BACKUP')).toBe(true);
  });
});

describe('aviso backup sem bloco', () => {
  it('backup presente mas nota sem bloco emite BACKUP_SEM_BLOCO', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      notasOriginais: [makeNota()],
      backups: [makeBackup()],
    });
    expect(r.avisos.some((a) => a.codigo === 'BACKUP_SEM_BLOCO')).toBe(true);
  });
});

describe('aviso backup sem manifesto', () => {
  it('backup sem filePathOriginal correspondente no manifesto emite BACKUP_SEM_MANIFESTO', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      backups: [makeBackup('05_Eventos/Desconhecido.md', 'BACKUP_ANTES_APLICACAO/05_Eventos_Desconhecido.md')],
    });
    expect(r.avisos.some((a) => a.codigo === 'BACKUP_SEM_MANIFESTO')).toBe(true);
  });

  it('backup com filePathOriginal vazio emite BACKUP_SEM_MANIFESTO', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      backups: [{ filePathOriginal: '', caminhoBackup: 'BACKUP_ANTES_APLICACAO/algum.md', conteudo: '' }],
    });
    expect(r.avisos.some((a) => a.codigo === 'BACKUP_SEM_MANIFESTO')).toBe(true);
  });
});

describe('sem seção Sinopse', () => {
  it('arquivo Scrivener sem "## Sinopse de escrita" emite SEM_SECAO_SINOPSE', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      arquivosScrivener: [makeArquivo(CAMINHO, { semSinopse: true })],
    });
    expect(r.avisos.some((a) => a.codigo === 'SEM_SECAO_SINOPSE')).toBe(true);
  });
});

describe('sem Observações estruturais', () => {
  it('arquivo Scrivener sem "## Observações estruturais" emite SEM_OBSERVACOES', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      arquivosScrivener: [makeArquivo(CAMINHO, { semObservacoes: true })],
    });
    expect(r.avisos.some((a) => a.codigo === 'SEM_OBSERVACOES')).toBe(true);
  });
});

describe('tipo desconhecido', () => {
  it('tipo de item não reconhecido emite TIPO_DESCONHECIDO', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      manifestoJson: makeManifestoComEntrada({ tipo: 'desconhecido' }),
    });
    expect(r.avisos.some((a) => a.codigo === 'TIPO_DESCONHECIDO')).toBe(true);
  });
});

describe('Evento sem ordem', () => {
  it('evento_posicionado sem ordemNarrativa emite EVENTO_SEM_ORDEM', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      manifestoJson: makeManifestoComEntrada({ tipo: 'evento_posicionado', ordemNarrativa: null }),
    });
    expect(r.avisos.some((a) => a.codigo === 'EVENTO_SEM_ORDEM')).toBe(true);
  });
});

// ─── Testes de OK ─────────────────────────────────────────────────────────────

describe('ok bloco idêntico', () => {
  it('sinopse preenchida e bloco idêntico na nota emite BLOCO_IDENTICO', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      notasOriginais: [makeNotaComBloco()],
    });
    expect(r.oks.some((o) => o.codigo === 'BLOCO_IDENTICO')).toBe(true);
  });
});

describe('ok placeholder sem bloco', () => {
  it('sinopse com placeholder e sem bloco emite PLACEHOLDER_SEM_BLOCO', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      arquivosScrivener: [makeArquivo(CAMINHO, { sinopse: PLACEHOLDER })],
    });
    expect(r.oks.some((o) => o.codigo === 'PLACEHOLDER_SEM_BLOCO')).toBe(true);
  });

  it('sinopse vazia e sem bloco emite PLACEHOLDER_SEM_BLOCO', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      arquivosScrivener: [makeArquivo(CAMINHO, { sinopse: '' })],
    });
    expect(r.oks.some((o) => o.codigo === 'PLACEHOLDER_SEM_BLOCO')).toBe(true);
  });
});

describe('ok backup presente', () => {
  it('backup presente para nota com bloco emite BACKUP_PRESENTE', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      notasOriginais: [makeNotaComBloco()],
      backups: [makeBackup()],
    });
    expect(r.oks.some((o) => o.codigo === 'BACKUP_PRESENTE')).toBe(true);
  });
});

describe('ok quantidade', () => {
  it('emite QUANTIDADE_AUDITADA com total de eventos', () => {
    const r = auditarAplicacaoScrivener(dadosBase());
    const qOk = r.oks.find((o) => o.codigo === 'QUANTIDADE_AUDITADA');
    expect(qOk).toBeDefined();
    expect(qOk?.mensagem).toContain('1');
  });

  it('conta apenas itens com tipo em TIPOS_EVENTO', () => {
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      manifestoJson: makeManifestoComEntrada({ tipo: 'desconhecido' }),
    });
    const qOk = r.oks.find((o) => o.codigo === 'QUANTIDADE_AUDITADA');
    expect(qOk?.mensagem).toContain('0');
  });
});

// ─── Testes de sucesso/falha ──────────────────────────────────────────────────

describe('sucesso false com erro', () => {
  it('sucesso é false quando há pelo menos um erro', () => {
    const r = auditarAplicacaoScrivener({ ...dadosBase(), arquivosScrivener: [] });
    expect(r.sucesso).toBe(false);
    expect(r.erros.length).toBeGreaterThan(0);
  });
});

describe('sucesso true com avisos', () => {
  it('sucesso é true quando há avisos mas nenhum erro', () => {
    const r = auditarAplicacaoScrivener(dadosBase());
    expect(r.avisos.length).toBeGreaterThan(0);
    expect(r.sucesso).toBe(true);
  });
});

describe('separação ok/avisos/erros', () => {
  it('erros, avisos e oks são subconjuntos de itens com nível correto', () => {
    const r = auditarAplicacaoScrivener({ ...dadosBase(), arquivosScrivener: [] });
    expect(r.itens.length).toBe(r.erros.length + r.avisos.length + r.oks.length);
    expect(r.erros.every((i) => i.nivel === 'erro')).toBe(true);
    expect(r.avisos.every((i) => i.nivel === 'aviso')).toBe(true);
    expect(r.oks.every((i) => i.nivel === 'ok')).toBe(true);
  });
});

// ─── Testes do relatório ──────────────────────────────────────────────────────

describe('relatório com erros/avisos/OK', () => {
  it('relatório contém cabeçalho correto', () => {
    const r = auditarAplicacaoScrivener(dadosBase());
    expect(r.relatorioMarkdown).toContain('# Auditoria da aplicação Scrivener');
    expect(r.relatorioMarkdown).toContain(`Gerado em: ${GERADO_EM}`);
    expect(r.relatorioMarkdown).toContain('## Resumo');
    expect(r.relatorioMarkdown).toContain('## Erros');
    expect(r.relatorioMarkdown).toContain('## Avisos');
    expect(r.relatorioMarkdown).toContain('## OK');
  });

  it('relatório contém contagens no resumo', () => {
    const r = auditarAplicacaoScrivener({ ...dadosBase(), arquivosScrivener: [] });
    expect(r.relatorioMarkdown).toContain(`- Erros: ${r.erros.length}`);
    expect(r.relatorioMarkdown).toContain(`- Avisos: ${r.avisos.length}`);
    expect(r.relatorioMarkdown).toContain(`- OK: ${r.oks.length}`);
  });

  it('relatório lista o código do erro', () => {
    const r = auditarAplicacaoScrivener({ ...dadosBase(), arquivosScrivener: [] });
    expect(r.relatorioMarkdown).toContain('ARQUIVO_AUSENTE');
  });
});

describe('frase de não alteração', () => {
  it('relatório contém frase de não alteração', () => {
    const r = auditarAplicacaoScrivener(dadosBase());
    expect(r.relatorioMarkdown).toContain('Nenhuma nota do Vault foi alterada por esta auditoria.');
  });
});

describe('quebra final', () => {
  it('relatorioMarkdown termina com quebra de linha', () => {
    const r = auditarAplicacaoScrivener(dadosBase());
    expect(r.relatorioMarkdown.endsWith('\n')).toBe(true);
  });

  it('relatorioMarkdown com erros termina com quebra de linha', () => {
    const r = auditarAplicacaoScrivener({ ...dadosBase(), arquivosScrivener: [] });
    expect(r.relatorioMarkdown.endsWith('\n')).toBe(true);
  });
});

describe('sem strings inválidas', () => {
  it('relatório de cenário normal não contém strings inválidas', () => {
    const r = auditarAplicacaoScrivener(dadosBase());
    for (const s of STRINGS_INVALIDAS) {
      expect(r.relatorioMarkdown).not.toContain(s);
    }
  });
});

describe('sem stack trace', () => {
  it('relatório não contém stack trace mesmo quando manifesto é inválido', () => {
    const r = auditarAplicacaoScrivener({ ...dadosBase(), manifestoJson: '{bad json' });
    expect(r.relatorioMarkdown).not.toMatch(/\bat\s+\w/);
    expect(r.relatorioMarkdown).not.toContain('Error:');
  });
});

describe('Unicode', () => {
  it('filePath com caracteres Unicode é tratado corretamente', () => {
    const fpUnicode = '05_Eventos/Açaí e ção.md';
    const manifesto = JSON.stringify({
      tipo: MANIFESTO_TIPO,
      arquivos: [makeEntrada({ filePath: fpUnicode })],
    });
    const r = auditarAplicacaoScrivener({
      ...dadosBase(),
      manifestoJson: manifesto,
      notasOriginais: [],
    });
    expect(r.erros.some((e) => e.codigo === 'NOTA_ORIGINAL_AUSENTE')).toBe(true);
    expect(r.erros[0].filePathOriginal).toBe(fpUnicode);
  });
});

describe('não muta entrada', () => {
  it('dados de entrada não são modificados após a chamada', () => {
    const dados = dadosBase();
    const arquivosOriginal = dados.arquivosScrivener;
    const notasOriginal = dados.notasOriginais;
    auditarAplicacaoScrivener(dados);
    expect(dados.arquivosScrivener).toBe(arquivosOriginal);
    expect(dados.notasOriginais).toBe(notasOriginal);
  });
});

describe('resultado novo', () => {
  it('cada chamada retorna um resultado com arrays distintos', () => {
    const dados = dadosBase();
    const r1 = auditarAplicacaoScrivener(dados);
    const r2 = auditarAplicacaoScrivener(dados);
    expect(r1.itens).not.toBe(r2.itens);
    expect(r1.erros).not.toBe(r2.erros);
    expect(r1.oks).not.toBe(r2.oks);
  });
});

describe('chamadas equivalentes', () => {
  it('duas chamadas com mesma entrada produzem resultado estruturalmente igual', () => {
    const dados = dadosBase();
    const r1 = auditarAplicacaoScrivener(dados);
    const r2 = auditarAplicacaoScrivener(dados);
    expect(r1.sucesso).toBe(r2.sucesso);
    expect(r1.erros.length).toBe(r2.erros.length);
    expect(r1.avisos.length).toBe(r2.avisos.length);
    expect(r1.oks.length).toBe(r2.oks.length);
    expect(r1.relatorioMarkdown).toBe(r2.relatorioMarkdown);
  });
});
