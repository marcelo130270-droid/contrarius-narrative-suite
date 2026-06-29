import type { TFile } from 'obsidian';
import { parseYaml } from 'obsidian';
import { describe, expect, it } from 'vitest';
import { indexarContrarius, type IndexerDeps } from '../../src/contrarius/indexer';

function file(path: string): TFile {
  return { path } as unknown as TFile;
}

function deps(
  files: readonly TFile[],
  frontmatters: Readonly<Record<string, Record<string, unknown> | null>>,
): IndexerDeps {
  return {
    getMarkdownFiles: () => files,
    getFileCache: (target) => {
      const value = frontmatters[target.path];
      return value === undefined || value === null ? null : { frontmatter: value };
    },
    cachedRead: async () => 'sem frontmatter',
    parseYaml,
  };
}

describe('indexarContrarius — cobertura das entidades', () => {
  it('indexa as cinco entidades em subpastas recursivas', async () => {
    const files = [
      file('06_Lugares/Regiao/L-1.md'),
      file('02_Consciencias/Nucleo/C-1.md'),
      file('05_Eventos/Ato/E-1.md'),
      file('04_Relacoes/R-1.md'),
      file('03_Retrovidas/Nucleo/V-1.md'),
    ];
    const fm = {
      '02_Consciencias/Nucleo/C-1.md': { tipo: 'Consciencia', nome: 'C1' },
      '03_Retrovidas/Nucleo/V-1.md': { tipo: 'Retrovida', consc_id: 'C-1', vida: 'V01', nome: 'Pessoa' },
      '04_Relacoes/R-1.md': { tipo: 'Relacao', a: 'C-1', b: 'C-2' },
      '05_Eventos/Ato/E-1.md': { tipo: 'Evento', titulo: 'Evento' },
      '06_Lugares/Regiao/L-1.md': { tipo: 'Lugar', nome_atual: 'Lugar' },
    };
    const result = await indexarContrarius(deps(files, fm));
    expect(result.consciencias).toHaveLength(1);
    expect(result.retrovidas).toHaveLength(1);
    expect(result.relacoes).toHaveLength(1);
    expect(result.eventos).toHaveLength(1);
    expect(result.lugares).toHaveLength(1);
    expect(result.erros).toEqual([]);
  });

  it('normaliza os campos das entidades indexadas', async () => {
    const files = [file('05_Eventos/E.md'), file('06_Lugares/L.md'), file('04_Relacoes/R.md')];
    const fm = {
      '05_Eventos/E.md': { titulo: 'E', local: '[[L]]' },
      '06_Lugares/L.md': { nome_atual: 'Lugar' },
      '04_Relacoes/R.md': { a: '[[C-1]]', b: '[[C-2]]' },
    };
    const result = await indexarContrarius(deps(files, fm));
    expect(result.eventos[0].local).toEqual(['L']);
    expect(result.lugares[0].nomePreferido).toBe('Lugar');
    expect(result.relacoes[0].consciencia1).toBe('C-1');
  });

  it('produz ordem determinística por caminho', async () => {
    const files = [file('05_Eventos/Z.md'), file('05_Eventos/A.md'), file('05_Eventos/M.md')];
    const fm = {
      '05_Eventos/Z.md': { titulo: 'Z' },
      '05_Eventos/A.md': { titulo: 'A' },
      '05_Eventos/M.md': { titulo: 'M' },
    };
    const result = await indexarContrarius(deps(files, fm));
    expect(result.eventos.map((item) => item.id)).toEqual(['A', 'M', 'Z']);
  });

  it('não modifica a ordem da coleção de arquivos fornecida', async () => {
    const files = [file('05_Eventos/Z.md'), file('05_Eventos/A.md')];
    await indexarContrarius(deps(files, {
      '05_Eventos/Z.md': { titulo: 'Z' }, '05_Eventos/A.md': { titulo: 'A' },
    }));
    expect(files.map((item) => item.path)).toEqual(['05_Eventos/Z.md', '05_Eventos/A.md']);
  });
});

