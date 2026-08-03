export type TipoColecaoContrarius =
  | 'consciencias'
  | 'retrovidas'
  | 'eventos'
  | 'lugares'
  | 'relacoes'
  | 'grupos'
  | 'objetos'
  | 'notas';

export interface NotaContrariusBruta {
  path: string;
  basename: string;
  colecao: TipoColecaoContrarius | null;
  frontmatter: Record<string, unknown>;
  corpo?: string;
}

export interface ContrariusIndexBruto {
  notas: NotaContrariusBruta[];
}

// Campos confirmados por levantamento no Vault real em 2026-07-13 (ver CLAUDE.md).
// Uma Consciência não tem nome próprio no frontmatter: o(s) nome(s) vivem em cada Retrovida (`nomes`).
export interface Consciencia {
  path: string;
  id?: string;
  ident_extraf?: string;
  historicidade?: string;
  // Uma consciência pode pertencer a vários grupos cármicos ao mesmo tempo — array, não valor único.
  // Sem nota dedicada por grupo: o agrupamento é por valor compartilhado (ver agrupamento.ts).
  grupocarma?: string[];
  metadata: Record<string, unknown>;
}

export interface Retrovida {
  path: string;
  consciencia?: string;
  vida?: string;
  nomes?: string[];
  nascimento?: string;
  morte?: string;
  livro?: string;
  periodo?: string[];
  nucleo_geo?: string[];
  mov_historico?: string[];
  historicidade?: string;
  holopensenes?: string[];
  religiao?: string[];
  grupocarma?: string[];
  metadata: Record<string, unknown>;
}

export interface Evento {
  path: string;
  num_reg?: string;
  titulo?: string;
  local?: string[];
  periodo?: string[];
  nucleo_geo?: string[];
  livro?: string;
  retrovidas?: string[];
  holopensenes?: string[];
  religiao?: string;
  mov_historico?: string[];
  eventos_anteriores?: string[];
  eventos_posteriores?: string[];
  // Posição da cena no manuscrito — número de sequência puro (1, 2, 3...), SEM relação com nenhum ano
  // de calendário (nem o ano histórico do evento, nem o ano de uma eventual cena de "moldura" no
  // presente — ver CLAUDE.md, decisão de 2026-07-14). `num_reg`/título/nome do arquivo ficam fixos ao
  // reordenar; só este campo muda. Usar o botão "Renumerar ordem narrativa" do Dashboard pra manter
  // sequencial sem buracos depois de reordenar manualmente. Cronológica (data histórica) = `data_inicio`.
  ano_ordem?: string;
  data_inicio?: string;
  data_fim?: string;
  data_textual?: string;
  metadata: Record<string, unknown>;
}

export interface Lugar {
  path: string;
  num_reg?: string;
  nome_atual?: string;
  // Nomes alternativos/históricos vivem em `aliases` (migrado de `nomes_variantes`, que era subconjunto
  // redundante). Nomes históricos POR PERÍODO continuam soltos numa tabela no corpo da nota — decisão de
  // não estruturar isso ainda (ver CLAUDE.md).
  coordenadas?: string;
  nucleo_geo?: string[];
  livros?: string[];
  metadata: Record<string, unknown>;
}

export interface Relacao {
  path: string;
  metadata: Record<string, unknown>;
}

export interface ContrariusIndex {
  consciencias: Consciencia[];
  retrovidas: Retrovida[];
  eventos: Evento[];
  lugares: Lugar[];
  relacoes: Relacao[];
}

export type SeveridadeAlertaContrarius = 'erro' | 'aviso' | 'info';

export interface AlertaContrarius {
  severidade: SeveridadeAlertaContrarius;
  path: string;
  campo?: string;
  mensagem: string;
}

export interface ResultadoNormalizacao<T> {
  entidade: T;
  alertas: AlertaContrarius[];
}
