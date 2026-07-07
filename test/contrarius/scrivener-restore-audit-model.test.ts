import { describe, expect, it } from 'vitest';
import {
  gerarAuditoriaRestauracaoScrivener,
  type BackupAplicacaoAuditoriaRestauracao,
  type BackupPreRestauracaoAuditoria,
  type DadosAuditoriaRestauracaoScrivener,
  type NotaAtualAuditoriaRestauracao,
} from '../../src/contrarius/scrivener-restore-audit-model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GERADO_EM = '2026-07-06 14:00';
const MANIFESTO_TIPO = 'contrarius-scrivener-export';
const FILE_PATH = '05_Eventos/E-001.md';
const FILE_PATH_B = '05_Eventos/E-002.md';
const ID = 'E-001';
const ID_B = 'E-002';
const CAMINHO_BACKUP_APLICACAO = 'BACKUP_ANTES_APLICACAO/05_Eventos_E-001.md';
const CAMINHO_BACKUP_RESTAURACAO = 'BACKUP_ANTES_RESTAURACAO/05_Eventos_E-001.md';
const CONTEUDO_ORIGINAL = '# Título\n\nConteúdo original antes da aplicação.\n';
const TAG = 'CONTRARIUS:SCRIVENER-SINOPSE';

function makeManifesto(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ tipo: MANIFESTO_TIPO, arquivos: [], ...overrides });
}

function makeManifestoComEntrada(overridesEntrada: Record<string, unknown> = {}): string {
  const entrada = { filePath: FILE_PATH, id: ID, ...overridesEntrada };
  return JSON.stringify({ tipo: MANIFESTO_TIPO, arquivos: [entrada] });
}

function makeManifestoComDuas(
  a: Record<string, unknown> = {},
  b: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    tipo: MANIFESTO_TIPO,
    arquivos: [
      { filePath: FILE_PATH, id: ID, ...a },
      { filePath: FILE_PATH_B, id: ID_B, ...b },
    ],
  });
}

function makeBackupAplicacao(
  overrides: Partial<BackupAplicacaoAuditoriaRestauracao> = {},
): BackupAplicacaoAuditoriaRestauracao {
  return {
    filePathOriginal: FILE_PATH,
    caminhoBackup: CAMINHO_BACKUP_APLICACAO,
    conteudo: CONTEUDO_ORIGINAL,
    ...overrides,
  };
}

function makeBackupRestauracao(
  overrides: Partial<BackupPreRestauracaoAuditoria> = {},
): BackupPreRestauracaoAuditoria {
  return {
    filePathOriginal: FILE_PATH,
    caminhoBackup: CAMINHO_BACKUP_RESTAURACAO,
    conteudo: conteudoComBloco(),
    ...overrides,
  };
}

function makeNota(
  filePath = FILE_PATH,
  conteudoAtual = CONTEUDO_ORIGINAL,
): NotaAtualAuditoriaRestauracao {
  return { filePath, conteudoAtual };
}

function conteudoComBloco(id = ID): string {
  return [
    '# Título',
    '',
    `<!-- ${TAG}:START id="${id}" -->`,
    '## Sinopse importada do Scrivener',
    '',
    'Texto da sinopse preenchida.',
    '',
    `<!-- ${TAG}:END id="${id}" -->`,
    '',
  ].join('\n');
}

function makeDados(
  overrides: Partial<DadosAuditoriaRestauracaoScrivener> = {},
): DadosAuditoriaRestauracaoScrivener {
  return {
    manifestoJson: makeManifesto(),
    backupsAntesAplicacao: [],
    backupsAntesRestauracao: [],
    notasAtuais: [],
    geradoEm: GERADO_EM,
    ...overrides,
  };
}

// ─── Manifesto inválido ───────────────────────────────────────────────────────

