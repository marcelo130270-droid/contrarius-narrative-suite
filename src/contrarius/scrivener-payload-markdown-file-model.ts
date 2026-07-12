import type { ItemPayloadScrivener, TipoItemPayloadScrivener } from './scrivener-package-payload-model';
import type { PayloadScrivener } from './scrivener-package-payload-model';

export interface ArquivoMarkdownPayloadScrivener {
    caminhoRelativo: string;
    itemId: string;
    tipo: TipoItemPayloadScrivener;
    conteudo: string;
    tamanhoCaracteres: number;
}

export function criarSlugArquivoPayloadScrivener(valor: string): string {
    const semAcento = valor.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const lower = semAcento.toLowerCase();
    const hifenizado = lower.replace(/[^a-z0-9]+/g, '-');
    const slug = hifenizado.replace(/^-+|-+$/g, '');
    return slug || 'item';
}

function formatarValorYamlFrontmatter(valor: string): string {
    if (/[:"#\\[\]{}|>&']/.test(valor)) {
        return `"${valor.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    return valor;
}

export function criarConteudoMarkdownItemPayloadScrivener(item: ItemPayloadScrivener): string {
    const linhas: string[] = [];

    linhas.push('---');
    linhas.push(`id: ${item.id}`);
    linhas.push(`tipo: ${item.tipo}`);
    linhas.push(`titulo: ${formatarValorYamlFrontmatter(item.titulo)}`);
    if (item.caminhoFonte) linhas.push(`caminhoFonte: ${formatarValorYamlFrontmatter(item.caminhoFonte)}`);
    if (item.livro) linhas.push(`livro: ${formatarValorYamlFrontmatter(item.livro)}`);
    if (item.periodo) linhas.push(`periodo: ${formatarValorYamlFrontmatter(item.periodo)}`);
    if (item.ordemNarrativa !== undefined) linhas.push(`ordemNarrativa: ${item.ordemNarrativa}`);
    if (item.ordemCronologica !== undefined) linhas.push(`ordemCronologica: ${item.ordemCronologica}`);
    if (item.tags && item.tags.length > 0) {
        linhas.push('tags:');
        for (const tag of item.tags) {
            linhas.push(`  - ${tag}`);
        }
    }
    linhas.push('---');
    linhas.push('');
    linhas.push(`# ${item.titulo}`);
    linhas.push('');

    if (item.texto) {
        linhas.push(item.texto);
        linhas.push('');
    } else {
        linhas.push('## Metadata');
        linhas.push('');
        linhas.push(`- **id:** ${item.id}`);
        linhas.push(`- **tipo:** ${item.tipo}`);
        if (item.caminhoFonte) linhas.push(`- **fonte:** ${item.caminhoFonte}`);
        linhas.push('');
    }

    return linhas.join('\n');
}

export function criarArquivoMarkdownItemPayloadScrivener(item: ItemPayloadScrivener): ArquivoMarkdownPayloadScrivener {
    const slug = criarSlugArquivoPayloadScrivener(item.titulo);
    const caminhoRelativo = `payload/items/${item.tipo}/${slug}.md`;
    const conteudo = criarConteudoMarkdownItemPayloadScrivener(item);
    return {
        caminhoRelativo,
        itemId: item.id,
        tipo: item.tipo,
        conteudo,
        tamanhoCaracteres: conteudo.length,
    };
}

export function criarArquivosMarkdownPayloadScrivener(payload: PayloadScrivener): ArquivoMarkdownPayloadScrivener[] {
    const contadorPorTipo = new Map<string, Map<string, number>>();

    return payload.itens.map(item => {
        const slugBase = criarSlugArquivoPayloadScrivener(item.titulo);

        if (!contadorPorTipo.has(item.tipo)) {
            contadorPorTipo.set(item.tipo, new Map());
        }
        const contadorTipo = contadorPorTipo.get(item.tipo)!;

        const contagem = (contadorTipo.get(slugBase) ?? 0) + 1;
        contadorTipo.set(slugBase, contagem);

        const slug = contagem === 1 ? slugBase : `${slugBase}-${contagem}`;
        const caminhoRelativo = `payload/items/${item.tipo}/${slug}.md`;
        const conteudo = criarConteudoMarkdownItemPayloadScrivener(item);

        return {
            caminhoRelativo,
            itemId: item.id,
            tipo: item.tipo,
            conteudo,
            tamanhoCaracteres: conteudo.length,
        };
    });
}
