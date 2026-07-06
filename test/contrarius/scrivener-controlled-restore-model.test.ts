import { describe, expect, it } from 'vitest';
import {
  gerarRestauracaoControladaScrivener,
  type BackupRestauracaoControlada,
  type DadosRestauracaoControladaScrivener,
  type NotaAtualRestauracaoControlada,
} from '../../src/contrarius/scrivener-controlled-restore-model';

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

function makeBackup(overrides: Partial<BackupRestauracaoControlada> = {}): BackupRestauracaoControlada {
  return {
    filePathOriginal: FILE_PATH,
    caminhoBackup: CAMINHO_BACKUP,
    conteudoBackup: CONTEUDO_BACKUP,
    ...overrides,
  };
}

function makeNota(filePath = FILE_PATH, conteudoAtual = CONTEUDO_NOTA_SEM_BLOCO): NotaAtualRestauracaoControlada {
  return { filePath, conteudoAtual };
}

function notaComBloco(filePath = FILE_PATH, id = ID): NotaAtualRestauracaoControlada {
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

function makeDados(overrides: Partial<DadosRestauracaoControladaScrivener> = {}): DadosRestauracaoControladaScrivener {
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
    const r = gerarRestauracaoControladaScrivener(makeDados({ manifestoJson: 'não é json' }));
    expect(r.podeRestaurar).toBe(false);
    expect(r.bloqueados).toHaveLength(1);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_JSON_INVALIDO');
  });

  it('retorna bloqueado se manifesto é array (não objeto)', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados({ manifestoJson: '[]' }));
    expect(r.podeRestaurar).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_JSON_INVALIDO');
  });

  it('retorna bloqueado se manifesto é null JSON', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados({ manifestoJson: 'null' }));
    expect(r.podeRestaurar).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_JSON_INVALIDO');
  });
});

describe('bloqueio global: tipo inválido', () => {
  it('retorna bloqueado se tipo é diferente do esperado', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({ manifestoJson: JSON.stringify({ tipo: 'outro-tipo', arquivos: [] }) }),
    );
    expect(r.podeRestaurar).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_TIPO_INVALIDO');
  });

  it('retorna bloqueado se tipo está ausente', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({ manifestoJson: JSON.stringify({ arquivos: [] }) }),
    );
    expect(r.podeRestaurar).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_TIPO_INVALIDO');
  });
});

describe('bloqueio global: sem array arquivos', () => {
  it('retorna bloqueado se arquivos não é array', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({ manifestoJson: JSON.stringify({ tipo: MANIFESTO_TIPO, arquivos: 'errado' }) }),
    );
    expect(r.podeRestaurar).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_SEM_ARRAY_ARQUIVOS');
  });

  it('retorna bloqueado se arquivos está ausente', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({ manifestoJson: JSON.stringify({ tipo: MANIFESTO_TIPO }) }),
    );
    expect(r.podeRestaurar).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_SEM_ARRAY_ARQUIVOS');
  });
});

describe('bloqueio global: strings inválidas no manifesto', () => {
  it('bloqueia quando manifesto JSON contém "undefined"', () => {
    const json = `{"tipo":"${MANIFESTO_TIPO}","arquivos":[],"debug":"undefined"}`;
    const r = gerarRestauracaoControladaScrivener(makeDados({ manifestoJson: json }));
    expect(r.podeRestaurar).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_STRINGS_INVALIDAS');
  });

  it('bloqueia quando manifesto JSON contém "[object Object]"', () => {
    const json = `{"tipo":"${MANIFESTO_TIPO}","arquivos":[],"debug":"[object Object]"}`;
    const r = gerarRestauracaoControladaScrivener(makeDados({ manifestoJson: json }));
    expect(r.podeRestaurar).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_STRINGS_INVALIDAS');
  });

  it('bloqueia quando manifesto JSON contém "NaN"', () => {
    const json = `{"tipo":"${MANIFESTO_TIPO}","arquivos":[],"debug":"NaN"}`;
    const r = gerarRestauracaoControladaScrivener(makeDados({ manifestoJson: json }));
    expect(r.podeRestaurar).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_STRINGS_INVALIDAS');
  });

  it('bloqueia quando manifesto JSON contém "Infinity"', () => {
    const json = `{"tipo":"${MANIFESTO_TIPO}","arquivos":[],"debug":"Infinity"}`;
    const r = gerarRestauracaoControladaScrivener(makeDados({ manifestoJson: json }));
    expect(r.podeRestaurar).toBe(false);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_STRINGS_INVALIDAS');
  });
});

