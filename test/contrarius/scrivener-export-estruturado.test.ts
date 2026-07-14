import { describe, it, expect } from 'vitest';
import { gerarIndiceEstruturado } from '../../src/contrarius/scrivener-export-estruturado';
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
