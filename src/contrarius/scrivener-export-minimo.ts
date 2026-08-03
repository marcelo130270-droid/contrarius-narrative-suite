import type { IndiceContrarius } from './indexer';
import type { Consciencia, Evento, Lugar, Relacao, Retrovida } from './types';

function linha(rotulo: string, valor: string | undefined): string | null {
  if (!valor) return null;
  return `- **${rotulo}:** ${valor}`;
}

function linhaArray(rotulo: string, valores: string[] | undefined): string | null {
  if (!valores || valores.length === 0) return null;
  return `- **${rotulo}:** ${valores.join(', ')}`;
}

export function blocoConsciencia(c: Consciencia): string[] {
  return [
    `### ${c.id ?? '(sem id)'}`,
    '',
    ...[
      linha('id', c.id),
      linha('ident_extraf', c.ident_extraf),
      linha('historicidade', c.historicidade),
      linhaArray('grupocarma', c.grupocarma),
      linha('Fonte', c.path),
    ].filter((l): l is string => l !== null),
    '',
  ];
}

export function blocoRetrovida(r: Retrovida): string[] {
  const titulo = r.nomes && r.nomes.length > 0 ? r.nomes[0] : '(sem nome)';
  return [
    `### ${titulo}`,
    '',
    ...[
      linha('consciencia', r.consciencia),
      linha('vida', r.vida),
      linhaArray('nomes', r.nomes),
      linha('nascimento', r.nascimento),
      linha('morte', r.morte),
      linha('livro', r.livro),
      linhaArray('periodo', r.periodo),
      linhaArray('nucleo_geo', r.nucleo_geo),
      linha('historicidade', r.historicidade),
      linhaArray('grupocarma', r.grupocarma),
      linha('Fonte', r.path),
    ].filter((l): l is string => l !== null),
    '',
  ];
}

export function blocoEvento(e: Evento): string[] {
  return [
    `### ${e.titulo ?? e.num_reg ?? '(sem título)'}`,
    '',
    ...[
      linha('num_reg', e.num_reg),
      linha('titulo', e.titulo),
      linhaArray('local', e.local),
      linhaArray('periodo', e.periodo),
      linha('livro', e.livro),
      linhaArray('retrovidas', e.retrovidas),
      linha('data_textual', e.data_textual),
      linha('data_inicio', e.data_inicio),
      linha('ordem_cronologica', e.ordem_cronologica),
      linha('ordem_narrativa', e.ordem_narrativa),
      linha('Fonte', e.path),
    ].filter((l): l is string => l !== null),
    '',
  ];
}

export function blocoLugar(l: Lugar): string[] {
  return [
    `### ${l.nome_atual ?? l.num_reg ?? '(sem nome)'}`,
    '',
    ...[
      linha('num_reg', l.num_reg),
      linha('nome_atual', l.nome_atual),
      linha('coordenadas', l.coordenadas),
      linhaArray('nucleo_geo', l.nucleo_geo),
      linha('Fonte', l.path),
    ].filter((s): s is string => s !== null),
    '',
  ];
}

export function blocoRelacao(r: Relacao, indice: number): string[] {
  const campos = Object.entries(r.metadata)
    .map(([chave, valor]) => linha(chave, typeof valor === 'string' ? valor : JSON.stringify(valor)))
    .filter((l): l is string => l !== null);
  return [`### Relação ${indice + 1}`, '', ...campos, linha('Fonte', r.path)!, ''];
}

export function gerarScrivenerImportMarkdown(indice: IndiceContrarius, geradoEm: Date = new Date()): string {
  const linhas: string[] = [];

  linhas.push('# Contrarius — Exportação para Scrivener');
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

  linhas.push('## Índice por tipo');
  linhas.push('');
  linhas.push('### Consciências');
  for (const c of indice.consciencias) linhas.push(`- ${c.id ?? '(sem id)'}`);
  linhas.push('');
  linhas.push('### Retrovidas');
  for (const r of indice.retrovidas) linhas.push(`- ${r.nomes?.[0] ?? '(sem nome)'}`);
  linhas.push('');
  linhas.push('### Eventos');
  for (const e of indice.eventos) linhas.push(`- ${e.titulo ?? e.num_reg ?? '(sem título)'}`);
  linhas.push('');
  linhas.push('### Lugares');
  for (const l of indice.lugares) linhas.push(`- ${l.nome_atual ?? l.num_reg ?? '(sem nome)'}`);
  linhas.push('');

  linhas.push('## Consciências');
  linhas.push('');
  for (const c of indice.consciencias) linhas.push(...blocoConsciencia(c));

  linhas.push('## Retrovidas');
  linhas.push('');
  for (const r of indice.retrovidas) linhas.push(...blocoRetrovida(r));

  linhas.push('## Eventos');
  linhas.push('');
  for (const e of indice.eventos) linhas.push(...blocoEvento(e));

  linhas.push('## Lugares');
  linhas.push('');
  for (const l of indice.lugares) linhas.push(...blocoLugar(l));

  linhas.push('## Relações');
  linhas.push('');
  indice.relacoes.forEach((r, i) => linhas.push(...blocoRelacao(r, i)));

  return linhas.join('\n');
}