describe('manifesto inválido', () => {
  it('retorna erro se manifesto não é JSON válido', () => {
    const r = gerarAuditoriaRestauracaoScrivener(makeDados({ manifestoJson: 'não é json' }));
    expect(r.sucesso).toBe(false);
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0].codigo).toBe('MANIFESTO_JSON_INVALIDO');
  });

  it('retorna erro se manifesto é array (não objeto)', () => {
    const r = gerarAuditoriaRestauracaoScrivener(makeDados({ manifestoJson: '[]' }));
    expect(r.sucesso).toBe(false);
    expect(r.erros[0].codigo).toBe('MANIFESTO_JSON_INVALIDO');
  });

  it('retorna erro se tipo do manifesto é inválido', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({ manifestoJson: JSON.stringify({ tipo: 'outro-tipo', arquivos: [] }) }),
    );
    expect(r.sucesso).toBe(false);
    expect(r.erros[0].codigo).toBe('MANIFESTO_TIPO_INVALIDO');
  });

  it('retorna erro se manifesto não tem array arquivos', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({ manifestoJson: JSON.stringify({ tipo: MANIFESTO_TIPO }) }),
    );
    expect(r.sucesso).toBe(false);
    expect(r.erros[0].codigo).toBe('MANIFESTO_SEM_ARRAY_ARQUIVOS');
  });

  it('retorna apenas o erro global, sem processar backups', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: 'inválido',
        backupsAntesRestauracao: [makeBackupRestauracao()],
      }),
    );
    expect(r.itens).toHaveLength(1);
    expect(r.erros[0].codigo).toBe('MANIFESTO_JSON_INVALIDO');
  });
});

// ─── Backup de restauração inválido ───────────────────────────────────────────

describe('backup de restauração: validações básicas', () => {
  it('gera BACKUP_SEM_FILEPATH se filePathOriginal vazio', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backupsAntesRestauracao: [makeBackupRestauracao({ filePathOriginal: '' })],
      }),
    );
    expect(r.erros.some((e) => e.codigo === 'BACKUP_SEM_FILEPATH')).toBe(true);
    const item = r.erros.find((e) => e.codigo === 'BACKUP_SEM_FILEPATH')!;
    expect(item.caminhoBackupRestauracao).toBe(CAMINHO_BACKUP_RESTAURACAO);
  });

  it('gera BACKUP_SEM_FILEPATH se filePathOriginal apenas espaços', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backupsAntesRestauracao: [makeBackupRestauracao({ filePathOriginal: '   ' })],
      }),
    );
    expect(r.erros.some((e) => e.codigo === 'BACKUP_SEM_FILEPATH')).toBe(true);
  });

  it('gera BACKUP_DUPLICADO para segundo backup com mesmo filePath', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backupsAntesRestauracao: [
          makeBackupRestauracao(),
          makeBackupRestauracao({ caminhoBackup: 'BACKUP_ANTES_RESTAURACAO/outro.md' }),
        ],
        notasAtuais: [makeNota()],
      }),
    );
    expect(r.erros.some((e) => e.codigo === 'BACKUP_DUPLICADO')).toBe(true);
    const item = r.erros.find((e) => e.codigo === 'BACKUP_DUPLICADO')!;
    expect(item.filePathOriginal).toBe(FILE_PATH);
  });

  it('gera BACKUP_VAZIO se conteúdo do backup está vazio', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backupsAntesRestauracao: [makeBackupRestauracao({ conteudo: '' })],
      }),
    );
    expect(r.erros.some((e) => e.codigo === 'BACKUP_VAZIO')).toBe(true);
  });

  it('gera BACKUP_VAZIO se conteúdo do backup só tem espaços', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backupsAntesRestauracao: [makeBackupRestauracao({ conteudo: '   \n  ' })],
      }),
    );
    expect(r.erros.some((e) => e.codigo === 'BACKUP_VAZIO')).toBe(true);
  });

  it('gera BACKUP_SUSPEITO se backup contém string "undefined"', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backupsAntesRestauracao: [makeBackupRestauracao({ conteudo: 'Texto com undefined aqui.' })],
      }),
    );
    expect(r.erros.some((e) => e.codigo === 'BACKUP_SUSPEITO')).toBe(true);
    expect(r.erros.find((e) => e.codigo === 'BACKUP_SUSPEITO')!.mensagem).toContain('undefined');
  });

  it('gera BACKUP_SUSPEITO se backup contém "[object Object]"', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backupsAntesRestauracao: [makeBackupRestauracao({ conteudo: 'Texto [object Object] aqui.' })],
      }),
    );
    expect(r.erros.some((e) => e.codigo === 'BACKUP_SUSPEITO')).toBe(true);
  });

  it('gera CONFLITO_GIT_BACKUP se backup contém marcador de conflito Git', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backupsAntesRestauracao: [makeBackupRestauracao({ conteudo: '<<<<<<< HEAD\nconteúdo\n=======' })],
      }),
    );
    expect(r.erros.some((e) => e.codigo === 'CONFLITO_GIT_BACKUP')).toBe(true);
  });
});

