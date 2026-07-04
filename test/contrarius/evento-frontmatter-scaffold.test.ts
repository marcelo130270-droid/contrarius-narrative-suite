import { describe, expect, it } from 'vitest';
import {
  adicionarFrontmatterMinimoEvento,
  ErroFrontmatterMinimoEvento,
  type DadosFrontmatterMinimoEvento,
} from '../../src/contrarius/evento-frontmatter-scaffold';

const DADOS_BASE: DadosFrontmatterMinimoEvento = { idEvento: 'EVT001', titulo: 'Título Simples' };

function capturarErro(fn: () => unknown): ErroFrontmatterMinimoEvento {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErroFrontmatterMinimoEvento) return e;
    throw e;
  }
  throw new Error('Era esperado que a função lançasse ErroFrontmatterMinimoEvento');
}

function bodyAposFrontmatter(conteudo: string): string {
  let s = conteudo;
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  const linhas = s.split('\n');
  let contagem = 0;
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].replace(/\r$/, '') === '---') {
      contagem++;
      if (contagem === 2) return linhas.slice(i + 1).join('\n');
    }
  }
  return '';
}

// ─── 1. Nota sem frontmatter ──────────────────────────────────────────────────

describe('adicionarFrontmatterMinimoEvento — 1. nota sem frontmatter', () => {
  it('retorna alterado: true para nota sem frontmatter', () => {
    const { alterado } = adicionarFrontmatterMinimoEvento('# Corpo\n', DADOS_BASE);
    expect(alterado).toBe(true);
  });
});

// ─── 2. Corpo preservado ──────────────────────────────────────────────────────

describe('adicionarFrontmatterMinimoEvento — 2. corpo preservado', () => {
  it('preserva o corpo original exatamente após o frontmatter inserido', () => {
    const corpo = '# Heading\n\nParágrafo.\n';
    const { conteudo } = adicionarFrontmatterMinimoEvento(corpo, DADOS_BASE);
    expect(bodyAposFrontmatter(conteudo)).toBe(corpo);
  });
});

// ─── 3. LF ────────────────────────────────────────────────────────────────────

describe('adicionarFrontmatterMinimoEvento — 3. LF', () => {
  it('usa LF quando o conteúdo usa LF e não introduz CR', () => {
    const { conteudo } = adicionarFrontmatterMinimoEvento('Corpo\n', DADOS_BASE);
    expect(conteudo).not.toContain('\r');
  });
});

// ─── 4. CRLF ─────────────────────────────────────────────────────────────────

describe('adicionarFrontmatterMinimoEvento — 4. CRLF', () => {
  it('usa CRLF quando o conteúdo usa CRLF em todas as linhas do frontmatter', () => {
    const { conteudo } = adicionarFrontmatterMinimoEvento('Corpo\r\n', DADOS_BASE);
    const lfs = (conteudo.match(/\n/g) ?? []).length;
    const crlfs = (conteudo.match(/\r\n/g) ?? []).length;
    expect(crlfs).toBe(lfs);
  });
});

// ─── 5. BOM ───────────────────────────────────────────────────────────────────

describe('adicionarFrontmatterMinimoEvento — 5. BOM', () => {
  it('preserva BOM UTF-8 no início do resultado', () => {
    const BOM = '﻿';
    const { conteudo } = adicionarFrontmatterMinimoEvento(BOM + 'Corpo\n', DADOS_BASE);
    expect(conteudo.charCodeAt(0)).toBe(0xfeff);
  });
});

// ─── 6–11. Serialização do título ────────────────────────────────────────────

describe('adicionarFrontmatterMinimoEvento — 6. título simples', () => {
  it('serializa título simples sem aspas', () => {
    const { conteudo } = adicionarFrontmatterMinimoEvento('Corpo\n', { idEvento: 'EVT001', titulo: 'Título Simples' });
    expect(conteudo).toContain('titulo: Título Simples');
  });
});

describe('adicionarFrontmatterMinimoEvento — 7. título com dois-pontos', () => {
  it('serializa título com dois-pontos entre aspas', () => {
    const titulo = 'Evento: Principal';
    const { conteudo } = adicionarFrontmatterMinimoEvento('Corpo\n', { idEvento: 'EVT001', titulo });
    expect(conteudo).toContain('titulo: ' + JSON.stringify(titulo));
  });
});

