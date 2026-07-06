import { describe, expect, it } from 'vitest';
import {
  gerarPreviaRestauracaoScrivener,
  type BackupPreviaRestauracaoScrivener,
  type DadosPreviaRestauracaoScrivener,
  type NotaAtualPreviaRestauracaoScrivener,
} from '../../src/contrarius/scrivener-restore-preview-model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GERADO_EM = '2026-07-06 12:00';
const MANIFESTO_TIPO = 'contrarius-scrivener-export';
const FILE_PATH = '05_Eventos/E-001.md';
const FILE_PATH_B = '05_Eventos/E-002.md';
const ID = 'E-001';
const CAMINHO_BACKUP = 'BACKUP_ANTES_APLICACAO/05_Eventos_E-001.md';
const CONTEUDO_BACKUP = '# Título\n\nConteúdo original antes da aplicação.\n';
const CONTEUDO_NOTA_SEM_BLOCO = '# Título\n\nConteúdo sem bloco controlado.\n';

function makeManifesto(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ tipo: MANIFESTO_TIPO, arquivos: [], ...overrides });
}

function makeManifestoComEntrada(overridesEntrada: Record<string, unknown> = {}): string {
  const entrada = { filePath: FILE_PATH, id: ID, ...overridesEntrada };
  return JSON.stringify({ tipo: MANIFESTO_TIPO, arquivos: [entrada] });
}

function makeBackup(overrides: Partial<BackupPreviaRestauracaoScrivener> = {}): BackupPreviaRestauracaoScrivener {
  return {
    filePathOriginal: FILE_PATH,
    caminhoBackup: CAMINHO_BACKUP,
    conteudoBackup: CONTEUDO_BACKUP,
    ...overrides,
  };
}

function makeNota(filePath = FILE_PATH, conteudoAtual = CONTEUDO_NOTA_SEM_BLOCO): NotaAtualPreviaRestauracaoScrivener {
  return { filePath, conteudoAtual };
}

function notaComBloco(filePath = FILE_PATH, id = ID): NotaAtualPreviaRestauracaoScrivener {
  return {
    filePath,
    conteudoAtual: [
      '# Título',
      '',
      `<!-- CONTRARIUS:SCRIVENER-SINOPSE:START id="${id}" -->`,
      '## Sinopse importada do Scrivener',
      '',
      'Sinopse preenchida aqui.',
      '',
      `<!-- CONTRARIUS:SCRIVENER-SINOPSE:END id="${id}" -->`,
      '',
    ].join('\n'),
  };
}

function makeDados(overrides: Partial<DadosPreviaRestauracaoScrivener> = {}): DadosPreviaRestauracaoScrivener {
  return {
    manifestoJson: makeManifesto(),
    backups: [],
    notasAtuais: [],
    geradoEm: GERADO_EM,
    ...overrides,
  };
}

// ─── Bloqueios globais ────────────────────────────────────────────────────────

describe('bloqueio global: manifesto inválido', () => {
  it('retorna bloqueado se manifesto não é JSON válido', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados({ manifestoJson: 'não é json' }));
    expect(r.podeRestaurarFuturamente).toBe(false);
    expect(r.bloqueados).toHaveLength(1);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_JSON_INVALIDO');
  });

  it('retorna bloqueado se manifesto é array (não objeto)', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados({ manifestoJson: '[]' }));
    expect(r.podeRestaurarFuturamente).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_JSON_INVALIDO');
  });

  it('retorna bloqueado se manifesto é null JSON', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados({ manifestoJson: 'null' }));
    expect(r.podeRestaurarFuturamente).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_JSON_INVALIDO');
  });
});

describe('bloqueio global: tipo inválido', () => {
  it('retorna bloqueado se tipo é diferente do esperado', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({ manifestoJson: JSON.stringify({ tipo: 'outro-tipo', arquivos: [] }) }),
    );
    expect(r.podeRestaurarFuturamente).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_TIPO_INVALIDO');
  });

  it('retorna bloqueado se tipo está ausente', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({ manifestoJson: JSON.stringify({ arquivos: [] }) }),
    );
    expect(r.podeRestaurarFuturamente).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_TIPO_INVALIDO');
  });
});

describe('bloqueio global: sem array arquivos', () => {
  it('retorna bloqueado se arquivos não é array', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({ manifestoJson: JSON.stringify({ tipo: MANIFESTO_TIPO, arquivos: 'errado' }) }),
    );
    expect(r.podeRestaurarFuturamente).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_SEM_ARRAY_ARQUIVOS');
  });

  it('retorna bloqueado se arquivos está ausente', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({ manifestoJson: JSON.stringify({ tipo: MANIFESTO_TIPO }) }),
    );
    expect(r.podeRestaurarFuturamente).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_SEM_ARRAY_ARQUIVOS');
  });
});

