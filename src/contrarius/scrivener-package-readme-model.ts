import type { ManifestoScrivener } from './scrivener-package-manifest';
import type { PayloadScrivener, TipoItemPayloadScrivener } from './scrivener-package-payload-model';
import { criarArquivosMarkdownPayloadScrivener } from './scrivener-payload-markdown-file-model';

export interface ItemIndiceReadmePacoteScrivener {
    id: string;
    tipo: TipoItemPayloadScrivener;
    titulo: string;
    caminhoRelativo: string;
    livro?: string;
    periodo?: string;
}

export interface SecaoContagemReadmePacoteScrivener {
    chave: string;
    total: number;
}

export interface ReadmePacoteScrivener {
    conteudo: string;
    totalItens: number;
    totalArquivosItens: number;
    porTipo: SecaoContagemReadmePacoteScrivener[];
    porLivro: SecaoContagemReadmePacoteScrivener[];
    porPeriodo: SecaoContagemReadmePacoteScrivener[];
    itens: ItemIndiceReadmePacoteScrivener[];
}

function contarPorChave(chaves: string[]): SecaoContagemReadmePacoteScrivener[] {
    const mapa = new Map<string, number>();
    for (const chave of chaves) {
        mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
    }
    return Array.from(mapa.entries())
        .map(([chave, total]) => ({ chave, total }))
        .sort((a, b) => b.total !== a.total ? b.total - a.total : a.chave.localeCompare(b.chave));
}

export function criarReadmePacoteScrivener(
    manifesto: ManifestoScrivener,
    payload: PayloadScrivener,
): ReadmePacoteScrivener {
    const arquivosMarkdown = criarArquivosMarkdownPayloadScrivener(payload);

    const itensIndice: ItemIndiceReadmePacoteScrivener[] = payload.itens.map((item, i) => {
        const arquivo = arquivosMarkdown[i];
        const indice: ItemIndiceReadmePacoteScrivener = {
            id: item.id,
            tipo: item.tipo,
            titulo: item.titulo,
            caminhoRelativo: arquivo.caminhoRelativo,
        };
        if (item.livro) indice.livro = item.livro;
        if (item.periodo) indice.periodo = item.periodo;
        return indice;
    });

    const itensOrdenados = [...itensIndice].sort((a, b) => {
        const tipoComp = a.tipo.localeCompare(b.tipo);
        if (tipoComp !== 0) return tipoComp;

        const livroComp = (a.livro ?? '').localeCompare(b.livro ?? '');
        if (livroComp !== 0) return livroComp;

        const periodoComp = (a.periodo ?? '').localeCompare(b.periodo ?? '');
        if (periodoComp !== 0) return periodoComp;

        const tituloComp = a.titulo.localeCompare(b.titulo);
        if (tituloComp !== 0) return tituloComp;

        return a.id.localeCompare(b.id);
    });

    const totalItens = payload.totalItens;
    const totalArquivosItens = arquivosMarkdown.length;

    const porTipo = contarPorChave(payload.itens.map(i => i.tipo));
    const porLivro = contarPorChave(
        payload.itens.filter(i => i.livro).map(i => i.livro as string),
    );
    const porPeriodo = contarPorChave(
        payload.itens.filter(i => i.periodo).map(i => i.periodo as string),
    );

    const linhas: string[] = [];

    linhas.push('# Contrarius Scrivener package');
    linhas.push('');
    linhas.push('[Scrivener import](scrivener-import.md)');
    linhas.push('[Scrivener workspace](scrivener/index.md)');
    linhas.push('');
    linhas.push('## Manifest');
    linhas.push('');
    linhas.push(`- **Package id:** ${manifesto.id}`);
    linhas.push(`- **Type:** ${manifesto.tipo}`);
    linhas.push(`- **Vault:** ${manifesto.origemVault}`);
    linhas.push(`- **Created at:** ${manifesto.criadoEm}`);
    linhas.push(`- **Package path:** ${manifesto.caminhoPacote}`);
    if (manifesto.livro) linhas.push(`- **Book:** ${manifesto.livro}`);
    linhas.push('');

    if (totalItens === 0) {
        linhas.push('No payload items were exported.');
        linhas.push('');
    } else {
        linhas.push('## Payload summary');
        linhas.push('');
        linhas.push(`- **Total items:** ${totalItens}`);
        linhas.push(`- **Item markdown files:** ${totalArquivosItens}`);
        linhas.push('');

        linhas.push('## By type');
        linhas.push('');
        for (const c of porTipo) {
            linhas.push(`- ${c.chave}: ${c.total}`);
        }
        linhas.push('');

        if (porLivro.length > 0) {
            linhas.push('## By book');
            linhas.push('');
            for (const c of porLivro) {
                linhas.push(`- ${c.chave}: ${c.total}`);
            }
            linhas.push('');
        }

        if (porPeriodo.length > 0) {
            linhas.push('## By period');
            linhas.push('');
            for (const c of porPeriodo) {
                linhas.push(`- ${c.chave}: ${c.total}`);
            }
            linhas.push('');
        }

        linhas.push('## Item index');
        linhas.push('');
        for (const item of itensOrdenados) {
            linhas.push(`- [${item.titulo}](${item.caminhoRelativo})`);
        }
        linhas.push('');
    }

    const conteudo = linhas.join('\n');

    return {
        conteudo,
        totalItens,
        totalArquivosItens,
        porTipo,
        porLivro,
        porPeriodo,
        itens: itensOrdenados,
    };
}