describe('adicionarFrontmatterMinimoEvento — 8. título com #', () => {
  it('serializa título iniciando com # entre aspas', () => {
    const titulo = '#Título';
    const { conteudo } = adicionarFrontmatterMinimoEvento('Corpo\n', { idEvento: 'EVT001', titulo });
    expect(conteudo).toContain('titulo: ' + JSON.stringify(titulo));
  });
});

describe('adicionarFrontmatterMinimoEvento — 9. aspas', () => {
  it('serializa título com aspas duplas usando JSON.stringify', () => {
    const titulo = 'Título "citado"';
    const { conteudo } = adicionarFrontmatterMinimoEvento('Corpo\n', { idEvento: 'EVT001', titulo });
    expect(conteudo).toContain('titulo: ' + JSON.stringify(titulo));
  });
});

describe('adicionarFrontmatterMinimoEvento — 10. colchetes/chaves', () => {
  it('serializa título com colchetes entre aspas', () => {
    const titulo = '[Título]';
    const { conteudo } = adicionarFrontmatterMinimoEvento('Corpo\n', { idEvento: 'EVT001', titulo });
    expect(conteudo).toContain('titulo: ' + JSON.stringify(titulo));
  });
});

describe('adicionarFrontmatterMinimoEvento — 11. Unicode', () => {
  it('preserva caracteres Unicode sem aspas desnecessárias', () => {
    const titulo = 'Evento Ñoño 日本語';
    const { conteudo } = adicionarFrontmatterMinimoEvento('Corpo\n', { idEvento: 'EVT001', titulo });
    expect(conteudo).toContain('titulo: Evento Ñoño 日本語');
  });
});

// ─── 12–13. Aparar espaços ────────────────────────────────────────────────────

describe('adicionarFrontmatterMinimoEvento — 12. id aparado', () => {
  it('apara espaços do idEvento antes de inserir', () => {
    const { conteudo } = adicionarFrontmatterMinimoEvento('Corpo\n', { idEvento: '  EVT001  ', titulo: 'Título' });
    expect(conteudo).toContain('id_evento: EVT001');
    expect(conteudo).not.toContain('id_evento:   EVT001');
  });
});

describe('adicionarFrontmatterMinimoEvento — 13. título aparado', () => {
  it('apara espaços do título antes de serializar', () => {
    const { conteudo } = adicionarFrontmatterMinimoEvento('Corpo\n', { idEvento: 'EVT001', titulo: '  Título  ' });
    expect(conteudo).toContain('titulo: Título');
    expect(conteudo).not.toContain('titulo:   Título');
  });
});

// ─── 14–15. Rejeições ────────────────────────────────────────────────────────

describe('adicionarFrontmatterMinimoEvento — 14. id vazio', () => {
  it('lança ErroFrontmatterMinimoEvento com código id_evento_vazio para idEvento vazio', () => {
    const erro = capturarErro(() => adicionarFrontmatterMinimoEvento('Corpo\n', { idEvento: '', titulo: 'Título' }));
    expect(erro.codigo).toBe('id_evento_vazio');
  });

  it('lança para idEvento com apenas espaços', () => {
    const erro = capturarErro(() => adicionarFrontmatterMinimoEvento('Corpo\n', { idEvento: '   ', titulo: 'Título' }));
    expect(erro.codigo).toBe('id_evento_vazio');
  });
});

describe('adicionarFrontmatterMinimoEvento — 15. título vazio', () => {
  it('lança ErroFrontmatterMinimoEvento com código titulo_vazio para título vazio', () => {
    const erro = capturarErro(() => adicionarFrontmatterMinimoEvento('Corpo\n', { idEvento: 'EVT001', titulo: '' }));
    expect(erro.codigo).toBe('titulo_vazio');
  });

  it('lança para título com apenas espaços', () => {
    const erro = capturarErro(() => adicionarFrontmatterMinimoEvento('Corpo\n', { idEvento: 'EVT001', titulo: '   ' }));
    expect(erro.codigo).toBe('titulo_vazio');
  });
});

// ─── 16–17. Frontmatter existente ou inválido ─────────────────────────────────

describe('adicionarFrontmatterMinimoEvento — 16. frontmatter existente', () => {
  it('lança frontmatter_existente quando a nota já tem frontmatter válido', () => {
    const conteudo = '---\nid_evento: EVT001\ntitulo: Teste\n---\nCorpo\n';
    const erro = capturarErro(() => adicionarFrontmatterMinimoEvento(conteudo, DADOS_BASE));
    expect(erro.codigo).toBe('frontmatter_existente');
  });
});

