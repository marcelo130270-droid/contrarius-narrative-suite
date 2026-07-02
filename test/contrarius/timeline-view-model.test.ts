import { describe, expect, it } from 'vitest';
import type {
  CronologiaDuplaContrarius,
  ItemCronologiaContrarius,
  PosicaoTemporalContrarius,
  ProblemaCronologiaContrarius,
} from '../../src/contrarius/timeline-model';
import {
  construirVisaoCronologia,
  formatarPosicaoTemporal,
  rotuloProblemaCronologia,
  SEM_LIVRO_CRONOLOGIA,
  TODOS_OS_LIVROS_CRONOLOGIA,
  type FiltroVisaoCronologia,
} from '../../src/contrarius/timeline-view-model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePosicao(overrides: Partial<PosicaoTemporalContrarius> = {}): PosicaoTemporalContrarius {
  return {
    inicio: 14000000,
    fim: 14000000,
    precisao: 'ano',
    textoOriginal: '1400',
    aproximada: false,
    ...overrides,
  };
}

function makeItem(overrides: Partial<ItemCronologiaContrarius> = {}): ItemCronologiaContrarius {
  return {
    id: 'E-1',
    titulo: 'Evento Um',
    filePath: '05_Eventos/E-1.md',
    posicaoTemporal: makePosicao(),
    ordemNarrativa: 1,
    livro: ['Livro A'],
    capitulo: '',
    cena: '',
    ...overrides,
  };
}

function makeCronologia(
  overrides: Partial<CronologiaDuplaContrarius> = {},
): CronologiaDuplaContrarius {
  return {
    cronologica: { modo: 'cronologica', posicionados: [], naoPosicionados: [] },
    narrativa: { modo: 'narrativa', posicionados: [], naoPosicionados: [] },
    problemas: [],
    ...overrides,
  };
}

function makeProblema(
  overrides: Partial<ProblemaCronologiaContrarius> = {},
): ProblemaCronologiaContrarius {
  return {
    codigo: 'data_invalida',
    nivel: 'aviso',
    eventoId: 'E-1',
    filePath: '05_Eventos/E-1.md',
    mensagem: 'Mensagem de teste',
    relacionados: [],
    ...overrides,
  };
}

const filtroTodos: FiltroVisaoCronologia = {
  modo: 'cronologica',
  livro: TODOS_OS_LIVROS_CRONOLOGIA,
  consulta: '',
};

// ─── 1. Opções de livro — ordem ───────────────────────────────────────────────

describe('livros — ordem', () => {
  it('Todos os livros é sempre o primeiro', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [
          makeItem({ id: 'E-1', livro: ['Livro B'] }),
          makeItem({ id: 'E-2', livro: ['Livro A'] }),
        ],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    expect(visao.livros[0].chave).toBe(TODOS_OS_LIVROS_CRONOLOGIA);
    expect(visao.livros[0].rotulo).toBe('Todos os livros');
  });

  it('Sem livro é sempre o último', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [
          makeItem({ id: 'E-1', livro: [] }),
          makeItem({ id: 'E-2', livro: ['Livro A'] }),
        ],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    const last = visao.livros[visao.livros.length - 1];
    expect(last.chave).toBe(SEM_LIVRO_CRONOLOGIA);
    expect(last.rotulo).toBe('Sem livro');
  });

  it('livros nomeados são ordenados alfabeticamente entre Todos e Sem livro', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [
          makeItem({ id: 'E-1', livro: ['Zebra'] }),
          makeItem({ id: 'E-2', livro: ['Alfa'] }),
          makeItem({ id: 'E-3', livro: [] }),
        ],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    const rotulosNomeados = visao.livros.slice(1, -1).map((l) => l.rotulo);
    expect(rotulosNomeados).toEqual(['Alfa', 'Zebra']);
  });
});

// ─── 2. Contagem por livro ────────────────────────────────────────────────────

describe('livros — contagem', () => {
  it('contagem inclui posicionados e não posicionados', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ id: 'E-1', livro: ['Livro A'] })],
        naoPosicionados: [
          makeItem({
            id: 'E-2',
            livro: ['Livro A'],
            posicaoTemporal: makePosicao({ inicio: null, fim: null, precisao: 'nao_posicionado', textoOriginal: '' }),
          }),
        ],
      },
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    const livroA = visao.livros.find((l) => l.rotulo === 'Livro A');
    expect(livroA?.quantidade).toBe(2);
  });

  it('Todos os livros conta o total geral', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ id: 'E-1', livro: ['A'] }), makeItem({ id: 'E-2', livro: ['B'] })],
        naoPosicionados: [makeItem({ id: 'E-3', livro: [] })],
      },
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    expect(visao.livros[0].quantidade).toBe(3);
  });
});

