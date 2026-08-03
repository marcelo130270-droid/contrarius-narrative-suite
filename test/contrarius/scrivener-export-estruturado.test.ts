import { describe, it, expect } from 'vitest';
import {
  gerarDossieConsciencias,
  gerarDossieEventos,
  gerarDossieLugares,
  gerarDossieRelacoes,
  gerarDossieRetrovidas,
  gerarIndiceEstruturado,
  gerarIndicePorLivro,
  gerarIndicePorPeriodo,
  gerarTimelineCronologica,
  gerarTimelineNarrativa,
} from '../../src/contrarius/scrivener-export-estruturado';
import type { IndiceContrarius } from '../../src/contrarius/indexer';

function indiceVazio(): IndiceContrarius {
  return {
    consciencias: [],
    retrovidas: [],
    eventos: [],
    lugares: [],
    relacoes: [],
    alertas: [],
    porId: new Map(),
  };
}

const DATA_FIXA = new Date('2026-07-13T23:00:00.000Z');

describe('gerarIndiceEstruturado', () => {
  it('não quebra com índice vazio e inclui título/resumo/timestamp', () => {
    const md = gerarIndiceEstruturado(indiceVazio(), DATA_FIXA);
    expect(md).toContain('# Contrarius — Índice estruturado');
    expect(md).toContain('Gerado em: 2026-07-13T23:00:00.000Z');
    expect(md).toContain('- Consciências: 0');
  });

  it('gera link markdown pra cada entidade apontando pro caminho de origem', () => {
    const indice = indiceVazio();
    indice.consciencias.push({ path: '02_Consciencias/C-001.md', id: 'C-001', metadata: {} });
    indice.lugares.push({ path: '06_Lugares/L-001_Acra.md', num_reg: 'L-001', nome_atual: 'Acre', metadata: {} });

    const md = gerarIndiceEstruturado(indice, DATA_FIXA);
    expect(md).toContain('- [C-001](02_Consciencias/C-001.md)');
    expect(md).toContain('- [Acre](06_Lugares/L-001_Acra.md)');
  });

  it('usa rótulo de fallback quando falta id/nome', () => {
    const indice = indiceVazio();
    indice.consciencias.push({ path: '02_Consciencias/sem-id.md', metadata: {} });
    const md = gerarIndiceEstruturado(indice, DATA_FIXA);
    expect(md).toContain('- [(sem id)](02_Consciencias/sem-id.md)');
  });
});

describe('gerarTimelineCronologica', () => {
  it('ordena eventos por ordem_cronologica e separa os sem ordem numa seção à parte', () => {
    const indice = indiceVazio();
    indice.eventos.push(
      { path: '05_Eventos/E-002.md', titulo: 'Depois', ordem_cronologica: '10', data_textual: 'Verão de 1250', metadata: {} },
      { path: '05_Eventos/E-001.md', titulo: 'Antes', ordem_cronologica: '2', data_inicio: '1200-01-01', metadata: {} },
      { path: '05_Eventos/E-003.md', titulo: 'Sem ordem', metadata: {} },
    );

    const md = gerarTimelineCronologica(indice, DATA_FIXA);
    expect(md).toContain('# Contrarius — Timeline cronológica');
    const posAntes = md.indexOf('Antes');
    const posDepois = md.indexOf('Depois');
    expect(posAntes).toBeGreaterThan(0);
    expect(posAntes).toBeLessThan(posDepois);
    expect(md).toContain('## Sem ordem_cronologica');
    expect(md).toContain('[Sem ordem](05_Eventos/E-003.md)');
    // data_inicio/data_textual continuam informativos, numa coluna à parte (não usados pra ordenar)
    expect(md).toContain('1200-01-01');
    expect(md).toContain('Verão de 1250');
  });

  it('não quebra com nenhum evento', () => {
    expect(() => gerarTimelineCronologica(indiceVazio(), DATA_FIXA)).not.toThrow();
  });
});

describe('gerarTimelineNarrativa', () => {
  it('ordena por ordem_narrativa numérico', () => {
    const indice = indiceVazio();
    indice.eventos.push(
      { path: '05_Eventos/E-002.md', titulo: 'Depois', ordem_narrativa: '10', metadata: {} },
      { path: '05_Eventos/E-001.md', titulo: 'Antes', ordem_narrativa: '2', metadata: {} },
    );

    const md = gerarTimelineNarrativa(indice, DATA_FIXA);
    expect(md).toContain('# Contrarius — Timeline narrativa');
    expect(md.indexOf('Antes')).toBeLessThan(md.indexOf('Depois'));
  });
});