describe('bloqueio global: strings inválidas no manifesto', () => {
  it('bloqueia quando manifesto JSON contém "undefined"', () => {
    const json = `{"tipo":"${MANIFESTO_TIPO}","arquivos":[],"debug":"undefined"}`;
    const r = gerarPreviaRestauracaoScrivener(makeDados({ manifestoJson: json }));
    expect(r.podeRestaurarFuturamente).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_STRINGS_INVALIDAS');
  });

  it('bloqueia quando manifesto JSON contém "[object Object]"', () => {
    const json = `{"tipo":"${MANIFESTO_TIPO}","arquivos":[],"debug":"[object Object]"}`;
    const r = gerarPreviaRestauracaoScrivener(makeDados({ manifestoJson: json }));
    expect(r.podeRestaurarFuturamente).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_STRINGS_INVALIDAS');
  });

  it('bloqueia quando manifesto JSON contém "NaN"', () => {
    const json = `{"tipo":"${MANIFESTO_TIPO}","arquivos":[],"debug":"NaN"}`;
    const r = gerarPreviaRestauracaoScrivener(makeDados({ manifestoJson: json }));
    expect(r.podeRestaurarFuturamente).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_STRINGS_INVALIDAS');
  });

  it('bloqueia quando manifesto JSON contém "Infinity"', () => {
    const json = `{"tipo":"${MANIFESTO_TIPO}","arquivos":[],"debug":"Infinity"}`;
    const r = gerarPreviaRestauracaoScrivener(makeDados({ manifestoJson: json }));
    expect(r.podeRestaurarFuturamente).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_STRINGS_INVALIDAS');
  });
});

// ─── Bloqueios por item ───────────────────────────────────────────────────────

describe('bloqueio por item: backup sem filePath', () => {
  it('bloqueia backup com filePathOriginal vazio', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backups: [makeBackup({ filePathOriginal: '' })],
      }),
    );
    expect(r.bloqueados).toHaveLength(1);
    expect(r.bloqueados[0].codigo).toBe('BACKUP_SEM_FILEPATH');
    expect(r.bloqueados[0].tipo).toBe('bloqueado');
  });

  it('bloqueia backup com filePathOriginal apenas espaços', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backups: [makeBackup({ filePathOriginal: '   ' })],
      }),
    );
    expect(r.bloqueados[0].codigo).toBe('BACKUP_SEM_FILEPATH');
  });
});

describe('bloqueio por item: backup duplicado', () => {
  it('bloqueia o segundo backup para o mesmo filePath', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [
          makeBackup(),
          makeBackup({ caminhoBackup: 'BACKUP_ANTES_APLICACAO/outro.md' }),
        ],
        notasAtuais: [makeNota()],
      }),
    );
    const duplicados = r.bloqueados.filter((i) => i.codigo === 'BACKUP_DUPLICADO');
    expect(duplicados).toHaveLength(1);
    expect(duplicados[0].filePathOriginal).toBe(FILE_PATH);
  });
});

describe('bloqueio por item: nota atual ausente', () => {
  it('bloqueia quando nota atual não existe para o filePath', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [], // nota não fornecida
      }),
    );
    expect(r.bloqueados).toHaveLength(1);
    expect(r.bloqueados[0].codigo).toBe('NOTA_AUSENTE');
  });
});

describe('bloqueio por item: backup vazio', () => {
  it('bloqueia backup com conteúdo vazio', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup({ conteudoBackup: '' })],
        notasAtuais: [makeNota()],
      }),
    );
    expect(r.bloqueados[0].codigo).toBe('BACKUP_VAZIO');
  });

  it('bloqueia backup com apenas whitespace', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup({ conteudoBackup: '\n\n  \n' })],
        notasAtuais: [makeNota()],
      }),
    );
    expect(r.bloqueados[0].codigo).toBe('BACKUP_VAZIO');
  });
});

describe('bloqueio por item: strings inválidas no backup', () => {
  it('bloqueia backup com conteúdo contendo "undefined"', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup({ conteudoBackup: 'Valor: undefined aqui.' })],
        notasAtuais: [makeNota()],
      }),
    );
    expect(r.bloqueados[0].codigo).toBe('BACKUP_STRINGS_INVALIDAS');
  });

  it('bloqueia backup com conteúdo contendo "[object Object]"', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup({ conteudoBackup: 'dado: [object Object]' })],
        notasAtuais: [makeNota()],
      }),
    );
    expect(r.bloqueados[0].codigo).toBe('BACKUP_STRINGS_INVALIDAS');
  });
});

