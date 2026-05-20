# warehouse-label-printer

Aplicação web mobile-first para imprimir etiquetas de armazém em formato **100 mm x 150 mm**. O MVP usa Next.js App Router, TypeScript, Tailwind CSS, base local JSON/localStorage, scanner por câmara no browser e códigos de barras gerados localmente com `@bwip-js/browser`.

## Requisitos

- Node.js 24+
- npm 11+

## Correr localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Para testar a câmara num telemóvel, o browser normalmente exige HTTPS ou uma origem segura. Em desktop, `localhost` costuma funcionar.

## Fluxo principal

1. Abra **Digitalizar EAN**.
2. Digitalize com a câmara ou introduza EAN/ITF/Código Auchan manualmente.
3. Confirme o produto.
4. Preencha ordem de compra, lote, validade, caixa e quantidade de etiquetas.
5. Veja a pré-visualização.
6. Abra **Imprimir** e use as definições da impressora.

## Atualizar produtos

Produtos iniciais estão em `data/products.json`.

Com Supabase configurado, a aplicação carrega primeiro a tabela `products`. Sem Supabase, continua a usar `data/products.json`/`localStorage`.

Para preparar a base Supabase:

1. Execute o SQL em `supabase/schema.sql` no SQL Editor do Supabase.
2. Crie `.env.local` com:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ghxyakafkwxbowynafkh.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

3. Importe Sabores do Mundo:

```bash
npm run supabase:import:sabores
```

O importador usa por defeito:

```bash
/Users/nit/Documents/VALIDADES PARA AUCHAN/VALIDADES ATUALIZADAS/MAPA VALIDADES - AUCHAN SABORES MUNDO.xlsx
```

A coluna I desse ficheiro alimenta `validade_minima_dias`.

A página **Admin Produtos** permite:

- adicionar, editar e apagar produtos;
- importar JSON;
- exportar JSON;
- repor a base inicial.

As alterações feitas no admin ficam em `localStorage` quando Supabase não está a ser usado.

## Impressão correta

A página `/print` usa:

```css
@page {
  size: 100mm 150mm;
  margin: 0;
}
```

Definições recomendadas da impressora:

- Tamanho do papel: **100 mm x 150 mm**
- Escala: **100%**
- Margens: **nenhuma**
- Desativar “ajustar à página” quando existir essa opção

Se `Quantidade de Etiquetas` for maior que 1, a página de impressão renderiza uma etiqueta por página.

## Códigos de barras e GS1-128

Os códigos são gerados no browser com `@bwip-js/browser`.

Aviso de produção: **todos os GS1-128 devem ser testados com o scanner do armazém/retalhista antes de uso real**. A estrutura está isolada em `lib/gs1.ts` e `lib/barcode.ts` para facilitar ajustes de FNC1, Application Identifiers e regras do retalhista.

## SSCC

Configuração default:

- `companyPrefix = "5603936"`
- `extensionDigit = "3"`
- `serialStart = 500000`

No MVP, o serial SSCC é guardado em `localStorage`.

Aviso de produção: **localStorage só é seguro para um dispositivo**. Em produção com vários dispositivos, gere SSCC num backend/base de dados central para evitar duplicados.

## Histórico

A página `/history` guarda:

- produto;
- GTIN;
- ordem de compra;
- lote;
- data de entrega;
- validade;
- estado de validade Auchan;
- caixa;
- quantidade;
- SSCC;
- data de criação.

Com Supabase configurado, as etiquetas impressas também são gravadas na tabela `labels`.

O botão **Reimprimir** volta a carregar a etiqueta para `/print`.

## Verificação

```bash
npm run test
npm run typecheck
npm run build
```