// ─── Bloqueios por item ───────────────────────────────────────────────────────

describe('bloqueio por item: backup sem filePath', () => {
  it('bloqueia backup com filePathOriginal vazio', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backups: [makeBackup({ filePathOriginal: '' })],
      }),
    );
    expect(r.bloqueados).toHaveLength(1);
    expect(r.bloqueados[0].codigo).toBe('BACKUP_SEM_FILEPATH');
  });

  it('bloqueia backup com filePathOriginal apenas espaços', () => {
    const r = gerarRestauracaoControladaScrivener(
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
    const r = gerarRestauracaoControladaScrivener(
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
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [],
      }),
    );
    expect(r.bloqueados).toHaveLength(1);
    expect(r.bloqueados[0].codigo).toBe('NOTA_AUSENTE');
  });
});

describe('bloqueio por item: backup vazio', () => {
  it('bloqueia backup com conteúdo vazio', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup({ conteudoBackup: '' })],
        notasAtuais: [makeNota()],
      }),
    );
    expect(r.bloqueados[0].codigo).toBe('BACKUP_VAZIO');
  });

  it('bloqueia backup com apenas whitespace', () => {
    const r = gerarRestauracaoControladaScrivener(
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
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup({ conteudoBackup: 'Valor: undefined aqui.' })],
        notasAtuais: [makeNota()],
      }),
    );
    expect(r.bloqueados[0].codigo).toBe('BACKUP_STRINGS_INVALIDAS');
  });

  it('bloqueia backup com conteúdo contendo "[object Object]"', () => {
    const r = gerarRestauracaoControladaScrivener(
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
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup({ conteudoBackup: '<<<<<<< HEAD\nconteúdo\n=======' })],
        notasAtuais: [makeNota()],
      }),
    );
    expect(r.bloqueados[0].codigo).toBe('CONFLITO_GIT_BACKUP');
  });

  it('bloqueia nota atual com marcador de conflito Git', () => {
    const r = gerarRestauracaoControladaScrivener(
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
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifesto(),
        backups: [makeBackup()],
        notasAtuais: [makeNota()],
      }),
    );
    expect(r.bloqueados[0].codigo).toBe('BACKUP_SEM_MANIFESTO');
  });

  it('bloqueia backup com filePath diferente do manifesto', () => {
    const r = gerarRestauracaoControladaScrivener(
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
    const r = gerarRestauracaoControladaScrivener(
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
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada({ id: ID }),
        backups: [],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.bloqueados[0].idEvento).toBe(ID);
  });
});

// ─── Escritas ─────────────────────────────────────────────────────────────────

describe('escrita: candidato válido', () => {
  it('retorna escrita quando backup válido, nota existe, backup != nota, nota tem bloco', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.escritas).toHaveLength(1);
    expect(r.escritas[0].filePathOriginal).toBe(FILE_PATH);
    expect(r.escritas[0].conteudoBackup).toBe(CONTEUDO_BACKUP);
    expect(r.escritas[0].caminhoBackup).toBe(CAMINHO_BACKUP);
  });

  it('inclui idEvento quando manifesto fornece id', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada({ id: ID }),
        backups: [makeBackup()],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.escritas[0].idEvento).toBe(ID);
  });

  it('não inclui idEvento quando id está ausente no manifesto', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada({ id: '' }),
        backups: [makeBackup()],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.escritas[0].idEvento).toBeUndefined();
  });

  it('podeRestaurar é true quando há escritas sem bloqueados', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.podeRestaurar).toBe(true);
  });
});

