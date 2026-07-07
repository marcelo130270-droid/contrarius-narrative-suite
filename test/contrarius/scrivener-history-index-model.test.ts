import { describe, expect, it } from 'vitest';
import {
  gerarIndiceHistoricoScrivener,
  type ArquivoPacoteHistoricoScrivener,
  type DadosIndiceHistoricoScrivener,
  type DadosPacoteHistoricoScrivener,
  type EtapaScrivenerHistorico,
} from '../../src/contrarius/scrivener-history-index-model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GERADO_EM = '2026-07-07 10:00';
const NOME_PASTA = 'roteiro-scrivener-20260705-103045';
const NOME_PASTA_B = 'roteiro-scrivener-20260704-090000';

function makeManifestoValido(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    tipo: 'contrarius-scrivener-export',
    versao: 1,
    titulo: 'Pacote Scrivener',
    filtroLivro: 'Livro 1',
    geradoEm: '2026-07-05 10:30',
    arquivos: [{ filePath: '05_Eventos/E-001.md' }],
    problemas: [],
    ...overrides,
  });
}

function arqs(caminhos: string[]): readonly ArquivoPacoteHistoricoScrivener[] {
  return caminhos.map((caminhoRelativo) => ({ caminhoRelativo }));
}

function makePacote(
  nomePasta: string,
  caminhos: string[],
  manifestoJson = makeManifestoValido(),
): DadosPacoteHistoricoScrivener {
  return { nomePasta, arquivos: arqs(caminhos), manifestoJson };
}

const BASE = ['contrarius-manifest.json'];

function makeDados(
  pacotes: DadosPacoteHistoricoScrivener[],
  geradoEm = GERADO_EM,
): DadosIndiceHistoricoScrivener {
  return { pacotes, geradoEm };
}

// ─── Testes: lista vazia ───────────────────────────────────────────────────────

describe('gerarIndiceHistoricoScrivener — lista vazia', () => {
  it('retorna 0 pacotes quando não há nenhum', () => {
    const r = gerarIndiceHistoricoScrivener(makeDados([]));
    expect(r.totalPacotes).toBe(0);
    expect(r.pacotes).toHaveLength(0);
  });

  it('markdown contém frase "Nenhum pacote" quando vazio', () => {
    const r = gerarIndiceHistoricoScrivener(makeDados([]));
    expect(r.relatorioMarkdown).toContain('Nenhum pacote Scrivener encontrado');
  });

  it('markdown inclui timestamp geradoEm', () => {
    const r = gerarIndiceHistoricoScrivener(makeDados([]));
    expect(r.relatorioMarkdown).toContain(GERADO_EM);
  });

  it('markdown indica que nenhum arquivo foi alterado', () => {
    const r = gerarIndiceHistoricoScrivener(makeDados([]));
    expect(r.relatorioMarkdown).toContain('Nenhum arquivo foi alterado');
  });
});

// ─── Testes: manifesto ────────────────────────────────────────────────────────

