import type {
  ArquivoMarkdownContrariusLike,
  MetadataCacheContrariusLike,
  OpcoesLeituraVaultContrarius,
  VaultContrariusLike,
} from './reader';
import { lerVaultContrarius } from './reader';
import { normalizarConsciencia } from './entities/consciencia';
import { normalizarRetrovida } from './entities/retrovida';
import { normalizarEvento } from './entities/evento';
import { normalizarLugar } from './entities/lugar';
import { normalizarRelacao } from './entities/relacao';
import type {
  AlertaContrarius,
  Consciencia,
  Evento,
  Lugar,
  NotaContrariusBruta,
  Relacao,
  Retrovida,
  TipoColecaoContrarius,
} from './types';

export interface IndiceContrarius {
  consciencias: Consciencia[];
  retrovidas: Retrovida[];
  eventos: Evento[];
  lugares: Lugar[];
  relacoes: Relacao[];
  alertas: AlertaContrarius[];
  porId: Map<string, Consciencia | Evento | Lugar>;
  porLivro: Map<string, Array<Retrovida | Evento>>;
  porPeriodo: Map<string, Array<Retrovida | Evento>>;
  porNucleoGeo: Map<string, Array<Retrovida | Evento | Lugar>>;
}

function porCaminho<T extends { path: string }>(a: T, b: T): number {
  return a.path.localeCompare(b.path);
}

function agruparPorCampo<T>(itens: readonly T[], obterChaves: (item: T) => string | string[] | undefined): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const item of itens) {
    const bruto = obterChaves(item);
    const chaves = Array.isArray(bruto) ? bruto : bruto ? [bruto] : [];
    for (const chave of chaves) {
      const atual = mapa.get(chave);
      if (atual) atual.push(item);
      else mapa.set(chave, [item]);
    }
  }
  return mapa;
}

function notasDaColecao(notas: readonly NotaContrariusBruta[], colecao: TipoColecaoContrarius): NotaContrariusBruta[] {
  return notas.filter((nota) => nota.colecao === colecao).sort(porCaminho);
}

export async function indexarVaultContrarius<TArquivo extends ArquivoMarkdownContrariusLike>(
  vault: VaultContrariusLike<TArquivo>,
  metadataCache: MetadataCacheContrariusLike<TArquivo>,
  opcoes?: OpcoesLeituraVaultContrarius,
): Promise<IndiceContrarius> {
  const bruto = await lerVaultContrarius(vault, metadataCache, opcoes);

  const alertas: AlertaContrarius[] = [];
  const consciencias: Consciencia[] = [];
  const retrovidas: Retrovida[] = [];
  const eventos: Evento[] = [];
  const lugares: Lugar[] = [];
  const relacoes: Relacao[] = [];

  for (const nota of notasDaColecao(bruto.notas, 'consciencias')) {
    const resultado = normalizarConsciencia(nota);
    consciencias.push(resultado.entidade);
    alertas.push(...resultado.alertas);
  }
  for (const nota of notasDaColecao(bruto.notas, 'retrovidas')) {
    const resultado = normalizarRetrovida(nota);
    retrovidas.push(resultado.entidade);
    alertas.push(...resultado.alertas);
  }
  for (const nota of notasDaColecao(bruto.notas, 'eventos')) {
    const resultado = normalizarEvento(nota);
    eventos.push(resultado.entidade);
    alertas.push(...resultado.alertas);
  }
  for (const nota of notasDaColecao(bruto.notas, 'lugares')) {
    const resultado = normalizarLugar(nota);
    lugares.push(resultado.entidade);
    alertas.push(...resultado.alertas);
  }
  for (const nota of notasDaColecao(bruto.notas, 'relacoes')) {
    const resultado = normalizarRelacao(nota);
    relacoes.push(resultado.entidade);
    alertas.push(...resultado.alertas);
  }

  const porId = new Map<string, Consciencia | Evento | Lugar>();
  for (const consciencia of consciencias) if (consciencia.id) porId.set(consciencia.id, consciencia);
  for (const evento of eventos) if (evento.codigo) porId.set(evento.codigo, evento);
  for (const lugar of lugares) if (lugar.codigo) porId.set(lugar.codigo, lugar);

  const porLivro = agruparPorCampo<Retrovida | Evento>([...retrovidas, ...eventos], (item) => item.livro);
  const porPeriodo = agruparPorCampo<Retrovida | Evento>([...retrovidas, ...eventos], (item) => item.periodo);
  const porNucleoGeo = agruparPorCampo<Retrovida | Evento | Lugar>(
    [...retrovidas, ...eventos, ...lugares],
    (item) => item.nucleo_geo,
  );

  return { consciencias, retrovidas, eventos, lugares, relacoes, alertas, porId, porLivro, porPeriodo, porNucleoGeo };
}
