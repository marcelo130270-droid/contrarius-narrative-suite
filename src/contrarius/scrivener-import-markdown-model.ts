import type { ManifestoScrivener } from './scrivener-package-manifest';
import type { ItemPayloadScrivener, PayloadScrivener, TipoItemPayloadScrivener } from './scrivener-package-payload-model';

export interface ArquivoImportacaoMarkdownScrivener {
    caminhoRelativo: string;
    conteudo: string;
    tamanhoCaracteres: number;
}

const ORDEM_TIPOS: readonly TipoItemPayloadScrivener[] = [
    'consciencia', 'retrovida', 'evento', 'lugar', 'relacao', 'grupo', 'objeto', 'nota',
];

const ROTULOS_SECAO: Record<TipoItemPayloadScrivener, string> = {
    consciencia: 'Consciências',
    retrovida: 'Retrovidas',
    evento: 'Eventos',
    lugar: 'Lugares',
    relacao: 'Relações',
    grupo: 'Grupos',
    objeto: 'Objetos',
    nota: 'Notas',
};

function anchorParaRotulo(rotulo: string): string {
    return '#' + rotulo.toLowerCase().replace(/\s+/g, '-');
}

function ordenarItensImportacao(itens: readonly ItemPayloadScrivener[]): ItemPayloadScrivener[] {
    return [...itens].sort((a, b) => {
        const tipoA = ORDEM_TIPOS.indexOf(a.tipo);
        const tipoB = ORDEM_TIPOS.indexOf(b.tipo);
        if (tipoA !== tipoB) return tipoA - tipoB;

        const aN = a.ordemNarrativa ?? Infinity;
        const bN = b.ordemNarrativa ?? Infinity;
        if (aN !== bN) return aN - bN;

        const aC = a.ordemCronologica ?? Infinity;
        const bC = b.ordemCronologica ?? Infinity;
        if (aC !== bC) return aC - bC;

        const tituloComp = a.titulo.localeCompare(b.titulo);
        if (tituloComp !== 0) return tituloComp;

        return a.id.localeCompare(b.id);
    });
}

export function criarArquivoImportacaoMarkdownScrivener(
    payload: PayloadScrivener,
    manifesto?: ManifestoScrivener,
): ArquivoImportacaoMarkdownScrivener {
    const linhas: string[] = [];

    linhas.push('# Contrarius Scrivener Import');
    linhas.push('');
    linhas.push('## Resumo');
    linhas.push('');
    if (manifesto?.origemVault) linhas.push(`- **Vault:** ${manifesto.origemVault}`);
    linhas.push(`- **Total de itens:** ${payload.totalItens}`);
    if (payload.geradoEm) linhas.push(`- **Data de criação:** ${payload.geradoEm}`);
    linhas.push('');

    const itensOrdenados = ordenarItensImportacao(payload.itens);

    const porTipo = new Map<TipoItemPayloadScrivener, ItemPayloadScrivener[]>();
    for (const tipo of ORDEM_TIPOS) {
        const itensDoTipo = itensOrdenados.filter(i => i.tipo === tipo);
        if (itensDoTipo.length > 0) {
            porTipo.set(tipo, itensDoTipo);
        }
    }

    const tiposPresentes = ORDEM_TIPOS.filter(t => porTipo.has(t));

    if (tiposPresentes.length > 0) {
        linhas.push('## Índice');
        linhas.push('');
        for (const tipo of tiposPresentes) {
            const rotulo = ROTULOS_SECAO[tipo];
            linhas.push(`- [${rotulo}](${anchorParaRotulo(rotulo)})`);
        }
        linhas.push('');

        for (const tipo of tiposPresentes) {
            const rotulo = ROTULOS_SECAO[tipo];
            const itens = porTipo.get(tipo)!;
            linhas.push(`## ${rotulo}`);
            linhas.push('');
            for (const item of itens) {
                linhas.push(`### ${item.titulo}`);
                linhas.push('');
                linhas.push(`- ID: ${item.id}`);
                linhas.push(`- Tipo: ${item.tipo}`);
                if (item.caminhoFonte) linhas.push(`- Fonte: ${item.caminhoFonte}`);
                if (item.livro) linhas.push(`- Livro: ${item.livro}`);
                if (item.periodo) linhas.push(`- Período: ${item.periodo}`);
                if (item.tags && item.tags.length > 0) {
                    linhas.push(`- Tags: ${item.tags.join(', ')}`);
                }
                if (item.metadata && Object.keys(item.metadata).length > 0) {
                    linhas.push('');
                    linhas.push('```json');
                    linhas.push(JSON.stringify(item.metadata, null, 2));
                    linhas.push('```');
                }
                linhas.push('');
            }
        }
    }

    const conteudo = linhas.join('\n');
    return {
        caminhoRelativo: 'scrivener-import.md',
        conteudo,
        tamanhoCaracteres: conteudo.length,
    };
}
