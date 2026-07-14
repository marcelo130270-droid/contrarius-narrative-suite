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
  it('normaliza uma consciência real (sem campo nome, que não existe nesse tipo)', () => {
    const { entidade, alertas } = normalizarConsciencia(
      nota('02_Consciencias/C-002.md', {
        tipo: 'Consciencia',
        id: 'C-002',
        ident_extraf: 'X',
        status: 'ativa',
        historicidade: 'Ficticio',
        importancia: 5,
      }),
    );

    expect(alertas).toHaveLength(0);
    expect(entidade.id).toBe('C-002');
    expect(entidade.historicidade).toBe('Ficticio');
    expect(entidade.metadata).toEqual({ tipo: 'Consciencia', status: 'ativa', importancia: 5 });
  });

  it('gera alerta de erro quando falta id', () => {
    const { alertas } = normalizarConsciencia(nota('02_Consciencias/sem-id.md', { status: 'ativa' }));
    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'erro', campo: 'id' }));
  });

  it('gera alerta de info para id provisório xxx', () => {
    const { alertas } = normalizarConsciencia(nota('02_Consciencias/C-xxx.md', { id: 'xxx' }));
    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'info', campo: 'id' }));
  });

  it('não lança exceção com frontmatter vazio', () => {
    expect(() => normalizarConsciencia(nota('02_Consciencias/vazio.md', {}))).not.toThrow();
  });

  it('lê grupocarma como array (uma consciência pode pertencer a vários grupos)', () => {
    const { entidade } = normalizarConsciencia(
      nota('02_Consciencias/C-001.md', { id: 'C-001', grupocarma: ['Cruzados de Montpaon', 'Família Del Vignal'] }),
    );
    expect(entidade.grupocarma).toEqual(['Cruzados de Montpaon', 'Família Del Vignal']);
  });
});

describe('normalizarRetrovida', () => {
  it('normaliza uma retrovida real: consciencia é o campo de vínculo, vida é numérico, periodo/religiao são arrays', () => {
    const { entidade, alertas } = normalizarRetrovida(
      nota('03_Retrovidas/C-091_V01_Jehanne.md', {
        tipo: 'Retrovida',
        consciencia: 'C-091',
        vida: 1,
        nomes: ['Jehanne de Paris', 'Jehanne'],
        periodo: ['Sec XIII'],
        nucleo_geo: ['Paris'],
        livro: '1 Arles',
        historicidade: 'Ficticio',
        religiao: ['Catolicismo'],
      }),
    );

    expect(alertas.filter((a) => a.campo === 'consciencia')).toHaveLength(0);
    expect(entidade.consciencia).toBe('C-091');
    expect(entidade.vida).toBe('1');
    expect(entidade.nomes).toEqual(['Jehanne de Paris', 'Jehanne']);
    expect(entidade.periodo).toEqual(['Sec XIII']);
    expect(entidade.religiao).toEqual(['Catolicismo']);
  });

  it('gera erro quando falta consciencia', () => {
    const { alertas } = normalizarRetrovida(nota('03_Retrovidas/R-001.md', { livro: 'Livro 1' }));
    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'erro', campo: 'consciencia' }));
  });

  it('aceita valores conhecidos de historicidade (com ou sem acento/maiúscula) sem alerta', () => {
    const { alertas } = normalizarRetrovida(nota('03_Retrovidas/R-002.md', { consciencia: 'C-001', historicidade: 'Ficticio' }));
    expect(alertas.filter((a) => a.campo === 'historicidade')).toHaveLength(0);
  });

  it('gera aviso para historicidade fora do esperado', () => {
    const { alertas } = normalizarRetrovida(nota('03_Retrovidas/R-003.md', { consciencia: 'C-001', historicidade: 'desconhecido' }));
    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'aviso', campo: 'historicidade' }));
  });

  it('lê grupocarma como array', () => {
    const { entidade } = normalizarRetrovida(
      nota('03_Retrovidas/R-004.md', { consciencia: 'C-001', grupocarma: ['Cruzados de Montpaon'] }),
    );
    expect(entidade.grupocarma).toEqual(['Cruzados de Montpaon']);
  });
});

