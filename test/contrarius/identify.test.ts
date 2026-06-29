import { describe, expect, it } from 'vitest';
import {
  identificarTipoEntidade,
  inferirNaturezaConsciencial,
  normalizarTipoDeclarado,
  PASTAS_CONTRARIUS_PADRAO,
  tipoPorPasta,
} from '../../src/contrarius/identify';

describe('tipoPorPasta', () => {
  it('identifica Consciência na pasta canônica', () => {
    expect(tipoPorPasta('02_Consciencias/C-1.md')).toBe('consciencia');
  });

  it('identifica Retrovida recursivamente', () => {
    expect(tipoPorPasta('03_Retrovidas/Nucleo/Sub/V-1.md')).toBe('retrovida');
  });

  it('identifica Relação', () => {
    expect(tipoPorPasta('04_Relacoes/R-1.md')).toBe('relacao');
  });

  it('identifica Evento recursivamente', () => {
    expect(tipoPorPasta('05_Eventos/Capitulo/E-1.md')).toBe('evento');
  });

  it('identifica Lugar recursivamente', () => {
    expect(tipoPorPasta('06_Lugares/Europa/Franca/L-1.md')).toBe('lugar');
  });

  it('aceita barras Windows', () => {
    expect(tipoPorPasta('05_Eventos\\Sub\\E.md')).toBe('evento');
  });

  it('ignora diferenças de caixa', () => {
    expect(tipoPorPasta('05_EVENTOS/Sub/E.md')).toBe('evento');
  });

  it('aceita barras repetidas e externas', () => {
    expect(tipoPorPasta('/05_Eventos//Sub/E.md')).toBe('evento');
  });

  it('não confunde prefixos de pasta', () => {
    expect(tipoPorPasta('05_Eventos_Arquivados/E.md')).toBeNull();
  });

  it('não encontra pasta canônica no meio de outro caminho', () => {
    expect(tipoPorPasta('Arquivo/05_Eventos/E.md')).toBeNull();
  });

  it('aceita configuração de pasta personalizada aninhada', () => {
    const custom = { ...PASTAS_CONTRARIUS_PADRAO, evento: 'Narrativa/Eventos' };
    expect(tipoPorPasta('Narrativa/Eventos/Ato1/E.md', custom)).toBe('evento');
  });

  it('ignora configuração vazia', () => {
    const custom = { ...PASTAS_CONTRARIUS_PADRAO, evento: '' };
    expect(tipoPorPasta('E.md', custom)).toBeNull();
  });
});

describe('normalizarTipoDeclarado', () => {
  it('normaliza Consciência com acento', () => {
    expect(normalizarTipoDeclarado('Consciência')).toBe('consciencia');
  });

  it('normaliza Relação com acento e caixa alta', () => {
    expect(normalizarTipoDeclarado('RELAÇÃO')).toBe('relacao');
  });

  it('apara espaços', () => {
    expect(normalizarTipoDeclarado(' Retrovida ')).toBe('retrovida');
  });

  it('reconhece Evento e Lugar', () => {
    expect(normalizarTipoDeclarado('Evento')).toBe('evento');
    expect(normalizarTipoDeclarado('Lugar')).toBe('lugar');
  });

  it('aceita primeiro item válido de lista conforme normStr', () => {
    expect(normalizarTipoDeclarado(['', 'Evento'])).toBe('evento');
  });

  it('reconhece aliases pré-humanos legados', () => {
    expect(normalizarTipoDeclarado('Consc Pré Humana')).toBe('consciencia');
    expect(normalizarTipoDeclarado('Consc_Pre_Humana')).toBe('consciencia');
    expect(normalizarTipoDeclarado('Consciência Pré-Humana')).toBe('consciencia');
    expect(normalizarTipoDeclarado('Retrovida_Pre_Humana')).toBe('retrovida');
    expect(normalizarTipoDeclarado('Retrovida Pré-Humana')).toBe('retrovida');
  });

  it('reconhece Relação Grupocármica como Relação', () => {
    expect(normalizarTipoDeclarado('Relacao_Grupocarmica')).toBe('relacao');
    expect(normalizarTipoDeclarado('Relação Grupocármica')).toBe('relacao');
  });

  it('retorna null para tipo desconhecido', () => {
    expect(normalizarTipoDeclarado('desconhecido')).toBeNull();
  });

  it('retorna null para valores ausentes e objetos', () => {
    expect(normalizarTipoDeclarado(null)).toBeNull();
    expect(normalizarTipoDeclarado({ tipo: 'Evento' })).toBeNull();
  });
});