describe('indexarContrarius — escopo das pastas', () => {
  it('ignora arquivos fora das pastas por padrão', async () => {
    const result = await indexarContrarius(deps([file('Notas/E.md')], { 'Notas/E.md': { tipo: 'Evento', titulo: 'X' } }));
    expect(result.eventos).toHaveLength(0);
  });

  it('pode incluir arquivos fora das pastas pelo tipo', async () => {
    const result = await indexarContrarius(
      deps([file('Notas/E.md')], { 'Notas/E.md': { tipo: 'Evento', titulo: 'X' } }),
      { incluirForaDasPastas: true },
    );
    expect(result.eventos).toHaveLength(1);
  });

  it('ignora arquivo externo sem tipo mesmo com incluirForaDasPastas', async () => {
    const result = await indexarContrarius(
      deps([file('Notas/X.md')], { 'Notas/X.md': { titulo: 'X' } }),
      { incluirForaDasPastas: true },
    );
    expect(result.eventos).toHaveLength(0);
    expect(result.lugares).toHaveLength(0);
  });

  it('aceita substituição parcial de pasta', async () => {
    const path = 'Narrativa/Eventos/Ato/E.md';
    const result = await indexarContrarius(
      deps([file(path), file('06_Lugares/L.md')], {
        [path]: { titulo: 'X' }, '06_Lugares/L.md': { nome_atual: 'L' },
      }),
      { pastas: { evento: 'Narrativa/Eventos' } },
    );
    expect(result.eventos).toHaveLength(1);
    expect(result.lugares).toHaveLength(1);
  });

  it('aceita caminhos Windows nas pastas canônicas', async () => {
    const path = '05_Eventos\\Sub\\E.md';
    const result = await indexarContrarius(deps([file(path)], { [path]: { titulo: 'X' } }));
    expect(result.eventos).toHaveLength(1);
  });
});

describe('indexarContrarius — leitura de frontmatter', () => {
  it('indexa nota sem frontmatter como entidade incompleta e registra aviso', async () => {
    const files = [file('05_Eventos/Sem.md'), file('05_Eventos/Com.md')];
    const result = await indexarContrarius(deps(files, {
      '05_Eventos/Sem.md': null, '05_Eventos/Com.md': { titulo: 'Com' },
    }));
    expect(result.eventos).toHaveLength(2);
    expect(result.eventos[0].id).toBe('Com');
    expect(result.eventos[1].id).toBe('Sem');
    expect(result.eventos[1].frontmatterRaw).toEqual({});
    expect(result.erros).toEqual([]);
    expect(result.avisosIndexacao).toHaveLength(1);
    expect(result.avisosIndexacao[0]).toMatchObject({
      filePath: '05_Eventos/Sem.md',
      campo: 'frontmatter',
    });
    expect(result.avisosIndexacao[0].mensagem).toContain('incompleta');
  });

  it('indexa frontmatter vazio como entidade incompleta', async () => {
    const path = '06_Lugares/L-013_Provisorio.md';
    const custom: IndexerDeps = {
      getMarkdownFiles: () => [file(path)],
      getFileCache: () => null,
      cachedRead: async () => `---

---

Anotações provisórias`,
      parseYaml,
    };
    const result = await indexarContrarius(custom);
    expect(result.lugares).toHaveLength(1);
    expect(result.lugares[0].id).toBe('L-013_Provisorio');
    expect(result.lugares[0].frontmatterRaw).toEqual({});
    expect(result.erros).toEqual([]);
    expect(result.avisosIndexacao[0].mensagem).toContain('incompleta');
  });

  it('indexa objeto vazio fornecido pelo cache como entidade incompleta', async () => {
    const path = '05_Eventos/E-X_Rascunho.md';
    const result = await indexarContrarius(deps([file(path)], { [path]: {} }));
    expect(result.eventos).toHaveLength(1);
    expect(result.eventos[0].id).toBe('E-X_Rascunho');
    expect(result.erros).toEqual([]);
    expect(result.avisosIndexacao[0].mensagem).toContain('Frontmatter vazio');
  });

  it('mantém frontmatter YAML inválido como erro e não indexa a nota', async () => {
    const path = '05_Eventos/Invalido.md';
    const custom: IndexerDeps = {
      getMarkdownFiles: () => [file(path)],
      getFileCache: () => null,
      cachedRead: async () => `---
titulo: [valor inválido
---

Texto`,
      parseYaml,
    };
    const result = await indexarContrarius(custom);
    expect(result.eventos).toHaveLength(0);
    expect(result.avisosIndexacao).toEqual([]);
    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].mensagem).toContain('inválido ou ilegível');
  });

  it('mantém bloco sem delimitador final como erro', async () => {
    const path = '06_Lugares/SemFechamento.md';
    const custom: IndexerDeps = {
      getMarkdownFiles: () => [file(path)],
      getFileCache: () => null,
      cachedRead: async () => `---
nome_atual: Lugar sem fechamento

Texto`,
      parseYaml,
    };
    const result = await indexarContrarius(custom);
    expect(result.lugares).toHaveLength(0);
    expect(result.avisosIndexacao).toEqual([]);
    expect(result.erros).toHaveLength(1);
  });

  it('usa fallback do conteúdo Markdown quando o cache não tem frontmatter', async () => {
    const path = '05_Eventos/Fallback.md';
    const custom: IndexerDeps = {
      getMarkdownFiles: () => [file(path)],
      getFileCache: () => null,
      cachedRead: async () => '---\ntitulo: Pelo arquivo\nlocal: "[[L-1]]"\n---\n\nTexto',
      parseYaml,
    };
    const result = await indexarContrarius(custom);
    expect(result.eventos[0].titulo).toBe('Pelo arquivo');
    expect(result.eventos[0].local).toEqual(['L-1']);
  });

  it('não modifica os objetos de frontmatter recebidos', async () => {
    const path = '05_Eventos/E.md';
    const source = { titulo: 'X', extra: { values: ['a'] } };
    const snapshot = JSON.stringify(source);
    await indexarContrarius(deps([file(path)], { [path]: source }));
    expect(JSON.stringify(source)).toBe(snapshot);
  });

  it('não compartilha campos desconhecidos com o frontmatter recebido', async () => {
    const path = '05_Eventos/E.md';
    const source = { titulo: 'X', extra: { values: ['a'] } };
    const result = await indexarContrarius(deps([file(path)], { [path]: source }));
    const copy = result.eventos[0].camposDesconhecidos['extra'] as { values: string[] };
    copy.values.push('b');
    expect(source.extra.values).toEqual(['a']);
  });
});

