import { describe, it, expect } from 'vitest';
import {
  criarSlugScrivener,
  criarNomePacoteScrivener,
  criarEntradaManifestoOperacionalScrivener,
} from '../../src/contrarius/scrivener-package-manifest-factory';
import type { ContextoManifestoScrivenerOperacional } from '../../src/contrarius/scrivener-package-manifest-factory';

const AGORA_FIXA = new Date('2024-03-15T10:00:00.000Z');

const CONTEXTO_BASE: ContextoManifestoScrivenerOperacional = {
  tipo: 'exportacao',
  origemVault: 'meu-vault',
  diretorioPacotes: '/pacotes',
  livro: 'Meu Livro',
  agora: AGORA_FIXA,
};

describe('criarSlugScrivener()', () => {
  it('removes accents, lowercases, and collapses separators', () => {
    expect(criarSlugScrivener('Ação & Reação!')).toBe('acao-reacao');
  });

  it('returns sem-identificacao for empty string', () => {
    expect(criarSlugScrivener('')).toBe('sem-identificacao');
  });

  it('returns sem-identificacao for whitespace only', () => {
    expect(criarSlugScrivener('   ')).toBe('sem-identificacao');
  });

  it('returns sem-identificacao for null', () => {
    expect(criarSlugScrivener(null)).toBe('sem-identificacao');
  });

  it('returns sem-identificacao for undefined', () => {
    expect(criarSlugScrivener(undefined)).toBe('sem-identificacao');
  });

  it('lowercases input', () => {
    expect(criarSlugScrivener('UPPER CASE')).toBe('upper-case');
  });

  it('collapses multiple separators into single dash', () => {
    expect(criarSlugScrivener('hello   world---foo')).toBe('hello-world-foo');
  });

  it('removes leading and trailing dashes', () => {
    expect(criarSlugScrivener('!hello!')).toBe('hello');
  });

  it('handles common Portuguese accented characters', () => {
    expect(criarSlugScrivener('São Paulo')).toBe('sao-paulo');
    expect(criarSlugScrivener('Coração')).toBe('coracao');
  });
});

describe('criarNomePacoteScrivener()', () => {
  it('is deterministic when agora is provided', () => {
    const r1 = criarNomePacoteScrivener(CONTEXTO_BASE);
    const r2 = criarNomePacoteScrivener(CONTEXTO_BASE);
    expect(r1.id).toBe(r2.id);
    expect(r1.nomeArquivo).toBe(r2.nomeArquivo);
    expect(r1.caminhoPacote).toBe(r2.caminhoPacote);
    expect(r1.criadoEm).toBe(r2.criadoEm);
  });

  it('normalizes criadoEm to ISO string', () => {
    const r = criarNomePacoteScrivener(CONTEXTO_BASE);
    expect(r.criadoEm).toBe('2024-03-15T10:00:00.000Z');
  });

  it('uses sem-livro when livro is missing', () => {
    const r = criarNomePacoteScrivener({ ...CONTEXTO_BASE, livro: undefined });
    expect(r.id).toContain('-sem-livro-');
  });

  it('uses sem-livro when livro is empty string', () => {
    const r = criarNomePacoteScrivener({ ...CONTEXTO_BASE, livro: '' });
    expect(r.id).toContain('-sem-livro-');
  });

  it('uses sem-livro when livro is whitespace only', () => {
    const r = criarNomePacoteScrivener({ ...CONTEXTO_BASE, livro: '   ' });
    expect(r.id).toContain('-sem-livro-');
  });

  it('joins directory using forward slash and removes trailing slash', () => {
    const r = criarNomePacoteScrivener({ ...CONTEXTO_BASE, diretorioPacotes: '/pacotes/' });
    expect(r.caminhoPacote).toBe('/pacotes/' + r.nomeArquivo);
  });

  it('removes trailing backslash from directory', () => {
    const r = criarNomePacoteScrivener({ ...CONTEXTO_BASE, diretorioPacotes: 'C:\\pacotes\\' });
    expect(r.caminhoPacote).toBe('C:\\pacotes/' + r.nomeArquivo);
  });

  it('uses nomeArquivo only when directory is empty', () => {
    const r = criarNomePacoteScrivener({ ...CONTEXTO_BASE, diretorioPacotes: '' });
    expect(r.caminhoPacote).toBe(r.nomeArquivo);
  });

  it('uses nomeArquivo only when directory is whitespace only', () => {
    const r = criarNomePacoteScrivener({ ...CONTEXTO_BASE, diretorioPacotes: '   ' });
    expect(r.caminhoPacote).toBe(r.nomeArquivo);
  });

  it('nomeArquivo ends with .scrivener-package', () => {
    const r = criarNomePacoteScrivener(CONTEXTO_BASE);
    expect(r.nomeArquivo).toMatch(/\.scrivener-package$/);
  });

  it('id starts with tipo', () => {
    const r = criarNomePacoteScrivener(CONTEXTO_BASE);
    expect(r.id.startsWith('exportacao-')).toBe(true);
  });

  it('accepts agora as ISO string', () => {
    const r = criarNomePacoteScrivener({ ...CONTEXTO_BASE, agora: '2024-03-15T10:00:00.000Z' });
    expect(r.criadoEm).toBe('2024-03-15T10:00:00.000Z');
    expect(r.id).toBe(criarNomePacoteScrivener(CONTEXTO_BASE).id);
  });
});

describe('criarEntradaManifestoOperacionalScrivener()', () => {
  it('returns a valid EntradaManifestoScrivener for exportacao', () => {
    const entrada = criarEntradaManifestoOperacionalScrivener(CONTEXTO_BASE);
    expect(entrada.tipo).toBe('exportacao');
    expect(entrada.origemVault).toBe('meu-vault');
    expect(entrada.id).toBeTruthy();
    expect(entrada.criadoEm).toBe('2024-03-15T10:00:00.000Z');
    expect(entrada.caminhoPacote).toBeTruthy();
  });

  it('trims origemVault', () => {
    const entrada = criarEntradaManifestoOperacionalScrivener({
      ...CONTEXTO_BASE,
      origemVault: '  meu-vault  ',
    });
    expect(entrada.origemVault).toBe('meu-vault');
  });

  it('trims livro', () => {
    const entrada = criarEntradaManifestoOperacionalScrivener({
      ...CONTEXTO_BASE,
      livro: '  Meu Livro  ',
    });
    expect(entrada.livro).toBe('Meu Livro');
  });

  it('trims observacoes', () => {
    const entrada = criarEntradaManifestoOperacionalScrivener({
      ...CONTEXTO_BASE,
      observacoes: '  uma nota  ',
    });
    expect(entrada.observacoes).toBe('uma nota');
  });

  it('omits livro when empty after trim', () => {
    const entrada = criarEntradaManifestoOperacionalScrivener({ ...CONTEXTO_BASE, livro: '   ' });
    expect(entrada.livro).toBeUndefined();
  });

  it('omits observacoes when empty after trim', () => {
    const entrada = criarEntradaManifestoOperacionalScrivener({
      ...CONTEXTO_BASE,
      observacoes: '',
    });
    expect(entrada.observacoes).toBeUndefined();
  });

  it('omits livro when missing', () => {
    const entrada = criarEntradaManifestoOperacionalScrivener({
      ...CONTEXTO_BASE,
      livro: undefined,
    });
    expect(entrada.livro).toBeUndefined();
  });

  it('omits observacoes when missing', () => {
    const entrada = criarEntradaManifestoOperacionalScrivener({
      ...CONTEXTO_BASE,
      observacoes: undefined,
    });
    expect(entrada.observacoes).toBeUndefined();
  });
});