describe('bloqueio por item: conflito Git', () => {
  it('bloqueia backup com marcador de conflito Git', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup({ conteudoBackup: '<<<<<<< HEAD\nconteúdo\n=======' })],
        notasAtuais: [makeNota()],
      }),
    );
    expect(r.bloqueados[0].codigo).toBe('CONFLITO_GIT_BACKUP');
  });

  it('bloqueia nota atual com marcador de conflito Git', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [makeNota(FILE_PATH, '<<<<<<< HEAD\nconteúdo\n=======\noutra\n>>>>>>>')],
      }),
    );
    expect(r.bloqueados[0].codigo).toBe('CONFLITO_GIT_NOTA');
  });
});

describe('bloqueio por item: backup sem manifesto', () => {
  it('bloqueia backup cujo filePath não está no manifesto', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifesto(), // arquivos vazio
        backups: [makeBackup()],
        notasAtuais: [makeNota()],
      }),
    );
    expect(r.bloqueados[0].codigo).toBe('BACKUP_SEM_MANIFESTO');
  });

  it('bloqueia backup com filePath diferente do manifesto', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada({ filePath: FILE_PATH_B }),
        backups: [makeBackup({ filePathOriginal: FILE_PATH })],
        notasAtuais: [makeNota()],
      }),
    );
    const item = r.bloqueados.find((i) => i.codigo === 'BACKUP_SEM_MANIFESTO');
    expect(item).toBeDefined();
  });
});

describe('bloqueio por item: manifesto sem backup mas nota tem bloco', () => {
  it('bloqueia quando filePath do manifesto não tem backup e nota tem bloco controlado', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.bloqueados).toHaveLength(1);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_SEM_BACKUP_COM_BLOCO');
    expect(r.bloqueados[0].filePathOriginal).toBe(FILE_PATH);
  });

  it('inclui idEvento quando disponível no manifesto', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada({ id: ID }),
        backups: [],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.bloqueados[0].idEvento).toBe(ID);
  });
});

// ─── Ações: restaurar_backup ──────────────────────────────────────────────────

describe('ação: restaurar_backup', () => {
  it('candidato quando backup válido, nota existe, backup != nota, nota tem bloco', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.restauracoes).toHaveLength(1);
    expect(r.restauracoes[0].codigo).toBe('RESTAURAR_BACKUP');
    expect(r.restauracoes[0].tipo).toBe('restaurar_backup');
  });

  it('inclui filePathOriginal, caminhoBackup, idEvento no item', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada({ id: ID }),
        backups: [makeBackup()],
        notasAtuais: [notaComBloco()],
      }),
    );
    const item = r.restauracoes[0];
    expect(item.filePathOriginal).toBe(FILE_PATH);
    expect(item.caminhoBackup).toBe(CAMINHO_BACKUP);
    expect(item.idEvento).toBe(ID);
  });

  it('inclui conteudoAtual e conteudoBackup no item', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [notaComBloco()],
      }),
    );
    const item = r.restauracoes[0];
    expect(item.conteudoBackup).toBe(CONTEUDO_BACKUP);
    expect(item.conteudoAtual).toBe(notaComBloco().conteudoAtual);
  });
});

// ─── Ações: sem_acao ──────────────────────────────────────────────────────────

describe('ação: sem_acao — backup idêntico à nota atual', () => {
  it('sem ação quando backup e nota têm conteúdo idêntico', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup({ conteudoBackup: CONTEUDO_NOTA_SEM_BLOCO })],
        notasAtuais: [makeNota(FILE_PATH, CONTEUDO_NOTA_SEM_BLOCO)],
      }),
    );
    expect(r.semAcao.some((i) => i.codigo === 'BACKUP_IDENTICO')).toBe(true);
    expect(r.restauracoes).toHaveLength(0);
  });
});

describe('ação: sem_acao — nota sem bloco controlado', () => {
  it('sem ação quando nota não contém bloco controlado Scrivener', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [makeNota()], // sem bloco
      }),
    );
    expect(r.semAcao.some((i) => i.codigo === 'SEM_BLOCO_CONTROLADO')).toBe(true);
    expect(r.restauracoes).toHaveLength(0);
  });
});

