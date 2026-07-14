import type { IndiceContrarius } from './indexer';
import { ordenarEventosParaTimeline, type ModoOrdenacaoTimeline } from './timeline';
import type { Evento } from './types';

function linhaIndice(rotulo: string, path: string): string {
  return `- [${rotulo}](${path})`;
}

function rotuloEvento(e: Evento): string {
  return e.titulo ?? e.num_reg ?? '(sem título)';
}

// Etapa 14, sub-fase 1: só o índice. Dossiê por tipo e timeline exportável vêm em sub-fases seguintes,
// cada uma validada separadamente — não gerar tudo de uma vez (lição da instabilidade anterior).
export function gerarIndiceEstruturado(indice: IndiceContrarius, geradoEm: Date = new Date()): string {
  const linhas: string[] = [];

  linhas.push('# Contrarius — Índice estruturado');
  linhas.push('');
  linhas.push(`Gerado em: ${geradoEm.toISOString()}`);
  linhas.push('');
  linhas.push('## Resumo');
  linhas.push('');
  linhas.push(`- Consciências: ${indice.consciencias.length}`);
  linhas.push(`- Retrovidas: ${indice.retrovidas.length}`);
  linhas.push(`- Eventos: ${indice.eventos.length}`);
  linhas.push(`- Lugares: ${indice.lugares.length}`);
  linhas.push(`- Relações: ${indice.relacoes.length}`);
  linhas.push('');

  linhas.push('## Consciências');
  linhas.push('');
  for (const c of indice.consciencias) linhas.push(linhaIndice(c.id ?? '(sem id)', c.path));
  linhas.push('');

  linhas.push('## Retrovidas');
  linhas.push('');
  for (const r of indice.retrovidas) linhas.push(linhaIndice(r.nomes?.[0] ?? '(sem nome)', r.path));
  linhas.push('');

  linhas.push('## Eventos');
  linhas.push('');
  for (const e of indice.eventos) linhas.push(linhaIndice(e.titulo ?? e.num_reg ?? '(sem título)', e.path));
  linhas.push('');

  linhas.push('## Lugares');
  linhas.push('');
  for (const l of indice.lugares) linhas.push(linhaIndice(l.nome_atual ?? l.num_reg ?? '(sem nome)', l.path));
  linhas.push('');

  linhas.push('## Relações');
  linhas.push('');
  indice.relacoes.forEach((r, i) => linhas.push(linhaIndice(`Relação ${i + 1}`, r.path)));
  linhas.push('');

  return linhas.join('\n');
}

function gerarTimeline(indice: IndiceContrarius, modo: ModoOrdenacaoTimeline, titulo: string, geradoEm: Date): string {
  const { comData, semData, campoUsado } = ordenarEventosParaTimeline(indice.eventos, modo);
  const linhas: string[] = [];

  linhas.push(`# ${titulo}`);
  linhas.push('');
  linhas.push(`Gerado em: ${geradoEm.toISOString()}`);
  linhas.push('');
  linhas.push(`| ${campoUsado === 'data_inicio' ? 'Data' : 'Ordem'} | Evento | Livro |`);
  linhas.push('| --- | --- | --- |');
  for (const e of comData) {
    linhas.push(`| ${e[campoUsado] ?? ''} | [${rotuloEvento(e)}](${e.path}) | ${e.livro ?? ''} |`);
  }
  linhas.push('');

  if (semData.length > 0) {
    linhas.push(`## Sem ${campoUsado} (não entram na ordenação acima)`);
    linhas.push('');
    for (const e of semData) linhas.push(linhaIndice(rotuloEvento(e), e.path));
    linhas.push('');
  }

  return linhas.join('\n');
}

// Etapa 14, sub-fase 2: timeline exportável. `cronologia.md` = ordem histórica/no mundo (data_inicio);
// `eventos.md` = ordem narrativa, a ordem em que o leitor encontra as cenas (ano_ordem). Reaproveita a
// mesma ordenação já usada no Dashboard (src/contrarius/timeline.ts), sem duplicar a lógica.
export function gerarTimelineCronologica(indice: IndiceContrarius, geradoEm: Date = new Date()): string {
  return gerarTimeline(indice, 'cronologica', 'Contrarius — Timeline cronológica', geradoEm);
}

export function gerarTimelineNarrativa(indice: IndiceContrarius, geradoEm: Date = new Date()): string {
  return gerarTimeline(indice, 'narrativa', 'Contrarius — Timeline narrativa (ordem de leitura)', geradoEm);
}
