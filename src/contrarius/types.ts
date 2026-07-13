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
  grupocarma?: string;
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
  metadata: Record<string, unknown>;
}

export interface Evento {
  path: string;
  codigo?: string;
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
  metadata: Record<string, unknown>;
}

export interface Lugar {
  path: string;
  codigo?: string;
  nome_atual?: string;
  nomes_historicos?: string[];
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