// ─── 3. Filtro por livro ──────────────────────────────────────────────────────

describe('filtro por livro', () => {
  it('filtra por livro e exclui outros', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [
          makeItem({ id: 'E-1', livro: ['Livro A'] }),
          makeItem({ id: 'E-2', livro: ['Livro B'] }),
        ],
        naoPosicionados: [],
      },
    });

    const livroAChave = construirVisaoCronologia(cronologia, filtroTodos)
      .livros.find((l) => l.rotulo === 'Livro A')!.chave;

    const visao = construirVisaoCronologia(cronologia, { ...filtroTodos, livro: livroAChave });
    expect(visao.posicionados).toHaveLength(1);
    expect(visao.posicionados[0].item.id).toBe('E-1');
  });

  it('comparação de livro é insensível a acentos e maiúsculas', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [
          makeItem({ id: 'E-1', livro: ['Ação'] }),
          makeItem({ id: 'E-2', livro: ['Acao'] }),
        ],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    // Both normalize to 'acao', so they share the same chave and appear in the same option
    const acaoOpcao = visao.livros.find((l) => l.rotulo === 'Ação' || l.rotulo === 'Acao');
    expect(acaoOpcao?.quantidade).toBe(2);
  });
});

// ─── 4. Filtro Sem livro ──────────────────────────────────────────────────────

describe('filtro Sem livro', () => {
  it('Sem livro filtra apenas itens sem livro definido', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [
          makeItem({ id: 'E-1', livro: [] }),
          makeItem({ id: 'E-2', livro: ['Livro A'] }),
        ],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, {
      ...filtroTodos,
      livro: SEM_LIVRO_CRONOLOGIA,
    });
    expect(visao.posicionados).toHaveLength(1);
    expect(visao.posicionados[0].item.id).toBe('E-1');
  });
});

// ─── 5. Busca — sem diferenciar caixa e acentos ──────────────────────────────

describe('busca — insensível a caixa e acentos', () => {
  it('encontra por título com acentos invertidos', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ id: 'E-1', titulo: 'Ação Épica' })],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, { ...filtroTodos, consulta: 'acao epica' });
    expect(visao.posicionados).toHaveLength(1);
  });

  it('encontra por título em maiúsculas com busca em minúsculas', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ id: 'E-1', titulo: 'GRANDE BATALHA' })],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, { ...filtroTodos, consulta: 'grande batalha' });
    expect(visao.posicionados).toHaveLength(1);
  });

  it('não retorna eventos que não correspondem', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ id: 'E-1', titulo: 'Evento Alfa' })],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, { ...filtroTodos, consulta: 'beta' });
    expect(visao.posicionados).toHaveLength(0);
  });
});

// ─── 6. Busca por ID ─────────────────────────────────────────────────────────

describe('busca por ID', () => {
  it('encontra pelo id do evento', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [
          makeItem({ id: 'EVT-42', titulo: 'Sem título relevante' }),
          makeItem({ id: 'EVT-99', titulo: 'Outro evento' }),
        ],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, { ...filtroTodos, consulta: 'evt-42' });
    expect(visao.posicionados).toHaveLength(1);
    expect(visao.posicionados[0].item.id).toBe('EVT-42');
  });
});

// ─── 7. Busca por capítulo e cena ────────────────────────────────────────────

describe('busca por capítulo e cena', () => {
  it('encontra pelo capítulo', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [
          makeItem({ id: 'E-1', capitulo: 'A Chegada' }),
          makeItem({ id: 'E-2', capitulo: 'A Partida' }),
        ],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, { ...filtroTodos, consulta: 'chegada' });
    expect(visao.posicionados).toHaveLength(1);
    expect(visao.posicionados[0].item.id).toBe('E-1');
  });

  it('encontra pela cena', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ id: 'E-1', cena: 'Cena do Jardim' })],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, { ...filtroTodos, consulta: 'jardim' });
    expect(visao.posicionados).toHaveLength(1);
  });
});

// ─── 8. Modo cronológico ──────────────────────────────────────────────────────

