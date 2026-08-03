import type { IndiceContrarius } from './indexer';
import { ordenarEventosParaTimeline, rotuloEvento, type ModoOrdenacaoTimeline } from './timeline';
import {
  blocoConsciencia,
  blocoEvento,
  blocoLugar,
  blocoRelacao,
  blocoRetrovida,
} from './scrivener-export-minimo';
import { CAMPOS_AGRUPAVEIS, rotuloEntidade } from './agrupamento';

function linhaIndice(rotulo: string, path: string): string {
  return `- [${rotulo}](${path})`;
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
  for (const e of indice.eventos) linhas.push(linhaIndice(rotuloEvento(e), e.path));
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

// Etapa 14, sub-fase 3: dossiê por tipo — um arquivo por coleção, com todos os campos detalhados
// (não só o link do índice). Reaproveita os mesmos blocos por entidade da Etapa 11
// (scrivener-export-minimo.ts), só reorganizados um tipo por arquivo em vez de tudo junto.
function cabecalhoDossie(titulo: string, geradoEm: Date): string[] {
  return [`# ${titulo}`, '', `Gerado em: ${geradoEm.toISOString()}`, ''];
}

export function gerarDossieConsciencias(indice: IndiceContrarius, geradoEm: Date = new Date()): string {
  const linhas = cabecalhoDossie('Contrarius — Dossiê de Consciências', geradoEm);
  for (const c of indice.consciencias) linhas.push(...blocoConsciencia(c));
  return linhas.join('\n');
}

export function gerarDossieRetrovidas(indice: IndiceContrarius, geradoEm: Date = new Date()): string {
  const linhas = cabecalhoDossie('Contrarius — Dossiê de Retrovidas', geradoEm);
  for (const r of indice.retrovidas) linhas.push(...blocoRetrovida(r));
  return linhas.join('\n');
}

export function gerarDossieEventos(indice: IndiceContrarius, geradoEm: Date = new Date()): string {
  const linhas = cabecalhoDossie('Contrarius — Dossiê de Eventos', geradoEm);
  for (const e of indice.eventos) linhas.push(...blocoEvento(e));
  return linhas.join('\n');
}

export function gerarDossieLugares(indice: IndiceContrarius, geradoEm: Date = new Date()): string {
  const linhas = cabecalhoDossie('Contrarius — Dossiê de Lugares', geradoEm);
  for (const l of indice.lugares) linhas.push(...blocoLugar(l));
  return linhas.join('\n');
}

export function gerarDossieRelacoes(indice: IndiceContrarius, geradoEm: Date = new Date()): string {
  const linhas = cabecalhoDossie('Contrarius — Dossiê de Relações', geradoEm);
  indice.relacoes.forEach((r, i) => linhas.push(...blocoRelacao(r, i)));
  return linhas.join('\n');
}

// Etapa 14, sub-fase 4 (última): índices por livro/período. Reaproveita o mesmo registro
// CAMPOS_AGRUPAVEIS já usado no Dashboard (Visões) — não duplica a lógica de agrupamento pela terceira vez.
function gerarIndicePorCampo(indice: IndiceContrarius, chaveCampo: string, titulo: string, geradoEm: Date): string {
  const campo = CAMPOS_AGRUPAVEIS.find((c) => c.chave === chaveCampo);
  const linhas = cabecalhoDossie(titulo, geradoEm);
  if (!campo) return linhas.join('\n');

  const mapa = campo.extrair(indice);
  const chaves = [...mapa.keys()].sort((a, b) => a.localeCompare(b));
  for (const chave of chaves) {
    linhas.push(`## ${chave}`);
    linhas.push('');
    const itens = [...(mapa.get(chave) ?? [])].sort((a, b) => rotuloEntidade(a).localeCompare(rotuloEntidade(b)));
    for (const item of itens) linhas.push(linhaIndice(rotuloEntidade(item), item.path));
    linhas.push('');
  }
  return linhas.join('\n');
}

export function gerarIndicePorLivro(indice: IndiceContrarius, geradoEm: Date = new Date()): string {
  return gerarIndicePorCampo(indice, 'livro', 'Contrarius — Índice por livro', geradoEm);
}

export function gerarIndicePorPeriodo(indice: IndiceContrarius, geradoEm: Date = new Date()): string {
  return gerarIndicePorCampo(indice, 'periodo', 'Contrarius — Índice por período', geradoEm);
}
