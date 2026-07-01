import { describe, expect, it } from 'vitest';
import type { ContrariusEntityKey } from '../../src/contrarius/entity-details-model';
import type { ContrariusTipoEntidade } from '../../src/contrarius/types';
import {
  abrirDetalheRaiz,
  criarEstadoNavegacaoDetalhe,
  navegarParaDetalhe,
  rotuloTipoEntidade,
  temFichaDetalhadaNestaFase,
  voltarDetalhe,
} from '../../src/contrarius/entity-details-view-model';

function keyC(filePath = '02_Consciencias/C-001.md'): ContrariusEntityKey {
  return { tipoEntidade: 'consciencia', filePath };
}

function keyR(filePath = '03_Retrovidas/C-001_V01.md'): ContrariusEntityKey {
  return { tipoEntidade: 'retrovida', filePath };
}

// 1. Estado inicial vazio
describe('criarEstadoNavegacaoDetalhe', () => {
  it('retorna currentKey nulo e histórico vazio', () => {
    const state = criarEstadoNavegacaoDetalhe();
    expect(state.currentKey).toBeNull();
    expect(state.history).toHaveLength(0);
  });
});

// 2. Abertura de ficha raiz
describe('abrirDetalheRaiz', () => {
  it('define currentKey igual à chave fornecida e histórico vazio', () => {
    const key = keyC();
    const state = abrirDetalheRaiz(key);
    expect(state.currentKey).toEqual(key);
    expect(state.history).toHaveLength(0);
  });

  it('clona a chave ao construir o estado', () => {
    const key = keyC();
    const state = abrirDetalheRaiz(key);
    expect(state.currentKey).not.toBe(key);
  });
});

// 3. Navegação Consciência → Retrovida
describe('navegarParaDetalhe — Consciência para Retrovida', () => {
  it('define currentKey como Retrovida e empilha Consciência no histórico', () => {
    const kC = keyC();
    const kR = keyR();
    const state = navegarParaDetalhe(abrirDetalheRaiz(kC), kR);
    expect(state.currentKey).toEqual(kR);
    expect(state.history).toHaveLength(1);
    expect(state.history[0]).toEqual(kC);
  });
});

// 4. Navegação em múltiplos níveis
describe('navegarParaDetalhe — múltiplos níveis', () => {
  it('acumula histórico em três níveis de navegação', () => {
    const k1 = keyC('02_Consciencias/C-001.md');
    const k2 = keyR('03_Retrovidas/C-001_V01.md');
    const k3 = keyR('03_Retrovidas/C-001_V02.md');
    const s1 = abrirDetalheRaiz(k1);
    const s2 = navegarParaDetalhe(s1, k2);
    const s3 = navegarParaDetalhe(s2, k3);
    expect(s3.currentKey).toEqual(k3);
    expect(s3.history).toHaveLength(2);
    expect(s3.history[0]).toEqual(k1);
    expect(s3.history[1]).toEqual(k2);
  });
});

// 5. Retorno para ficha anterior
describe('voltarDetalhe — retorno para ficha anterior', () => {
  it('restaura a ficha anterior e reduz o histórico em um nível', () => {
    const k1 = keyC();
    const k2 = keyR();
    const s2 = navegarParaDetalhe(abrirDetalheRaiz(k1), k2);
    const s1 = voltarDetalhe(s2);
    expect(s1.currentKey).toEqual(k1);
    expect(s1.history).toHaveLength(0);
  });
});

// 6. Retorno da raiz para lista
describe('voltarDetalhe — retorno da raiz para lista', () => {
  it('retorna estado de lista quando histórico está vazio', () => {
    const state = voltarDetalhe(abrirDetalheRaiz(keyC()));
    expect(state.currentKey).toBeNull();
    expect(state.history).toHaveLength(0);
  });
});

// 7. Limpeza direta para lista
describe('limpeza para lista', () => {
  it('criarEstadoNavegacaoDetalhe limpa qualquer estado de ficha em andamento', () => {
    navegarParaDetalhe(abrirDetalheRaiz(keyC()), keyR());
    const cleared = criarEstadoNavegacaoDetalhe();
    expect(cleared.currentKey).toBeNull();
    expect(cleared.history).toHaveLength(0);
  });
});

// 8. Ausência de mutação dos estados e chaves de entrada
describe('imutabilidade', () => {
  it('não muta o estado de entrada ao navegar', () => {
    const k1 = keyC();
    const k2 = keyR();
    const s1 = abrirDetalheRaiz(k1);
    navegarParaDetalhe(s1, k2);
    expect(s1.history).toHaveLength(0);
    expect(s1.currentKey).toEqual(k1);
  });

  it('não muta a chave de entrada ao abrir ficha raiz', () => {
    const key: ContrariusEntityKey = { tipoEntidade: 'consciencia', filePath: '02_Consciencias/C-001.md' };
    const originalPath = key.filePath;
    const state = abrirDetalheRaiz(key);
    expect(key.filePath).toBe(originalPath);
    expect(state.currentKey).not.toBe(key);
  });

  it('não muta o estado ao voltar', () => {
    const k1 = keyC();
    const k2 = keyR();
    const s2 = navegarParaDetalhe(abrirDetalheRaiz(k1), k2);
    const histLen = s2.history.length;
    const prevKey = s2.currentKey;
    voltarDetalhe(s2);
    expect(s2.history).toHaveLength(histLen);
    expect(s2.currentKey).toEqual(prevKey);
  });

  it('as chaves no histórico são cópias, não referências às originais', () => {
    const k1 = keyC();
    const k2 = keyR();
    const s2 = navegarParaDetalhe(abrirDetalheRaiz(k1), k2);
    expect(s2.history[0]).not.toBe(k1);
    expect(s2.currentKey).not.toBe(k2);
  });
});

// 9. Ficha interna apenas para Consciência e Retrovida
describe('temFichaDetalhadaNestaFase', () => {
  it('retorna true para consciencia', () => {
    expect(temFichaDetalhadaNestaFase('consciencia')).toBe(true);
  });

  it('retorna true para retrovida', () => {
    expect(temFichaDetalhadaNestaFase('retrovida')).toBe(true);
  });

  it('retorna false para evento', () => {
    expect(temFichaDetalhadaNestaFase('evento')).toBe(false);
  });

  it('retorna false para lugar', () => {
    expect(temFichaDetalhadaNestaFase('lugar')).toBe(false);
  });

  it('retorna false para relacao', () => {
    expect(temFichaDetalhadaNestaFase('relacao')).toBe(false);
  });
});

// 10. Rótulos em português para todos os tipos
describe('rotuloTipoEntidade', () => {
  it('fornece rótulos em português para os cinco tipos canônicos', () => {
    const tipos: ContrariusTipoEntidade[] = ['consciencia', 'retrovida', 'evento', 'lugar', 'relacao'];
    expect(tipos.map(rotuloTipoEntidade)).toEqual([
      'Consciência',
      'Retrovida',
      'Evento',
      'Lugar',
      'Relação',
    ]);
  });
});