// ─── Nota atual: validações ───────────────────────────────────────────────────

describe('nota atual: validações', () => {
  it('gera NOTA_AUSENTE se nota não existe no vault', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backupsAntesRestauracao: [makeBackupRestauracao()],
        notasAtuais: [],
      }),
    );
    expect(r.erros.some((e) => e.codigo === 'NOTA_AUSENTE')).toBe(true);
    const item = r.erros.find((e) => e.codigo === 'NOTA_AUSENTE')!;
    expect(item.filePathOriginal).toBe(FILE_PATH);
  });

  it('gera CONFLITO_GIT_NOTA se nota atual contém marcador de conflito', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backupsAntesRestauracao: [makeBackupRestauracao()],
        notasAtuais: [makeNota(FILE_PATH, '<<<<<<< HEAD\nconteúdo\n=======')],
      }),
    );
    expect(r.erros.some((e) => e.codigo === 'CONFLITO_GIT_NOTA')).toBe(true);
  });

  it('gera RESTAURACAO_NAO_APLICADA se nota atual idêntica ao backup pré-restauração', () => {
    const conteudoBloco = conteudoComBloco();
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backupsAntesRestauracao: [makeBackupRestauracao({ conteudo: conteudoBloco })],
        notasAtuais: [makeNota(FILE_PATH, conteudoBloco)],
      }),
    );
    expect(r.erros.some((e) => e.codigo === 'RESTAURACAO_NAO_APLICADA')).toBe(true);
  });

  it('gera BLOCO_REMANESCENTE se nota atual ainda tem bloco Scrivener após restauração', () => {
    const conteudoBloco = conteudoComBloco();
    const outroConteudo = conteudoBloco + '\nextra';
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backupsAntesRestauracao: [makeBackupRestauracao({ conteudo: conteudoComBloco() })],
        notasAtuais: [makeNota(FILE_PATH, outroConteudo)],
      }),
    );
    expect(r.erros.some((e) => e.codigo === 'BLOCO_REMANESCENTE')).toBe(true);
  });
});

// ─── Restauração correta ──────────────────────────────────────────────────────

