export type ContrariusTipoEntidade =
  | "consciencia"
  | "retrovida"
  | "evento"
  | "lugar"
  | "relacao";

export interface IndexError {
  filePath: string;
  mensagem: string;
  campo?: string;
}

export interface ContrariusBase {
  filePath: string;
  tipoEntidade: ContrariusTipoEntidade;
  /** Frontmatter preservado integralmente antes de qualquer normalização. */
  frontmatterRaw: Readonly<Record<string, unknown>>;
  /** Campos presentes no frontmatter que não foram mapeados para nenhum campo tipado. */
  camposDesconhecidos: Readonly<Record<string, unknown>>;
  avisos: readonly string[];
}

export interface Consciencia extends ContrariusBase {
  tipoEntidade: "consciencia";
  /** Basename do arquivo .md sem extensão — identificador estável de sistema. */
  id: string;
  nome: string;
  identExtraf: string;
  nucleoGeo: readonly string[];
  religiao: readonly string[];
  holopensenes: readonly string[];
  grupocarma: readonly string[];
  reaparece: boolean;
}

export interface Retrovida extends ContrariusBase {
  tipoEntidade: "retrovida";
  /** Basename do arquivo .md sem extensão — identificador estável de sistema. */
  id: string;
  conscId: string;
  vida: string;
  nomes: readonly string[];
  nascimento: number | null;
  morte: number | null;
  livro: readonly string[];
  periodo: readonly string[];
  nucleoGeo: readonly string[];
  movHistorico: readonly string[];
  pov: string;
  holopensenes: readonly string[];
  religiao: readonly string[];
  classeSocial: readonly string[];
}

/** Fase 1A: apenas Consciencia e Retrovida indexadas; eventos/lugares/relacoes serão acrescentados nas fases seguintes. */
export interface ContrariusIndex {
  consciencias: readonly Consciencia[];
  retrovidas: readonly Retrovida[];
  erros: readonly IndexError[];
}
