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
  for (const evento of indice.eventos) registrar(evento.codigo, evento.path);
  for (const lugar of indice.lugares) registrar(lugar.codigo, lugar.path);

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

export function validarIndiceContrarius(indice: IndiceContrarius): AlertaContrarius[] {
  return [
    ...detectarIdsDuplicados(indice),
    ...validarConscienciaDeRetrovidas(indice),
    ...validarRetrovidasDeEventos(indice),
    ...validarLocalDeEventos(indice),
    ...validarLivroEPeriodo(indice),
  ];
}
