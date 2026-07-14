import type { IndiceContrarius } from './indexer';
import type { AlertaContrarius } from './types';

function basenameDoCaminho(path: string): string {
  const segmento = path.split('/').pop() ?? path;
  return segmento.endsWith('.md') ? segmento.slice(0, -3) : segmento;
}

function detectarIdsDuplicados(indice: IndiceContrarius): AlertaContrarius[] {
  const ocorrencias = new Map<string, string[]>();
  const registrar = (id: string | undefined, path: string) => {
    if (!id) return;
    const atual = ocorrencias.get(id);
    if (atual) atual.push(path);
    else ocorrencias.set(id, [path]);
  };

  for (const consciencia of indice.consciencias) registrar(consciencia.id, consciencia.path);
  for (const evento of indice.eventos) registrar(evento.num_reg, evento.path);
  for (const lugar of indice.lugares) registrar(lugar.num_reg, lugar.path);

  const alertas: AlertaContrarius[] = [];
  for (const [id, paths] of ocorrencias) {
    if (paths.length <= 1) continue;
    for (const path of paths) {
      const outros = paths.filter((p) => p !== path);
      alertas.push({
        severidade: 'erro',
        path,
        campo: 'id',
        mensagem: `ID duplicado "${id}" também usado em: ${outros.join(', ')}.`,
      });
    }
  }
  return alertas;
}

function validarConscienciaDeRetrovidas(indice: IndiceContrarius): AlertaContrarius[] {
  const idsConsciencias = new Set(indice.consciencias.map((c) => c.id).filter((id): id is string => !!id));
  const alertas: AlertaContrarius[] = [];
  for (const retrovida of indice.retrovidas) {
    if (retrovida.consciencia && !idsConsciencias.has(retrovida.consciencia)) {
      alertas.push({
        severidade: 'erro',
        path: retrovida.path,
        campo: 'consciencia',
        mensagem: `consciencia "${retrovida.consciencia}" não corresponde a nenhuma consciência existente.`,
      });
    }
  }
  return alertas;
}

function validarRetrovidasDeEventos(indice: IndiceContrarius): AlertaContrarius[] {
  const basenamesRetrovidas = new Set(indice.retrovidas.map((r) => basenameDoCaminho(r.path)));
  const alertas: AlertaContrarius[] = [];
  for (const evento of indice.eventos) {
    for (const retrovida of evento.retrovidas ?? []) {
      if (!basenamesRetrovidas.has(retrovida)) {
        alertas.push({
          severidade: 'erro',
          path: evento.path,
          campo: 'retrovidas',
          mensagem: `Retrovida referenciada "${retrovida}" não corresponde a nenhuma retrovida existente.`,
        });
      }
    }
  }
  return alertas;
}

function validarLocalDeEventos(indice: IndiceContrarius): AlertaContrarius[] {
  const basenamesLugares = new Set(indice.lugares.map((l) => basenameDoCaminho(l.path)));
  const alertas: AlertaContrarius[] = [];
  for (const evento of indice.eventos) {
    for (const local of evento.local ?? []) {
      if (/^L-/.test(local) && !basenamesLugares.has(local)) {
        alertas.push({
          severidade: 'erro',
          path: evento.path,
          campo: 'local',
          mensagem: `local "${local}" não corresponde a nenhum lugar existente.`,
        });
      }
    }
  }
  return alertas;
}

function validarLivroEPeriodo(indice: IndiceContrarius): AlertaContrarius[] {
  const alertas: AlertaContrarius[] = [];
  for (const retrovida of indice.retrovidas) {
    if (!retrovida.livro) alertas.push({ severidade: 'aviso', path: retrovida.path, campo: 'livro', mensagem: 'Retrovida sem livro.' });
    if (!retrovida.periodo || retrovida.periodo.length === 0) {
      alertas.push({ severidade: 'aviso', path: retrovida.path, campo: 'periodo', mensagem: 'Retrovida sem período.' });
    }
  }
  return alertas;
}

function normalizarGrupocarma(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Distância de Levenshtein clássica (DP), sem dependência externa.
function distanciaLevenshtein(a: string, b: string): number {
  const linhas = a.length + 1;
  const colunas = b.length + 1;
  const dp: number[][] = Array.from({ length: linhas }, () => new Array<number>(colunas).fill(0));
  for (let i = 0; i < linhas; i++) dp[i][0] = i;
  for (let j = 0; j < colunas; j++) dp[0][j] = j;
  for (let i = 1; i < linhas; i++) {
    for (let j = 1; j < colunas; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + custo);
    }
  }
  return dp[a.length][b.length];
}

// Alerta quando dois valores de grupocarma são parecidos mas não idênticos — provável erro de
// digitação que quebraria o agrupamento silenciosamente (não há nota dedicada por grupo pra corrigir).
function detectarGrupocarmaSimilares(indice: IndiceContrarius): AlertaContrarius[] {
  const ocorrencias = new Map<string, string>(); // valor original -> primeiro path que o usa
  for (const consciencia of indice.consciencias) {
    for (const valor of consciencia.grupocarma ?? []) {
      if (!ocorrencias.has(valor)) ocorrencias.set(valor, consciencia.path);
    }
  }
  for (const retrovida of indice.retrovidas) {
    for (const valor of retrovida.grupocarma ?? []) {
      if (!ocorrencias.has(valor)) ocorrencias.set(valor, retrovida.path);
    }
  }

  const valores = [...ocorrencias.keys()];
  const alertas: AlertaContrarius[] = [];
  const paresJaAlertados = new Set<string>();

  for (let i = 0; i < valores.length; i++) {
    for (let j = i + 1; j < valores.length; j++) {
      const a = valores[i];
      const b = valores[j];
      const na = normalizarGrupocarma(a);
      const nb = normalizarGrupocarma(b);
      if (na === nb) continue;
      const distancia = distanciaLevenshtein(na, nb);
      const limiar = Math.ceil(Math.max(na.length, nb.length) * 0.2);
      if (distancia === 0 || distancia > limiar) continue;

      const chavePar = [a, b].sort().join('|');
      if (paresJaAlertados.has(chavePar)) continue;
      paresJaAlertados.add(chavePar);

      alertas.push({
        severidade: 'aviso',
        path: ocorrencias.get(a)!,
        campo: 'grupocarma',
        mensagem: `Grupo cármico "${a}" é parecido com "${b}" (usado em outra nota) — possível erro de digitação.`,
      });
      alertas.push({
        severidade: 'aviso',
        path: ocorrencias.get(b)!,
        campo: 'grupocarma',
        mensagem: `Grupo cármico "${b}" é parecido com "${a}" (usado em outra nota) — possível erro de digitação.`,
      });
    }
  }
  return alertas;
}

export function validarIndiceContrarius(indice: IndiceContrarius): AlertaContrarius[] {
  return [
    ...detectarIdsDuplicados(indice),
    ...validarConscienciaDeRetrovidas(indice),
    ...validarRetrovidasDeEventos(indice),
    ...validarLocalDeEventos(indice),
    ...validarLivroEPeriodo(indice),
    ...detectarGrupocarmaSimilares(indice),
  ];
}