describe('gerarIndiceHistoricoScrivener — manifesto', () => {
  it('pacote sem nenhum arquivo tem etapa sem_manifesto', () => {
    const r = gerarIndiceHistoricoScrivener(makeDados([makePacote(NOME_PASTA, [])]));
    expect(r.pacotes[0].etapaMaisAvancada).toBe<EtapaScrivenerHistorico>('sem_manifesto');
    expect(r.pacotes[0].temManifesto).toBe(false);
  });

  it('pacote sem contrarius-manifest.json tem etapa sem_manifesto', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, ['Livro-1/001-evento.md'])]),
    );
    expect(r.pacotes[0].etapaMaisAvancada).toBe<EtapaScrivenerHistorico>('sem_manifesto');
  });

  it('pacote com manifesto válido sem operações tem etapa exportado', () => {
    const r = gerarIndiceHistoricoScrivener(makeDados([makePacote(NOME_PASTA, BASE)]));
    expect(r.pacotes[0].etapaMaisAvancada).toBe<EtapaScrivenerHistorico>('exportado');
    expect(r.pacotes[0].temManifesto).toBe(true);
    expect(r.pacotes[0].manifesto.valido).toBe(true);
  });

  it('manifesto JSON malformado resulta em sem_manifesto', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, BASE, 'não é json {')]),
    );
    expect(r.pacotes[0].etapaMaisAvancada).toBe<EtapaScrivenerHistorico>('sem_manifesto');
    expect(r.pacotes[0].manifesto.valido).toBe(false);
  });

  it('manifesto com tipo incorreto resulta em sem_manifesto', () => {
    const json = JSON.stringify({ tipo: 'outro-tipo', arquivos: [] });
    const r = gerarIndiceHistoricoScrivener(makeDados([makePacote(NOME_PASTA, BASE, json)]));
    expect(r.pacotes[0].etapaMaisAvancada).toBe<EtapaScrivenerHistorico>('sem_manifesto');
  });

  it('manifesto com array nulo resulta em sem_manifesto', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, BASE, 'null')]),
    );
    expect(r.pacotes[0].etapaMaisAvancada).toBe<EtapaScrivenerHistorico>('sem_manifesto');
  });

  it('manifesto extrai titulo, filtroLivro, geradoEm e totalArquivos', () => {
    const r = gerarIndiceHistoricoScrivener(makeDados([makePacote(NOME_PASTA, BASE)]));
    const m = r.pacotes[0].manifesto;
    expect(m.valido).toBe(true);
    expect(m.titulo).toBe('Pacote Scrivener');
    expect(m.filtroLivro).toBe('Livro 1');
    expect(m.geradoEm).toBe('2026-07-05 10:30');
    expect(m.totalArquivos).toBe(1);
    expect(m.totalProblemas).toBe(0);
  });

  it('manifesto sem campo arquivos retorna totalArquivos 0', () => {
    const json = JSON.stringify({
      tipo: 'contrarius-scrivener-export',
      titulo: 'T',
      filtroLivro: 'L',
      geradoEm: '2026-07-01 10:00',
    });
    const r = gerarIndiceHistoricoScrivener(makeDados([makePacote(NOME_PASTA, BASE, json)]));
    expect(r.pacotes[0].manifesto.totalArquivos).toBe(0);
  });

  it('manifesto com problemas retorna totalProblemas correto', () => {
    const json = makeManifestoValido({
      problemas: [{ nivel: 'aviso', mensagem: 'A' }, { nivel: 'erro', mensagem: 'B' }],
    });
    const r = gerarIndiceHistoricoScrivener(makeDados([makePacote(NOME_PASTA, BASE, json)]));
    expect(r.pacotes[0].manifesto.totalProblemas).toBe(2);
  });
});

// ─── Testes: detecção de operações ────────────────────────────────────────────

