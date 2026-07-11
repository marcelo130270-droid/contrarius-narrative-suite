import { describe, it, expect } from 'vitest';
import {
  validarManifestoScrivener,
  manifestoTemProblemas,
  manifestoParaEstadoPacoteScrivener,
  criarEntradaManifestoDiagnosticoScrivener,
  MANIFESTO_ID_AUSENTE,
  MANIFESTO_CRIADO_EM_AUSENTE,
  MANIFESTO_CRIADO_EM_INVALIDO,
  MANIFESTO_TIPO_AUSENTE,
  MANIFESTO_TIPO_INVALIDO,
  MANIFESTO_ORIGEM_VAULT_AUSENTE,
  MANIFESTO_CAMINHO_PACOTE_AUSENTE,
} from '../../src/contrarius/scrivener-package-manifest';

const ENTRADA_VALIDA = {
  id: 'pkg-001',
  criadoEm: '2024-03-15T10:00:00.000Z',
  tipo: 'exportacao' as const,
  origemVault: 'meu-vault',
  caminhoPacote: 'exportacao.scrivener-package',
};

describe('validarManifestoScrivener()', () => {
  it('valid minimal input returns normalized manifest with no errors', () => {
    const result = validarManifestoScrivener(ENTRADA_VALIDA);
    expect(result.id).toBe('pkg-001');
    expect(result.criadoEm).toBe('2024-03-15T10:00:00.000Z');
    expect(result.tipo).toBe('exportacao');
    expect(result.origemVault).toBe('meu-vault');
    expect(result.caminhoPacote).toBe('exportacao.scrivener-package');
    expect(result.erros).toEqual([]);
    expect(result.avisos).toEqual([]);
  });

  it('trims string fields and omits optional fields empty after trim', () => {
    const result = validarManifestoScrivener({
      ...ENTRADA_VALIDA,
      id: '  pkg-001  ',
      origemVault: '  meu-vault  ',
      livro: '   ',
      observacoes: '',
    });
    expect(result.id).toBe('pkg-001');
    expect(result.origemVault).toBe('meu-vault');
    expect(result.livro).toBeUndefined();
    expect(result.observacoes).toBeUndefined();
  });

  it('keeps optional fields when non-empty after trim', () => {
    const result = validarManifestoScrivener({
      ...ENTRADA_VALIDA,
      livro: '  Meu Livro  ',
      observacoes: '  Nota  ',
    });
    expect(result.livro).toBe('Meu Livro');
    expect(result.observacoes).toBe('Nota');
  });

  it('missing id adds MANIFESTO_ID_AUSENTE with empty string', () => {
    const result = validarManifestoScrivener({ ...ENTRADA_VALIDA, id: undefined });
    expect(result.id).toBe('');
    expect(result.erros).toContain(MANIFESTO_ID_AUSENTE);
  });

  it('missing criadoEm adds MANIFESTO_CRIADO_EM_AUSENTE with empty string', () => {
    const result = validarManifestoScrivener({ ...ENTRADA_VALIDA, criadoEm: undefined });
    expect(result.criadoEm).toBe('');
    expect(result.erros).toContain(MANIFESTO_CRIADO_EM_AUSENTE);
  });

  it('missing tipo adds MANIFESTO_TIPO_AUSENTE and normalizes to diagnostico', () => {
    const result = validarManifestoScrivener({ ...ENTRADA_VALIDA, tipo: undefined });
    expect(result.tipo).toBe('diagnostico');
    expect(result.erros).toContain(MANIFESTO_TIPO_AUSENTE);
  });

  it('missing origemVault adds MANIFESTO_ORIGEM_VAULT_AUSENTE with empty string', () => {
    const result = validarManifestoScrivener({ ...ENTRADA_VALIDA, origemVault: undefined });
    expect(result.origemVault).toBe('');
    expect(result.erros).toContain(MANIFESTO_ORIGEM_VAULT_AUSENTE);
  });

  it('missing caminhoPacote adds MANIFESTO_CAMINHO_PACOTE_AUSENTE with empty string', () => {
    const result = validarManifestoScrivener({ ...ENTRADA_VALIDA, caminhoPacote: undefined });
    expect(result.caminhoPacote).toBe('');
    expect(result.erros).toContain(MANIFESTO_CAMINHO_PACOTE_AUSENTE);
  });

  it('all missing required fields adds all error codes', () => {
    const result = validarManifestoScrivener({});
    expect(result.erros).toContain(MANIFESTO_ID_AUSENTE);
    expect(result.erros).toContain(MANIFESTO_CRIADO_EM_AUSENTE);
    expect(result.erros).toContain(MANIFESTO_TIPO_AUSENTE);
    expect(result.erros).toContain(MANIFESTO_ORIGEM_VAULT_AUSENTE);
    expect(result.erros).toContain(MANIFESTO_CAMINHO_PACOTE_AUSENTE);
  });

  it('invalid criadoEm keeps trimmed string and adds MANIFESTO_CRIADO_EM_INVALIDO', () => {
    const result = validarManifestoScrivener({ ...ENTRADA_VALIDA, criadoEm: 'not-a-date' });
    expect(result.criadoEm).toBe('not-a-date');
    expect(result.erros).toContain(MANIFESTO_CRIADO_EM_INVALIDO);
    expect(result.erros).not.toContain(MANIFESTO_CRIADO_EM_AUSENTE);
  });

  it('invalid tipo adds MANIFESTO_TIPO_INVALIDO and normalizes to diagnostico', () => {
    const result = validarManifestoScrivener({ ...ENTRADA_VALIDA, tipo: 'invalido' as any });
    expect(result.tipo).toBe('diagnostico');
    expect(result.erros).toContain(MANIFESTO_TIPO_INVALIDO);
    expect(result.erros).not.toContain(MANIFESTO_TIPO_AUSENTE);
  });

  it('does not throw for any validation failure', () => {
    expect(() => validarManifestoScrivener({})).not.toThrow();
    expect(() => validarManifestoScrivener({ criadoEm: 'nope', tipo: 'x' as any })).not.toThrow();
  });
});

