import { describe, it, expect } from 'vitest';
import { gerarScrivenerImportMarkdown } from '../../src/contrarius/scrivener-export-minimo';
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

const DATA_FIXA = new Date('2026-07-13T22:00:00.000Z');

describe('gerarScrivenerImportMarkdown', () => {
  it('não quebra com índice vazio e inclui título/resumo/timestamp', () => {
    const md = gerarScrivenerImportMarkdown(indiceVazio(), DATA_FIXA);
    expect(md).toContain('# Contrarius — Exportação para Scrivener');
    expect(md).toContain('Gerado em: 2026-07-13T22:00:00.000Z');
    expect(md).toContain('- Consciências: 0');
  });

  it('inclui consciência com campos principais e fonte', () => {
    const indice = indiceVazio();
    indice.consciencias.push({
      path: '02_Consciencias/C-001.md',
      id: 'C-001',
      ident_extraf: 'X',
      historicidade: 'Ficticio',
      grupocarma: ['Cruzados de Montpaon'],
      metadata: {},
    });

    const md = gerarScrivenerImportMarkdown(indice, DATA_FIXA);
    expect(md).toContain('### C-001');
    expect(md).toContain('**id:** C-001');
    expect(md).toContain('**grupocarma:** Cruzados de Montpaon');
    expect(md).toContain('**Fonte:** 02_Consciencias/C-001.md');
  });

  it('usa o primeiro nome da retrovida como título da seção', () => {
    const indice = indiceVazio();
    indice.retrovidas.push({
      path: '03_Retrovidas/C-001_V01.md',
      consciencia: 'C-001',
      nomes: ['Rogier Del Vignal', 'Seigneur de Montpaon'],
      metadata: {},
    });

    const md = gerarScrivenerImportMarkdown(indice, DATA_FIXA);
    expect(md).toContain('### Rogier Del Vignal');
    expect(md).toContain('**nomes:** Rogier Del Vignal, Seigneur de Montpaon');
  });

  it('não lança exceção para entidades sem nenhum campo preenchido', () => {
    const indice = indiceVazio();
    indice.consciencias.push({ path: '02_Consciencias/vazio.md', metadata: {} });
    indice.retrovidas.push({ path: '03_Retrovidas/vazio.md', metadata: {} });
    indice.eventos.push({ path: '05_Eventos/vazio.md', metadata: {} });
    indice.lugares.push({ path: '06_Lugares/vazio.md', metadata: {} });
    indice.relacoes.push({ path: '04_Relacoes/vazio.md', metadata: {} });

    expect(() => gerarScrivenerImportMarkdown(indice, DATA_FIXA)).not.toThrow();
  });

  it('inclui relação a partir dos campos em metadata', () => {
    const indice = indiceVazio();
    indice.relacoes.push({
      path: '04_Relacoes/rel-1.md',
      metadata: { a: 'C-001', b: 'C-002', tipo_relacao: 'aliado' },
    });

    const md = gerarScrivenerImportMarkdown(indice, DATA_FIXA);
    expect(md).toContain('### Relação 1');
    expect(md).toContain('**a:** C-001');
    expect(md).toContain('**tipo_relacao:** aliado');
  });
});