describe('gerarIndiceHistoricoScrivener — detecção de operações', () => {
  it('RELATORIO_COMPARACAO.md → comparado', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'RELATORIO_COMPARACAO.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).toContain<EtapaScrivenerHistorico>('comparado');
  });

  it('RELATORIO_COMPARACAO-2.md (sufixo numérico) → comparado', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'RELATORIO_COMPARACAO-2.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).toContain<EtapaScrivenerHistorico>('comparado');
  });

  it('RELATORIO_COMPARACAO-abc.md (sufixo não numérico) não conta', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'RELATORIO_COMPARACAO-abc.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).not.toContain<EtapaScrivenerHistorico>('comparado');
  });

  it('PLANO_PRE_IMPORTACAO.md → plano_gerado', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'PLANO_PRE_IMPORTACAO.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).toContain<EtapaScrivenerHistorico>('plano_gerado');
  });

  it('PREVIA_APLICACAO_SCRIVENER.md → previa_aplicacao', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'PREVIA_APLICACAO_SCRIVENER.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).toContain<EtapaScrivenerHistorico>('previa_aplicacao');
  });

  it('APLICACAO_SCRIVENER_BLOQUEADA.md → aplicacao_bloqueada', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'APLICACAO_SCRIVENER_BLOQUEADA.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).toContain<EtapaScrivenerHistorico>('aplicacao_bloqueada');
  });

  it('APLICACAO_SCRIVENER_BLOQUEADA.md NÃO gera aplicado', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'APLICACAO_SCRIVENER_BLOQUEADA.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).not.toContain<EtapaScrivenerHistorico>('aplicado');
  });

  it('APLICACAO_SCRIVENER_ERRO.md → aplicacao_erro', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'APLICACAO_SCRIVENER_ERRO.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).toContain<EtapaScrivenerHistorico>('aplicacao_erro');
  });

  it('APLICACAO_SCRIVENER.md → aplicado', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'APLICACAO_SCRIVENER.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).toContain<EtapaScrivenerHistorico>('aplicado');
  });

  it('APLICACAO_SCRIVENER.md NÃO gera aplicacao_bloqueada', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'APLICACAO_SCRIVENER.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).not.toContain<EtapaScrivenerHistorico>('aplicacao_bloqueada');
  });

  it('AUDITORIA_APLICACAO_SCRIVENER.md → auditado_aplicacao', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'AUDITORIA_APLICACAO_SCRIVENER.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).toContain<EtapaScrivenerHistorico>('auditado_aplicacao');
  });

  it('RELATORIO_PREVIA_RESTAURACAO_SCRIVENER.md → previa_restauracao', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA, [...BASE, 'RELATORIO_PREVIA_RESTAURACAO_SCRIVENER.md']),
      ]),
    );
    expect(r.pacotes[0].operacoesPresentes).toContain<EtapaScrivenerHistorico>('previa_restauracao');
  });

  it('RESTAURACAO_SCRIVENER_BLOQUEADA.md → restauracao_bloqueada', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'RESTAURACAO_SCRIVENER_BLOQUEADA.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).toContain<EtapaScrivenerHistorico>('restauracao_bloqueada');
  });

  it('RESTAURACAO_SCRIVENER_BLOQUEADA.md NÃO gera restaurado', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'RESTAURACAO_SCRIVENER_BLOQUEADA.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).not.toContain<EtapaScrivenerHistorico>('restaurado');
  });

  it('RESTAURACAO_SCRIVENER_ERRO.md → restauracao_erro', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'RESTAURACAO_SCRIVENER_ERRO.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).toContain<EtapaScrivenerHistorico>('restauracao_erro');
  });

  it('RESTAURACAO_SCRIVENER.md → restaurado', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'RESTAURACAO_SCRIVENER.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).toContain<EtapaScrivenerHistorico>('restaurado');
  });

  it('RESTAURACAO_SCRIVENER.md NÃO gera restauracao_bloqueada', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'RESTAURACAO_SCRIVENER.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).not.toContain<EtapaScrivenerHistorico>('restauracao_bloqueada');
  });

  it('AUDITORIA_RESTAURACAO_SCRIVENER.md → auditado_restauracao', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'AUDITORIA_RESTAURACAO_SCRIVENER.md'])]),
    );
    expect(r.pacotes[0].operacoesPresentes).toContain<EtapaScrivenerHistorico>('auditado_restauracao');
  });

  it('arquivo de evento em subpasta não conta como operação', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA, [
          ...BASE,
          'Livro-1/001-ev-abc.md',
          'BACKUP_ANTES_APLICACAO/RELATORIO_COMPARACAO.md',
        ]),
      ]),
    );
    expect(r.pacotes[0].operacoesPresentes).not.toContain<EtapaScrivenerHistorico>('comparado');
  });

  it('múltiplas operações presentes são todas listadas', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA, [
          ...BASE,
          'RELATORIO_COMPARACAO.md',
          'PLANO_PRE_IMPORTACAO.md',
          'PREVIA_APLICACAO_SCRIVENER.md',
          'APLICACAO_SCRIVENER.md',
          'AUDITORIA_APLICACAO_SCRIVENER.md',
        ]),
      ]),
    );
    const ops = r.pacotes[0].operacoesPresentes;
    expect(ops).toContain<EtapaScrivenerHistorico>('exportado');
    expect(ops).toContain<EtapaScrivenerHistorico>('comparado');
    expect(ops).toContain<EtapaScrivenerHistorico>('plano_gerado');
    expect(ops).toContain<EtapaScrivenerHistorico>('previa_aplicacao');
    expect(ops).toContain<EtapaScrivenerHistorico>('aplicado');
    expect(ops).toContain<EtapaScrivenerHistorico>('auditado_aplicacao');
  });
});

