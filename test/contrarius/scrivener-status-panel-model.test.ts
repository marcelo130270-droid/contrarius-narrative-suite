import { describe, expect, it } from 'vitest';
import {
  gerarPainelStatusScrivener,
  type ArquivoStatusPainelScrivener,
  type DadosStatusPainelScrivener,
  type EtapaStatusPainelScrivener,
  type NivelStatusPainelScrivener,
  type PacoteEntradaStatusScrivener,
} from '../../src/contrarius/scrivener-status-panel-model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOME_PASTA = 'roteiro-scrivener-20260707-143022';

function makeManifestoValido(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    tipo: 'contrarius-scrivener-export',
    titulo: 'Roteiro Principal',
    filtroLivro: 'Livro 1',
    geradoEm: '2026-07-07 14:30',
    arquivos: [{ filePath: '05_Eventos/E-001.md' }, { filePath: '05_Eventos/E-002.md' }],
    problemas: [],
    ...overrides,
  });
}

function arqs(caminhos: string[]): readonly ArquivoStatusPainelScrivener[] {
  return caminhos.map((caminhoRelativo) => ({ caminhoRelativo }));
}

const BASE = ['contrarius-manifest.json'];

function makePacote(
  caminhos: string[],
  manifestoJson = makeManifestoValido(),
  nomePasta = NOME_PASTA,
): PacoteEntradaStatusScrivener {
  return { nomePasta, arquivos: arqs(caminhos), manifestoJson };
}

function makeDados(
  pacote: PacoteEntradaStatusScrivener | null,
  total = pacote !== null ? 1 : 0,
): DadosStatusPainelScrivener {
  return { totalPacotesNaPasta: total, pacoteMaisRecente: pacote };
}

// ─── Testes: lista vazia ───────────────────────────────────────────────────────

describe('gerarStatusPainelScrivener — lista vazia', () => {
  it('retorna semPacotes true quando totalPacotesNaPasta é 0', () => {
    const r = gerarPainelStatusScrivener({ totalPacotesNaPasta: 0, pacoteMaisRecente: null });
    expect(r.semPacotes).toBe(true);
    expect(r.totalPacotes).toBe(0);
    expect(r.pacoteMaisRecente).toBeNull();
  });

  it('retorna semPacotes false quando totalPacotesNaPasta > 0', () => {
    const r = gerarPainelStatusScrivener(makeDados(makePacote(BASE)));
    expect(r.semPacotes).toBe(false);
  });

  it('propaga totalPacotesNaPasta para totalPacotes', () => {
    const r = gerarPainelStatusScrivener({
      totalPacotesNaPasta: 5,
      pacoteMaisRecente: makePacote(BASE),
    });
    expect(r.totalPacotes).toBe(5);
  });
});

// ─── Testes: manifesto ────────────────────────────────────────────────────────

