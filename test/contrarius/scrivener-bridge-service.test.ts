import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScrivenerBridgeService } from '../../src/contrarius/scrivener-bridge-service';
import type { ScrivenerBridgeSettingsHost } from '../../src/contrarius/scrivener-bridge-service';
import type { EstadoPacoteScrivener } from '../../src/contrarius/scrivener-alerts-panel-model';

function makeHost(pacotes?: EstadoPacoteScrivener[]): ScrivenerBridgeSettingsHost & { saveSettings: ReturnType<typeof vi.fn> } {
  return {
    settings: { scrivenerPacotes: pacotes },
    saveSettings: vi.fn().mockResolvedValue(undefined),
  };
}

describe('ScrivenerBridgeService', () => {
  describe('listarPacotes()', () => {
    it('returns [] when settings has no scrivenerPacotes', () => {
      const host = makeHost(undefined);
      const service = new ScrivenerBridgeService(host);
      expect(service.listarPacotes()).toEqual([]);
    });

    it('returns [] when scrivenerPacotes is an empty array', () => {
      const host = makeHost([]);
      const service = new ScrivenerBridgeService(host);
      expect(service.listarPacotes()).toEqual([]);
    });

    it('returns normalized copies of stored packages', () => {
      const original: EstadoPacoteScrivener = { manifesto: { valido: true }, aplicacao: { status: 'ok' } };
      const host = makeHost([original]);
      const service = new ScrivenerBridgeService(host);
      const result = service.listarPacotes();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(original);
    });

    it('does not expose original package object references', () => {
      const original: EstadoPacoteScrivener = { manifesto: { valido: true } };
      const host = makeHost([original]);
      const service = new ScrivenerBridgeService(host);
      const result = service.listarPacotes();
      expect(result[0]).not.toBe(original);
      expect(result[0].manifesto).not.toBe(original.manifesto);
    });
  });

  describe('getEstadoPainel()', () => {
    it('returns pacotes from settings', () => {
      const pacote: EstadoPacoteScrivener = { restauracao: { status: 'ok' } };
      const host = makeHost([pacote]);
      const service = new ScrivenerBridgeService(host);
      const estado = service.getEstadoPainel();
      expect(estado.pacotes).toHaveLength(1);
      expect(estado.pacotes![0]).toEqual(pacote);
    });

    it('returns { pacotes: [] } when no packages stored', () => {
      const host = makeHost(undefined);
      const service = new ScrivenerBridgeService(host);
      expect(service.getEstadoPainel()).toEqual({ pacotes: [] });
    });

    it('does not expose original package object references', () => {
      const original: EstadoPacoteScrivener = { manifesto: { valido: false } };
      const host = makeHost([original]);
      const service = new ScrivenerBridgeService(host);
      const estado = service.getEstadoPainel();
      expect(estado.pacotes![0]).not.toBe(original);
    });
  });

  describe('registrarPacote()', () => {
    it('appends a package and calls saveSettings once', async () => {
      const host = makeHost([]);
      const service = new ScrivenerBridgeService(host);
      const pacote: EstadoPacoteScrivener = { manifesto: { valido: true } };
      await service.registrarPacote(pacote);
      expect(host.settings.scrivenerPacotes).toHaveLength(1);
      expect(host.settings.scrivenerPacotes![0]).toEqual(pacote);
      expect(host.saveSettings).toHaveBeenCalledTimes(1);
    });

    it('normalizes and limits packages through the store', async () => {
      const existing: EstadoPacoteScrivener[] = Array.from({ length: 10 }, (_, i) => ({
        manifesto: { valido: true, comProblemas: i % 2 === 0 },
      }));
      const host = makeHost(existing);
      const service = new ScrivenerBridgeService(host);
      const extra: EstadoPacoteScrivener = { aplicacao: { status: 'ok' } };
      await service.registrarPacote(extra);
      // store keeps last 10 entries, so total stays at 10
      expect(host.settings.scrivenerPacotes).toHaveLength(10);
      expect(host.settings.scrivenerPacotes![9]).toEqual(extra);
    });
  });

  describe('registrarPacoteDiagnostico()', () => {
    it('stores a diagnostic package that has intentional warning/blocking data', async () => {
      const host = makeHost([]);
      const service = new ScrivenerBridgeService(host);
      await service.registrarPacoteDiagnostico();
      expect(host.settings.scrivenerPacotes).toHaveLength(1);
      const pkg = host.settings.scrivenerPacotes![0];
      // diagnostic package has comProblemas=true (warning) and bloqueada restauracao (blocking)
      expect(pkg.manifesto?.comProblemas).toBe(true);
      expect(pkg.restauracao?.status).toBe('bloqueada');
      expect(host.saveSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('limparPacotes()', () => {
    it('clears the state and calls saveSettings once', async () => {
      const host = makeHost([{ manifesto: { valido: true } }]);
      const service = new ScrivenerBridgeService(host);
      await service.limparPacotes();
      expect(host.settings.scrivenerPacotes).toEqual([]);
      expect(host.saveSettings).toHaveBeenCalledTimes(1);
    });
  });
});