describe('restauração correta', () => {
  it('gera RESTAURACAO_CORRETA quando nota == backup pré-aplicação', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backupsAntesAplicacao: [makeBackupAplicacao()],
        backupsAntesRestauracao: [makeBackupRestauracao()],
        notasAtuais: [makeNota(FILE_PATH, CONTEUDO_ORIGINAL)],
      }),
    );
    expect(r.sucesso).toBe(true);
    const ok = r.oks.find((o) => o.codigo === 'RESTAURACAO_CORRETA');
    expect(ok).toBeDefined();
    expect(ok!.filePathOriginal).toBe(FILE_PATH);
    expect(ok!.caminhoBackupAplicacao).toBe(CAMINHO_BACKUP_APLICACAO);
    expect(ok!.caminhoBackupRestauracao).toBe(CAMINHO_BACKUP_RESTAURACAO);
    expect(ok!.idEvento).toBe(ID);
  });

  it('popula idEvento quando filePath encontrado no manifesto', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backupsAntesAplicacao: [makeBackupAplicacao()],
        backupsAntesRestauracao: [makeBackupRestauracao()],
        notasAtuais: [makeNota(FILE_PATH, CONTEUDO_ORIGINAL)],
      }),
    );
    const ok = r.oks.find((o) => o.codigo === 'RESTAURACAO_CORRETA');
    expect(ok!.idEvento).toBe(ID);
  });

  it('omite idEvento quando filePath não está no manifesto', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backupsAntesAplicacao: [makeBackupAplicacao()],
        backupsAntesRestauracao: [makeBackupRestauracao()],
        notasAtuais: [makeNota(FILE_PATH, CONTEUDO_ORIGINAL)],
      }),
    );
    const ok = r.oks.find((o) => o.codigo === 'RESTAURACAO_CORRETA');
    expect(ok!.idEvento).toBeUndefined();
  });
});

// ─── Sem backup pré-aplicação ─────────────────────────────────────────────────

describe('sem backup pré-aplicação', () => {
  it('gera SEM_BACKUP_APLICACAO quando nota restaurada mas sem backup pré-aplicação', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backupsAntesAplicacao: [],
        backupsAntesRestauracao: [makeBackupRestauracao()],
        notasAtuais: [makeNota(FILE_PATH, CONTEUDO_ORIGINAL)],
      }),
    );
    const aviso = r.avisos.find((a) => a.codigo === 'SEM_BACKUP_APLICACAO');
    expect(aviso).toBeDefined();
    expect(aviso!.filePathOriginal).toBe(FILE_PATH);
  });

  it('conta como auditada quando SEM_BACKUP_APLICACAO', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backupsAntesAplicacao: [],
        backupsAntesRestauracao: [makeBackupRestauracao()],
        notasAtuais: [makeNota(FILE_PATH, CONTEUDO_ORIGINAL)],
      }),
    );
    const qtd = r.oks.find((o) => o.codigo === 'QUANTIDADE_AUDITADA');
    expect(qtd!.mensagem).toContain('1');
  });
});

// ─── Restauração divergente ───────────────────────────────────────────────────

describe('restauração divergente', () => {
  it('gera RESTAURACAO_DIVERGENTE quando nota difere do backup pré-aplicação mas sem bloco', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backupsAntesAplicacao: [makeBackupAplicacao()],
        backupsAntesRestauracao: [makeBackupRestauracao()],
        notasAtuais: [makeNota(FILE_PATH, '# Título\n\nConteúdo diferente modificado.\n')],
      }),
    );
    const aviso = r.avisos.find((a) => a.codigo === 'RESTAURACAO_DIVERGENTE');
    expect(aviso).toBeDefined();
    expect(aviso!.filePathOriginal).toBe(FILE_PATH);
    expect(aviso!.caminhoBackupAplicacao).toBe(CAMINHO_BACKUP_APLICACAO);
    expect(aviso!.caminhoBackupRestauracao).toBe(CAMINHO_BACKUP_RESTAURACAO);
    expect(aviso!.idEvento).toBe(ID);
  });
});

// ─── Manifesto sem backup pré-restauração ────────────────────────────────────