describe('escrita: múltiplas notas', () => {
  it('retorna escritas para cada backup válido', () => {
    const manifestoJson = JSON.stringify({
      tipo: MANIFESTO_TIPO,
      arquivos: [
        { filePath: FILE_PATH, id: ID },
        { filePath: FILE_PATH_B, id: 'E-002' },
      ],
    });
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson,
        backups: [
          makeBackup(),
          makeBackup({ filePathOriginal: FILE_PATH_B, caminhoBackup: 'BACKUP_ANTES_APLICACAO/05_Eventos_E-002.md' }),
        ],
        notasAtuais: [notaComBloco(), notaComBloco(FILE_PATH_B, 'E-002')],
      }),
    );
    expect(r.escritas).toHaveLength(2);
    expect(r.podeRestaurar).toBe(true);
  });
});

// ─── Ações: sem_acao ──────────────────────────────────────────────────────────

describe('sem ação: backup idêntico à nota atual', () => {
  it('sem ação quando backup e nota têm conteúdo idêntico', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup({ conteudoBackup: CONTEUDO_NOTA_SEM_BLOCO })],
        notasAtuais: [makeNota(FILE_PATH, CONTEUDO_NOTA_SEM_BLOCO)],
      }),
    );
    expect(r.semAcao.some((i) => i.codigo === 'BACKUP_IDENTICO')).toBe(true);
    expect(r.escritas).toHaveLength(0);
  });
});

describe('sem ação: nota sem bloco controlado', () => {
  it('sem ação quando nota não contém bloco controlado Scrivener', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [makeNota()],
      }),
    );
    expect(r.semAcao.some((i) => i.codigo === 'SEM_BLOCO_CONTROLADO')).toBe(true);
    expect(r.escritas).toHaveLength(0);
  });
});

describe('sem ação: manifesto sem backup e sem bloco', () => {
  it('sem ação quando filePath do manifesto não tem backup e nota não tem bloco', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [],
        notasAtuais: [makeNota()],
      }),
    );
    expect(r.semAcao.some((i) => i.codigo === 'MANIFESTO_SEM_BACKUP_SEM_BLOCO')).toBe(true);
    expect(r.bloqueados).toHaveLength(0);
  });

  it('sem ação quando nota não existe e não há backup', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [],
        notasAtuais: [],
      }),
    );
    expect(r.semAcao.some((i) => i.codigo === 'MANIFESTO_SEM_BACKUP_SEM_BLOCO')).toBe(true);
  });
});

// ─── podeRestaurar ────────────────────────────────────────────────────────────

describe('podeRestaurar', () => {
  it('é false quando há qualquer bloqueio', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.podeRestaurar).toBe(false);
  });

  it('é true quando não há bloqueios (apenas escritas)', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.podeRestaurar).toBe(true);
  });

  it('é true quando não há bloqueios (apenas sem_acao)', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [makeNota()],
      }),
    );
    expect(r.podeRestaurar).toBe(true);
    expect(r.bloqueados).toHaveLength(0);
  });

  it('é false quando manifesto é inválido (bloqueio global)', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados({ manifestoJson: 'inválido' }));
    expect(r.podeRestaurar).toBe(false);
  });

  it('é false quando há mistura de escritas e bloqueados', () => {
    const manifestoJson = JSON.stringify({
      tipo: MANIFESTO_TIPO,
      arquivos: [
        { filePath: FILE_PATH, id: ID },
        { filePath: FILE_PATH_B, id: 'E-002' },
      ],
    });
    // FILE_PATH_B tem bloco mas sem backup → bloqueado
    // FILE_PATH tem backup e bloco → escrita
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson,
        backups: [makeBackup()],
        notasAtuais: [notaComBloco(), notaComBloco(FILE_PATH_B, 'E-002')],
      }),
    );
    expect(r.podeRestaurar).toBe(false);
    expect(r.escritas).toHaveLength(1);
    expect(r.bloqueados).toHaveLength(1);
    expect(r.bloqueados[0].codigo).toBe('MANIFESTO_SEM_BACKUP_COM_BLOCO');
  });
});

// ─── Relatório ────────────────────────────────────────────────────────────────