describe('indexarContrarius — diagnóstico de tipos e IDs', () => {
  it('registra conflito de tipo e usa a pasta', async () => {
    const path = '05_Eventos/E.md';
    const result = await indexarContrarius(deps([file(path)], { [path]: { tipo: 'Lugar', titulo: 'X' } }));
    expect(result.eventos).toHaveLength(1);
    expect(result.lugares).toHaveLength(0);
    expect(result.erros[0].campo).toBe('tipo');
    expect(result.erros[0].mensagem).toContain('Conflito');
  });

  it('registra tipo declarado desconhecido mas usa a pasta', async () => {
    const path = '06_Lugares/L.md';
    const result = await indexarContrarius(deps([file(path)], { [path]: { tipo: 'Cidade', nome_atual: 'X' } }));
    expect(result.lugares).toHaveLength(1);
    expect(result.erros[0].mensagem).toContain('não reconhecido');
  });

  it('ignora tipo desconhecido fora das pastas e registra diagnóstico', async () => {
    const path = 'Notas/X.md';
    const result = await indexarContrarius(
      deps([file(path)], { [path]: { tipo: 'Cidade', nome_atual: 'X' } }),
      { incluirForaDasPastas: true },
    );
    expect(result.lugares).toHaveLength(0);
    expect(result.erros[0].mensagem).toContain('não reconhecido');
  });

  it('detecta IDs duplicados sem remover entidades', async () => {
    const files = [file('05_Eventos/A.md'), file('05_Eventos/B.md')];
    const fm = {
      '05_Eventos/A.md': { id_evento: 'E-1', titulo: 'A' },
      '05_Eventos/B.md': { id_evento: 'E-1', titulo: 'B' },
    };
    const result = await indexarContrarius(deps(files, fm));
    expect(result.eventos).toHaveLength(2);
    expect(result.erros.some((item) => item.mensagem.includes('ID duplicado'))).toBe(true);
  });

  it('não considera ids vazios como duplicados', async () => {
    const files = [file('05_Eventos/.md'), file('05_Eventos/Sub/.md')];
    const fm = { '05_Eventos/.md': { titulo: 'A', id_evento: '' }, '05_Eventos/Sub/.md': { titulo: 'B', id_evento: '' } };
    const result = await indexarContrarius(deps(files, fm));
    expect(result.erros.some((item) => item.mensagem.includes('ID duplicado'))).toBe(false);
  });
});