describe('dossiês por tipo', () => {
  it('cada dossiê tem seu próprio título e só as entidades do seu tipo', () => {
    const indice = indiceVazio();
    indice.consciencias.push({ path: '02_Consciencias/C-001.md', id: 'C-001', metadata: {} });
    indice.retrovidas.push({ path: '03_Retrovidas/R-001.md', consciencia: 'C-001', nomes: ['Fulano'], metadata: {} });
    indice.eventos.push({ path: '05_Eventos/E-001.md', titulo: 'Evento X', metadata: {} });
    indice.lugares.push({ path: '06_Lugares/L-001.md', num_reg: 'L-001', nome_atual: 'Roma', metadata: {} });
    indice.relacoes.push({ path: '04_Relacoes/rel-1.md', metadata: { a: 'C-001', b: 'C-002' } });

    const dossieConsciencias = gerarDossieConsciencias(indice, DATA_FIXA);
    expect(dossieConsciencias).toContain('# Contrarius — Dossiê de Consciências');
    expect(dossieConsciencias).toContain('C-001');
    expect(dossieConsciencias).not.toContain('Fulano');

    expect(gerarDossieRetrovidas(indice, DATA_FIXA)).toContain('Fulano');
    expect(gerarDossieEventos(indice, DATA_FIXA)).toContain('Evento X');
    expect(gerarDossieLugares(indice, DATA_FIXA)).toContain('Roma');
    expect(gerarDossieRelacoes(indice, DATA_FIXA)).toContain('a:** C-001');
  });

  it('nenhum dos 5 dossiês lança exceção com índice vazio', () => {
    const indice = indiceVazio();
    expect(() => gerarDossieConsciencias(indice, DATA_FIXA)).not.toThrow();
    expect(() => gerarDossieRetrovidas(indice, DATA_FIXA)).not.toThrow();
    expect(() => gerarDossieEventos(indice, DATA_FIXA)).not.toThrow();
    expect(() => gerarDossieLugares(indice, DATA_FIXA)).not.toThrow();
    expect(() => gerarDossieRelacoes(indice, DATA_FIXA)).not.toThrow();
  });
});

describe('gerarIndicePorLivro e gerarIndicePorPeriodo', () => {
  it('agrupa retrovidas e eventos por livro, com cada grupo como seção própria', () => {
    const indice = indiceVazio();
    indice.retrovidas.push({ path: '03_Retrovidas/R-001.md', nomes: ['Fulano'], livro: 'Livro 1', metadata: {} });
    indice.eventos.push({ path: '05_Eventos/E-001.md', titulo: 'Evento X', livro: 'Livro 1', metadata: {} });
    indice.retrovidas.push({ path: '03_Retrovidas/R-002.md', nomes: ['Beltrano'], livro: 'Livro 2', metadata: {} });

    const md = gerarIndicePorLivro(indice, DATA_FIXA);
    expect(md).toContain('# Contrarius — Índice por livro');
    expect(md).toContain('## Livro 1');
    expect(md).toContain('## Livro 2');
    expect(md).toContain('- [Fulano](03_Retrovidas/R-001.md)');
    expect(md).toContain('- [Evento X](05_Eventos/E-001.md)');
  });

  it('agrupa por período', () => {
    const indice = indiceVazio();
    indice.retrovidas.push({ path: '03_Retrovidas/R-001.md', nomes: ['Fulano'], periodo: ['Sec XIII'], metadata: {} });

    const md = gerarIndicePorPeriodo(indice, DATA_FIXA);
    expect(md).toContain('# Contrarius — Índice por período');
    expect(md).toContain('## Sec XIII');
    expect(md).toContain('- [Fulano](03_Retrovidas/R-001.md)');
  });

  it('não lança exceção com índice vazio', () => {
    expect(() => gerarIndicePorLivro(indiceVazio(), DATA_FIXA)).not.toThrow();
    expect(() => gerarIndicePorPeriodo(indiceVazio(), DATA_FIXA)).not.toThrow();
  });
});
