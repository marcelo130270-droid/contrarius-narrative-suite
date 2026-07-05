import { describe, expect, it } from 'vitest';
import {
  validarPacoteScrivenerMarkdown,
  resumirValidacaoPacoteScrivener,
} from '../../src/contrarius/scrivener-export-validation-model';
import type { PacoteScrivener } from '../../src/contrarius/scrivener-export-model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MANIFESTO_VALIDO = JSON.stringify(
  {
    tipo: 'contrarius-scrivener-export',
    versao: 1,
    titulo: 'Teste',
    filtroLivro: 'Todos os livros',
    busca: '',
    geradoEm: '2026-07-05 10:00',
    totais: { eventosPosicionados: 0, eventosSemOrdem: 0, problemas: 0 },
    arquivos: [],
    problemas: [],
  },
  null,
  2,
) + '\n';

function makePacoteMinimo(overrides: Partial<PacoteScrivener> = {}): PacoteScrivener {
  return {
    arquivos: [
      { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
      { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
      { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
    ],
    ...overrides,
  };
}

function makePacoteComEvento(): PacoteScrivener {
  return {
    arquivos: [
      { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
      {
        caminhoRelativo: 'contrarius-manifest.json',
        conteudo:
          JSON.stringify(
            {
              tipo: 'contrarius-scrivener-export',
              versao: 1,
              titulo: 'Teste',
              filtroLivro: 'Todos os livros',
              busca: '',
              geradoEm: '2026-07-05 10:00',
              totais: { eventosPosicionados: 1, eventosSemOrdem: 0, problemas: 0 },
              arquivos: [
                {
                  tipo: 'evento_posicionado',
                  caminhoRelativo: 'Livro-1/Cap-1/010-evento.md',
                  chave: 'k',
                  id: 'E-001',
                  titulo: 'Evento',
                  filePath: '05_Eventos/E-001.md',
                  livro: 'Livro 1',
                  capitulo: 'Cap 1',
                  cena: 'Abertura',
                  ordemNarrativa: 10,
                },
              ],
              problemas: [],
            },
            null,
            2,
          ) + '\n',
      },
      { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      { caminhoRelativo: 'Livro-1/Cap-1/010-evento.md', conteudo: '# Evento\n' },
    ],
  };
}

// ─── 1. Pacote válido ─────────────────────────────────────────────────────────

describe('pacote válido', () => {
  it('retorna valido=true sem problemas', () => {
    const resultado = validarPacoteScrivenerMarkdown(makePacoteComEvento());
    expect(resultado.valido).toBe(true);
    expect(resultado.problemas).toHaveLength(0);
    expect(resultado.erros).toHaveLength(0);
    expect(resultado.avisos).toHaveLength(0);
  });
});

// ─── 2. Falta 00_ROTEIRO.md ──────────────────────────────────────────────────

describe('falta 00_ROTEIRO.md', () => {
  it('gera erro FALTA_ROTEIRO', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some((p) => p.codigo === 'FALTA_ROTEIRO')).toBe(true);
  });
});

// ─── 3. Falta manifesto ──────────────────────────────────────────────────────

describe('falta manifesto', () => {
  it('gera erro FALTA_MANIFESTO', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some((p) => p.codigo === 'FALTA_MANIFESTO')).toBe(true);
  });
});

// ─── 4. Falta README ─────────────────────────────────────────────────────────

describe('falta README', () => {
  it('gera erro FALTA_README', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some((p) => p.codigo === 'FALTA_README')).toBe(true);
  });
});

// ─── 5. Caminho vazio ─────────────────────────────────────────────────────────

describe('caminho vazio', () => {
  it('gera erro CAMINHO_VAZIO', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '', conteudo: '# Conteúdo\n' },
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'CAMINHO_VAZIO')).toBe(true);
  });
});

// ─── 6. Caminho absoluto ──────────────────────────────────────────────────────

describe('caminho absoluto', () => {
  it('gera erro CAMINHO_ABSOLUTO para caminho com barra inicial', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '/absoluto/arquivo.md', conteudo: '# Conteúdo\n' },
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'CAMINHO_ABSOLUTO')).toBe(true);
  });

  it('gera erro CAMINHO_ABSOLUTO para caminho com letra de drive', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: 'C:\\pasta\\arquivo.md', conteudo: '# Conteúdo\n' },
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'CAMINHO_ABSOLUTO')).toBe(true);
  });
});

// ─── 7. Caminho com .. ───────────────────────────────────────────────────────