describe('ação: sem_acao — manifesto sem backup e sem bloco', () => {
  it('sem ação quando filePath do manifesto não tem backup e nota não tem bloco', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [],
        notasAtuais: [makeNota()], // nota existe mas sem bloco
      }),
    );
    expect(r.semAcao.some((i) => i.codigo === 'MANIFESTO_SEM_BACKUP_SEM_BLOCO')).toBe(true);
    expect(r.bloqueados).toHaveLength(0);
  });

  it('sem ação quando nota não existe e não há backup', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [],
        notasAtuais: [],
      }),
    );
    expect(r.semAcao.some((i) => i.codigo === 'MANIFESTO_SEM_BACKUP_SEM_BLOCO')).toBe(true);
  });
});

// ─── podeRestaurarFuturamente ─────────────────────────────────────────────────

describe('podeRestaurarFuturamente', () => {
  it('é false quando há qualquer bloqueio', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [],
        notasAtuais: [notaComBloco()], // sem backup com bloco → bloqueado
      }),
    );
    expect(r.podeRestaurarFuturamente).toBe(false);
  });

  it('é true quando não há bloqueios (apenas restauracoes)', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.podeRestaurarFuturamente).toBe(true);
  });

  it('é true quando não há bloqueios (apenas sem_acao)', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [makeNota()],
      }),
    );
    expect(r.podeRestaurarFuturamente).toBe(true);
    expect(r.bloqueados).toHaveLength(0);
  });

  it('é false quando manifesto é inválido (global block)', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados({ manifestoJson: 'inválido' }));
    expect(r.podeRestaurarFuturamente).toBe(false);
  });
});

// ─── Separações ───────────────────────────────────────────────────────────────

describe('separações de restauracoes, bloqueados, semAcao', () => {
  it('restauracoes contém apenas tipo restaurar_backup', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.restauracoes.every((i) => i.tipo === 'restaurar_backup')).toBe(true);
  });

  it('bloqueados contém apenas tipo bloqueado', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.bloqueados.every((i) => i.tipo === 'bloqueado')).toBe(true);
  });

  it('semAcao contém apenas tipo sem_acao', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [makeNota()],
      }),
    );
    expect(r.semAcao.every((i) => i.tipo === 'sem_acao')).toBe(true);
  });

  it('itens contém todos os itens de todos os tipos', () => {
    const manifestoJson = JSON.stringify({
      tipo: MANIFESTO_TIPO,
      arquivos: [
        { filePath: FILE_PATH, id: ID },
        { filePath: FILE_PATH_B, id: 'E-002' },
      ],
    });
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson,
        backups: [makeBackup()],
        notasAtuais: [notaComBloco(), makeNota(FILE_PATH_B)],
      }),
    );
    // FILE_PATH → restaurar_backup; FILE_PATH_B → sem_acao (manifesto sem backup sem bloco)
    expect(r.itens.length).toBe(r.restauracoes.length + r.bloqueados.length + r.semAcao.length);
  });
});

// ─── Relatório ────────────────────────────────────────────────────────────────

describe('relatório Markdown', () => {
  it('contém título "# Prévia de restauração Scrivener"', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados());
    expect(r.relatorioMarkdown).toContain('# Prévia de restauração Scrivener');
  });

  it('contém "Gerado em:"', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados());
    expect(r.relatorioMarkdown).toContain(`Gerado em: ${GERADO_EM}`);
  });

  it('contém a frase "Nenhuma nota do Vault foi alterada por esta prévia."', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados());
    expect(r.relatorioMarkdown).toContain('Nenhuma nota do Vault foi alterada por esta prévia.');
  });

  it('contém a frase "Esta prévia não restaura backups."', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados());
    expect(r.relatorioMarkdown).toContain('Esta prévia não restaura backups.');
  });

  it('contém seção "## Resumo"', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados());
    expect(r.relatorioMarkdown).toContain('## Resumo');
  });

  it('contém seção "## Restaurações candidatas"', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados());
    expect(r.relatorioMarkdown).toContain('## Restaurações candidatas');
  });

  it('contém seção "## Bloqueados"', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados());
    expect(r.relatorioMarkdown).toContain('## Bloqueados');
  });

  it('contém seção "## Sem ação"', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados());
    expect(r.relatorioMarkdown).toContain('## Sem ação');
  });

  it('termina com quebra de linha', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados());
    expect(r.relatorioMarkdown.endsWith('\n')).toBe(true);
  });

  it('termina com quebra de linha mesmo com bloqueio global', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados({ manifestoJson: 'inválido' }));
    expect(r.relatorioMarkdown.endsWith('\n')).toBe(true);
  });

  it('não contém "undefined" no relatório', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados());
    expect(r.relatorioMarkdown).not.toContain('undefined');
  });

  it('não contém "[object Object]" no relatório', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados());
    expect(r.relatorioMarkdown).not.toContain('[object Object]');
  });

  it('não contém "NaN" no relatório (exceto texto esperado)', () => {
    // Garante que valores NaN internos não vazam no relatório
    const r = gerarPreviaRestauracaoScrivener(makeDados());
    // O relatório não deve ter "NaN" como artefato
    const linhas = r.relatorioMarkdown.split('\n').filter((l) => l.includes('NaN'));
    expect(linhas).toHaveLength(0);
  });

  it('não contém "Infinity" no relatório', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados());
    expect(r.relatorioMarkdown).not.toContain('Infinity');
  });

  it('mostra contagens corretas no resumo', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.relatorioMarkdown).toContain('Restaurações candidatas: 1');
    expect(r.relatorioMarkdown).toContain('Bloqueados: 0');
    expect(r.relatorioMarkdown).toContain('Sem ação: 0');
  });

  it('inclui caminho da nota candidata a restauração', () => {
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.relatorioMarkdown).toContain(FILE_PATH);
  });

  it('não contém stack trace', () => {
    const r = gerarPreviaRestauracaoScrivener(makeDados({ manifestoJson: '{{{invalido' }));
    expect(r.relatorioMarkdown).not.toMatch(/at\s+\w+\s+\(/);
    expect(r.relatorioMarkdown).not.toContain('Error:');
  });
});