describe('identificarTipoEntidade', () => {
  it('usa a pasta como autoridade em conflito', () => {
    const result = identificarTipoEntidade('05_Eventos/E.md', { tipo: 'Lugar' });
    expect(result.tipo).toBe('evento');
    expect(result.tipoPasta).toBe('evento');
    expect(result.tipoFrontmatter).toBe('lugar');
    expect(result.conflito).toBe(true);
  });

  it('usa tipo do frontmatter fora das pastas', () => {
    const result = identificarTipoEntidade('Notas/E.md', { tipo: 'Evento' });
    expect(result.tipo).toBe('evento');
    expect(result.conflito).toBe(false);
  });

  it('usa a pasta quando o tipo não foi declarado', () => {
    const result = identificarTipoEntidade('06_Lugares/L.md', {});
    expect(result.tipo).toBe('lugar');
    expect(result.tipoDeclarado).toBe('');
  });

  it('não marca conflito quando pasta e frontmatter concordam', () => {
    expect(identificarTipoEntidade('04_Relacoes/R.md', { tipo: 'Relação' }).conflito).toBe(false);
  });

  it('preserva o texto normalizado do tipo declarado para diagnóstico', () => {
    expect(identificarTipoEntidade('05_Eventos/E.md', { tipo: '  Cidade  ' }).tipoDeclarado).toBe('Cidade');
  });

  it('retorna nulo quando não há identificação', () => {
    expect(identificarTipoEntidade('Notas/X.md', {}).tipo).toBeNull();
  });

  it('trata tipo pré-humano incompatível com pasta como aviso legado, não conflito', () => {
    const result = identificarTipoEntidade(
      '03_Retrovidas/Retrovidas Pre-Humanas/P-002_V01.md',
      { tipo: 'Consc Pré Humana', consciencia: 'P-002' },
    );
    expect(result.tipo).toBe('retrovida');
    expect(result.tipoFrontmatter).toBe('consciencia');
    expect(result.conflito).toBe(false);
    expect(result.incompatibilidadeLegada).toBe(true);
    expect(result.naturezaConsciencial).toBe('pre-humana');
  });

  it('identifica natureza pré-humana pelo alias declarado', () => {
    const result = identificarTipoEntidade('02_Consciencias/P-001.md', { tipo: 'Consc Pré Humana' });
    expect(result.tipo).toBe('consciencia');
    expect(result.naturezaConsciencial).toBe('pre-humana');
  });

  it('mantém natureza humana nos tipos canônicos', () => {
    expect(identificarTipoEntidade('02_Consciencias/C-001.md', { tipo: 'Consciencia' }).naturezaConsciencial).toBe('humana');
    expect(identificarTipoEntidade('03_Retrovidas/C-001_V01.md', { tipo: 'Retrovida' }).naturezaConsciencial).toBe('humana');
  });

  it('respeita pastas personalizadas', () => {
    const custom = { ...PASTAS_CONTRARIUS_PADRAO, lugar: 'Canon/Locais' };
    expect(identificarTipoEntidade('Canon/Locais/L.md', {}, custom).tipo).toBe('lugar');
  });
});


describe('inferirNaturezaConsciencial', () => {
  it('usa pasta pré-humana como fallback', () => {
    expect(inferirNaturezaConsciencial(
      '03_Retrovidas/Retrovidas Pre-Humanas/X.md',
      { tipo: 'Retrovida' },
      'retrovida',
    )).toBe('pre-humana');
  });

  it('usa prefixo P- no id, consciência ou basename', () => {
    expect(inferirNaturezaConsciencial('02_Consciencias/X.md', { id: 'P-001' }, 'consciencia')).toBe('pre-humana');
    expect(inferirNaturezaConsciencial('03_Retrovidas/X.md', { consciencia: 'P-002' }, 'retrovida')).toBe('pre-humana');
    expect(inferirNaturezaConsciencial('03_Retrovidas/P-003_V01.md', {}, 'retrovida')).toBe('pre-humana');
  });

  it('não classifica ids humanos como pré-humanos', () => {
    expect(inferirNaturezaConsciencial('02_Consciencias/C-001.md', { id: 'C-001' }, 'consciencia')).toBe('humana');
  });
});