describe('caminho com ..', () => {
  it('gera erro CAMINHO_TRAVERSAL', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '../fora/arquivo.md', conteudo: '# Conteúdo\n' },
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'CAMINHO_TRAVERSAL')).toBe(true);
  });
});

// ─── 8. Caminho com barra invertida ──────────────────────────────────────────

describe('caminho com barra invertida', () => {
  it('gera erro CAMINHO_BARRA_INVERTIDA', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: 'pasta\\arquivo.md', conteudo: '# Conteúdo\n' },
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'CAMINHO_BARRA_INVERTIDA')).toBe(true);
  });
});

// ─── 9. Caminho duplicado ─────────────────────────────────────────────────────

describe('caminho duplicado', () => {
  it('gera erro CAMINHO_DUPLICADO', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Duplicado\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'CAMINHO_DUPLICADO')).toBe(true);
  });
});

// ─── 10. Conteúdo vazio ───────────────────────────────────────────────────────

describe('conteúdo vazio', () => {
  it('gera erro CONTEUDO_VAZIO', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'CONTEUDO_VAZIO')).toBe(true);
  });
});

// ─── 11. Sem quebra final ─────────────────────────────────────────────────────

describe('sem quebra final', () => {
  it('gera erro SEM_QUEBRA_FINAL', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro sem newline' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'SEM_QUEBRA_FINAL')).toBe(true);
  });
});

// ─── 12. Manifesto JSON inválido ──────────────────────────────────────────────

describe('manifesto JSON inválido', () => {
  it('gera erro MANIFESTO_JSON_INVALIDO', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: 'não é JSON{\n' },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'MANIFESTO_JSON_INVALIDO')).toBe(true);
  });
});

// ─── 13. Tipo de manifesto inválido ──────────────────────────────────────────

describe('tipo de manifesto inválido', () => {
  it('gera erro MANIFESTO_TIPO_INVALIDO', () => {
    const manifesto = JSON.stringify(
      {
        tipo: 'outro-tipo',
        versao: 1,
        totais: { eventosPosicionados: 0, eventosSemOrdem: 0, problemas: 0 },
        arquivos: [],
        problemas: [],
      },
      null,
      2,
    ) + '\n';
    const pacote = makePacoteMinimo({
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: manifesto },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    });
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'MANIFESTO_TIPO_INVALIDO')).toBe(true);
  });
});

// ─── 14. Versão inválida ──────────────────────────────────────────────────────

describe('versão inválida', () => {
  it('gera erro MANIFESTO_VERSAO_INVALIDA', () => {
    const manifesto = JSON.stringify(
      {
        tipo: 'contrarius-scrivener-export',
        versao: 2,
        arquivos: [],
        problemas: [],
      },
      null,
      2,
    ) + '\n';
    const pacote = makePacoteMinimo({
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: manifesto },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    });
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'MANIFESTO_VERSAO_INVALIDA')).toBe(true);
  });
});

// ─── 15. Item do manifesto aponta para arquivo ausente ───────────────────────

describe('item do manifesto aponta para arquivo ausente', () => {
  it('gera erro MANIFESTO_ARQUIVO_AUSENTE', () => {
    const manifesto = JSON.stringify(
      {
        tipo: 'contrarius-scrivener-export',
        versao: 1,
        arquivos: [
          {
            caminhoRelativo: 'nao-existe.md',
            ordemNarrativa: null,
          },
        ],
        problemas: [],
      },
      null,
      2,
    ) + '\n';
    const pacote = makePacoteMinimo({
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: manifesto },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    });
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'MANIFESTO_ARQUIVO_AUSENTE')).toBe(true);
  });
});

// ─── 16. Item duplicado no manifesto ─────────────────────────────────────────

describe('item duplicado no manifesto', () => {
  it('gera erro MANIFESTO_ARQUIVO_DUPLICADO', () => {
    const manifesto = JSON.stringify(
      {
        tipo: 'contrarius-scrivener-export',
        versao: 1,
        arquivos: [
          { caminhoRelativo: 'Livro-1/Cap-1/010-evt.md', ordemNarrativa: 10 },
          { caminhoRelativo: 'Livro-1/Cap-1/010-evt.md', ordemNarrativa: 10 },
        ],
        problemas: [],
      },
      null,
      2,
    ) + '\n';
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: manifesto },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
        { caminhoRelativo: 'Livro-1/Cap-1/010-evt.md', conteudo: '# Evento\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'MANIFESTO_ARQUIVO_DUPLICADO')).toBe(true);
  });
});

// ─── 17. ordemNarrativa inválida no manifesto ────────────────────────────────