describe('manifestoTemProblemas()', () => {
  it('returns false for manifest with no errors or warnings', () => {
    const manifesto = validarManifestoScrivener(ENTRADA_VALIDA);
    expect(manifestoTemProblemas(manifesto)).toBe(false);
  });

  it('returns true when there are errors', () => {
    const manifesto = validarManifestoScrivener({});
    expect(manifestoTemProblemas(manifesto)).toBe(true);
  });

  it('returns true when there are only warnings', () => {
    const manifesto = validarManifestoScrivener(ENTRADA_VALIDA);
    manifesto.avisos.push('algum-aviso');
    expect(manifestoTemProblemas(manifesto)).toBe(true);
  });
});

describe('manifestoParaEstadoPacoteScrivener()', () => {
  it('maps clean manifest to valido=true and comProblemas=false', () => {
    const manifesto = validarManifestoScrivener(ENTRADA_VALIDA);
    const estado = manifestoParaEstadoPacoteScrivener(manifesto);
    expect(estado.manifesto?.valido).toBe(true);
    expect(estado.manifesto?.comProblemas).toBe(false);
  });

  it('maps error manifest to valido=false and comProblemas=true', () => {
    const manifesto = validarManifestoScrivener({});
    const estado = manifestoParaEstadoPacoteScrivener(manifesto);
    expect(estado.manifesto?.valido).toBe(false);
    expect(estado.manifesto?.comProblemas).toBe(true);
  });

  it('returns object without extra fields', () => {
    const manifesto = validarManifestoScrivener(ENTRADA_VALIDA);
    const estado = manifestoParaEstadoPacoteScrivener(manifesto);
    expect(Object.keys(estado)).toEqual(['manifesto']);
    expect(Object.keys(estado.manifesto!)).toEqual(['valido', 'comProblemas']);
  });
});

describe('criarEntradaManifestoDiagnosticoScrivener()', () => {
  it('returns deterministic valid diagnostic data', () => {
    const entrada = criarEntradaManifestoDiagnosticoScrivener();
    expect(entrada.id).toBe('diagnostico-scrivener');
    expect(entrada.criadoEm).toBe('2000-01-01T00:00:00.000Z');
    expect(entrada.tipo).toBe('diagnostico');
    expect(entrada.origemVault).toBe('diagnostico');
    expect(entrada.caminhoPacote).toBe('diagnostico.scrivener-package');
    expect(entrada.observacoes).toBe('Pacote diagnostico Contrarius/Scrivener');
  });

  it('produces a valid manifest when validated', () => {
    const entrada = criarEntradaManifestoDiagnosticoScrivener();
    const manifesto = validarManifestoScrivener(entrada);
    expect(manifesto.erros).toEqual([]);
  });

  it('applies overrides last', () => {
    const entrada = criarEntradaManifestoDiagnosticoScrivener({ id: 'override-id', tipo: 'restauracao' });
    expect(entrada.id).toBe('override-id');
    expect(entrada.tipo).toBe('restauracao');
    expect(entrada.origemVault).toBe('diagnostico');
  });
});
