import { describe, it, expect } from 'vitest';
import { normalizarConsciencia } from '../../src/contrarius/entities/consciencia';
import { normalizarRetrovida } from '../../src/contrarius/entities/retrovida';
import { normalizarEvento } from '../../src/contrarius/entities/evento';
import { normalizarLugar } from '../../src/contrarius/entities/lugar';
import { normalizarRelacao } from '../../src/contrarius/entities/relacao';
import type { NotaContrariusBruta } from '../../src/contrarius/types';

function nota(path: string, frontmatter: Record<string, unknown>): NotaContrariusBruta {
  return { path, basename: path.split('/').pop()!.replace('.md', ''), colecao: null, frontmatter };
}

describe('normalizarConsciencia', () => {
  it('normaliza uma consciência completa', () => {
    const { entidade, alertas } = normalizarConsciencia(
      nota('02_Consciencias/C-001.md', {
        id: 'C-001',
        nome: 'Fulano',
        nucleo_geo: ['Roma'],
        grupocarma: 'G1',
        reaparece: 'sim',
        campo_desconhecido: 'valor',
      }),
    );

    expect(alertas).toHaveLength(0);
    expect(entidade.id).toBe('C-001');
    expect(entidade.nome).toBe('Fulano');
    expect(entidade.reaparece).toBe(true);
    expect(entidade.metadata).toEqual({ campo_desconhecido: 'valor' });
  });

  it('gera alerta de erro quando falta id', () => {
    const { alertas } = normalizarConsciencia(nota('02_Consciencias/sem-id.md', { nome: 'Fulano' }));
    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'erro', campo: 'id' }));
  });

  it('gera alerta de info para id provisório xxx', () => {
    const { alertas } = normalizarConsciencia(nota('02_Consciencias/C-xxx.md', { id: 'xxx', nome: 'xxx' }));
    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'info', campo: 'id' }));
  });

  it('tolera nucleo_geo como string única', () => {
    const { entidade } = normalizarConsciencia(nota('02_Consciencias/C-002.md', { id: 'C-002', nucleo_geo: 'Roma' }));
    expect(entidade.nucleo_geo).toEqual(['Roma']);
  });

  it('não lança exceção com frontmatter vazio', () => {
    expect(() => normalizarConsciencia(nota('02_Consciencias/vazio.md', {}))).not.toThrow();
  });
});

describe('normalizarRetrovida', () => {
  it('gera erro quando falta consc_id', () => {
    const { alertas } = normalizarRetrovida(nota('03_Retrovidas/R-001.md', { livro: 'Livro 1' }));
    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'erro', campo: 'consc_id' }));
  });

  it('aceita valores conhecidos de pov sem alerta', () => {
    const { alertas } = normalizarRetrovida(nota('03_Retrovidas/R-002.md', { consc_id: 'C-001', pov: 'lendário' }));
    expect(alertas.filter((a) => a.campo === 'pov')).toHaveLength(0);
  });

  it('gera aviso para pov fora do esperado', () => {
    const { alertas } = normalizarRetrovida(nota('03_Retrovidas/R-003.md', { consc_id: 'C-001', pov: 'desconhecido' }));
    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'aviso', campo: 'pov' }));
  });
});

describe('normalizarEvento', () => {
  it('gera erro quando falta id_evento e aviso quando falta participantes', () => {
    const { alertas } = normalizarEvento(nota('05_Eventos/sem-id.md', {}));
    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'erro', campo: 'id_evento' }));
    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'aviso', campo: 'participantes' }));
  });

  it('normaliza eventos_anteriores/posteriores como array', () => {
    const { entidade } = normalizarEvento(
      nota('05_Eventos/E-001.md', {
        id_evento: 'E-001',
        participantes: ['C-001'],
        eventos_anteriores: 'E-000',
      }),
    );
    expect(entidade.eventos_anteriores).toEqual(['E-000']);
  });
});

describe('normalizarLugar', () => {
  it('gera erro quando falta id_lugar', () => {
    const { alertas } = normalizarLugar(nota('06_Lugares/sem-id.md', { nome_atual: 'Roma' }));
    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'erro', campo: 'id_lugar' }));
  });

  it('mantém nucleo_geo como string única (não array) para Lugar', () => {
    const { entidade } = normalizarLugar(nota('06_Lugares/L-001.md', { id_lugar: 'L-001', nucleo_geo: 'Mediterrâneo' }));
    expect(entidade.nucleo_geo).toBe('Mediterrâneo');
  });
});

describe('normalizarRelacao', () => {
  it('preserva o frontmatter inteiro em metadata', () => {
    const { entidade, alertas } = normalizarRelacao(nota('04_Relacoes/rel-1.md', { tipo: 'aliado', de: 'C-001', para: 'C-002' }));
    expect(entidade.metadata).toEqual({ tipo: 'aliado', de: 'C-001', para: 'C-002' });
    expect(alertas).toHaveLength(0);
  });

  it('gera aviso quando não há frontmatter', () => {
    const { alertas } = normalizarRelacao(nota('04_Relacoes/vazia.md', {}));
    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'aviso' }));
  });
});
