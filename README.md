# warehouse-label-printer

Aplicação web mobile-first para imprimir etiquetas de armazém em formato **100 mm x 150 mm**. Usa Next.js App Router, TypeScript, Tailwind CSS, Supabase como base partilhada obrigatória em produção, scanner por câmara no browser e códigos de barras gerados localmente com `@bwip-js/browser`.

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

Produtos iniciais/seed estão em `data/products.json`.

Em produção, a aplicação usa apenas Supabase como fonte de verdade. Se as variáveis públicas de Supabase não estiverem configuradas em produção, a app falha em vez de usar dados locais.

Em desenvolvimento/testes, quando Supabase não está configurado, a aplicação pode usar `data/products.json`/`localStorage` como fallback local para facilitar trabalho offline.

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

A página **Admin Produtos** permite gerir a tabela Supabase `products`:

- adicionar, editar e apagar produtos;
- importar JSON;
- exportar JSON;
- repor a base inicial.

Sem Supabase, estas alterações só são guardadas em `localStorage` durante desenvolvimento/testes.

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

Em produção, a reserva de serial SSCC deve ser feita pela função Supabase `reserve_next_sscc_serial()`/tabela `sscc_counters`, para evitar duplicados entre dispositivos. O fallback local só existe em desenvolvimento/testes.

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

Em produção, as etiquetas impressas são gravadas na tabela Supabase `labels`. O histórico local só é usado como fallback em desenvolvimento/testes.

O botão **Reimprimir** volta a carregar a etiqueta para `/print`.

## Verificação

```bash
npm run test
npm run typecheck
npm run build
```