describe('indexarContrarius — compatibilidade pré-humana e aliases legados', () => {
  it('indexa Consciência pré-humana sem erro de tipo', async () => {
    const path = '02_Consciencias/P-001.md';
    const result = await indexarContrarius(deps([file(path)], {
      [path]: { tipo: 'Consc Pré Humana', id: 'P-001' },
    }));
    expect(result.consciencias).toHaveLength(1);
    expect(result.consciencias[0].naturezaConsciencial).toBe('pre-humana');
    expect(result.erros).toEqual([]);
  });

  it('indexa Retrovida pré-humana com alias canônico', async () => {
    const path = '03_Retrovidas/Retrovidas Pre-Humanas/P-001_V01.md';
    const result = await indexarContrarius(deps([file(path)], {
      [path]: { tipo: 'Retrovida_Pre_Humana', consciencia: 'P-001', vida: 1, nomes: ['Animal'] },
    }));
    expect(result.retrovidas).toHaveLength(1);
    expect(result.retrovidas[0].naturezaConsciencial).toBe('pre-humana');
    expect(result.erros).toEqual([]);
    expect(result.avisosIndexacao).toEqual([]);
  });

  it('usa a pasta para Retrovida com tipo legado de Consciência e registra aviso', async () => {
    const path = '03_Retrovidas/Retrovidas Pre-Humanas/P-002_V01.md';
    const result = await indexarContrarius(deps([file(path)], {
      [path]: { tipo: 'Consc Pré Humana', consciencia: 'P-002', vida: 1, nomes: ['Animal'] },
    }));
    expect(result.retrovidas).toHaveLength(1);
    expect(result.retrovidas[0].naturezaConsciencial).toBe('pre-humana');
    expect(result.erros).toEqual([]);
    expect(result.avisosIndexacao).toHaveLength(1);
    expect(result.avisosIndexacao[0].mensagem).toContain('Tipo legado incompatível');
  });

  it('reconhece Relacao_Grupocarmica sem diagnóstico de tipo desconhecido', async () => {
    const path = '04_Relacoes/REL-001.md';
    const result = await indexarContrarius(deps([file(path)], {
      [path]: { tipo: 'Relacao_Grupocarmica', a: 'C-001', b: 'C-002' },
    }));
    expect(result.relacoes).toHaveLength(1);
    expect(result.erros).toEqual([]);
  });

  it('mantém conflito verdadeiro entre categorias não conscienciais como erro', async () => {
    const path = '05_Eventos/E.md';
    const result = await indexarContrarius(deps([file(path)], {
      [path]: { tipo: 'Lugar', titulo: 'Evento' },
    }));
    expect(result.eventos).toHaveLength(1);
    expect(result.erros).toHaveLength(1);
    expect(result.avisosIndexacao).toEqual([]);
  });
});

