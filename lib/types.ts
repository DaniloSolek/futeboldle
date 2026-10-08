export interface Time {
  id: string;
  nome: string;
  estado: string;
  regiao: string;
  fundacao: number;
  divisao: string;
  cores: string[];
  titulosEstaduais: number;
  titulosNacionais: number;
  titulosInternacionais: number;
}

export type StatusAtributo = "correto" | "parcial" | "errado";

export interface ResultadoComparacao {
  acertou: boolean;
  nomeCorreto?: string;
  atributos: {
    estado: { valor: string; status: StatusAtributo };
    regiao: { valor: string; status: StatusAtributo };
    fundacao: { valor: number; status: StatusAtributo; direcao?: "maior" | "menor" };
    divisao: { valor: string; status: StatusAtributo };
    cores: { valor: string[]; status: StatusAtributo };
    titulosEstaduais: { valor: number; status: StatusAtributo; direcao?: "maior" | "menor" };
    titulosNacionais: { valor: number; status: StatusAtributo; direcao?: "maior" | "menor" };
    titulosInternacionais: { valor: number; status: StatusAtributo; direcao?: "maior" | "menor" };
  };
}