describe('manifesto sem backup pré-restauração', () => {
  it('gera NOTA_COM_BLOCO_SEM_RESTAURACAO quando nota tem bloco mas não foi restaurada', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backupsAntesRestauracao: [],
        notasAtuais: [makeNota(FILE_PATH, conteudoComBloco())],
      }),
    );
    expect(r.erros.some((e) => e.codigo === 'NOTA_COM_BLOCO_SEM_RESTAURACAO')).toBe(true);
    const item = r.erros.find((e) => e.codigo === 'NOTA_COM_BLOCO_SEM_RESTAURACAO')!;
    expect(item.filePathOriginal).toBe(FILE_PATH);
    expect(item.idEvento).toBe(ID);
  });

  it('gera SEM_RESTAURACAO_NECESSARIA quando nota sem bloco e sem restauração', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backupsAntesRestauracao: [],
        notasAtuais: [makeNota(FILE_PATH, CONTEUDO_ORIGINAL)],
      }),
    );
    expect(r.oks.some((o) => o.codigo === 'SEM_RESTAURACAO_NECESSARIA')).toBe(true);
    const item = r.oks.find((o) => o.codigo === 'SEM_RESTAURACAO_NECESSARIA')!;
    expect(item.filePathOriginal).toBe(FILE_PATH);
    expect(item.idEvento).toBe(ID);
  });

  it('gera SEM_RESTAURACAO_NECESSARIA quando nota do manifesto não encontrada no vault', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backupsAntesRestauracao: [],
        notasAtuais: [],
      }),
    );
    expect(r.oks.some((o) => o.codigo === 'SEM_RESTAURACAO_NECESSARIA')).toBe(true);
  });

  it('omite idEvento em SEM_RESTAURACAO_NECESSARIA quando manifesto não tem id', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada({ id: '' }),
        backupsAntesRestauracao: [],
        notasAtuais: [makeNota(FILE_PATH, CONTEUDO_ORIGINAL)],
      }),
    );
    const item = r.oks.find((o) => o.codigo === 'SEM_RESTAURACAO_NECESSARIA')!;
    expect(item.idEvento).toBeUndefined();
  });
});

// ─── QUANTIDADE_AUDITADA ──────────────────────────────────────────────────────

describe('QUANTIDADE_AUDITADA', () => {
  it('é sempre gerado ao final', () => {
    const r = gerarAuditoriaRestauracaoScrivener(makeDados({ manifestoJson: makeManifesto() }));
    expect(r.oks.some((o) => o.codigo === 'QUANTIDADE_AUDITADA')).toBe(true);
  });

  it('conta 0 quando não há backups processados com sucesso', () => {
    const r = gerarAuditoriaRestauracaoScrivener(makeDados({ manifestoJson: makeManifesto() }));
    const qtd = r.oks.find((o) => o.codigo === 'QUANTIDADE_AUDITADA')!;
    expect(qtd.mensagem).toContain('0');
  });

  it('conta 1 para restauração correta', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backupsAntesAplicacao: [makeBackupAplicacao()],
        backupsAntesRestauracao: [makeBackupRestauracao()],
        notasAtuais: [makeNota(FILE_PATH, CONTEUDO_ORIGINAL)],
      }),
    );
    const qtd = r.oks.find((o) => o.codigo === 'QUANTIDADE_AUDITADA')!;
    expect(qtd.mensagem).toContain('1');
  });

  it('conta 2 para duas restaurações corretas', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComDuas(),
        backupsAntesAplicacao: [
          makeBackupAplicacao(),
          makeBackupAplicacao({ filePathOriginal: FILE_PATH_B, caminhoBackup: 'BACKUP_ANTES_APLICACAO/05_Eventos_E-002.md' }),
        ],
        backupsAntesRestauracao: [
          makeBackupRestauracao(),
          makeBackupRestauracao({ filePathOriginal: FILE_PATH_B, caminhoBackup: 'BACKUP_ANTES_RESTAURACAO/05_Eventos_E-002.md' }),
        ],
        notasAtuais: [
          makeNota(FILE_PATH, CONTEUDO_ORIGINAL),
          makeNota(FILE_PATH_B, CONTEUDO_ORIGINAL),
        ],
      }),
    );
    const qtd = r.oks.find((o) => o.codigo === 'QUANTIDADE_AUDITADA')!;
    expect(qtd.mensagem).toContain('2');
  });

  it('não conta backup com erro como auditado', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backupsAntesRestauracao: [makeBackupRestauracao({ conteudo: '' })],
      }),
    );
    const qtd = r.oks.find((o) => o.codigo === 'QUANTIDADE_AUDITADA')!;
    expect(qtd.mensagem).toContain('0');
  });
});

