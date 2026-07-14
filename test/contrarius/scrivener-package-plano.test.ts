import { describe, it, expect } from 'vitest';
import {
  construirPlanoPacoteScrivener,
  hashConteudo,
  nomePastaPacote,
} from '../../src/contrarius/scrivener-package-plano';
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

const DATA_FIXA = new Date('2026-07-13T22:00:00.000Z');

describe('hashConteudo', () => {
  it('é determinístico: mesmo texto produz o mesmo hash', () => {
    expect(hashConteudo('abc')).toBe(hashConteudo('abc'));
  });

  it('muda quando o conteúdo muda', () => {
    expect(hashConteudo('abc')).not.toBe(hashConteudo('abd'));
  });
});

describe('nomePastaPacote', () => {
  it('gera nome de pasta com timestamp, sem caracteres inválidos', () => {
    const nome = nomePastaPacote(DATA_FIXA);
    expect(nome).toBe('scrivener-package/2026-07-13T22-00-00-000Z');
  });

  it('gera nomes diferentes para timestamps diferentes (não sobrescreve pacote anterior)', () => {
    const a = nomePastaPacote(new Date('2026-07-13T22:00:00.000Z'));
    const b = nomePastaPacote(new Date('2026-07-13T22:00:01.000Z'));
    expect(a).not.toBe(b);
  });
});

describe('construirPlanoPacoteScrivener', () => {
  it('inclui manifest.json, scrivener-import.md, README.md e integrity/report.json', () => {
    const plano = construirPlanoPacoteScrivener(indiceVazio(), DATA_FIXA);
    const caminhos = plano.map((a) => a.caminhoRelativo);
    expect(caminhos).toEqual(['manifest.json', 'scrivener-import.md', 'README.md', 'integrity/report.json']);
  });

  it('manifest.json tem schema, versão e contagens corretas', () => {
    const indice = indiceVazio();
    indice.consciencias.push({ path: '02_Consciencias/C-001.md', id: 'C-001', metadata: {} });
    const plano = construirPlanoPacoteScrivener(indice, DATA_FIXA);
    const manifesto = JSON.parse(plano.find((a) => a.caminhoRelativo === 'manifest.json')!.conteudo);

    expect(manifesto.schema).toBe('contrarius-scrivener-package');
    expect(manifesto.versao).toBe(1);
    expect(manifesto.geradoEm).toBe('2026-07-13T22:00:00.000Z');
    expect(manifesto.contagens.consciencias).toBe(1);
  });

  it('integrity/report.json tem uma entrada por arquivo, com hash e tamanho batendo', () => {
    const plano = construirPlanoPacoteScrivener(indiceVazio(), DATA_FIXA);
    const relatorio = JSON.parse(plano.find((a) => a.caminhoRelativo === 'integrity/report.json')!.conteudo);

    expect(relatorio.totalArquivos).toBe(3);
    expect(relatorio.arquivos).toHaveLength(3);

    const manifestoArquivo = plano.find((a) => a.caminhoRelativo === 'manifest.json')!;
    const entradaManifesto = relatorio.arquivos.find((a: { caminhoRelativo: string }) => a.caminhoRelativo === 'manifest.json');
    expect(entradaManifesto.tamanhoCaracteres).toBe(manifestoArquivo.conteudo.length);
    expect(entradaManifesto.hash).toBe(hashConteudo(manifestoArquivo.conteudo));
  });

  it('não lança exceção com índice vazio', () => {
    expect(() => construirPlanoPacoteScrivener(indiceVazio(), DATA_FIXA)).not.toThrow();
  });
});