describe('gerarStatusPainelScrivener — manifesto', () => {
  it('pacote sem arquivos tem etapa sem_manifesto', () => {
    const r = gerarPainelStatusScrivener(makeDados(makePacote([])));
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('sem_manifesto');
    expect(r.pacoteMaisRecente?.manifesto.valido).toBe(false);
  });

  it('pacote sem contrarius-manifest.json tem etapa sem_manifesto', () => {
    const r = gerarPainelStatusScrivener(makeDados(makePacote(['Livro-1/001-evento.md'])));
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('sem_manifesto');
  });

  it('manifesto JSON malformado resulta em sem_manifesto', () => {
    const r = gerarPainelStatusScrivener(makeDados(makePacote(BASE, 'não é json {')));
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('sem_manifesto');
    expect(r.pacoteMaisRecente?.manifesto.valido).toBe(false);
  });

  it('manifesto com tipo incorreto resulta em sem_manifesto', () => {
    const json = JSON.stringify({ tipo: 'outro-sistema', arquivos: [] });
    const r = gerarPainelStatusScrivener(makeDados(makePacote(BASE, json)));
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('sem_manifesto');
  });

  it('manifesto null resulta em sem_manifesto', () => {
    const r = gerarPainelStatusScrivener(makeDados(makePacote(BASE, 'null')));
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('sem_manifesto');
  });

  it('pacote com manifesto válido e sem operações tem etapa exportado', () => {
    const r = gerarPainelStatusScrivener(makeDados(makePacote(BASE)));
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('exportado');
    expect(r.pacoteMaisRecente?.manifesto.valido).toBe(true);
  });

  it('manifesto extrai titulo, filtroLivro, geradoEm, totalArquivos e totalProblemas', () => {
    const r = gerarPainelStatusScrivener(makeDados(makePacote(BASE)));
    const m = r.pacoteMaisRecente?.manifesto;
    expect(m?.titulo).toBe('Roteiro Principal');
    expect(m?.filtroLivro).toBe('Livro 1');
    expect(m?.geradoEm).toBe('2026-07-07 14:30');
    expect(m?.totalArquivos).toBe(2);
    expect(m?.totalProblemas).toBe(0);
  });

  it('manifesto com problemas retorna totalProblemas correto', () => {
    const json = makeManifestoValido({
      problemas: [{ nivel: 'aviso', mensagem: 'A' }, { nivel: 'erro', mensagem: 'B' }],
    });
    const r = gerarPainelStatusScrivener(makeDados(makePacote(BASE, json)));
    expect(r.pacoteMaisRecente?.manifesto.totalProblemas).toBe(2);
  });

  it('manifesto sem campo arquivos retorna totalArquivos 0', () => {
    const json = JSON.stringify({ tipo: 'contrarius-scrivener-export', titulo: 'T' });
    const r = gerarPainelStatusScrivener(makeDados(makePacote(BASE, json)));
    expect(r.pacoteMaisRecente?.manifesto.totalArquivos).toBe(0);
  });
});

// ─── Testes: detecção de etapas ───────────────────────────────────────────────

describe('gerarStatusPainelScrivener — detecção de etapas', () => {
  it('RELATORIO_COMPARACAO.md → comparado', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'RELATORIO_COMPARACAO.md'])),
    );
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('comparado');
  });

  it('RELATORIO_COMPARACAO-2.md (sufixo numérico) → comparado', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'RELATORIO_COMPARACAO-2.md'])),
    );
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('comparado');
  });

  it('RELATORIO_COMPARACAO-abc.md (sufixo não numérico) não detecta comparado', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'RELATORIO_COMPARACAO-abc.md'])),
    );
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('exportado');
  });

  it('PLANO_PRE_IMPORTACAO.md → plano_gerado', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'PLANO_PRE_IMPORTACAO.md'])),
    );
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('plano_gerado');
  });

  it('PREVIA_APLICACAO_SCRIVENER.md → previa_aplicacao', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'PREVIA_APLICACAO_SCRIVENER.md'])),
    );
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('previa_aplicacao');
  });

  it('APLICACAO_SCRIVENER_BLOQUEADA.md → aplicacao_bloqueada (sem sobrescrever aplicado)', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'APLICACAO_SCRIVENER_BLOQUEADA.md'])),
    );
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('aplicacao_bloqueada');
  });

  it('APLICACAO_SCRIVENER_ERRO.md → aplicacao_erro', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'APLICACAO_SCRIVENER_ERRO.md'])),
    );
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('aplicacao_erro');
  });

  it('APLICACAO_SCRIVENER.md → aplicado', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'APLICACAO_SCRIVENER.md'])),
    );
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('aplicado');
  });

  it('AUDITORIA_APLICACAO_SCRIVENER.md → auditado_aplicacao', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'APLICACAO_SCRIVENER.md', 'AUDITORIA_APLICACAO_SCRIVENER.md'])),
    );
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('auditado_aplicacao');
  });

  it('RELATORIO_PREVIA_RESTAURACAO_SCRIVENER.md → previa_restauracao', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'RELATORIO_PREVIA_RESTAURACAO_SCRIVENER.md'])),
    );
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('previa_restauracao');
  });

  it('RESTAURACAO_SCRIVENER_BLOQUEADA.md → restauracao_bloqueada', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'RESTAURACAO_SCRIVENER_BLOQUEADA.md'])),
    );
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('restauracao_bloqueada');
  });

  it('RESTAURACAO_SCRIVENER_ERRO.md → restauracao_erro', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'RESTAURACAO_SCRIVENER_ERRO.md'])),
    );
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('restauracao_erro');
  });

  it('RESTAURACAO_SCRIVENER.md → restaurado', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'APLICACAO_SCRIVENER.md', 'RESTAURACAO_SCRIVENER.md'])),
    );
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('restaurado');
  });

  it('AUDITORIA_RESTAURACAO_SCRIVENER.md → auditado_restauracao (etapa máxima)', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(
        makePacote([
          ...BASE,
          'APLICACAO_SCRIVENER.md',
          'RESTAURACAO_SCRIVENER.md',
          'AUDITORIA_RESTAURACAO_SCRIVENER.md',
        ]),
      ),
    );
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('auditado_restauracao');
  });

  it('arquivo em subpasta não é confundido com operação na raiz', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'subpasta/RELATORIO_COMPARACAO.md'])),
    );
    expect(r.pacoteMaisRecente?.etapaMaisAvancada).toBe<EtapaStatusPainelScrivener>('exportado');
  });
});