describe('modo cronológico', () => {
  it('usa a sequência cronológica', () => {
    const item1 = makeItem({ id: 'E-cron-1' });
    const item2 = makeItem({ id: 'E-cron-2' });
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [item1, item2],
        naoPosicionados: [],
      },
      narrativa: {
        modo: 'narrativa',
        posicionados: [makeItem({ id: 'E-narr-1' })],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    expect(visao.posicionados.map((l) => l.item.id)).toEqual(['E-cron-1', 'E-cron-2']);
  });

  it('rotuloTemporal no modo cronológico usa a data formatada', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ posicaoTemporal: makePosicao({ textoOriginal: '1400', precisao: 'ano' }) })],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    expect(visao.posicionados[0].rotuloTemporal).toBe('1400');
  });
});

// ─── 9. Modo narrativo ────────────────────────────────────────────────────────

describe('modo narrativo', () => {
  it('usa a sequência narrativa', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ id: 'E-cron' })],
        naoPosicionados: [],
      },
      narrativa: {
        modo: 'narrativa',
        posicionados: [makeItem({ id: 'E-narr-1' }), makeItem({ id: 'E-narr-2' })],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, { ...filtroTodos, modo: 'narrativa' });
    expect(visao.posicionados.map((l) => l.item.id)).toEqual(['E-narr-1', 'E-narr-2']);
  });

  it('rotuloTemporal no modo narrativo usa Ordem N', () => {
    const cronologia = makeCronologia({
      narrativa: {
        modo: 'narrativa',
        posicionados: [makeItem({ ordemNarrativa: 5 })],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, { ...filtroTodos, modo: 'narrativa' });
    expect(visao.posicionados[0].rotuloTemporal).toBe('Ordem 5');
  });
});

// ─── 10. Preservação da ordem ─────────────────────────────────────────────────

describe('preservação da ordem do modelo', () => {
  it('mantém a ordem exata dos arrays de entrada', () => {
    const ids = ['E-C', 'E-A', 'E-B'];
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: ids.map((id) => makeItem({ id })),
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    expect(visao.posicionados.map((l) => l.item.id)).toEqual(ids);
  });
});

// ─── 11. Numeração entre seções ───────────────────────────────────────────────

describe('numeração', () => {
  it('reinicia posicao em 1 em cada seção', () => {
    const posNaoPos = makePosicao({ inicio: null, fim: null, precisao: 'nao_posicionado', textoOriginal: '' });
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ id: 'P1' }), makeItem({ id: 'P2' })],
        naoPosicionados: [
          makeItem({ id: 'NP1', posicaoTemporal: posNaoPos }),
          makeItem({ id: 'NP2', posicaoTemporal: posNaoPos }),
        ],
      },
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    expect(visao.posicionados.map((l) => l.posicao)).toEqual([1, 2]);
    expect(visao.naoPosicionados.map((l) => l.posicao)).toEqual([1, 2]);
  });
});

// ─── 12. Formatação — data aproximada ────────────────────────────────────────

describe('formatarPosicaoTemporal — aproximada', () => {
  it('prefixa ≈ quando aproximada e texto sem marca', () => {
    const pos = makePosicao({ textoOriginal: '1400', aproximada: true });
    expect(formatarPosicaoTemporal(pos)).toBe('≈ 1400');
  });

  it('não duplica ≈ se o texto já começa com ≈', () => {
    const pos = makePosicao({ textoOriginal: '≈ 1400', aproximada: true });
    expect(formatarPosicaoTemporal(pos)).toBe('≈ 1400');
  });

  it('não prefixa ≈ se aproximada for false', () => {
    const pos = makePosicao({ textoOriginal: '1400', aproximada: false });
    expect(formatarPosicaoTemporal(pos)).toBe('1400');
  });
});

// ─── 13. Formatação — não posicionado ────────────────────────────────────────

describe('formatarPosicaoTemporal — nao_posicionado', () => {
  it('retorna Sem posição cronológica', () => {
    const pos = makePosicao({ inicio: null, fim: null, precisao: 'nao_posicionado', textoOriginal: '' });
    expect(formatarPosicaoTemporal(pos)).toBe('Sem posição cronológica');
  });
});

// ─── 14. Formatação — ano de ordem ───────────────────────────────────────────

describe('formatarPosicaoTemporal — ano_ordem', () => {
  it('prefixa com Ano de ordem:', () => {
    const pos = makePosicao({ precisao: 'ano_ordem', textoOriginal: '1400', inicio: 14000000 });
    expect(formatarPosicaoTemporal(pos)).toBe('Ano de ordem: 1400');
  });

  it('fallback quando textoOriginal vazio', () => {
    const pos = makePosicao({ precisao: 'ano_ordem', textoOriginal: '', inicio: 14000000 });
    expect(formatarPosicaoTemporal(pos)).toBe('Ano de ordem');
  });
});

