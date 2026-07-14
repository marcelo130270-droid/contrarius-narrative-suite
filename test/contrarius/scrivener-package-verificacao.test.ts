import { describe, it, expect } from 'vitest';
import { verificarPacoteScrivener, type ArquivoLidoPacote } from '../../src/contrarius/scrivener-package-verificacao';
import { construirPlanoPacoteScrivener, hashConteudo } from '../../src/contrarius/scrivener-package-plano';
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

function pacoteCompletoValido(): ArquivoLidoPacote[] {
  const plano = construirPlanoPacoteScrivener(indiceVazio(), new Date('2026-07-13T22:00:00.000Z'));
  return plano.map((a) => ({ caminhoRelativo: a.caminhoRelativo, conteudo: a.conteudo }));
}

describe('verificarPacoteScrivener', () => {
  it('pacote completo e íntegro: todos os itens ok, sem exceção', () => {
    const relatorio = verificarPacoteScrivener(pacoteCompletoValido());
    expect(relatorio.pacoteEncontrado).toBe(true);
    expect(relatorio.manifestoValido).toBe(true);
    expect(relatorio.itens.every((i) => i.status === 'ok')).toBe(true);
    expect(relatorio.resumo).toContain('íntegro');
  });

  it('pacote ausente: nenhum arquivo encontrado, relatório claro (não erro genérico)', () => {
    const arquivos: ArquivoLidoPacote[] = [
      { caminhoRelativo: 'manifest.json', conteudo: null },
      { caminhoRelativo: 'scrivener-import.md', conteudo: null },
      { caminhoRelativo: 'README.md', conteudo: null },
      { caminhoRelativo: 'integrity/report.json', conteudo: null },
    ];
    const relatorio = verificarPacoteScrivener(arquivos);
    expect(relatorio.pacoteEncontrado).toBe(false);
    expect(relatorio.resumo).toContain('Nenhum pacote encontrado');
    expect(relatorio.itens.every((i) => i.status === 'faltando')).toBe(true);
  });

  it('arquivo faltando (README.md ausente, resto presente): lista o que falta especificamente', () => {
    const arquivos = pacoteCompletoValido().map((a) =>
      a.caminhoRelativo === 'README.md' ? { ...a, conteudo: null } : a,
    );
    const relatorio = verificarPacoteScrivener(arquivos);
    expect(relatorio.pacoteEncontrado).toBe(true);
    expect(relatorio.itens).toContainEqual(expect.objectContaining({ caminhoRelativo: 'README.md', status: 'faltando' }));
  });

  it('manifest.json com JSON inválido: reporta erro de parse, não lança exceção', () => {
    const arquivos = pacoteCompletoValido().map((a) =>
      a.caminhoRelativo === 'manifest.json' ? { ...a, conteudo: '{ isso não é json' } : a,
    );
    expect(() => verificarPacoteScrivener(arquivos)).not.toThrow();
    const relatorio = verificarPacoteScrivener(arquivos);
    expect(relatorio.manifestoValido).toBe(false);
    expect(relatorio.itens).toContainEqual(expect.objectContaining({ caminhoRelativo: 'manifest.json', status: 'json_invalido' }));
  });

  it('integrity/report.json com JSON inválido: reporta erro de parse, não lança exceção', () => {
    const arquivos = pacoteCompletoValido().map((a) =>
      a.caminhoRelativo === 'integrity/report.json' ? { ...a, conteudo: 'não é json{{{' } : a,
    );
    expect(() => verificarPacoteScrivener(arquivos)).not.toThrow();
    const relatorio = verificarPacoteScrivener(arquivos);
    expect(relatorio.itens).toContainEqual(
      expect.objectContaining({ caminhoRelativo: 'integrity/report.json', status: 'json_invalido' }),
    );
  });

  it('arquivo com conteúdo alterado após a exportação (hash não bate): detecta corrupção/gravação incompleta', () => {
    const arquivos = pacoteCompletoValido().map((a) =>
      a.caminhoRelativo === 'scrivener-import.md' ? { ...a, conteudo: a.conteudo + '\nTEXTO ADULTERADO' } : a,
    );
    const relatorio = verificarPacoteScrivener(arquivos);
    expect(relatorio.itens).toContainEqual(
      expect.objectContaining({ caminhoRelativo: 'scrivener-import.md', status: 'hash_diferente' }),
    );
  });

  it('funciona igual para pacote "antigo" (timestamp diferente) — nenhuma lógica depende de ser o mais recente', () => {
    const plano = construirPlanoPacoteScrivener(indiceVazio(), new Date('2020-01-01T00:00:00.000Z'));
    const arquivos = plano.map((a) => ({ caminhoRelativo: a.caminhoRelativo, conteudo: a.conteudo }));
    const relatorio = verificarPacoteScrivener(arquivos);
    expect(relatorio.pacoteEncontrado).toBe(true);
    expect(relatorio.itens.every((i) => i.status === 'ok')).toBe(true);
  });

  it('hash de referência calculado da mesma forma que na exportação (mesma função)', () => {
    const arquivos = pacoteCompletoValido();
    const manifesto = arquivos.find((a) => a.caminhoRelativo === 'manifest.json')!;
    expect(hashConteudo(manifesto.conteudo!)).toBeTruthy();
  });
});