// ─── Testes: rótulo e nível de etapa ─────────────────────────────────────────

describe('gerarStatusPainelScrivener — rotuloEtapa e nivelEtapa', () => {
  it('exportado tem nível info', () => {
    const r = gerarPainelStatusScrivener(makeDados(makePacote(BASE)));
    expect(r.pacoteMaisRecente?.nivelEtapa).toBe<NivelStatusPainelScrivener>('info');
  });

  it('comparado tem nível info', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'RELATORIO_COMPARACAO.md'])),
    );
    expect(r.pacoteMaisRecente?.nivelEtapa).toBe<NivelStatusPainelScrivener>('info');
  });

  it('aplicado tem nível ok', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'APLICACAO_SCRIVENER.md'])),
    );
    expect(r.pacoteMaisRecente?.nivelEtapa).toBe<NivelStatusPainelScrivener>('ok');
  });

  it('auditado_aplicacao tem nível ok', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'APLICACAO_SCRIVENER.md', 'AUDITORIA_APLICACAO_SCRIVENER.md'])),
    );
    expect(r.pacoteMaisRecente?.nivelEtapa).toBe<NivelStatusPainelScrivener>('ok');
  });

  it('auditado_restauracao tem nível ok', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(
        makePacote([
          ...BASE,
          'APLICACAO_SCRIVENER.md',
          'RESTAURACAO_SCRIVENER.md',
          'AUDITORIA_RESTAURACAO_SCRIVENER.md',
        ]),
      ),
    );
    expect(r.pacoteMaisRecente?.nivelEtapa).toBe<NivelStatusPainelScrivener>('ok');
  });

  it('sem_manifesto tem nível aviso', () => {
    const r = gerarPainelStatusScrivener(makeDados(makePacote([])));
    expect(r.pacoteMaisRecente?.nivelEtapa).toBe<NivelStatusPainelScrivener>('aviso');
  });

  it('aplicacao_bloqueada tem nível aviso', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'APLICACAO_SCRIVENER_BLOQUEADA.md'])),
    );
    expect(r.pacoteMaisRecente?.nivelEtapa).toBe<NivelStatusPainelScrivener>('aviso');
  });

  it('aplicacao_erro tem nível erro', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'APLICACAO_SCRIVENER_ERRO.md'])),
    );
    expect(r.pacoteMaisRecente?.nivelEtapa).toBe<NivelStatusPainelScrivener>('erro');
  });

  it('restauracao_erro tem nível erro', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(makePacote([...BASE, 'RESTAURACAO_SCRIVENER_ERRO.md'])),
    );
    expect(r.pacoteMaisRecente?.nivelEtapa).toBe<NivelStatusPainelScrivener>('erro');
  });

  it('rotuloEtapa retorna string legível', () => {
    const r = gerarPainelStatusScrivener(makeDados(makePacote(BASE)));
    expect(r.pacoteMaisRecente?.rotuloEtapa).toBe('Exportado');
  });

  it('rotuloEtapa para auditado_restauracao', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(
        makePacote([
          ...BASE,
          'APLICACAO_SCRIVENER.md',
          'RESTAURACAO_SCRIVENER.md',
          'AUDITORIA_RESTAURACAO_SCRIVENER.md',
        ]),
      ),
    );
    expect(r.pacoteMaisRecente?.rotuloEtapa).toBe('Auditado (restauração)');
  });
});