// ─── Unicode ──────────────────────────────────────────────────────────────────

describe('Unicode', () => {
  it('preserva caracteres Unicode no filePath e mensagens', () => {
    const fpUnicode = '05_Eventos/Ação-Nação-日本語.md';
    const manifestoJson = JSON.stringify({
      tipo: MANIFESTO_TIPO,
      arquivos: [{ filePath: fpUnicode, id: 'E-U01' }],
    });
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson,
        backups: [makeBackup({ filePathOriginal: fpUnicode })],
        notasAtuais: [notaComBloco(fpUnicode, 'E-U01')],
      }),
    );
    expect(r.restauracoes[0].filePathOriginal).toBe(fpUnicode);
    expect(r.relatorioMarkdown).toContain(fpUnicode);
  });

  it('preserva Unicode no conteúdo de backup e nota', () => {
    const conteudo = '# Título\n\nTexto com acentuação: Ação, Coração, 日本語.\n';
    const r = gerarPreviaRestauracaoScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup({ conteudoBackup: conteudo })],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.restauracoes[0].conteudoBackup).toBe(conteudo);
  });
});

// ─── Imutabilidade e determinismo ─────────────────────────────────────────────

describe('imutabilidade e determinismo', () => {
  it('não muta a entrada', () => {
    const backups = [makeBackup()];
    const notasAtuais = [notaComBloco()];
    const dados = makeDados({
      manifestoJson: makeManifestoComEntrada(),
      backups,
      notasAtuais,
    });
    const backupOriginal = { ...backups[0] };
    gerarPreviaRestauracaoScrivener(dados);
    expect(backups[0].filePathOriginal).toBe(backupOriginal.filePathOriginal);
    expect(backups[0].conteudoBackup).toBe(backupOriginal.conteudoBackup);
    expect(backups.length).toBe(1);
  });

  it('retorna resultado novo a cada chamada', () => {
    const dados = makeDados({
      manifestoJson: makeManifestoComEntrada(),
      backups: [makeBackup()],
      notasAtuais: [notaComBloco()],
    });
    const r1 = gerarPreviaRestauracaoScrivener(dados);
    const r2 = gerarPreviaRestauracaoScrivener(dados);
    expect(r1).not.toBe(r2);
    expect(r1.itens).not.toBe(r2.itens);
  });

  it('chamadas equivalentes retornam resultados equivalentes', () => {
    const dados1 = makeDados({
      manifestoJson: makeManifestoComEntrada(),
      backups: [makeBackup()],
      notasAtuais: [notaComBloco()],
    });
    const dados2 = makeDados({
      manifestoJson: makeManifestoComEntrada(),
      backups: [makeBackup()],
      notasAtuais: [notaComBloco()],
    });
    const r1 = gerarPreviaRestauracaoScrivener(dados1);
    const r2 = gerarPreviaRestauracaoScrivener(dados2);
    expect(r1.podeRestaurarFuturamente).toBe(r2.podeRestaurarFuturamente);
    expect(r1.restauracoes.length).toBe(r2.restauracoes.length);
    expect(r1.relatorioMarkdown).toBe(r2.relatorioMarkdown);
  });
});
