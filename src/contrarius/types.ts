export type NaturezaConsciencial = "humana" | "pre-humana";

export type ContrariusTipoEntidade =
  | "consciencia"
  | "retrovida"
  | "evento"
  | "lugar"
  | "relacao";

export interface IndexWarning {
  filePath: string;
  mensagem: string;
  campo?: string;
}

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
  naturezaConsciencial: NaturezaConsciencial;
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
  naturezaConsciencial: NaturezaConsciencial;
}

export interface Evento extends ContrariusBase {
  tipoEntidade: "evento";
  /**
   * Identificador do evento.
   * Aliases em ordem de precedência: id_evento → codigo → id → basename do arquivo.
   */
  id: string;
  titulo: string;
  anoOrdem: number | null;
  data: string;
  dataInicio: string;
  dataFim: string;
  dataTextual: string;
  dataAproximada: boolean;
  periodo: readonly string[];
  natureza: string;
  status: string;
  local: readonly string[];
  nucleoGeo: readonly string[];
  participantes: readonly string[];
  retrovidas: readonly string[];
  grupocarma: readonly string[];
  holopensenes: readonly string[];
  religiao: readonly string[];
  movHistorico: readonly string[];
  eventosAnteriores: readonly string[];
  eventosPosteriores: readonly string[];
  ordemNarrativa: number | null;
  capitulo: string;
  cena: string;
  livro: readonly string[];
  fontes: readonly string[];
  tags: readonly string[];
}

export interface Lugar extends ContrariusBase {
  tipoEntidade: "lugar";
  /**
   * Identificador do lugar.
   * Aliases em ordem de precedência: id_lugar → codigo → id → basename do arquivo.
   */
  id: string;
  aliases: readonly string[];
  /**
   * Nome preferido / canônico do lugar.
   * Aliases em ordem de precedência: nome_preferencial_saga → "nome preferido" → nome_preferido → nome_atual.
   */
  nomePreferido: string;
  nomeAtual: string;
  nomesVariantes: readonly string[];
  nomesHistoricos: readonly string[];
  categoriaLugar: readonly string[];
  statusGeografico: string;
  coordenadas: string;
  coordenadasGoogleEarth: string;
  sistemaGeodesico: string;
  nucleoGeo: readonly string[];
  localidadeAtual: string;
  departamentoAtual: string;
  regiaoAtual: string;
  paisAtual: string;
  periodo: readonly string[];
  livros: readonly string[];
  lugaresRelacionados: readonly string[];
  fontes: readonly string[];
  tags: readonly string[];
}

export interface Relacao extends ContrariusBase {
  tipoEntidade: "relacao";
  /**
   * Identificador da relação.
   * Aliases em ordem de precedência: id → basename do arquivo.
   */
  id: string;
  /**
   * Primeira consciência da relação.
   * Normalização futura: primeira propriedade preenchida entre `a` e `consciencia_1`.
   */
  consciencia1: string;
  /**
   * Segunda consciência da relação.
   * Normalização futura: primeira propriedade preenchida entre `b` e `consciencia_2`.
   */
  consciencia2: string;
  tipoRelacao: readonly string[];
  intensidade: string;
  inicio: string;
  fim: string;
  livro: readonly string[];
  estado: string;
  tags: readonly string[];
}

export interface ContrariusIndex {
  consciencias: readonly Consciencia[];
  retrovidas: readonly Retrovida[];
  eventos: readonly Evento[];
  lugares: readonly Lugar[];
  relacoes: readonly Relacao[];
  avisosIndexacao: readonly IndexWarning[];
  erros: readonly IndexError[];
}
