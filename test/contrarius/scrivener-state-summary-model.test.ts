import { describe, it, expect } from 'vitest';
import { resumirEstadoScrivener } from '../../src/contrarius/scrivener-state-summary-model';
import type { EstadoPacoteScrivener } from '../../src/contrarius/scrivener-alerts-panel-model';

describe('resumirEstadoScrivener', () => {
  it('returns empty summary for undefined', () => {
    const r = resumirEstadoScrivener(undefined);
    expect(r.nivel).toBe('empty');
    expect(r.totalPacotes).toBe(0);
    expect(r.mensagem).toBe('No persisted Scrivener package state yet.');
  });

  it('returns empty summary for null', () => {
    const r = resumirEstadoScrivener(null);
    expect(r.nivel).toBe('empty');
    expect(r.totalPacotes).toBe(0);
  });

  it('returns empty summary for empty array', () => {
    const r = resumirEstadoScrivener([]);
    expect(r.nivel).toBe('empty');
    expect(r.totalPacotes).toBe(0);
    expect(r.pacotesValidos).toBe(0);
  });

  it('returns ok summary for a single clean valid package', () => {
    const pacotes: EstadoPacoteScrivener[] = [
      { manifesto: { valido: true, comProblemas: false } },
    ];
    const r = resumirEstadoScrivener(pacotes);
    expect(r.nivel).toBe('ok');
    expect(r.totalPacotes).toBe(1);
    expect(r.pacotesValidos).toBe(1);
    expect(r.pacotesInvalidos).toBe(0);
    expect(r.mensagem).toBe('Persisted Scrivener package state is clean.');
  });

  it('returns error summary when manifest is invalid', () => {
    const pacotes: EstadoPacoteScrivener[] = [
      { manifesto: { valido: false } },
    ];
    const r = resumirEstadoScrivener(pacotes);
    expect(r.nivel).toBe('error');
    expect(r.pacotesInvalidos).toBe(1);
    expect(r.mensagem).toBe('Persisted Scrivener package state has errors or invalid manifests.');
  });

  it('returns warning summary when manifest has comProblemas', () => {
    const pacotes: EstadoPacoteScrivener[] = [
      { manifesto: { valido: true, comProblemas: true } },
    ];
    const r = resumirEstadoScrivener(pacotes);
    expect(r.nivel).toBe('warning');
    expect(r.pacotesComProblemas).toBe(1);
    expect(r.mensagem).toBe('Persisted Scrivener package state has warnings or blocked operations.');
  });

  it('returns error summary when aplicacao.status is erro', () => {
    const pacotes: EstadoPacoteScrivener[] = [
      { manifesto: { valido: true }, aplicacao: { status: 'erro' } },
    ];
    const r = resumirEstadoScrivener(pacotes);
    expect(r.nivel).toBe('error');
    expect(r.pacotesComAplicacaoErro).toBe(1);
  });

  it('returns error summary when restauracao.status is erro', () => {
    const pacotes: EstadoPacoteScrivener[] = [
      { manifesto: { valido: true }, restauracao: { status: 'erro' } },
    ];
    const r = resumirEstadoScrivener(pacotes);
    expect(r.nivel).toBe('error');
    expect(r.pacotesComRestauracaoErro).toBe(1);
  });

  it('returns warning summary when aplicacao.status is bloqueada', () => {
    const pacotes: EstadoPacoteScrivener[] = [
      { manifesto: { valido: true }, aplicacao: { status: 'bloqueada' } },
    ];
    const r = resumirEstadoScrivener(pacotes);
    expect(r.nivel).toBe('warning');
    expect(r.pacotesComBloqueio).toBe(1);
  });

  it('returns warning summary when restauracao.status is bloqueada', () => {
    const pacotes: EstadoPacoteScrivener[] = [
      { manifesto: { valido: true }, restauracao: { status: 'bloqueada' } },
    ];
    const r = resumirEstadoScrivener(pacotes);
    expect(r.nivel).toBe('warning');
    expect(r.pacotesComBloqueio).toBe(1);
  });

  it('counts a package with both aplicacao and restauracao bloqueada only once in pacotesComBloqueio', () => {
    const pacotes: EstadoPacoteScrivener[] = [
      { aplicacao: { status: 'bloqueada' }, restauracao: { status: 'bloqueada' } },
    ];
    const r = resumirEstadoScrivener(pacotes);
    expect(r.pacotesComBloqueio).toBe(1);
  });

  it('mixed packages: error takes priority over warning, counters are correct', () => {
    const pacotes: EstadoPacoteScrivener[] = [
      { manifesto: { valido: true } },                                      // ok
      { manifesto: { valido: false } },                                     // invalid → error
      { manifesto: { valido: true, comProblemas: true } },                  // warning
      { manifesto: { valido: true }, aplicacao: { status: 'bloqueada' } },  // warning/blocked
    ];
    const r = resumirEstadoScrivener(pacotes);
    expect(r.totalPacotes).toBe(4);
    expect(r.pacotesValidos).toBe(3);
    expect(r.pacotesInvalidos).toBe(1);
    expect(r.pacotesComProblemas).toBe(1);
    expect(r.pacotesComBloqueio).toBe(1);
    expect(r.nivel).toBe('error');
  });
});
