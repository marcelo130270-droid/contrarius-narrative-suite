import type { ItemPayloadScrivener, PayloadScrivener, TipoItemPayloadScrivener } from './scrivener-package-payload-model';

export interface ArquivoEstruturadoScrivener {
    caminhoRelativo: string;
    conteudo: string;
    tamanhoCaracteres: number;
}

const ORDEM_TIPOS: readonly TipoItemPayloadScrivener[] = [
    'consciencia', 'retrovida', 'evento', 'lugar', 'relacao', 'grupo', 'objeto', 'nota',
];

const ROTULOS_DOSSIE: Record<TipoItemPayloadScrivener, string> = {
    consciencia: 'Consciências',
    retrovida: 'Retrovidas',
    evento: 'Eventos',
    lugar: 'Lugares',
    relacao: 'Relações',
    grupo: 'Grupos',
    objeto: 'Objetos',
    nota: 'Notas',
};

const SLUGS_DOSSIE: Record<TipoItemPayloadScrivener, string> = {
    consciencia: 'consciencias',
    retrovida: 'retrovidas',
    evento: 'eventos',
    lugar: 'lugares',
    relacao: 'relacoes',
    grupo: 'grupos',
    objeto: 'objetos',
    nota: 'notas',
};

function criarArquivo(caminhoRelativo: string, linhas: string[]): ArquivoEstruturadoScrivener {
    const conteudo = linhas.join('\n');
    return { caminhoRelativo, conteudo, tamanhoCaracteres: conteudo.length };
}

function extrairDataCronologica(item: ItemPayloadScrivener): string {
    const meta = item.metadata ?? {};
    for (const campo of ['data', 'data_inicio', 'nascimento', 'data_fim', 'morte']) {
        const val = meta[campo];
        if (val !== undefined && val !== null) return String(val);
    }
    return '';
}

function compararBaseChaveCronologica(a: ItemPayloadScrivener, b: ItemPayloadScrivener): number {
    const aCron = a.ordemCronologica ?? Infinity;
    const bCron = b.ordemCronologica ?? Infinity;
    if (aCron !== bCron) return aCron - bCron;

    const aData = extrairDataCronologica(a);
    const bData = extrairDataCronologica(b);
    return aData.localeCompare(bData);
}

function compararEventos(a: ItemPayloadScrivener, b: ItemPayloadScrivener): number {
    const base = compararBaseChaveCronologica(a, b);
    if (base !== 0) return base;

    const tituloComp = a.titulo.localeCompare(b.titulo);
    if (tituloComp !== 0) return tituloComp;

    return a.id.localeCompare(b.id);
}

function compararCronologia(a: ItemPayloadScrivener, b: ItemPayloadScrivener): number {
    const base = compararBaseChaveCronologica(a, b);
    if (base !== 0) return base;

    const tipoComp = a.tipo.localeCompare(b.tipo);
    if (tipoComp !== 0) return tipoComp;

    const tituloComp = a.titulo.localeCompare(b.titulo);
    if (tituloComp !== 0) return tituloComp;

    return a.id.localeCompare(b.id);
}

function temCampoCronologico(item: ItemPayloadScrivener): boolean {
    if (item.ordemCronologica !== undefined) return true;
    const meta = item.metadata ?? {};
    return ['data', 'data_inicio', 'data_fim', 'nascimento', 'morte'].some(k => meta[k] !== undefined);
}

function criarDossie(tipo: TipoItemPayloadScrivener, itens: ItemPayloadScrivener[]): ArquivoEstruturadoScrivener {
    const rotulo = ROTULOS_DOSSIE[tipo];
    const slug = SLUGS_DOSSIE[tipo];
    const linhas: string[] = [];

    linhas.push(`# Dossiê — ${rotulo}`);
    linhas.push('');
    linhas.push(`Total: ${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`);
    linhas.push('');

    for (const item of itens) {
        linhas.push(`## ${item.titulo}`);
        linhas.push('');
        linhas.push(`- ID: ${item.id}`);
        linhas.push(`- Tipo: ${item.tipo}`);
        if (item.caminhoFonte) linhas.push(`- Fonte: ${item.caminhoFonte}`);
        if (item.livro) linhas.push(`- Livro: ${item.livro}`);
        if (item.periodo) linhas.push(`- Período: ${item.periodo}`);
        if (item.tags && item.tags.length > 0) linhas.push(`- Tags: ${item.tags.join(', ')}`);
        if (item.metadata && Object.keys(item.metadata).length > 0) {
            linhas.push('');
            linhas.push('```json');
            linhas.push(JSON.stringify(item.metadata, null, 2));
            linhas.push('```');
        }
        linhas.push('');
    }

    return criarArquivo(`scrivener/dossier/${slug}.md`, linhas);
}

