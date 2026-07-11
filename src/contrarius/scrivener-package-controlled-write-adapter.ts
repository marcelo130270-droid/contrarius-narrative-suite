export interface GravadorPacoteScrivener {
    exists(caminho: string): Promise<boolean>;
    mkdir(caminho: string): Promise<void>;
    write(caminho: string, conteudo: string): Promise<void>;
}

export interface AdaptadorControladoEscritaScrivenerOptions {
    sobrescrever?: boolean;
}

export class ErroCaminhoPacoteScrivener extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ErroCaminhoPacoteScrivener';
    }
}

function normalizarCaminhoEscritaScrivener(caminho: string): string {
    const normalizado = caminho.trim().replace(/\\/g, '/').replace(/\/+/g, '/');

    if (normalizado.length === 0) {
        throw new ErroCaminhoPacoteScrivener('Caminho de escrita Scrivener vazio.');
    }

    if (normalizado.startsWith('/') || /^[A-Za-z]:\//.test(normalizado)) {
        throw new ErroCaminhoPacoteScrivener(`Caminho absoluto bloqueado: ${caminho}`);
    }

    const partes = normalizado.split('/');

    if (partes.some(parte => parte === '..')) {
        throw new ErroCaminhoPacoteScrivener(`Caminho com subida de diretorio bloqueado: ${caminho}`);
    }

    if (partes.some(parte => parte.trim().length === 0 || parte === '.')) {
        throw new ErroCaminhoPacoteScrivener(`Caminho invalido para escrita Scrivener: ${caminho}`);
    }

    return partes.join('/');
}

function diretoriosPaisScrivener(caminhoArquivo: string): string[] {
    const partes = caminhoArquivo.split('/');
    partes.pop();

    const diretorios: string[] = [];

    for (let index = 0; index < partes.length; index += 1) {
        diretorios.push(partes.slice(0, index + 1).join('/'));
    }

    return diretorios;
}

export function criarAdaptadorControladoEscritaPacoteScrivener(
    gravador: GravadorPacoteScrivener,
    options: AdaptadorControladoEscritaScrivenerOptions = {},
) {
    const sobrescrever = options.sobrescrever ?? false;

    return {
        async escreverArquivoTexto(caminhoDestino: string, conteudo: string): Promise<void> {
            const caminhoNormalizado = normalizarCaminhoEscritaScrivener(caminhoDestino);

            for (const diretorio of diretoriosPaisScrivener(caminhoNormalizado)) {
                if (!(await gravador.exists(diretorio))) {
                    await gravador.mkdir(diretorio);
                }
            }

            if (!sobrescrever && await gravador.exists(caminhoNormalizado)) {
                throw new ErroCaminhoPacoteScrivener(`Arquivo Scrivener ja existe e sobrescrita esta bloqueada: ${caminhoNormalizado}`);
            }

            await gravador.write(caminhoNormalizado, conteudo);
        },
    };
}
