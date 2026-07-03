import { describe, expect, it } from 'vitest';
import type { ContrariusIndex, Evento } from '../../src/contrarius/types';
import {
  TODOS_OS_LIVROS_PLANO_NARRATIVO,
  SEM_LIVRO_PLANO_NARRATIVO,
  construirPlanoNarrativo,
  editarItemPlanoNarrativo,
  moverItemPlanoNarrativo,
  renumerarPlanoNarrativo,
  restaurarItemPlanoNarrativo,
  restaurarPlanoNarrativo,
  gerarAlteracoesPlanoNarrativo,
} from '../../src/contrarius/narrative-order-model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEvento(overrides: Partial<Evento> = {}): Evento {
  return {
    tipoEntidade: 'evento',
    id: 'E-1',
    titulo: 'Evento Um',
    anoOrdem: null,
    data: '',
    dataInicio: '',
    dataFim: '',
    dataTextual: '',
    dataAproximada: false,
    periodo: [],
    natureza: '',
    status: '',
    local: [],
    nucleoGeo: [],
    participantes: [],
    retrovidas: [],
    grupocarma: [],
    holopensenes: [],
    religiao: [],
    movHistorico: [],
    eventosAnteriores: [],
    eventosPosteriores: [],
    ordemNarrativa: null,
    capitulo: '',
    cena: '',
    livro: [],
    fontes: [],
    tags: [],
    filePath: '05_Eventos/E-1.md',
    frontmatterRaw: {},
    camposDesconhecidos: {},
    avisos: [],
    ...overrides,
  };
}

function makeIndex(eventos: Evento[]): ContrariusIndex {
  return {
    consciencias: [],
    retrovidas: [],
    eventos,
    lugares: [],
    relacoes: [],
    avisosIndexacao: [],
    erros: [],
  };
}

// ─── 1. Todos os livros ───────────────────────────────────────────────────────