// ─── sucesso / erros / avisos / oks ──────────────────────────────────────────

describe('resultado: sucesso, erros, avisos, oks', () => {
  it('sucesso = true quando sem erros', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backupsAntesAplicacao: [makeBackupAplicacao()],
        backupsAntesRestauracao: [makeBackupRestauracao()],
        notasAtuais: [makeNota(FILE_PATH, CONTEUDO_ORIGINAL)],
      }),
    );
    expect(r.sucesso).toBe(true);
    expect(r.erros).toHaveLength(0);
  });

  it('sucesso = false quando há erros', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backupsAntesRestauracao: [makeBackupRestauracao()],
        notasAtuais: [],
      }),
    );
    expect(r.sucesso).toBe(false);
    expect(r.erros.length).toBeGreaterThan(0);
  });

  it('itens = erros + avisos + oks', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backupsAntesAplicacao: [makeBackupAplicacao()],
        backupsAntesRestauracao: [makeBackupRestauracao()],
        notasAtuais: [makeNota(FILE_PATH, CONTEUDO_ORIGINAL)],
      }),
    );
    expect(r.itens.length).toBe(r.erros.length + r.avisos.length + r.oks.length);
  });
});

// ─── Relatório Markdown ───────────────────────────────────────────────────────

describe('relatório Markdown', () => {
  it('começa com "# Auditoria da restauração Scrivener"', () => {
    const r = gerarAuditoriaRestauracaoScrivener(makeDados({ manifestoJson: makeManifesto() }));
    expect(r.relatorioMarkdown.startsWith('# Auditoria da restauração Scrivener')).toBe(true);
  });

  it('contém geradoEm', () => {
    const r = gerarAuditoriaRestauracaoScrivener(makeDados({ manifestoJson: makeManifesto() }));
    expect(r.relatorioMarkdown).toContain(GERADO_EM);
  });

  it('contém frase de não alteração', () => {
    const r = gerarAuditoriaRestauracaoScrivener(makeDados({ manifestoJson: makeManifesto() }));
    expect(r.relatorioMarkdown).toContain('Nenhuma nota do Vault foi alterada por esta auditoria.');
  });

  it('contém seções Erros, Avisos e OK', () => {
    const r = gerarAuditoriaRestauracaoScrivener(makeDados({ manifestoJson: makeManifesto() }));
    expect(r.relatorioMarkdown).toContain('## Erros');
    expect(r.relatorioMarkdown).toContain('## Avisos');
    expect(r.relatorioMarkdown).toContain('## OK');
  });

  it('contém "Nenhum." nas seções vazias', () => {
    const r = gerarAuditoriaRestauracaoScrivener(makeDados({ manifestoJson: makeManifesto() }));
    expect(r.relatorioMarkdown).toContain('Nenhum.');
  });

  it('contém código do item de erro no relatório', () => {
    const r = gerarAuditoriaRestauracaoScrivener(makeDados({ manifestoJson: 'invalido' }));
    expect(r.relatorioMarkdown).toContain('MANIFESTO_JSON_INVALIDO');
  });

  it('contém o filePath da nota no item de restauração correta', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backupsAntesAplicacao: [makeBackupAplicacao()],
        backupsAntesRestauracao: [makeBackupRestauracao()],
        notasAtuais: [makeNota(FILE_PATH, CONTEUDO_ORIGINAL)],
      }),
    );
    expect(r.relatorioMarkdown).toContain(FILE_PATH);
  });

  it('termina com nova linha', () => {
    const r = gerarAuditoriaRestauracaoScrivener(makeDados({ manifestoJson: makeManifesto() }));
    expect(r.relatorioMarkdown.endsWith('\n')).toBe(true);
  });

  it('contém resumo com contagens', () => {
    const r = gerarAuditoriaRestauracaoScrivener(makeDados({ manifestoJson: makeManifesto() }));
    expect(r.relatorioMarkdown).toContain('## Resumo');
    expect(r.relatorioMarkdown).toContain('- Erros:');
    expect(r.relatorioMarkdown).toContain('- Avisos:');
    expect(r.relatorioMarkdown).toContain('- OK:');
  });
});

