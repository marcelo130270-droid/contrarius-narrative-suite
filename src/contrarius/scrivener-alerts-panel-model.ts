export type NivelAlertaScrivener = 'erro' | 'aviso' | 'info';

export type CodigoAlertaScrivener =
  | 'SEM_PACOTES'
  | 'MANIFESTO_INVALIDO'
  | 'APLICACAO_ERRO'
  | 'RESTAURACAO_ERRO'
  | 'APLICACAO_BLOQUEADA'
  | 'RESTAURACAO_BLOQUEADA'
  | 'APLICACAO_NAO_AUDITADA'
  | 'RESTAURACAO_NAO_AUDITADA'
  | 'SEM_BACKUP_APLICACAO'
  | 'SEM_BACKUP_RESTAURACAO'
  | 'MANIFESTO_COM_PROBLEMAS';

export interface AlertaScrivener {
  readonly codigo: CodigoAlertaScrivener;
  readonly nivel: NivelAlertaScrivener;
}

export interface ContagensAlertasScrivener {
  readonly erros: number;
  readonly avisos: number;
  readonly infos: number;
  readonly total: number;
}

export interface ResultadoAlertasScrivener {
  readonly alertas: ReadonlyArray<AlertaScrivener>;
  readonly semAlertas: boolean;
  readonly contagens: ContagensAlertasScrivener;
}

export type StatusOperacaoScrivener = 'ok' | 'erro' | 'bloqueada';

export interface EstadoOperacaoScrivener {
  readonly status?: StatusOperacaoScrivener;
  readonly auditada?: boolean;
  readonly precisaBackup?: boolean;
  readonly temBackup?: boolean;
}

export interface EstadoManifestoScrivener {
  readonly valido?: boolean;
  readonly comProblemas?: boolean;
}

export interface EstadoPacoteScrivener {
  readonly manifesto?: EstadoManifestoScrivener;
  readonly aplicacao?: EstadoOperacaoScrivener;
  readonly restauracao?: EstadoOperacaoScrivener;
}

export interface EstadoPainelScrivener {
  readonly pacotes?: ReadonlyArray<EstadoPacoteScrivener>;
}

function criarAlerta(codigo: CodigoAlertaScrivener, nivel: NivelAlertaScrivener): AlertaScrivener {
  return Object.freeze({ codigo, nivel });
}

function contarAlertas(alertas: ReadonlyArray<AlertaScrivener>): ContagensAlertasScrivener {
  const erros = alertas.filter((alerta) => alerta.nivel === 'erro').length;
  const avisos = alertas.filter((alerta) => alerta.nivel === 'aviso').length;
  const infos = alertas.filter((alerta) => alerta.nivel === 'info').length;

  return Object.freeze({
    erros,
    avisos,
    infos,
    total: alertas.length,
  });
}

function criarResultado(alertasEntrada: ReadonlyArray<AlertaScrivener>): ResultadoAlertasScrivener {
  const alertas = Object.freeze([...alertasEntrada]);

  return Object.freeze({
    alertas,
    semAlertas: alertas.length === 0,
    contagens: contarAlertas(alertas),
  });
}

function avaliarOperacao(
  operacao: EstadoOperacaoScrivener | undefined,
  codigoErro: CodigoAlertaScrivener,
  codigoBloqueada: CodigoAlertaScrivener,
  codigoNaoAuditada: CodigoAlertaScrivener,
  codigoSemBackup: CodigoAlertaScrivener,
): AlertaScrivener[] {
  if (!operacao) {
    return [];
  }

  const alertas: AlertaScrivener[] = [];

  if (operacao.status === 'erro') {
    alertas.push(criarAlerta(codigoErro, 'erro'));
  }

  if (operacao.status === 'bloqueada') {
    alertas.push(criarAlerta(codigoBloqueada, 'aviso'));
  }

  if (operacao.auditada === false) {
    alertas.push(criarAlerta(codigoNaoAuditada, 'aviso'));
  }

  if (operacao.precisaBackup === true && operacao.temBackup !== true) {
    alertas.push(criarAlerta(codigoSemBackup, 'aviso'));
  }

  return alertas;
}

export function gerarAlertasScrivener(status: EstadoPainelScrivener | undefined | null): ResultadoAlertasScrivener {
  const pacotes = status?.pacotes ?? [];

  if (pacotes.length === 0) {
    return criarResultado([criarAlerta('SEM_PACOTES', 'info')]);
  }

  const pacoteMaisRecente = pacotes[pacotes.length - 1];
  const manifesto = pacoteMaisRecente.manifesto;
  const alertas: AlertaScrivener[] = [];

  if (manifesto?.valido === false) {
    return criarResultado([criarAlerta('MANIFESTO_INVALIDO', 'erro')]);
  }

  if (manifesto?.comProblemas === true) {
    alertas.push(criarAlerta('MANIFESTO_COM_PROBLEMAS', 'aviso'));
  }

  alertas.push(
    ...avaliarOperacao(
      pacoteMaisRecente.aplicacao,
      'APLICACAO_ERRO',
      'APLICACAO_BLOQUEADA',
      'APLICACAO_NAO_AUDITADA',
      'SEM_BACKUP_APLICACAO',
    ),
  );

  alertas.push(
    ...avaliarOperacao(
      pacoteMaisRecente.restauracao,
      'RESTAURACAO_ERRO',
      'RESTAURACAO_BLOQUEADA',
      'RESTAURACAO_NAO_AUDITADA',
      'SEM_BACKUP_RESTAURACAO',
    ),
  );

  return criarResultado(alertas);
}