// ─── Testes: backups ──────────────────────────────────────────────────────────

describe('gerarStatusPainelScrivener — backups', () => {
  it('sem backups retorna temBackupAplicacao false e total 0', () => {
    const r = gerarPainelStatusScrivener(makeDados(makePacote(BASE)));
    expect(r.pacoteMaisRecente?.temBackupAplicacao).toBe(false);
    expect(r.pacoteMaisRecente?.totalBackupsAplicacao).toBe(0);
  });

  it('arquivos em BACKUP_ANTES_APLICACAO/ contam como backup de aplicação', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(
        makePacote([
          ...BASE,
          'BACKUP_ANTES_APLICACAO/E-001.md',
          'BACKUP_ANTES_APLICACAO/E-002.md',
        ]),
      ),
    );
    expect(r.pacoteMaisRecente?.temBackupAplicacao).toBe(true);
    expect(r.pacoteMaisRecente?.totalBackupsAplicacao).toBe(2);
  });

  it('arquivos em BACKUP_ANTES_RESTAURACAO/ contam como backup de restauração', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(
        makePacote([...BASE, 'BACKUP_ANTES_RESTAURACAO/E-001.md']),
      ),
    );
    expect(r.pacoteMaisRecente?.temBackupRestauracao).toBe(true);
    expect(r.pacoteMaisRecente?.totalBackupsRestauracao).toBe(1);
  });

  it('backups de aplicação e restauração são contados independentemente', () => {
    const r = gerarPainelStatusScrivener(
      makeDados(
        makePacote([
          ...BASE,
          'BACKUP_ANTES_APLICACAO/E-001.md',
          'BACKUP_ANTES_APLICACAO/E-002.md',
          'BACKUP_ANTES_RESTAURACAO/E-001.md',
        ]),
      ),
    );
    expect(r.pacoteMaisRecente?.totalBackupsAplicacao).toBe(2);
    expect(r.pacoteMaisRecente?.totalBackupsRestauracao).toBe(1);
  });
});

// ─── Testes: nomePasta e imutabilidade ────────────────────────────────────────

describe('gerarStatusPainelScrivener — nomePasta e imutabilidade', () => {
  it('nomePasta é propagado corretamente', () => {
    const r = gerarPainelStatusScrivener(makeDados(makePacote(BASE, makeManifestoValido(), NOME_PASTA)));
    expect(r.pacoteMaisRecente?.nomePasta).toBe(NOME_PASTA);
  });

  it('nomePasta com caracteres especiais é preservado', () => {
    const nome = 'roteiro-scrivener-2026-Ação';
    const r = gerarPainelStatusScrivener(makeDados(makePacote(BASE, makeManifestoValido(), nome)));
    expect(r.pacoteMaisRecente?.nomePasta).toBe(nome);
  });

  it('dados de entrada não são alterados', () => {
    const arquivos = [{ caminhoRelativo: 'contrarius-manifest.json' }];
    const pacote: PacoteEntradaStatusScrivener = {
      nomePasta: NOME_PASTA,
      arquivos,
      manifestoJson: makeManifestoValido(),
    };
    const dados: DadosStatusPainelScrivener = { totalPacotesNaPasta: 1, pacoteMaisRecente: pacote };
    gerarPainelStatusScrivener(dados);
    expect(dados.totalPacotesNaPasta).toBe(1);
    expect(dados.pacoteMaisRecente?.nomePasta).toBe(NOME_PASTA);
    expect(arquivos).toHaveLength(1);
  });

  it('pacoteMaisRecente null com totalPacotesNaPasta > 0 retorna semPacotes false e pacoteMaisRecente null', () => {
    const r = gerarPainelStatusScrivener({ totalPacotesNaPasta: 3, pacoteMaisRecente: null });
    expect(r.semPacotes).toBe(false);
    expect(r.totalPacotes).toBe(3);
    expect(r.pacoteMaisRecente).toBeNull();
  });
});
