import type { IndiceContrarius } from './indexer';
import type { AlertaContrarius } from './types';

function detectarIdsDuplicados(indice: IndiceContrarius): AlertaContrarius[] {
  const ocorrencias = new Map<string, string[]>();
  const registrar = (id: string | undefined, path: string) => {
    if (!id) return;
    const atual = ocorrencias.get(id);
    if (atual) atual.push(path);
    else ocorrencias.set(id, [path]);
  };

  for (const consciencia of indice.consciencias) registrar(consciencia.id, consciencia.path);
  for (const evento of indice.eventos) registrar(evento.id_evento, evento.path);
  for (const lugar of indice.lugares) registrar(lugar.id_lugar, lugar.path);

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

function validarConscIdDeRetrovidas(indice: IndiceContrarius): AlertaContrarius[] {
  const idsConsciencias = new Set(indice.consciencias.map((c) => c.id).filter((id): id is string => !!id));
  const alertas: AlertaContrarius[] = [];
  for (const retrovida of indice.retrovidas) {
    if (retrovida.consc_id && !idsConsciencias.has(retrovida.consc_id)) {
      alertas.push({
        severidade: 'erro',
        path: retrovida.path,
        campo: 'consc_id',
        mensagem: `consc_id "${retrovida.consc_id}" não corresponde a nenhuma consciência existente.`,
      });
    }
  }
  return alertas;
}

function validarParticipantesDeEventos(indice: IndiceContrarius): AlertaContrarius[] {
  const idsConsciencias = new Set(indice.consciencias.map((c) => c.id).filter((id): id is string => !!id));
  const alertas: AlertaContrarius[] = [];
  for (const evento of indice.eventos) {
    for (const participante of evento.participantes ?? []) {
      if (!idsConsciencias.has(participante)) {
        alertas.push({
          severidade: 'erro',
          path: evento.path,
          campo: 'participantes',
          mensagem: `Participante "${participante}" não corresponde a nenhuma consciência existente.`,
        });
      }
    }
  }
  return alertas;
}

function validarLocalDeEventos(indice: IndiceContrarius): AlertaContrarius[] {
  const idsLugares = new Set(indice.lugares.map((l) => l.id_lugar).filter((id): id is string => !!id));
  const alertas: AlertaContrarius[] = [];
  for (const evento of indice.eventos) {
    if (evento.local && /^L-/.test(evento.local) && !idsLugares.has(evento.local)) {
      alertas.push({
        severidade: 'erro',
        path: evento.path,
        campo: 'local',
        mensagem: `local "${evento.local}" não corresponde a nenhum lugar existente.`,
      });
    }
  }
  return alertas;
}

function validarLivroEPeriodo(indice: IndiceContrarius): AlertaContrarius[] {
  const alertas: AlertaContrarius[] = [];
  for (const retrovida of indice.retrovidas) {
    if (!retrovida.livro) alertas.push({ severidade: 'aviso', path: retrovida.path, campo: 'livro', mensagem: 'Retrovida sem livro.' });
    if (!retrovida.periodo) alertas.push({ severidade: 'aviso', path: retrovida.path, campo: 'periodo', mensagem: 'Retrovida sem período.' });
  }
  for (const evento of indice.eventos) {
    if (!evento.livro) alertas.push({ severidade: 'aviso', path: evento.path, campo: 'livro', mensagem: 'Evento sem livro.' });
    if (!evento.periodo) alertas.push({ severidade: 'aviso', path: evento.path, campo: 'periodo', mensagem: 'Evento sem período.' });
  }
  for (const lugar of indice.lugares) {
    if (!lugar.periodo) alertas.push({ severidade: 'aviso', path: lugar.path, campo: 'periodo', mensagem: 'Lugar sem período.' });
  }
  return alertas;
}

export function validarIndiceContrarius(indice: IndiceContrarius): AlertaContrarius[] {
  return [
    ...detectarIdsDuplicados(indice),
    ...validarConscIdDeRetrovidas(indice),
    ...validarParticipantesDeEventos(indice),
    ...validarLocalDeEventos(indice),
    ...validarLivroEPeriodo(indice),
  ];
}