// ─── Testes: etapaMaisAvancada ─────────────────────────────────────────────────

describe('gerarIndiceHistoricoScrivener — etapaMaisAvancada', () => {
  it('auditado_restauracao é a etapa mais avançada do ciclo', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA, [
          ...BASE,
          'RELATORIO_COMPARACAO.md',
          'APLICACAO_SCRIVENER.md',
          'AUDITORIA_RESTAURACAO_SCRIVENER.md',
        ]),
      ]),
    );
    expect(r.pacotes[0].etapaMaisAvancada).toBe<EtapaScrivenerHistorico>('auditado_restauracao');
  });

  it('aplicado tem prioridade maior que aplicacao_bloqueada', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA, [
          ...BASE,
          'APLICACAO_SCRIVENER_BLOQUEADA.md',
          'APLICACAO_SCRIVENER.md',
        ]),
      ]),
    );
    expect(r.pacotes[0].etapaMaisAvancada).toBe<EtapaScrivenerHistorico>('aplicado');
  });

  it('restaurado tem prioridade maior que restauracao_bloqueada', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA, [
          ...BASE,
          'RESTAURACAO_SCRIVENER_BLOQUEADA.md',
          'RESTAURACAO_SCRIVENER.md',
        ]),
      ]),
    );
    expect(r.pacotes[0].etapaMaisAvancada).toBe<EtapaScrivenerHistorico>('restaurado');
  });

  it('auditado_aplicacao tem prioridade maior que aplicado', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA, [
          ...BASE,
          'APLICACAO_SCRIVENER.md',
          'AUDITORIA_APLICACAO_SCRIVENER.md',
        ]),
      ]),
    );
    expect(r.pacotes[0].etapaMaisAvancada).toBe<EtapaScrivenerHistorico>('auditado_aplicacao');
  });

  it('sem operações além do manifesto → exportado', () => {
    const r = gerarIndiceHistoricoScrivener(makeDados([makePacote(NOME_PASTA, BASE)]));
    expect(r.pacotes[0].etapaMaisAvancada).toBe<EtapaScrivenerHistorico>('exportado');
  });
});

// ─── Testes: backups ──────────────────────────────────────────────────────────

describe('gerarIndiceHistoricoScrivener — backups', () => {
  it('BACKUP_ANTES_APLICACAO com 3 arquivos → temBackupAplicacao=true, total=3', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA, [
          ...BASE,
          'BACKUP_ANTES_APLICACAO/05_Eventos_E-001.md',
          'BACKUP_ANTES_APLICACAO/05_Eventos_E-002.md',
          'BACKUP_ANTES_APLICACAO/05_Eventos_E-003.md',
        ]),
      ]),
    );
    expect(r.pacotes[0].temBackupAplicacao).toBe(true);
    expect(r.pacotes[0].totalBackupsAplicacao).toBe(3);
  });

  it('BACKUP_ANTES_RESTAURACAO com 1 arquivo → temBackupRestauracao=true, total=1', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA, [
          ...BASE,
          'BACKUP_ANTES_RESTAURACAO/05_Eventos_E-001.md',
        ]),
      ]),
    );
    expect(r.pacotes[0].temBackupRestauracao).toBe(true);
    expect(r.pacotes[0].totalBackupsRestauracao).toBe(1);
  });

  it('sem backups → temBackupAplicacao=false, total=0', () => {
    const r = gerarIndiceHistoricoScrivener(makeDados([makePacote(NOME_PASTA, BASE)]));
    expect(r.pacotes[0].temBackupAplicacao).toBe(false);
    expect(r.pacotes[0].totalBackupsAplicacao).toBe(0);
    expect(r.pacotes[0].temBackupRestauracao).toBe(false);
    expect(r.pacotes[0].totalBackupsRestauracao).toBe(0);
  });

  it('backups de aplicação e restauração contabilizados separadamente', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA, [
          ...BASE,
          'BACKUP_ANTES_APLICACAO/A.md',
          'BACKUP_ANTES_APLICACAO/B.md',
          'BACKUP_ANTES_RESTAURACAO/C.md',
        ]),
      ]),
    );
    expect(r.pacotes[0].totalBackupsAplicacao).toBe(2);
    expect(r.pacotes[0].totalBackupsRestauracao).toBe(1);
  });
});