describe('adicionarFrontmatterMinimoEvento — 17. frontmatter inválido', () => {
  it('lança frontmatter_invalido quando há abertura sem fechamento', () => {
    const conteudo = '---\nid_evento: EVT001\nSem fechamento\n';
    const erro = capturarErro(() => adicionarFrontmatterMinimoEvento(conteudo, DADOS_BASE));
    expect(erro.codigo).toBe('frontmatter_invalido');
  });
});

// ─── 18–19. Casos especiais de conteúdo ──────────────────────────────────────

describe('adicionarFrontmatterMinimoEvento — 18. conteúdo vazio', () => {
  it('funciona com conteúdo vazio e retorna frontmatter bem formado', () => {
    const { conteudo, alterado } = adicionarFrontmatterMinimoEvento('', DADOS_BASE);
    expect(alterado).toBe(true);
    expect(conteudo).toContain('---');
    expect(conteudo).toContain('id_evento: EVT001');
  });
});

describe('adicionarFrontmatterMinimoEvento — 19. corpo imediato', () => {
  it('preserva corpo sem newline final imediatamente após o fechamento', () => {
    const corpo = '# Heading sem newline final';
    const { conteudo } = adicionarFrontmatterMinimoEvento(corpo, DADOS_BASE);
    expect(conteudo.endsWith(corpo)).toBe(true);
  });
});

// ─── 20–21. Valores proibidos ────────────────────────────────────────────────

describe('adicionarFrontmatterMinimoEvento — 20. sem undefined', () => {
  it('resultado não contém a string "undefined"', () => {
    const { conteudo } = adicionarFrontmatterMinimoEvento('Corpo\n', DADOS_BASE);
    expect(conteudo).not.toContain('undefined');
  });
});

describe('adicionarFrontmatterMinimoEvento — 21. sem [object Object]', () => {
  it('resultado não contém "[object Object]"', () => {
    const { conteudo } = adicionarFrontmatterMinimoEvento('Corpo\n', DADOS_BASE);
    expect(conteudo).not.toContain('[object Object]');
  });
});

// ─── 22. Chamadas repetidas ───────────────────────────────────────────────────

describe('adicionarFrontmatterMinimoEvento — 22. chamadas repetidas', () => {
  it('segunda chamada com resultado da primeira lança frontmatter_existente', () => {
    const { conteudo: primeiro } = adicionarFrontmatterMinimoEvento('Corpo\n', DADOS_BASE);
    const erro = capturarErro(() => adicionarFrontmatterMinimoEvento(primeiro, DADOS_BASE));
    expect(erro.codigo).toBe('frontmatter_existente');
  });
});

// ─── 23. Entradas não mutadas ────────────────────────────────────────────────

describe('adicionarFrontmatterMinimoEvento — 23. entradas não mutadas', () => {
  it('não muta a string de entrada nem os dados fornecidos', () => {
    const conteudo = 'Corpo\n';
    const dados: DadosFrontmatterMinimoEvento = { idEvento: 'EVT001', titulo: 'Título' };
    adicionarFrontmatterMinimoEvento(conteudo, dados);
    expect(conteudo).toBe('Corpo\n');
    expect(dados.idEvento).toBe('EVT001');
    expect(dados.titulo).toBe('Título');
  });
});

// ─── 24. Resultado novo ───────────────────────────────────────────────────────

describe('adicionarFrontmatterMinimoEvento — 24. resultado novo', () => {
  it('retorna string diferente da entrada', () => {
    const conteudo = 'Corpo\n';
    const { conteudo: resultado } = adicionarFrontmatterMinimoEvento(conteudo, DADOS_BASE);
    expect(resultado).not.toBe(conteudo);
  });
});

// ─── 25. Campos incertos vazios ───────────────────────────────────────────────

describe('adicionarFrontmatterMinimoEvento — 25. campos incertos vazios', () => {
  it('todos os campos de valor incerto aparecem vazios no frontmatter', () => {
    const { conteudo } = adicionarFrontmatterMinimoEvento('Corpo\n', DADOS_BASE);
    const linhas = conteudo.split('\n').map((l) => l.replace(/\r$/, ''));
    const camposVazios = [
      'livro',
      'periodo',
      'data',
      'ano_ordem',
      'ordem_narrativa',
      'capitulo',
      'cena',
      'participantes',
      'holopensenes',
      'religiao',
      'mov_historico',
      'eventos_anteriores',
      'eventos_posteriores',
    ];
    for (const campo of camposVazios) {
      const linha = linhas.find((l) => l === campo + ':');
      expect(linha, `campo "${campo}" deveria ser vazio`).toBeDefined();
    }
  });
});
