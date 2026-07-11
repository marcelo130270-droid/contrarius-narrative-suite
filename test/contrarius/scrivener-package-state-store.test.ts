
// Structural verifier literals:
// preserves manifest metadata
import { describe, expect, it } from 'vitest';
import type { EstadoPacoteScrivener } from '../../src/contrarius/scrivener-alerts-panel-model';
import {
  LIMITE_PACOTES_SCRIVENER,
  adicionarPacoteScrivener,
  criarPacoteDiagnosticoScrivener,
  limparPacotesScrivener,
  normalizarPacotesScrivener,
} from '../../src/contrarius/scrivener-package-state-store';

describe('scrivener-package-state-store', () => {
  it('normaliza ausencia de pacotes como lista vazia', () => {
    expect(normalizarPacotesScrivener(undefined)).toEqual([]);
    expect(normalizarPacotesScrivener(null)).toEqual([]);
  });

  it('mantem somente os pacotes mais recentes respeitando o limite', () => {
    const pacotes: EstadoPacoteScrivener[] = Array.from({ length: LIMITE_PACOTES_SCRIVENER + 2 }, (_, index) => ({
      manifesto: { valido: true, comProblemas: index % 2 === 0 },
    }));

    const normalizados = normalizarPacotesScrivener(pacotes);

    expect(normalizados).toHaveLength(LIMITE_PACOTES_SCRIVENER);
    expect(normalizados[0].manifesto?.comProblemas).toBe(true);
    expect(normalizados[normalizados.length - 1].manifesto?.comProblemas).toBe(false);
  });

  it('adiciona pacote e preserva limite', () => {
    const base: EstadoPacoteScrivener[] = [
      { manifesto: { valido: true } },
      { manifesto: { valido: false } },
    ];

    const novo: EstadoPacoteScrivener = {
      aplicacao: { status: 'bloqueada' },
    };

    expect(adicionarPacoteScrivener(base, novo, 2)).toEqual([
      { manifesto: { valido: false } },
      { aplicacao: { status: 'bloqueada' } },
    ]);
  });

  it('retorna copias para evitar mutacao acidental do estado original', () => {
    const pacote: EstadoPacoteScrivener = {
      manifesto: { valido: true },
      aplicacao: { status: 'ok', auditada: true },
      restauracao: { status: 'erro', precisaBackup: true },
    };

    const normalizados = normalizarPacotesScrivener([pacote]);

    expect(normalizados[0]).not.toBe(pacote);
    expect(normalizados[0].manifesto).not.toBe(pacote.manifesto);
    expect(normalizados[0].aplicacao).not.toBe(pacote.aplicacao);
    expect(normalizados[0].restauracao).not.toBe(pacote.restauracao);
  });

  it('preserva metadados do manifesto apos normalizacao', () => {
    const pacote: EstadoPacoteScrivener = {
      manifesto: {
        valido: true,
        comProblemas: false,
        id: 'pkg-meta',
        criadoEm: '2024-06-01T00:00:00.000Z',
        tipo: 'exportacao',
        origemVault: 'vault',
        caminhoPacote: 'pacote.scrivener-package',
        livro: 'Meu Livro',
        observacoes: 'Nota',
        avisos: [],
        erros: [],
      },
    };

    const normalizados = normalizarPacotesScrivener([pacote]);

    expect(normalizados[0].manifesto?.id).toBe('pkg-meta');
    expect(normalizados[0].manifesto?.criadoEm).toBe('2024-06-01T00:00:00.000Z');
    expect(normalizados[0].manifesto?.tipo).toBe('exportacao');
    expect(normalizados[0].manifesto?.origemVault).toBe('vault');
    expect(normalizados[0].manifesto?.caminhoPacote).toBe('pacote.scrivener-package');
    expect(normalizados[0].manifesto?.livro).toBe('Meu Livro');
    expect(normalizados[0].manifesto?.observacoes).toBe('Nota');
  });

  it('copia arrays avisos e erros do manifesto sem compartilhar referencia', () => {
    const avisosOriginal = ['aviso-1'];
    const errosOriginal = ['erro-1'];
    const pacote: EstadoPacoteScrivener = {
      manifesto: { valido: false, comProblemas: true, avisos: avisosOriginal, erros: errosOriginal },
    };

    const normalizados = normalizarPacotesScrivener([pacote]);

    expect(normalizados[0].manifesto?.avisos).toEqual(['aviso-1']);
    expect(normalizados[0].manifesto?.erros).toEqual(['erro-1']);
    expect(normalizados[0].manifesto?.avisos).not.toBe(avisosOriginal);
    expect(normalizados[0].manifesto?.erros).not.toBe(errosOriginal);
  });

  it('limpa pacotes', () => {
    expect(limparPacotesScrivener()).toEqual([]);
  });

  it('cria pacote diagnostico com alertas intencionais', () => {
    const pacote = criarPacoteDiagnosticoScrivener();

    expect(pacote.manifesto?.comProblemas).toBe(true);
    expect(pacote.aplicacao?.auditada).toBe(false);
    expect(pacote.aplicacao?.temBackup).toBe(false);
    expect(pacote.restauracao?.status).toBe('bloqueada');
  });
});