// ─── 15. Contexto narrativo sem separadores órfãos ───────────────────────────

describe('rotuloContexto', () => {
  it('não contém separadores órfãos quando capitulo e cena são vazios', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ livro: ['Livro A'], capitulo: '', cena: '' })],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    const ctx = visao.posicionados[0].rotuloContexto;
    expect(ctx).not.toMatch(/^\s*·/);
    expect(ctx).not.toMatch(/·\s*$/);
    expect(ctx).not.toMatch(/·\s*·/);
    expect(ctx).toBe('Livro A');
  });

  it('inclui capitulo e cena quando presentes', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ livro: ['Livro A'], capitulo: 'Cap 1', cena: 'Sc 3' })],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    const ctx = visao.posicionados[0].rotuloContexto;
    expect(ctx).toContain('Cap. Cap 1');
    expect(ctx).toContain('Cena Sc 3');
  });

  it('contexto vazio quando nenhum campo presente', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ livro: [], capitulo: '', cena: '' })],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    expect(visao.posicionados[0].rotuloContexto).toBe('');
  });
});

// ─── 16. Problemas limitados a IDs visíveis ──────────────────────────────────

describe('problemas filtrados por IDs visíveis', () => {
  it('exclui problemas de eventos não visíveis', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ id: 'E-visivel', livro: ['Livro A'] })],
        naoPosicionados: [],
      },
      problemas: [
        makeProblema({ eventoId: 'E-visivel' }),
        makeProblema({ eventoId: 'E-oculto', filePath: '05_Eventos/E-oculto.md' }),
      ],
    });

    const livroAChave = construirVisaoCronologia(cronologia, filtroTodos)
      .livros.find((l) => l.rotulo === 'Livro A')!.chave;

    const visao = construirVisaoCronologia(cronologia, { ...filtroTodos, livro: livroAChave });
    expect(visao.problemas).toHaveLength(1);
    expect(visao.problemas[0].eventoId).toBe('E-visivel');
  });

  it('inclui problemas cujo eventoId esteja visível', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ id: 'E-1' })],
        naoPosicionados: [],
      },
      problemas: [makeProblema({ eventoId: 'E-1' })],
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    expect(visao.problemas).toHaveLength(1);
  });
});

// ─── 17. Erros antes de avisos ────────────────────────────────────────────────

describe('ordenação de problemas', () => {
  it('erros aparecem antes de avisos', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ id: 'E-1' }), makeItem({ id: 'E-2' })],
        naoPosicionados: [],
      },
      problemas: [
        makeProblema({ eventoId: 'E-1', nivel: 'aviso', codigo: 'data_invalida' }),
        makeProblema({ eventoId: 'E-2', nivel: 'erro', codigo: 'ciclo_de_dependencia' }),
      ],
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    expect(visao.problemas[0].nivel).toBe('erro');
    expect(visao.problemas[1].nivel).toBe('aviso');
  });
});

// ─── 18. Rótulos dos oito códigos ────────────────────────────────────────────

describe('rotuloProblemaCronologia', () => {
  it('cobre todos os oito códigos', () => {
    expect(rotuloProblemaCronologia('data_invalida')).toBe('Data inválida');
    expect(rotuloProblemaCronologia('intervalo_invertido')).toBe('Intervalo invertido');
    expect(rotuloProblemaCronologia('ordem_narrativa_ausente')).toBe('Ordem narrativa ausente');
    expect(rotuloProblemaCronologia('ordem_narrativa_duplicada')).toBe('Ordem narrativa duplicada');
    expect(rotuloProblemaCronologia('referencia_evento_nao_encontrada')).toBe('Referência de evento não encontrada');
    expect(rotuloProblemaCronologia('referencia_evento_ambigua')).toBe('Referência de evento ambígua');
    expect(rotuloProblemaCronologia('restricao_cronologica_violada')).toBe('Restrição cronológica violada');
    expect(rotuloProblemaCronologia('ciclo_de_dependencia')).toBe('Ciclo de dependência');
  });
});

// ─── 19. Estado vazio ─────────────────────────────────────────────────────────