describe('indexarContrarius — resiliência', () => {
  it('converte falha ao listar arquivos em erro de índice', async () => {
    const broken: IndexerDeps = {
      getMarkdownFiles: () => { throw new Error('falha simulada'); },
      getFileCache: () => null,
      cachedRead: async () => '',
      parseYaml,
    };
    const result = await indexarContrarius(broken);
    expect(result.eventos).toEqual([]);
    expect(result.erros[0].mensagem).toContain('falha simulada');
  });

  it('continua quando getFileCache de um arquivo lança erro', async () => {
    const files = [file('05_Eventos/A.md'), file('05_Eventos/B.md')];
    const custom: IndexerDeps = {
      getMarkdownFiles: () => files,
      getFileCache: (target) => {
        if (target.path.endsWith('A.md')) throw new Error('cache quebrado');
        return { frontmatter: { titulo: 'B' } };
      },
      cachedRead: async () => '',
      parseYaml,
    };
    const result = await indexarContrarius(custom);
    expect(result.eventos.map((item) => item.id)).toEqual(['B']);
    expect(result.erros[0].mensagem).toContain('cache quebrado');
  });

  it('continua quando cachedRead falha e reporta frontmatter ilegível', async () => {
    const files = [file('05_Eventos/A.md'), file('05_Eventos/B.md')];
    const custom: IndexerDeps = {
      getMarkdownFiles: () => files,
      getFileCache: (target) => target.path.endsWith('B.md') ? { frontmatter: { titulo: 'B' } } : null,
      cachedRead: async () => { throw new Error('leitura quebrada'); },
      parseYaml,
    };
    const result = await indexarContrarius(custom);
    expect(result.eventos.map((item) => item.id)).toEqual(['B']);
    expect(result.erros[0].mensagem).toContain('inválido ou ilegível');
  });

  it('retorna coleções vazias quando não há arquivos', async () => {
    const result = await indexarContrarius(deps([], {}));
    expect(result).toEqual({ consciencias: [], retrovidas: [], eventos: [], lugares: [], relacoes: [], avisosIndexacao: [], erros: [] });
  });
});

describe('indexarContrarius — notas provisórias sem frontmatter (requisitos 9–15)', () => {
  it('req. 9: Evento sem frontmatter é indexado provisoriamente e gera exatamente um aviso de indexação', async () => {
    const path = '05_Eventos/E-Provisorio.md';
    const result = await indexarContrarius(deps([file(path)], { [path]: null }));
    expect(result.eventos).toHaveLength(1);
    expect(result.avisosIndexacao).toHaveLength(1);
    expect(result.avisosIndexacao[0].filePath).toBe(path);
    expect(result.erros).toEqual([]);
  });

  it('req. 10: Evento provisório não produz aviso interno derivado de titulo ausente', async () => {
    const path = '05_Eventos/E-Provisorio.md';
    const result = await indexarContrarius(deps([file(path)], { [path]: null }));
    expect(result.eventos[0].avisos.some((a) => a.includes('titulo'))).toBe(false);
  });

  it('req. 11: Lugar sem frontmatter é indexado provisoriamente e gera exatamente um aviso de indexação', async () => {
    const path = '06_Lugares/L-Provisorio.md';
    const result = await indexarContrarius(deps([file(path)], { [path]: null }));
    expect(result.lugares).toHaveLength(1);
    expect(result.avisosIndexacao).toHaveLength(1);
    expect(result.avisosIndexacao[0].filePath).toBe(path);
    expect(result.erros).toEqual([]);
  });

  it('req. 12: Lugar provisório não produz aviso interno derivado de nomePreferido ausente', async () => {
    const path = '06_Lugares/L-Provisorio.md';
    const result = await indexarContrarius(deps([file(path)], { [path]: null }));
    expect(result.lugares[0].avisos.some((a) => a.includes('nomePreferido'))).toBe(false);
  });

  it('req. 13: entidade provisória não produz nenhum aviso interno', async () => {
    const evPath = '05_Eventos/E-Prov.md';
    const lPath = '06_Lugares/L-Prov.md';
    const result = await indexarContrarius(deps(
      [file(evPath), file(lPath)],
      { [evPath]: null, [lPath]: null },
    ));
    expect(result.eventos[0].avisos).toEqual([]);
    expect(result.lugares[0].avisos).toEqual([]);
  });

  it('req. 14: Evento com frontmatter presente mas titulo ausente continua gerando aviso interno', async () => {
    const path = '05_Eventos/E-Invalido.md';
    const result = await indexarContrarius(deps([file(path)], { [path]: { natureza: 'político' } }));
    expect(result.eventos).toHaveLength(1);
    expect(result.eventos[0].avisos.some((a) => a.includes('titulo'))).toBe(true);
  });

  it('req. 15: Lugar com frontmatter presente mas nomePreferido ausente continua gerando aviso interno', async () => {
    const path = '06_Lugares/L-Invalido.md';
    const result = await indexarContrarius(deps([file(path)], { [path]: { coordenadas: '1.0, 2.0' } }));
    expect(result.lugares).toHaveLength(1);
    expect(result.lugares[0].avisos.some((a) => a.includes('nomePreferido'))).toBe(true);
  });
});