// ─── Testes: múltiplos pacotes e ordenação ─────────────────────────────────────

describe('gerarIndiceHistoricoScrivener — múltiplos pacotes', () => {
  it('dois pacotes → totalPacotes=2', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA, BASE),
        makePacote(NOME_PASTA_B, BASE),
      ]),
    );
    expect(r.totalPacotes).toBe(2);
    expect(r.pacotes).toHaveLength(2);
  });

  it('pacotes ordenados por nomePasta descendente (mais recente primeiro)', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA_B, BASE),
        makePacote(NOME_PASTA, BASE),
      ]),
    );
    expect(r.pacotes[0].nomePasta).toBe(NOME_PASTA);
    expect(r.pacotes[1].nomePasta).toBe(NOME_PASTA_B);
  });

  it('cada pacote tem seu próprio estado independente', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA, [...BASE, 'APLICACAO_SCRIVENER.md']),
        makePacote(NOME_PASTA_B, BASE),
      ]),
    );
    const a = r.pacotes.find((p) => p.nomePasta === NOME_PASTA);
    const b = r.pacotes.find((p) => p.nomePasta === NOME_PASTA_B);
    expect(a?.etapaMaisAvancada).toBe<EtapaScrivenerHistorico>('aplicado');
    expect(b?.etapaMaisAvancada).toBe<EtapaScrivenerHistorico>('exportado');
  });
});

// ─── Testes: Markdown ─────────────────────────────────────────────────────────

describe('gerarIndiceHistoricoScrivener — Markdown', () => {
  it('markdown contém cabeçalho principal', () => {
    const r = gerarIndiceHistoricoScrivener(makeDados([]));
    expect(r.relatorioMarkdown).toContain('# Índice histórico de pacotes Scrivener');
  });

  it('markdown contém nome do pacote como heading', () => {
    const r = gerarIndiceHistoricoScrivener(makeDados([makePacote(NOME_PASTA, BASE)]));
    expect(r.relatorioMarkdown).toContain(`### ${NOME_PASTA}`);
  });

  it('markdown contém etapa mais avançada do pacote', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [...BASE, 'AUDITORIA_RESTAURACAO_SCRIVENER.md'])]),
    );
    expect(r.relatorioMarkdown).toContain('Auditado (restauração)');
  });

  it('markdown contém dados do manifesto válido', () => {
    const r = gerarIndiceHistoricoScrivener(makeDados([makePacote(NOME_PASTA, BASE)]));
    expect(r.relatorioMarkdown).toContain('Pacote Scrivener');
    expect(r.relatorioMarkdown).toContain('2026-07-05 10:30');
    expect(r.relatorioMarkdown).toContain('1 arquivo');
  });

  it('markdown indica manifesto ausente quando não há manifesto', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, [])]),
    );
    expect(r.relatorioMarkdown).toContain('Ausente ou inválido');
  });

  it('markdown lista contagem de backups quando presentes', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA, [
          ...BASE,
          'BACKUP_ANTES_APLICACAO/A.md',
          'BACKUP_ANTES_APLICACAO/B.md',
        ]),
      ]),
    );
    expect(r.relatorioMarkdown).toContain('Sim (2 arquivos)');
  });

  it('markdown indica Não para backups ausentes', () => {
    const r = gerarIndiceHistoricoScrivener(makeDados([makePacote(NOME_PASTA, BASE)]));
    expect(r.relatorioMarkdown).toContain('Backup antes da aplicação**: Não');
    expect(r.relatorioMarkdown).toContain('Backup antes da restauração**: Não');
  });

  it('markdown com 1 backup usa singular', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA, [...BASE, 'BACKUP_ANTES_RESTAURACAO/A.md']),
      ]),
    );
    expect(r.relatorioMarkdown).toContain('Sim (1 arquivo)');
  });

  it('markdown lista operações registradas', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA, [
          ...BASE,
          'RELATORIO_COMPARACAO.md',
          'APLICACAO_SCRIVENER.md',
        ]),
      ]),
    );
    expect(r.relatorioMarkdown).toContain('Exportado');
    expect(r.relatorioMarkdown).toContain('Comparado');
    expect(r.relatorioMarkdown).toContain('Aplicado');
  });

  it('markdown contém contagem de pacotes no cabeçalho da seção', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, BASE), makePacote(NOME_PASTA_B, BASE)]),
    );
    expect(r.relatorioMarkdown).toContain('## Pacotes (2)');
  });

  it('markdown lista livro filtrado quando presente no manifesto', () => {
    const r = gerarIndiceHistoricoScrivener(makeDados([makePacote(NOME_PASTA, BASE)]));
    expect(r.relatorioMarkdown).toContain('Livro filtrado');
    expect(r.relatorioMarkdown).toContain('Livro 1');
  });

  it('markdown não lista livro filtrado quando vazio', () => {
    const json = makeManifestoValido({ filtroLivro: '' });
    const r = gerarIndiceHistoricoScrivener(
      makeDados([makePacote(NOME_PASTA, BASE, json)]),
    );
    expect(r.relatorioMarkdown).not.toContain('Livro filtrado');
  });
});