describe('relatório Markdown', () => {
  it('contém título "# Restauração controlada Scrivener"', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados());
    expect(r.relatorioMarkdown).toContain('# Restauração controlada Scrivener');
  });

  it('contém "Gerado em:"', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados());
    expect(r.relatorioMarkdown).toContain(`Gerado em: ${GERADO_EM}`);
  });

  it('contém a frase "Nenhum frontmatter foi alterado por esta restauração."', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados());
    expect(r.relatorioMarkdown).toContain('Nenhum frontmatter foi alterado por esta restauração.');
  });

  it('contém seção "## Resumo"', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados());
    expect(r.relatorioMarkdown).toContain('## Resumo');
  });

  it('contém seção "## Restaurações"', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados());
    expect(r.relatorioMarkdown).toContain('## Restaurações');
  });

  it('contém seção "## Bloqueados"', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados());
    expect(r.relatorioMarkdown).toContain('## Bloqueados');
  });

  it('contém seção "## Sem ação"', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados());
    expect(r.relatorioMarkdown).toContain('## Sem ação');
  });

  it('contém aviso de bloqueio quando há bloqueados', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.relatorioMarkdown).toContain('BLOQUEADA');
    expect(r.relatorioMarkdown).toContain('Nenhuma nota foi alterada');
  });

  it('não contém aviso de bloqueio quando não há bloqueados', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.relatorioMarkdown).not.toContain('BLOQUEADA');
  });

  it('termina com quebra de linha', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados());
    expect(r.relatorioMarkdown.endsWith('\n')).toBe(true);
  });

  it('termina com quebra de linha mesmo com bloqueio global', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados({ manifestoJson: 'inválido' }));
    expect(r.relatorioMarkdown.endsWith('\n')).toBe(true);
  });

  it('não contém "undefined" no relatório', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados());
    expect(r.relatorioMarkdown).not.toContain('undefined');
  });

  it('não contém "[object Object]" no relatório', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados());
    expect(r.relatorioMarkdown).not.toContain('[object Object]');
  });

  it('não contém "NaN" como artefato no relatório', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados());
    const linhas = r.relatorioMarkdown.split('\n').filter((l) => l.includes('NaN'));
    expect(linhas).toHaveLength(0);
  });

  it('não contém "Infinity" no relatório', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados());
    expect(r.relatorioMarkdown).not.toContain('Infinity');
  });

  it('mostra contagens corretas no resumo', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.relatorioMarkdown).toContain('Restaurações: 1');
    expect(r.relatorioMarkdown).toContain('Bloqueados: 0');
    expect(r.relatorioMarkdown).toContain('Sem ação: 0');
  });

  it('inclui caminho da nota a restaurar', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.relatorioMarkdown).toContain(FILE_PATH);
  });

  it('inclui caminho do backup a restaurar', () => {
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup()],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.relatorioMarkdown).toContain(CAMINHO_BACKUP);
  });

  it('não contém stack trace', () => {
    const r = gerarRestauracaoControladaScrivener(makeDados({ manifestoJson: '{{{invalido' }));
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
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson,
        backups: [makeBackup({ filePathOriginal: fpUnicode })],
        notasAtuais: [notaComBloco(fpUnicode, 'E-U01')],
      }),
    );
    expect(r.escritas[0].filePathOriginal).toBe(fpUnicode);
    expect(r.relatorioMarkdown).toContain(fpUnicode);
  });

  it('preserva Unicode no conteúdo do backup', () => {
    const conteudo = '# Título\n\nTexto com acentuação: Ação, Coração, 日本語.\n';
    const r = gerarRestauracaoControladaScrivener(
      makeDados({
        manifestoJson: makeManifestoComEntrada(),
        backups: [makeBackup({ conteudoBackup: conteudo })],
        notasAtuais: [notaComBloco()],
      }),
    );
    expect(r.escritas[0].conteudoBackup).toBe(conteudo);
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
    gerarRestauracaoControladaScrivener(dados);
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
    const r1 = gerarRestauracaoControladaScrivener(dados);
    const r2 = gerarRestauracaoControladaScrivener(dados);
    expect(r1).not.toBe(r2);
    expect(r1.escritas).not.toBe(r2.escritas);
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
    const r1 = gerarRestauracaoControladaScrivener(dados1);
    const r2 = gerarRestauracaoControladaScrivener(dados2);
    expect(r1.podeRestaurar).toBe(r2.podeRestaurar);
    expect(r1.escritas.length).toBe(r2.escritas.length);
    expect(r1.relatorioMarkdown).toBe(r2.relatorioMarkdown);
  });
});