describe('estado vazio', () => {
  it('cronologia vazia retorna totalAntesDosFiltros zero', () => {
    const visao = construirVisaoCronologia(makeCronologia(), filtroTodos);
    expect(visao.totalAntesDosFiltros).toBe(0);
    expect(visao.totalVisivel).toBe(0);
    expect(visao.posicionados).toHaveLength(0);
    expect(visao.naoPosicionados).toHaveLength(0);
    expect(visao.problemas).toHaveLength(0);
  });

  it('livros só tem Todos os livros quando não há itens', () => {
    const visao = construirVisaoCronologia(makeCronologia(), filtroTodos);
    expect(visao.livros).toHaveLength(1);
    expect(visao.livros[0].chave).toBe(TODOS_OS_LIVROS_CRONOLOGIA);
  });

  it('busca sem resultado retorna totais zero', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ titulo: 'Evento Real' })],
        naoPosicionados: [],
      },
    });
    const visao = construirVisaoCronologia(cronologia, { ...filtroTodos, consulta: 'zzz_nao_existe' });
    expect(visao.totalVisivel).toBe(0);
  });
});

// ─── 20. Nenhuma mutação das entradas ────────────────────────────────────────

describe('imutabilidade', () => {
  it('não muta o array de posicionados da entrada', () => {
    const pos = [makeItem({ id: 'E-1' }), makeItem({ id: 'E-2' })];
    const posCopy = [...pos];
    const cronologia = makeCronologia({
      cronologica: { modo: 'cronologica', posicionados: pos, naoPosicionados: [] },
    });
    construirVisaoCronologia(cronologia, filtroTodos);
    expect(pos).toHaveLength(posCopy.length);
    expect(pos[0].id).toBe(posCopy[0].id);
    expect(pos[1].id).toBe(posCopy[1].id);
  });

  it('não muta o array de problemas da entrada', () => {
    const problemas = [makeProblema({ eventoId: 'E-1', nivel: 'aviso' })];
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ id: 'E-1' })],
        naoPosicionados: [],
      },
      problemas,
    });
    construirVisaoCronologia(cronologia, filtroTodos);
    expect(problemas).toHaveLength(1);
    expect(problemas[0].nivel).toBe('aviso');
  });
});

// ─── 21. Arrays de saída não reutilizam referências mutáveis ─────────────────

describe('novos arrays na saída', () => {
  it('posicionados de saída é um array diferente do de entrada', () => {
    const entradaPos = [makeItem({ id: 'E-1' })];
    const cronologia = makeCronologia({
      cronologica: { modo: 'cronologica', posicionados: entradaPos, naoPosicionados: [] },
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    expect(visao.posicionados).not.toBe(entradaPos);
    expect(visao.posicionados).not.toBe(cronologia.cronologica.posicionados);
  });

  it('problemas de saída é um array diferente do de entrada', () => {
    const entradaProblemas = [makeProblema({ eventoId: 'E-1' })];
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [makeItem({ id: 'E-1' })],
        naoPosicionados: [],
      },
      problemas: entradaProblemas,
    });
    const visao = construirVisaoCronologia(cronologia, filtroTodos);
    expect(visao.problemas).not.toBe(entradaProblemas);
  });
});

// ─── 22. Chamadas repetidas produzem resultados equivalentes ─────────────────

describe('determinismo', () => {
  it('chamadas repetidas com os mesmos argumentos retornam resultados equivalentes', () => {
    const cronologia = makeCronologia({
      cronologica: {
        modo: 'cronologica',
        posicionados: [
          makeItem({ id: 'E-1', livro: ['Livro A'] }),
          makeItem({ id: 'E-2', livro: ['Livro B'] }),
        ],
        naoPosicionados: [
          makeItem({
            id: 'E-3',
            livro: [],
            posicaoTemporal: makePosicao({ inicio: null, fim: null, precisao: 'nao_posicionado', textoOriginal: '' }),
          }),
        ],
      },
      problemas: [makeProblema({ eventoId: 'E-1', nivel: 'erro', codigo: 'ciclo_de_dependencia' })],
    });

    const r1 = construirVisaoCronologia(cronologia, filtroTodos);
    const r2 = construirVisaoCronologia(cronologia, filtroTodos);

    expect(r1.totalAntesDosFiltros).toBe(r2.totalAntesDosFiltros);
    expect(r1.totalVisivel).toBe(r2.totalVisivel);
    expect(r1.posicionados.map((l) => l.item.id)).toEqual(r2.posicionados.map((l) => l.item.id));
    expect(r1.naoPosicionados.map((l) => l.item.id)).toEqual(r2.naoPosicionados.map((l) => l.item.id));
    expect(r1.problemas.map((p) => p.codigo)).toEqual(r2.problemas.map((p) => p.codigo));
    expect(r1.livros.map((l) => l.chave)).toEqual(r2.livros.map((l) => l.chave));
  });
});