describe('ordemNarrativa inválida no manifesto', () => {
  it('gera erro MANIFESTO_ORDEM_INVALIDA para string', () => {
    const manifesto = JSON.stringify(
      {
        tipo: 'contrarius-scrivener-export',
        versao: 1,
        arquivos: [
          { caminhoRelativo: 'Livro-1/Cap-1/010-evt.md', ordemNarrativa: 'dez' },
        ],
        problemas: [],
      },
      null,
      2,
    ) + '\n';
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: manifesto },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
        { caminhoRelativo: 'Livro-1/Cap-1/010-evt.md', conteudo: '# Evento\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'MANIFESTO_ORDEM_INVALIDA')).toBe(true);
  });

  it('aceita ordemNarrativa=null sem erro', () => {
    const manifesto = JSON.stringify(
      {
        tipo: 'contrarius-scrivener-export',
        versao: 1,
        arquivos: [
          { caminhoRelativo: '_sem_ordem/evt.md', ordemNarrativa: null },
        ],
        problemas: [],
      },
      null,
      2,
    ) + '\n';
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: manifesto },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
        { caminhoRelativo: '_sem_ordem/evt.md', conteudo: '# Evento\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'MANIFESTO_ORDEM_INVALIDA')).toBe(false);
  });
});

// ─── 18. Pacote contém "undefined" ───────────────────────────────────────────

describe('pacote contém "undefined"', () => {
  it('gera erro CONTEUDO_UNDEFINED', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n- Valor: undefined\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'CONTEUDO_UNDEFINED')).toBe(true);
  });
});

// ─── 19. Pacote contém "[object Object]" ─────────────────────────────────────

describe('pacote contém "[object Object]"', () => {
  it('gera erro CONTEUDO_OBJECT', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n- Local: [object Object]\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'CONTEUDO_OBJECT')).toBe(true);
  });
});

// ─── 20. Pacote contém "NaN" ──────────────────────────────────────────────────

describe('pacote contém "NaN"', () => {
  it('gera erro CONTEUDO_NAN', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n- Ordem: NaN\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'CONTEUDO_NAN')).toBe(true);
  });
});

// ─── 21. Pacote contém "Infinity" ────────────────────────────────────────────

describe('pacote contém "Infinity"', () => {
  it('gera erro CONTEUDO_INFINITY', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n- Valor: Infinity\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.erros.some((p) => p.codigo === 'CONTEUDO_INFINITY')).toBe(true);
  });
});

// ─── 22. Aviso: pacote sem eventos ───────────────────────────────────────────

describe('aviso pacote sem eventos', () => {
  it('gera aviso SEM_EVENTOS quando só há arquivos de controle', () => {
    const resultado = validarPacoteScrivenerMarkdown(makePacoteMinimo());
    expect(resultado.avisos.some((p) => p.codigo === 'SEM_EVENTOS')).toBe(true);
  });
});

// ─── 23. Aviso: sem eventos posicionados ─────────────────────────────────────

describe('aviso sem eventos posicionados', () => {
  it('gera aviso SEM_POSICIONADOS quando há apenas eventos sem ordem', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
        { caminhoRelativo: '_sem_ordem/evento-a.md', conteudo: '# Evento A\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.avisos.some((p) => p.codigo === 'SEM_POSICIONADOS')).toBe(true);
    expect(resultado.avisos.some((p) => p.codigo === 'SEM_EVENTOS')).toBe(false);
  });
});

// ─── 24. Aviso: eventos sem ordem ────────────────────────────────────────────

