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

export interface Consciencia {
  path: string;
  id?: string;
  nome?: string;
  ident_extraf?: string;
  nucleo_geo?: string[];
  religiao?: string;
  holopensenes?: string[];
  grupocarma?: string;
  reaparece?: boolean;
  metadata: Record<string, unknown>;
}

export interface Retrovida {
  path: string;
  consc_id?: string;
  vida?: string;
  nascimento?: string;
  morte?: string;
  livro?: string;
  periodo?: string;
  nucleo_geo?: string[];
  mov_historico?: string;
  pov?: 'real' | 'lendário' | 'fictício' | string;
  holopensenes?: string[];
  religiao?: string;
  metadata: Record<string, unknown>;
}

export interface Evento {
  path: string;
  id_evento?: string;
  local?: string;
  data?: string;
  periodo?: string;
  nucleo_geo?: string[];
  livro?: string;
  participantes?: string[];
  holopensenes?: string[];
  religiao?: string;
  mov_historico?: string;
  eventos_anteriores?: string[];
  eventos_posteriores?: string[];
  metadata: Record<string, unknown>;
}

export interface Lugar {
  path: string;
  id_lugar?: string;
  nome_atual?: string;
  nomes_historicos?: string[];
  coordenadas?: string;
  nucleo_geo?: string;
  periodo?: string;
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