// ─── Testes: imutabilidade ────────────────────────────────────────────────────

describe('gerarIndiceHistoricoScrivener — imutabilidade', () => {
  it('array de entrada não é modificado', () => {
    const pacotesEntrada: DadosPacoteHistoricoScrivener[] = [
      makePacote(NOME_PASTA_B, BASE),
      makePacote(NOME_PASTA, BASE),
    ];
    const nomesAntes = pacotesEntrada.map((p) => p.nomePasta);
    gerarIndiceHistoricoScrivener(makeDados(pacotesEntrada));
    expect(pacotesEntrada.map((p) => p.nomePasta)).toEqual(nomesAntes);
  });

  it('arquivos de entrada não são modificados', () => {
    const arquivos: ArquivoPacoteHistoricoScrivener[] = [
      { caminhoRelativo: 'contrarius-manifest.json' },
    ];
    const copiaAntes = [...arquivos];
    gerarIndiceHistoricoScrivener(
      makeDados([{ nomePasta: NOME_PASTA, arquivos, manifestoJson: makeManifestoValido() }]),
    );
    expect(arquivos).toEqual(copiaAntes);
  });

  it('operacoesPresentes retornado é uma cópia independente', () => {
    const r = gerarIndiceHistoricoScrivener(makeDados([makePacote(NOME_PASTA, BASE)]));
    const ops = r.pacotes[0].operacoesPresentes as EtapaScrivenerHistorico[];
    const tamanhoAntes = ops.length;
    ops.push('comparado');
    const r2 = gerarIndiceHistoricoScrivener(makeDados([makePacote(NOME_PASTA, BASE)]));
    expect(r2.pacotes[0].operacoesPresentes).toHaveLength(tamanhoAntes);
  });
});

// ─── Testes: Unicode e casos especiais ───────────────────────────────────────

describe('gerarIndiceHistoricoScrivener — casos especiais', () => {
  it('nome de pasta com caracteres especiais é preservado no markdown', () => {
    const nome = 'roteiro-scrivener-Ação-2026';
    const r = gerarIndiceHistoricoScrivener(makeDados([makePacote(nome, BASE)]));
    expect(r.relatorioMarkdown).toContain(nome);
  });

  it('caminhos com barra invertida (Windows) são normalizados para detecção', () => {
    const r = gerarIndiceHistoricoScrivener(
      makeDados([
        makePacote(NOME_PASTA, [
          'contrarius-manifest.json',
          'BACKUP_ANTES_APLICACAO\\arquivo.md',
        ]),
      ]),
    );
    expect(r.pacotes[0].totalBackupsAplicacao).toBe(1);
  });

  it('geradoEm vazio é tratado sem erro', () => {
    const r = gerarIndiceHistoricoScrivener({ pacotes: [], geradoEm: '' });
    expect(r.totalPacotes).toBe(0);
    expect(r.relatorioMarkdown).toContain('Gerado em:');
  });
});