describe('construirPlanoNarrativo — filtro Todos', () => {
  it('inclui todos os eventos independente do livro', () => {
    const e1 = makeEvento({ id: 'E1', livro: ['Livro A'], filePath: '05/E-1.md' });
    const e2 = makeEvento({ id: 'E2', livro: ['Livro B'], filePath: '05/E-2.md' });
    const e3 = makeEvento({ id: 'E3', livro: [], filePath: '05/E-3.md' });
    const plano = construirPlanoNarrativo(makeIndex([e1, e2, e3]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    expect(plano.itens).toHaveLength(3);
    expect(plano.livro).toBe(TODOS_OS_LIVROS_PLANO_NARRATIVO);
  });
});

// ─── 2. Sem livro ─────────────────────────────────────────────────────────────

describe('construirPlanoNarrativo — filtro Sem Livro', () => {
  it('filtra apenas eventos sem livro', () => {
    const e1 = makeEvento({ id: 'E1', livro: ['Livro A'], filePath: '05/E-1.md' });
    const e2 = makeEvento({ id: 'E2', livro: [], filePath: '05/E-2.md' });
    const e3 = makeEvento({ id: 'E3', livro: [''], filePath: '05/E-3.md' });
    const plano = construirPlanoNarrativo(makeIndex([e1, e2, e3]), SEM_LIVRO_PLANO_NARRATIVO);
    expect(plano.itens).toHaveLength(2);
    const ids = plano.itens.map((i) => i.id);
    expect(ids).toContain('E2');
    expect(ids).toContain('E3');
    expect(ids).not.toContain('E1');
  });
});

// ─── 3. Livro específico com normalização de acentos e caixa ─────────────────

describe('construirPlanoNarrativo — filtro por livro específico', () => {
  it('normaliza acento e caixa ao filtrar por livro', () => {
    const e1 = makeEvento({ id: 'E1', livro: ['Contrário'], filePath: '05/E-1.md' });
    const e2 = makeEvento({ id: 'E2', livro: ['Outro'], filePath: '05/E-2.md' });
    const plano = construirPlanoNarrativo(makeIndex([e1, e2]), 'CONTRARIO');
    expect(plano.itens).toHaveLength(1);
    expect(plano.itens[0].id).toBe('E1');
  });

  it('filtra com acento no filtro e sem no livro', () => {
    const e = makeEvento({ livro: ['Contrario'], filePath: '05/E-1.md' });
    const plano = construirPlanoNarrativo(makeIndex([e]), 'Contrário');
    expect(plano.itens).toHaveLength(1);
  });
});

// ─── 4. Primeiro livro não vazio ──────────────────────────────────────────────

describe('construirPlanoNarrativo — primeiro livro não vazio', () => {
  it('usa o primeiro livro não vazio do array', () => {
    const e = makeEvento({ livro: ['', '  ', 'Livro B', 'Livro C'] });
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    expect(plano.itens[0].livro).toBe('Livro B');
  });
});

// ─── 5. Título via nomeEvento ─────────────────────────────────────────────────

describe('construirPlanoNarrativo — título', () => {
  it('usa o título do evento quando disponível', () => {
    const e = makeEvento({ titulo: 'Meu Evento Narrativo', id: 'E-1' });
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    expect(plano.itens[0].titulo).toBe('Meu Evento Narrativo');
  });

  it('usa o id quando o título está vazio (comportamento de nomeEvento)', () => {
    const e = makeEvento({ titulo: '', id: 'E-42' });
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    expect(plano.itens[0].titulo).toBe('E-42');
  });
});

// ─── 6. Chave determinística ──────────────────────────────────────────────────

describe('construirPlanoNarrativo — chave', () => {
  it('chave é determinística e independente da posição no array', () => {
    const e1 = makeEvento({ id: 'E-1', filePath: '05/E-1.md' });
    const e2 = makeEvento({ id: 'E-2', filePath: '05/E-2.md' });
    const chaveA = construirPlanoNarrativo(makeIndex([e1]), TODOS_OS_LIVROS_PLANO_NARRATIVO).itens[0].chave;
    const chaveB = construirPlanoNarrativo(makeIndex([e2, e1]), TODOS_OS_LIVROS_PLANO_NARRATIVO)
      .itens.find((i) => i.id === 'E-1')!.chave;
    expect(chaveA).toBe(chaveB);
    expect(chaveA).toBeTruthy();
  });

  it('eventos com filePath diferentes têm chaves diferentes', () => {
    const e1 = makeEvento({ id: 'E-1', filePath: '05/E-1.md' });
    const e2 = makeEvento({ id: 'E-1', filePath: '05/E-2.md' });
    const plano = construirPlanoNarrativo(makeIndex([e1, e2]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    expect(plano.itens[0].chave).not.toBe(plano.itens[1].chave);
  });
});

// ─── 7–8. Ordenação inicial ───────────────────────────────────────────────────

describe('construirPlanoNarrativo — ordenação', () => {
  it('ordena por livroChave, ordemNarrativa, capítulo, cena, título, filePath', () => {
    const eA2 = makeEvento({ id: 'A2', livro: ['Livro A'], ordemNarrativa: 2, filePath: '05/A-2.md' });
    const eA1 = makeEvento({ id: 'A1', livro: ['Livro A'], ordemNarrativa: 1, filePath: '05/A-1.md' });
    const eB1 = makeEvento({ id: 'B1', livro: ['Livro B'], ordemNarrativa: 1, filePath: '05/B-1.md' });
    const plano = construirPlanoNarrativo(makeIndex([eA2, eB1, eA1]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    expect(plano.itens.map((i) => i.id)).toEqual(['A1', 'A2', 'B1']);
  });

  // 8. Ordem nula depois das finitas
  it('itens com ordemNarrativa nula ficam depois dos com ordem finita', () => {
    const eNull = makeEvento({ id: 'Null', ordemNarrativa: null, filePath: '05/Null.md' });
    const eOrd = makeEvento({ id: 'Ord', ordemNarrativa: 1, filePath: '05/Ord.md' });
    const plano = construirPlanoNarrativo(makeIndex([eNull, eOrd]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    expect(plano.itens[0].id).toBe('Ord');
    expect(plano.itens[1].id).toBe('Null');
  });

  it('desempata por capítulo, cena, título e filePath quando ordens são iguais', () => {
    const eZ = makeEvento({ id: 'Z', ordemNarrativa: 1, capitulo: 'B', filePath: '05/Z.md' });
    const eA = makeEvento({ id: 'A', ordemNarrativa: 1, capitulo: 'A', filePath: '05/A.md' });
    const plano = construirPlanoNarrativo(makeIndex([eZ, eA]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    expect(plano.itens[0].id).toBe('A');
  });
});

// ─── 9–11. Problemas ─────────────────────────────────────────────────────────

describe('construirPlanoNarrativo — problemas', () => {
  // 9. Mesma ordem em livros diferentes aceita
  it('mesma ordemNarrativa em livros diferentes não é ordem_duplicada', () => {
    const e1 = makeEvento({ id: 'E1', livro: ['Livro A'], ordemNarrativa: 5, filePath: '05/E-1.md' });
    const e2 = makeEvento({ id: 'E2', livro: ['Livro B'], ordemNarrativa: 5, filePath: '05/E-2.md' });
    const plano = construirPlanoNarrativo(makeIndex([e1, e2]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    expect(plano.problemas.filter((p) => p.codigo === 'ordem_duplicada')).toHaveLength(0);
  });

  // 10. Duplicidade no mesmo livro
  it('detecta ordem_duplicada quando dois eventos do mesmo livro têm a mesma ordemNarrativa', () => {
    const e1 = makeEvento({ id: 'E1', livro: ['Livro A'], ordemNarrativa: 5, filePath: '05/E-1.md' });
    const e2 = makeEvento({ id: 'E2', livro: ['Livro A'], ordemNarrativa: 5, filePath: '05/E-2.md' });
    const plano = construirPlanoNarrativo(makeIndex([e1, e2]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const dups = plano.problemas.filter((p) => p.codigo === 'ordem_duplicada');
    expect(dups.length).toBeGreaterThanOrEqual(2);
    expect(dups.every((d) => d.relacionados.length > 0)).toBe(true);
  });

  // 11. Arquivo duplicado
  it('detecta arquivo_duplicado quando dois eventos têm o mesmo filePath', () => {
    const e1 = makeEvento({ id: 'E1', filePath: '05/E-1.md' });
    const e2 = makeEvento({ id: 'E2', filePath: '05/E-1.md' });
    const plano = construirPlanoNarrativo(makeIndex([e1, e2]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    expect(plano.problemas.some((p) => p.codigo === 'arquivo_duplicado')).toBe(true);
    const arqs = plano.problemas.filter((p) => p.codigo === 'arquivo_duplicado');
    expect(arqs.every((p) => p.nivel === 'erro')).toBe(true);
  });
});

// ─── 12–18. Edição de item ────────────────────────────────────────────────────

describe('editarItemPlanoNarrativo', () => {
  // 12. Edição parcial
  it('edição parcial preserva campos não editados', () => {
    const e = makeEvento({ ordemNarrativa: 5, capitulo: 'Cap 1', cena: 'Cena 1' });
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const editado = editarItemPlanoNarrativo(plano, plano.itens[0].chave, { capitulo: 'Cap 2' });
    expect(editado.itens[0].ordemAtual).toBe(5);
    expect(editado.itens[0].capituloAtual).toBe('Cap 2');
    expect(editado.itens[0].cenaAtual).toBe('Cena 1');
  });

  // 13. Trim de capítulo e cena
  it('aplica trim em capítulo e cena na edição', () => {
    const e = makeEvento();
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const editado = editarItemPlanoNarrativo(plano, plano.itens[0].chave, {
      capitulo: '  Capítulo  ',
      cena: '  Cena  ',
    });
    expect(editado.itens[0].capituloAtual).toBe('Capítulo');
    expect(editado.itens[0].cenaAtual).toBe('Cena');
  });

  // 14. Ordem zero
  it('aceita ordemNarrativa zero na edição', () => {
    const e = makeEvento({ ordemNarrativa: 5 });
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const editado = editarItemPlanoNarrativo(plano, plano.itens[0].chave, { ordemNarrativa: 0 });
    expect(editado.itens[0].ordemAtual).toBe(0);
    expect(editado.problemas.filter((p) => p.codigo === 'ordem_invalida')).toHaveLength(0);
  });

  // 15. Ordem negativa
  it('aceita ordemNarrativa negativa na edição', () => {
    const e = makeEvento();
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const editado = editarItemPlanoNarrativo(plano, plano.itens[0].chave, { ordemNarrativa: -10 });
    expect(editado.itens[0].ordemAtual).toBe(-10);
    expect(editado.problemas.filter((p) => p.codigo === 'ordem_invalida')).toHaveLength(0);
  });

  // 16. NaN
  it('rejeita NaN na edição e registra ordem_invalida sem alterar ordemAtual', () => {
    const e = makeEvento({ ordemNarrativa: 5 });
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const editado = editarItemPlanoNarrativo(plano, plano.itens[0].chave, { ordemNarrativa: NaN });
    expect(editado.itens[0].ordemAtual).toBe(5);
    expect(editado.problemas.some((p) => p.codigo === 'ordem_invalida')).toBe(true);
  });

  // 17. Infinito
  it('rejeita Infinity na edição e registra ordem_invalida', () => {
    const e = makeEvento({ ordemNarrativa: 5 });
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const editado = editarItemPlanoNarrativo(plano, plano.itens[0].chave, { ordemNarrativa: Infinity });
    expect(editado.itens[0].ordemAtual).toBe(5);
    expect(editado.problemas.some((p) => p.codigo === 'ordem_invalida')).toBe(true);
  });

  // 18. Decimal inválido
  it('rejeita decimal na edição e registra ordem_invalida', () => {
    const e = makeEvento({ ordemNarrativa: 5 });
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const editado = editarItemPlanoNarrativo(plano, plano.itens[0].chave, { ordemNarrativa: 3.14 });
    expect(editado.itens[0].ordemAtual).toBe(5);
    expect(editado.problemas.some((p) => p.codigo === 'ordem_invalida')).toBe(true);
  });

  it('define ordemAtual como null quando edicao.ordemNarrativa é null', () => {
    const e = makeEvento({ ordemNarrativa: 5 });
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const editado = editarItemPlanoNarrativo(plano, plano.itens[0].chave, { ordemNarrativa: null });
    expect(editado.itens[0].ordemAtual).toBeNull();
    expect(editado.problemas.filter((p) => p.codigo === 'ordem_invalida')).toHaveLength(0);
  });
});

// ─── 19–23. Movimento ─────────────────────────────────────────────────────────

describe('moverItemPlanoNarrativo', () => {
  function trioPlano() {
    const e1 = makeEvento({ id: 'E1', ordemNarrativa: 1, filePath: '05/E-1.md' });
    const e2 = makeEvento({ id: 'E2', ordemNarrativa: 2, filePath: '05/E-2.md' });
    const e3 = makeEvento({ id: 'E3', ordemNarrativa: 3, filePath: '05/E-3.md' });
    return construirPlanoNarrativo(makeIndex([e1, e2, e3]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
  }

  // 19. Mover para início
  it('move item para o início (índice 0)', () => {
    const plano = trioPlano();
    const movido = moverItemPlanoNarrativo(plano, plano.itens[2].chave, 0);
    expect(movido.itens[0].id).toBe('E3');
    expect(movido.itens[1].id).toBe('E1');
    expect(movido.itens[2].id).toBe('E2');
  });

  // 20. Mover para fim
  it('move item para o fim', () => {
    const plano = trioPlano();
    const movido = moverItemPlanoNarrativo(plano, plano.itens[0].chave, 2);
    expect(movido.itens[2].id).toBe('E1');
    expect(movido.itens[0].id).toBe('E2');
    expect(movido.itens[1].id).toBe('E3');
  });

  // 21. Destino fora do intervalo
  it('clipa destino acima do intervalo para o fim', () => {
    const plano = trioPlano();
    const ultimoId = plano.itens[2].id;
    const movido = moverItemPlanoNarrativo(plano, plano.itens[0].chave, 9999);
    expect(movido.itens[2].id).toBe(plano.itens[0].id);
    expect(movido.itens[1].id).toBe(ultimoId);
  });

  it('clipa destino negativo para o início', () => {
    const plano = trioPlano();
    const movido = moverItemPlanoNarrativo(plano, plano.itens[2].chave, -5);
    expect(movido.itens[0].id).toBe('E3');
  });

  // 22. Item inexistente
  it('retorna plano equivalente quando chave não existe', () => {
    const plano = trioPlano();
    const movido = moverItemPlanoNarrativo(plano, 'chave-inexistente', 0);
    expect(movido.itens.map((i) => i.id)).toEqual(plano.itens.map((i) => i.id));
  });

  // 23. Movimento não renumera
  it('movimento não altera ordemAtual automaticamente', () => {
    const plano = trioPlano();
    const movido = moverItemPlanoNarrativo(plano, plano.itens[2].chave, 0);
    expect(movido.itens[0].ordemAtual).toBe(3);
    expect(movido.itens[1].ordemAtual).toBe(1);
    expect(movido.itens[2].ordemAtual).toBe(2);
  });
});

// ─── 24–28. Renumeração ───────────────────────────────────────────────────────

describe('renumerarPlanoNarrativo', () => {
  // 24. Renumeração simples
  it('renumera na ordem visual com inicio e passo dados', () => {
    const e1 = makeEvento({ id: 'E1', ordemNarrativa: 10, filePath: '05/E-1.md' });
    const e2 = makeEvento({ id: 'E2', ordemNarrativa: 20, filePath: '05/E-2.md' });
    const plano = construirPlanoNarrativo(makeIndex([e1, e2]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const renumerado = renumerarPlanoNarrativo(plano, { inicio: 1, passo: 1 });
    expect(renumerado.itens[0].ordemAtual).toBe(1);
    expect(renumerado.itens[1].ordemAtual).toBe(2);
  });

  // 25. Início e passo negativos válidos
  it('aceita inicio negativo e passo negativo', () => {
    const e1 = makeEvento({ id: 'E1', filePath: '05/E-1.md' });
    const e2 = makeEvento({ id: 'E2', filePath: '05/E-2.md' });
    const plano = construirPlanoNarrativo(makeIndex([e1, e2]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const renumerado = renumerarPlanoNarrativo(plano, { inicio: -1, passo: -1 });
    expect(renumerado.itens[0].ordemAtual).toBe(-1);
    expect(renumerado.itens[1].ordemAtual).toBe(-2);
    expect(renumerado.problemas.filter((p) => p.codigo === 'ordem_invalida')).toHaveLength(0);
  });

  // 26. Passo zero inválido
  it('rejeita passo zero e retorna plano inalterado com ordem_invalida', () => {
    const e = makeEvento({ ordemNarrativa: 5 });
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const renumerado = renumerarPlanoNarrativo(plano, { inicio: 1, passo: 0 });
    expect(renumerado.itens[0].ordemAtual).toBe(5);
    expect(renumerado.problemas.some((p) => p.codigo === 'ordem_invalida')).toBe(true);
  });

  it('rejeita passo não inteiro', () => {
    const e = makeEvento({ ordemNarrativa: 1 });
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const renumerado = renumerarPlanoNarrativo(plano, { inicio: 1, passo: 0.5 });
    expect(renumerado.problemas.some((p) => p.codigo === 'ordem_invalida')).toBe(true);
  });

  // 27. Reinício por livro em Todos
  it('reinicia o contador a cada livroChave no modo Todos', () => {
    const eA1 = makeEvento({ id: 'A1', livro: ['Livro A'], ordemNarrativa: 1, filePath: '05/A-1.md' });
    const eA2 = makeEvento({ id: 'A2', livro: ['Livro A'], ordemNarrativa: 2, filePath: '05/A-2.md' });
    const eB1 = makeEvento({ id: 'B1', livro: ['Livro B'], ordemNarrativa: 1, filePath: '05/B-1.md' });
    const plano = construirPlanoNarrativo(makeIndex([eA1, eA2, eB1]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const renumerado = renumerarPlanoNarrativo(plano, { inicio: 10, passo: 10 });
    // A: 10, 20 | B: 10
    const por = (id: string) => renumerado.itens.find((i) => i.id === id)!.ordemAtual;
    expect(por('A1')).toBe(10);
    expect(por('A2')).toBe(20);
    expect(por('B1')).toBe(10);
  });

  // 28. Sequência única em Sem livro
  it('usa sequência única (sem reinício) no modo Sem Livro', () => {
    const e1 = makeEvento({ id: 'E1', livro: [], filePath: '05/E-1.md' });
    const e2 = makeEvento({ id: 'E2', livro: [], filePath: '05/E-2.md' });
    const plano = construirPlanoNarrativo(makeIndex([e1, e2]), SEM_LIVRO_PLANO_NARRATIVO);
    const renumerado = renumerarPlanoNarrativo(plano, { inicio: 1, passo: 1 });
    expect(renumerado.itens[0].ordemAtual).toBe(1);
    expect(renumerado.itens[1].ordemAtual).toBe(2);
  });
});

// ─── 29–30. Restauração ───────────────────────────────────────────────────────

describe('restaurarItemPlanoNarrativo / restaurarPlanoNarrativo', () => {
  // 29. Restauração de item
  it('restaura os valores originais de um item específico', () => {
    const e = makeEvento({ ordemNarrativa: 5, capitulo: 'Cap', cena: 'Cena' });
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const editado = editarItemPlanoNarrativo(plano, plano.itens[0].chave, {
      ordemNarrativa: 99,
      capitulo: 'Novo',
      cena: 'Nova',
    });
    const restaurado = restaurarItemPlanoNarrativo(editado, plano.itens[0].chave);
    expect(restaurado.itens[0].ordemAtual).toBe(5);
    expect(restaurado.itens[0].capituloAtual).toBe('Cap');
    expect(restaurado.itens[0].cenaAtual).toBe('Cena');
    expect(restaurado.itens[0].alterado).toBe(false);
  });

  // 30. Restauração total
  it('restaura todos os itens do plano', () => {
    const e1 = makeEvento({ id: 'E1', ordemNarrativa: 1, filePath: '05/E-1.md' });
    const e2 = makeEvento({ id: 'E2', ordemNarrativa: 2, filePath: '05/E-2.md' });
    const plano = construirPlanoNarrativo(makeIndex([e1, e2]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const renumerado = renumerarPlanoNarrativo(plano, { inicio: 100, passo: 100 });
    expect(renumerado.totalAlterados).toBe(2);
    const restaurado = restaurarPlanoNarrativo(renumerado);
    expect(restaurado.itens[0].ordemAtual).toBe(1);
    expect(restaurado.itens[1].ordemAtual).toBe(2);
    expect(restaurado.totalAlterados).toBe(0);
  });
});

// ─── 31–36. totalAlterados e gerarAlteracoesPlanoNarrativo ───────────────────

describe('totalAlterados e gerarAlteracoesPlanoNarrativo', () => {
  // 31. totalAlterados
  it('totalAlterados reflete o número de itens alterados', () => {
    const e1 = makeEvento({ id: 'E1', filePath: '05/E-1.md' });
    const e2 = makeEvento({ id: 'E2', filePath: '05/E-2.md' });
    const plano = construirPlanoNarrativo(makeIndex([e1, e2]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    expect(plano.totalAlterados).toBe(0);
    const editado = editarItemPlanoNarrativo(plano, plano.itens[0].chave, { ordemNarrativa: 99 });
    expect(editado.totalAlterados).toBe(1);
    const tudo = renumerarPlanoNarrativo(plano, { inicio: 100, passo: 1 });
    expect(tudo.totalAlterados).toBe(2);
  });

  // 32. Conjunto mínimo de alterações
  it('gerarAlteracoesPlanoNarrativo retorna apenas itens realmente alterados', () => {
    const e1 = makeEvento({ id: 'E1', filePath: '05/E-1.md' });
    const e2 = makeEvento({ id: 'E2', filePath: '05/E-2.md' });
    const plano = construirPlanoNarrativo(makeIndex([e1, e2]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const editado = editarItemPlanoNarrativo(plano, plano.itens[0].chave, { ordemNarrativa: 10 });
    const alteracoes = gerarAlteracoesPlanoNarrativo(editado);
    expect(alteracoes).toHaveLength(1);
    expect(alteracoes[0].id).toBe('E1');
  });

  // 33. Antes e depois corretos
  it('alterações têm antes e depois corretos', () => {
    const e = makeEvento({ ordemNarrativa: 5, capitulo: 'Cap Original', cena: 'Cena Original' });
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const editado = editarItemPlanoNarrativo(plano, plano.itens[0].chave, {
      ordemNarrativa: 10,
      capitulo: 'Cap Novo',
    });
    const [alt] = gerarAlteracoesPlanoNarrativo(editado);
    expect(alt.antes.ordemNarrativa).toBe(5);
    expect(alt.antes.capitulo).toBe('Cap Original');
    expect(alt.antes.cena).toBe('Cena Original');
    expect(alt.depois.ordemNarrativa).toBe(10);
    expect(alt.depois.capitulo).toBe('Cap Novo');
    expect(alt.depois.cena).toBe('Cena Original');
  });

  // 34. Preservação da ordem visual
  it('gerarAlteracoesPlanoNarrativo preserva a ordem visual do plano', () => {
    const e1 = makeEvento({ id: 'E1', ordemNarrativa: 1, filePath: '05/E-1.md' });
    const e2 = makeEvento({ id: 'E2', ordemNarrativa: 2, filePath: '05/E-2.md' });
    const plano = construirPlanoNarrativo(makeIndex([e1, e2]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    // Move E2 para a frente
    const movido = moverItemPlanoNarrativo(plano, plano.itens[1].chave, 0);
    // Renumera: E2 fica 1, E1 fica 2
    const editado = renumerarPlanoNarrativo(movido, { inicio: 1, passo: 1 });
    const alteracoes = gerarAlteracoesPlanoNarrativo(editado);
    expect(alteracoes[0].id).toBe('E2');
    expect(alteracoes[1].id).toBe('E1');
  });

  // 35. Imutabilidade
  it('operações não mutam o plano de entrada', () => {
    const e = makeEvento({ ordemNarrativa: 5 });
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const ordemAntes = plano.itens[0].ordemAtual;
    const itensAntes = plano.itens;

    editarItemPlanoNarrativo(plano, plano.itens[0].chave, { ordemNarrativa: 99 });
    renumerarPlanoNarrativo(plano, { inicio: 100, passo: 1 });
    moverItemPlanoNarrativo(plano, plano.itens[0].chave, 0);
    restaurarItemPlanoNarrativo(plano, plano.itens[0].chave);

    expect(plano.itens[0].ordemAtual).toBe(ordemAntes);
    expect(plano.itens).toBe(itensAntes);
  });

  // 36. Chamadas repetidas equivalentes
  it('chamadas repetidas a gerarAlteracoesPlanoNarrativo produzem resultados equivalentes', () => {
    const e = makeEvento({ ordemNarrativa: 5 });
    const plano = construirPlanoNarrativo(makeIndex([e]), TODOS_OS_LIVROS_PLANO_NARRATIVO);
    const editado = editarItemPlanoNarrativo(plano, plano.itens[0].chave, { ordemNarrativa: 10 });
    const alt1 = gerarAlteracoesPlanoNarrativo(editado);
    const alt2 = gerarAlteracoesPlanoNarrativo(editado);
    expect(alt1).toEqual(alt2);
    expect(alt1).not.toBe(alt2);
  });
});