describe('normalizarEvento', () => {
  it('gera erro quando falta codigo e aviso quando falta retrovidas', () => {
    const { alertas } = normalizarEvento(nota('05_Eventos/sem-codigo.md', {}));
    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'erro', campo: 'codigo' }));
    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'aviso', campo: 'retrovidas' }));
  });

  it('resolve wikilinks em local/retrovidas/eventos_anteriores para o basename da nota', () => {
    const { entidade } = normalizarEvento(
      nota('05_Eventos/E-001 Início da retrocognição em Acra.md', {
        codigo: 'E-001',
        local: ['[[L-001_Acra]]'],
        retrovidas: ['[[C-001_V01_Rogier_Del_Vignal]]', '[[C-002_V01_Gastoun_de_Chastel_Double]]'],
        eventos_posteriores: ['[[E-002 Abordagem violenta de Gastoun]]'],
      }),
    );
    expect(entidade.local).toEqual(['L-001_Acra']);
    expect(entidade.retrovidas).toEqual(['C-001_V01_Rogier_Del_Vignal', 'C-002_V01_Gastoun_de_Chastel_Double']);
    expect(entidade.eventos_posteriores).toEqual(['E-002 Abordagem violenta de Gastoun']);
  });

  it('captura ano_ordem/data_textual como string e tolera data_inicio/data_fim vindo como Date (YAML sem aspas)', () => {
    const { entidade } = normalizarEvento(
      nota('05_Eventos/E-001.md', {
        codigo: 'E-001',
        ano_ordem: '2027',
        data_inicio: new Date('1229-09-10T00:00:00.000Z'),
        data_fim: new Date('1229-09-10T00:00:00.000Z'),
        data_textual: 'Outono de 1229',
      }),
    );
    expect(entidade.ano_ordem).toBe('2027');
    expect(entidade.data_inicio).toBe('1229-09-10');
    expect(entidade.data_fim).toBe('1229-09-10');
    expect(entidade.data_textual).toBe('Outono de 1229');
  });
});

describe('normalizarLugar', () => {
  it('gera erro quando falta codigo', () => {
    const { alertas } = normalizarLugar(nota('06_Lugares/sem-codigo.md', { nome_atual: 'Roma' }));
    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'erro', campo: 'codigo' }));
  });

  it('lê nomes_historicos a partir de nomes_variantes e coordenadas a partir de coordenadas_google_earth', () => {
    const { entidade } = normalizarLugar(
      nota('06_Lugares/L-001_Acra.md', {
        codigo: 'L-001',
        nome_atual: 'Acre',
        nomes_variantes: ['Accra'],
        coordenadas_google_earth: '32.9275, 35.0818',
        nucleo_geo: ['Levante'],
      }),
    );
    expect(entidade.nomes_historicos).toEqual(['Accra']);
    expect(entidade.coordenadas).toBe('32.9275, 35.0818');
    expect(entidade.nucleo_geo).toEqual(['Levante']);
  });
});

describe('normalizarRelacao', () => {
  it('preserva o frontmatter inteiro em metadata (a, b, tipo_relacao, estado)', () => {
    const { entidade, alertas } = normalizarRelacao(
      nota('04_Relacoes/rel-1.md', { a: 'C-001', b: 'C-002', tipo_relacao: 'aliado', estado: 'ativa' }),
    );
    expect(entidade.metadata).toEqual({ a: 'C-001', b: 'C-002', tipo_relacao: 'aliado', estado: 'ativa' });
    expect(alertas).toHaveLength(0);
  });

  it('gera aviso quando não há frontmatter', () => {
    const { alertas } = normalizarRelacao(nota('04_Relacoes/vazia.md', {}));
    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'aviso' }));
  });
});