describe('aviso com eventos sem ordem', () => {
  it('gera aviso COM_SEM_ORDEM quando há eventos em _sem_ordem/', () => {
    const pacote = makePacoteComEvento();
    const pacoteComSemOrdem: PacoteScrivener = {
      arquivos: [
        ...pacote.arquivos,
        { caminhoRelativo: '_sem_ordem/evento-b.md', conteudo: '# Evento B\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacoteComSemOrdem);
    expect(resultado.avisos.some((p) => p.codigo === 'COM_SEM_ORDEM')).toBe(true);
  });
});

// ─── 25. valido=false quando há erro ─────────────────────────────────────────

describe('valido false quando há erro', () => {
  it('retorna valido=false se houver qualquer erro', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    expect(resultado.valido).toBe(false);
  });
});

// ─── 26. valido=true quando só há aviso ──────────────────────────────────────

describe('valido true quando há só aviso', () => {
  it('retorna valido=true quando há avisos mas nenhum erro', () => {
    // Pacote mínimo sem eventos → gera apenas aviso SEM_EVENTOS
    const resultado = validarPacoteScrivenerMarkdown(makePacoteMinimo());
    expect(resultado.valido).toBe(true);
    expect(resultado.avisos.length).toBeGreaterThan(0);
  });
});

// ─── 27. Separação de erros e avisos ─────────────────────────────────────────

describe('separação de erros e avisos', () => {
  it('erros e avisos são filtragens de problemas', () => {
    const resultado = validarPacoteScrivenerMarkdown(makePacoteMinimo());
    const errosEsperados = resultado.problemas.filter((p) => p.nivel === 'erro');
    const avisosEsperados = resultado.problemas.filter((p) => p.nivel === 'aviso');
    expect(resultado.erros).toEqual(errosEsperados);
    expect(resultado.avisos).toEqual(avisosEsperados);
  });
});

// ─── 28. Ordem dos problemas ─────────────────────────────────────────────────

describe('ordem dos problemas', () => {
  it('preserva a ordem de detecção: problemas de arquivo antes de falta de obrigatórios', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: 'Livro/Cap/010-evt.md', conteudo: '' },
        { caminhoRelativo: '00_ROTEIRO.md', conteudo: '# Roteiro\n' },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    const primeiroErro = resultado.erros[0];
    expect(primeiroErro?.codigo).toBe('CONTEUDO_VAZIO');
  });
});

// ─── 29. Entrada não mutada ───────────────────────────────────────────────────

describe('entrada não mutada', () => {
  it('não modifica o pacote de entrada', () => {
    const pacote = makePacoteMinimo();
    const arquivosOriginal = [...pacote.arquivos];
    validarPacoteScrivenerMarkdown(pacote);
    expect(pacote.arquivos).toEqual(arquivosOriginal);
    expect(pacote.arquivos).toHaveLength(arquivosOriginal.length);
  });
});

// ─── 30. Resultado novo ───────────────────────────────────────────────────────

describe('resultado novo', () => {
  it('cada chamada retorna objeto diferente', () => {
    const pacote = makePacoteMinimo();
    const r1 = validarPacoteScrivenerMarkdown(pacote);
    const r2 = validarPacoteScrivenerMarkdown(pacote);
    expect(r1).not.toBe(r2);
    expect(r1.problemas).not.toBe(r2.problemas);
  });
});

// ─── 31–34. resumirValidacaoPacoteScrivener ───────────────────────────────────

describe('resumo sem problemas', () => {
  it('retorna texto indicando pacote válido', () => {
    const resultado = validarPacoteScrivenerMarkdown(makePacoteComEvento());
    const resumo = resumirValidacaoPacoteScrivener(resultado);
    expect(resumo).toContain('válido');
  });
});

describe('resumo com erros', () => {
  it('menciona quantidade de erros', () => {
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    const resumo = resumirValidacaoPacoteScrivener(resultado);
    expect(resumo).toMatch(/\d+ erro/);
  });
});

describe('resumo com avisos', () => {
  it('quando só há avisos menciona avisos', () => {
    const resultado = validarPacoteScrivenerMarkdown(makePacoteMinimo());
    const resumo = resumirValidacaoPacoteScrivener(resultado);
    expect(resumo).toMatch(/aviso/);
  });
});

describe('resumo sem stack trace', () => {
  it('não contém quebras de linha ou rastreamento de pilha', () => {
    const pacote: PacoteScrivener = { arquivos: [] };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    const resumo = resumirValidacaoPacoteScrivener(resultado);
    expect(resumo).not.toContain('\n');
    expect(resumo).not.toContain('at ');
    expect(resumo).not.toContain('Error:');
  });
});

// ─── 35. Unicode preservado ───────────────────────────────────────────────────

describe('Unicode preservado', () => {
  it('não deturpa caracteres acentuados no conteúdo', () => {
    const conteudo = '# Título com ç, ã, é, ö\n\nTexto com açúcar e ñoño.\n';
    const pacote: PacoteScrivener = {
      arquivos: [
        { caminhoRelativo: '00_ROTEIRO.md', conteudo },
        { caminhoRelativo: 'contrarius-manifest.json', conteudo: MANIFESTO_VALIDO },
        { caminhoRelativo: 'README_IMPORTACAO_SCRIVENER.md', conteudo: '# Readme\n' },
      ],
    };
    const resultado = validarPacoteScrivenerMarkdown(pacote);
    // Deve ser válido — caracteres Unicode não são strings proibidas
    expect(resultado.erros.some((p) => p.codigo === 'CONTEUDO_UNDEFINED')).toBe(false);
    expect(resultado.erros.some((p) => p.codigo === 'CONTEUDO_NAN')).toBe(false);
  });
});
