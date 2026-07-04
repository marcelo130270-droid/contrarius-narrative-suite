import { describe, expect, it } from 'vitest';
import {
  ROTULO_SEM_CAPITULO,
  ROTULO_SEM_LIVRO_ROTEIRO,
  construirRoteiroNarrativo,
  type EntradaRoteiroNarrativo,
} from '../../src/contrarius/narrative-outline-model';

function makeEntrada(overrides: Partial<EntradaRoteiroNarrativo> = {}): EntradaRoteiroNarrativo {
  return {
    chave: 'evento:05_Eventos/E-1.md:E-1',
    id: 'E-1',
    titulo: 'Evento Um',
    filePath: '05_Eventos/E-1.md',
    livro: 'Livro A',
    livroChave: 'livro a',
    ordemNarrativa: 10,
    capitulo: 'Capítulo 1',
    cena: 'Cena 1',
    ...overrides,
  };
}

describe('construirRoteiroNarrativo', () => {
  it('1. entrada vazia', () => {
    const result = construirRoteiroNarrativo([]);
    expect(result.livros).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('2. um livro, um capítulo, uma cena', () => {
    const result = construirRoteiroNarrativo([makeEntrada()]);
    expect(result.livros).toHaveLength(1);
    expect(result.livros[0].capitulos).toHaveLength(1);
    expect(result.livros[0].capitulos[0].cenas).toHaveLength(1);
    expect(result.livros[0].capitulos[0].cenas[0].itens).toHaveLength(1);
    expect(result.livros[0].capitulos[0].itensSemCena).toHaveLength(0);
  });

  it('3. múltiplos livros', () => {
    const e1 = makeEntrada({ chave: 'c1', livro: 'Livro A', livroChave: 'livro a' });
    const e2 = makeEntrada({ chave: 'c2', livro: 'Livro B', livroChave: 'livro b' });
    const result = construirRoteiroNarrativo([e1, e2]);
    expect(result.livros).toHaveLength(2);
  });

  it('4. livro vazio', () => {
    const e = makeEntrada({ livro: '', livroChave: '' });
    const result = construirRoteiroNarrativo([e]);
    expect(result.livros[0].titulo).toBe(ROTULO_SEM_LIVRO_ROTEIRO);
  });

  it('5. capítulo vazio', () => {
    const e = makeEntrada({ capitulo: '' });
    const result = construirRoteiroNarrativo([e]);
    expect(result.livros[0].capitulos[0].titulo).toBe(ROTULO_SEM_CAPITULO);
  });

  it('6. cena vazia', () => {
    const e = makeEntrada({ cena: '' });
    const result = construirRoteiroNarrativo([e]);
    const cap = result.livros[0].capitulos[0];
    expect(cap.cenas).toHaveLength(0);
    expect(cap.itensSemCena).toHaveLength(1);
  });

  it('7. mistura de cenas preenchidas e vazias', () => {
    const e1 = makeEntrada({ chave: 'c1', cena: 'Cena 1' });
    const e2 = makeEntrada({ chave: 'c2', cena: '' });
    const result = construirRoteiroNarrativo([e1, e2]);
    const cap = result.livros[0].capitulos[0];
    expect(cap.cenas).toHaveLength(1);
    expect(cap.itensSemCena).toHaveLength(1);
  });

  it('8. ordem preservada dos livros', () => {
    const e1 = makeEntrada({ chave: 'c1', livro: 'Zeta', livroChave: 'zeta' });
    const e2 = makeEntrada({ chave: 'c2', livro: 'Alpha', livroChave: 'alpha' });
    const result = construirRoteiroNarrativo([e1, e2]);
    expect(result.livros[0].titulo).toBe('Zeta');
    expect(result.livros[1].titulo).toBe('Alpha');
  });

  it('9. ordem preservada dos capítulos', () => {
    const e1 = makeEntrada({ chave: 'c1', capitulo: 'Z Cap', cena: '' });
    const e2 = makeEntrada({ chave: 'c2', capitulo: 'A Cap', cena: '' });
    const result = construirRoteiroNarrativo([e1, e2]);
    expect(result.livros[0].capitulos[0].titulo).toBe('Z Cap');
    expect(result.livros[0].capitulos[1].titulo).toBe('A Cap');
  });

  it('10. ordem preservada das cenas', () => {
    const e1 = makeEntrada({ chave: 'c1', cena: 'Z Cena' });
    const e2 = makeEntrada({ chave: 'c2', cena: 'A Cena' });
    const result = construirRoteiroNarrativo([e1, e2]);
    const cap = result.livros[0].capitulos[0];
    expect(cap.cenas[0].titulo).toBe('Z Cena');
    expect(cap.cenas[1].titulo).toBe('A Cena');
  });

  it('11. ordem preservada dos itens', () => {
    const e1 = makeEntrada({ chave: 'c1', titulo: 'Z Evento', cena: 'Cena 1' });
    const e2 = makeEntrada({ chave: 'c2', titulo: 'A Evento', cena: 'Cena 1' });
    const result = construirRoteiroNarrativo([e1, e2]);
    const itens = result.livros[0].capitulos[0].cenas[0].itens;
    expect(itens[0].titulo).toBe('Z Evento');
    expect(itens[1].titulo).toBe('A Evento');
  });

  it('12. normalização de acentos', () => {
    const e1 = makeEntrada({ chave: 'c1', capitulo: 'Capítulo 1' });
    const e2 = makeEntrada({ chave: 'c2', capitulo: 'Capitulo 1' });
    const result = construirRoteiroNarrativo([e1, e2]);
    expect(result.livros[0].capitulos).toHaveLength(1);
  });

  it('13. normalização de caixa', () => {
    const e1 = makeEntrada({ chave: 'c1', cena: 'CENA A' });
    const e2 = makeEntrada({ chave: 'c2', cena: 'cena a' });
    const result = construirRoteiroNarrativo([e1, e2]);
    const cap = result.livros[0].capitulos[0];
    expect(cap.cenas).toHaveLength(1);
    expect(cap.cenas[0].itens).toHaveLength(2);
  });

  it('14. compactação de espaços', () => {
    const e1 = makeEntrada({ chave: 'c1', cena: 'cena  a' });
    const e2 = makeEntrada({ chave: 'c2', cena: 'cena a' });
    const result = construirRoteiroNarrativo([e1, e2]);
    const cap = result.livros[0].capitulos[0];
    expect(cap.cenas).toHaveLength(1);
  });

  it('15. rótulo humano preservado', () => {
    const e = makeEntrada({ capitulo: '  Meu Capítulo  ' });
    const result = construirRoteiroNarrativo([e]);
    expect(result.livros[0].capitulos[0].titulo).toBe('Meu Capítulo');
  });

  it('16. primeira versão humana do rótulo preservada', () => {
    const e1 = makeEntrada({ chave: 'c1', capitulo: 'Capítulo Um' });
    const e2 = makeEntrada({ chave: 'c2', capitulo: 'capitulo um' });
    const result = construirRoteiroNarrativo([e1, e2]);
    expect(result.livros[0].capitulos[0].titulo).toBe('Capítulo Um');
  });

  it('17. itens com mesma chave de Evento', () => {
    const e1 = makeEntrada({ chave: 'mesmo-chave' });
    const e2 = makeEntrada({ chave: 'mesmo-chave' });
    const result = construirRoteiroNarrativo([e1, e2]);
    const itens = result.livros[0].capitulos[0].cenas[0].itens;
    expect(itens).toHaveLength(2);
  });

  it('18. ordem narrativa nula preservada', () => {
    const e = makeEntrada({ ordemNarrativa: null });
    const result = construirRoteiroNarrativo([e]);
    expect(result.livros[0].capitulos[0].cenas[0].itens[0].ordemNarrativa).toBeNull();
  });

  it('19. ordem narrativa zero preservada', () => {
    const e = makeEntrada({ ordemNarrativa: 0 });
    const result = construirRoteiroNarrativo([e]);
    expect(result.livros[0].capitulos[0].cenas[0].itens[0].ordemNarrativa).toBe(0);
  });

  it('20. ordem narrativa negativa preservada', () => {
    const e = makeEntrada({ ordemNarrativa: -5 });
    const result = construirRoteiroNarrativo([e]);
    expect(result.livros[0].capitulos[0].cenas[0].itens[0].ordemNarrativa).toBe(-5);
  });

  it('21. arrays novos', () => {
    const entradas: EntradaRoteiroNarrativo[] = [makeEntrada()];
    const result = construirRoteiroNarrativo(entradas);
    expect(result.livros).not.toBe(entradas);
    expect(result.livros[0].capitulos[0].cenas[0].itens).not.toBe(entradas);
  });

  it('22. entradas não mutadas', () => {
    const entradas: EntradaRoteiroNarrativo[] = [makeEntrada()];
    const copia = [...entradas];
    construirRoteiroNarrativo(entradas);
    expect(entradas).toEqual(copia);
  });

  it('23. chamadas repetidas equivalentes', () => {
    const entradas = [makeEntrada()];
    const r1 = construirRoteiroNarrativo(entradas);
    const r2 = construirRoteiroNarrativo(entradas);
    expect(r1).toEqual(r2);
  });

  it('24. total por cena', () => {
    const e1 = makeEntrada({ chave: 'c1', cena: 'Cena 1' });
    const e2 = makeEntrada({ chave: 'c2', cena: 'Cena 1' });
    const result = construirRoteiroNarrativo([e1, e2]);
    expect(result.livros[0].capitulos[0].cenas[0].total).toBe(2);
  });

  it('25. total por capítulo', () => {
    const e1 = makeEntrada({ chave: 'c1', cena: 'Cena 1' });
    const e2 = makeEntrada({ chave: 'c2', cena: 'Cena 2' });
    const e3 = makeEntrada({ chave: 'c3', cena: '' });
    const result = construirRoteiroNarrativo([e1, e2, e3]);
    expect(result.livros[0].capitulos[0].total).toBe(3);
  });

  it('26. total por livro', () => {
    const e1 = makeEntrada({ chave: 'c1', capitulo: 'Cap 1', cena: 'Cena 1' });
    const e2 = makeEntrada({ chave: 'c2', capitulo: 'Cap 2', cena: '' });
    const result = construirRoteiroNarrativo([e1, e2]);
    expect(result.livros[0].total).toBe(2);
  });

  it('27. total geral', () => {
    const e1 = makeEntrada({ chave: 'c1', livro: 'L1', livroChave: 'l1' });
    const e2 = makeEntrada({ chave: 'c2', livro: 'L2', livroChave: 'l2' });
    const e3 = makeEntrada({ chave: 'c3', livro: 'L1', livroChave: 'l1', capitulo: 'Cap 2' });
    const result = construirRoteiroNarrativo([e1, e2, e3]);
    expect(result.total).toBe(3);
  });
});