function criarTimelineEventos(itens: readonly ItemPayloadScrivener[]): ArquivoEstruturadoScrivener {
    const linhas: string[] = [];
    linhas.push('# Timeline — Eventos');
    linhas.push('');

    const eventos = itens.filter(i => i.tipo === 'evento');

    if (eventos.length === 0) {
        linhas.push('_Nenhum evento registrado._');
        linhas.push('');
    } else {
        const ordenados = [...eventos].sort(compararEventos);
        for (const item of ordenados) {
            linhas.push(`## ${item.titulo}`);
            linhas.push('');
            linhas.push(`- ID: ${item.id}`);
            if (item.caminhoFonte) linhas.push(`- Fonte: ${item.caminhoFonte}`);
            if (item.livro) linhas.push(`- Livro: ${item.livro}`);
            if (item.periodo) linhas.push(`- Período: ${item.periodo}`);
            linhas.push('');
        }
    }

    return criarArquivo('scrivener/timeline/eventos.md', linhas);
}

function criarTimelineCronologia(itens: readonly ItemPayloadScrivener[]): ArquivoEstruturadoScrivener {
    const linhas: string[] = [];
    linhas.push('# Timeline — Cronologia geral');
    linhas.push('');

    const comCampos = itens.filter(temCampoCronologico);

    if (comCampos.length === 0) {
        linhas.push('_Nenhum item com dados cronológicos registrado._');
        linhas.push('');
    } else {
        const ordenados = [...comCampos].sort(compararCronologia);
        for (const item of ordenados) {
            linhas.push(`## ${item.titulo}`);
            linhas.push('');
            linhas.push(`- ID: ${item.id}`);
            linhas.push(`- Tipo: ${item.tipo}`);
            if (item.caminhoFonte) linhas.push(`- Fonte: ${item.caminhoFonte}`);
            if (item.livro) linhas.push(`- Livro: ${item.livro}`);
            if (item.periodo) linhas.push(`- Período: ${item.periodo}`);
            linhas.push('');
        }
    }

    return criarArquivo('scrivener/timeline/cronologia.md', linhas);
}

function criarIndexEstruturado(
    payload: PayloadScrivener,
    tiposComItens: readonly TipoItemPayloadScrivener[],
): ArquivoEstruturadoScrivener {
    const linhas: string[] = [];
    linhas.push('# Contrarius Scrivener Workspace');
    linhas.push('');
    linhas.push('[Scrivener import](../scrivener-import.md)');
    linhas.push('');
    linhas.push('## Resumo do payload');
    linhas.push('');
    linhas.push(`- **Total de itens:** ${payload.totalItens}`);
    linhas.push(`- **Gerado em:** ${payload.geradoEm}`);
    linhas.push('');

    if (tiposComItens.length > 0) {
        linhas.push('## Dossiês');
        linhas.push('');
        for (const tipo of tiposComItens) {
            linhas.push(`- [${ROTULOS_DOSSIE[tipo]}](dossier/${SLUGS_DOSSIE[tipo]}.md)`);
        }
        linhas.push('');
    }

    linhas.push('## Timeline');
    linhas.push('');
    linhas.push('- [Eventos](timeline/eventos.md)');
    linhas.push('- [Cronologia geral](timeline/cronologia.md)');
    linhas.push('');

    return criarArquivo('scrivener/index.md', linhas);
}

export function criarArquivosEstruturadosScrivener(payload: PayloadScrivener): ArquivoEstruturadoScrivener[] {
    const porTipo = new Map<TipoItemPayloadScrivener, ItemPayloadScrivener[]>();
    for (const tipo of ORDEM_TIPOS) {
        const itensDoTipo = payload.itens.filter(i => i.tipo === tipo);
        if (itensDoTipo.length > 0) {
            porTipo.set(tipo, itensDoTipo);
        }
    }

    const tiposComItens = ORDEM_TIPOS.filter(t => porTipo.has(t));

    const arquivos: ArquivoEstruturadoScrivener[] = [];

    arquivos.push(criarIndexEstruturado(payload, tiposComItens));

    for (const tipo of tiposComItens) {
        arquivos.push(criarDossie(tipo, porTipo.get(tipo)!));
    }

    arquivos.push(criarTimelineEventos(payload.itens));
    arquivos.push(criarTimelineCronologia(payload.itens));

    return arquivos;
}