// ─── Imutabilidade ────────────────────────────────────────────────────────────

describe('imutabilidade', () => {
  it('não modifica o array de backupsAntesRestauracao recebido', () => {
    const backups = [makeBackupRestauracao()];
    const dados = makeDados({
      manifestoJson: makeManifestoComEntrada(),
      backupsAntesAplicacao: [makeBackupAplicacao()],
      backupsAntesRestauracao: backups,
      notasAtuais: [makeNota(FILE_PATH, CONTEUDO_ORIGINAL)],
    });
    gerarAuditoriaRestauracaoScrivener(dados);
    expect(backups).toHaveLength(1);
  });

  it('retorna novos arrays independentes em chamadas sucessivas', () => {
    const dados = makeDados({ manifestoJson: makeManifesto() });
    const r1 = gerarAuditoriaRestauracaoScrivener(dados);
    const r2 = gerarAuditoriaRestauracaoScrivener(dados);
    expect(r1.itens).not.toBe(r2.itens);
  });
});

// ─── Cenário completo ─────────────────────────────────────────────────────────

describe('cenário completo com duas notas', () => {
  it('restaura corretamente, divergente e sem restauração necessária', () => {
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComDuas(),
        backupsAntesAplicacao: [
          makeBackupAplicacao(),
          makeBackupAplicacao({
            filePathOriginal: FILE_PATH_B,
            caminhoBackup: 'BACKUP_ANTES_APLICACAO/05_Eventos_E-002.md',
            conteudo: '# Outro\n\nConteúdo B original.\n',
          }),
        ],
        backupsAntesRestauracao: [
          makeBackupRestauracao(),
          makeBackupRestauracao({
            filePathOriginal: FILE_PATH_B,
            caminhoBackup: 'BACKUP_ANTES_RESTAURACAO/05_Eventos_E-002.md',
            conteudo: conteudoComBloco(ID_B),
          }),
        ],
        notasAtuais: [
          makeNota(FILE_PATH, CONTEUDO_ORIGINAL),
          makeNota(FILE_PATH_B, '# Outro\n\nConteúdo B diferente.\n'),
        ],
      }),
    );
    expect(r.oks.some((o) => o.codigo === 'RESTAURACAO_CORRETA')).toBe(true);
    expect(r.avisos.some((a) => a.codigo === 'RESTAURACAO_DIVERGENTE')).toBe(true);
    expect(r.sucesso).toBe(true);
  });
});

// ─── Unicode ──────────────────────────────────────────────────────────────────

describe('Unicode e caracteres especiais', () => {
  it('processa caminhos com caracteres Unicode', () => {
    const fp = '05_Eventos/E-ação-ü.md';
    const r = gerarAuditoriaRestauracaoScrivener(
      makeDados({
        manifestoJson: JSON.stringify({ tipo: MANIFESTO_TIPO, arquivos: [{ filePath: fp, id: 'X' }] }),
        backupsAntesAplicacao: [{ filePathOriginal: fp, caminhoBackup: 'BACKUP_ANTES_APLICACAO/x.md', conteudo: 'conteúdo' }],
        backupsAntesRestauracao: [{ filePathOriginal: fp, caminhoBackup: 'BACKUP_ANTES_RESTAURACAO/x.md', conteudo: conteudoComBloco('X') }],
        notasAtuais: [{ filePath: fp, conteudoAtual: 'conteúdo' }],
      }),
    );
    expect(r.oks.some((o) => o.codigo === 'RESTAURACAO_CORRETA')).toBe(true);
  });
});
