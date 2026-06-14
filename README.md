# Super Dash Executivo — Unimed Sorocaba

Aplicação SPA estática para apresentação executiva de gestão populacional, sinistralidade e oportunidades financeiras.

## Como abrir

Abra o arquivo `index.html` no navegador.

A aplicação não exige backend, banco, Node, Python ou servidor. Para publicar no GitHub Pages, envie todos estes arquivos mantendo a estrutura:

```text
index.html
style.css
app.js
assets/
  data.js
  logo.svg
```

## Fontes usadas

Foram usados os arquivos consolidados disponíveis no upload:

- `dados_dashboard(1).json`
- `beneficiarios_classificados(1).csv`
- `detalhe_hiperutilizadores(1).csv`
- `detalhe_frequentadores_ps(1).csv`
- `detalhe_risco_crescente(1).csv`
- `detalhe_grupos_cuidado(1).csv`
- `detalhe_custo_evitavel(1).csv`
- `detalhe_imunobiologicos(1).csv`
- `detalhe_quimioterapia(1).csv`
- `detalhe_tea(1).csv`
- `alertas_qualidade(1).md`
- `relatorio_grupos_cuidado(1).md`
- `log_execucao(1).txt`

Arquivos solicitados no prompt, mas não detectados no upload:

- `datamart_executivo_unimed.json`
- `insights_executivos.json`
- `oportunidades_economia.json`
- `narrativas_executivas.json`
- `catalogo_kpis.json`

Por isso, o painel de oportunidades foi montado a partir dos consolidados presentes: `dados_dashboard`, `detalhe_custo_evitavel`, `detalhe_hiperutilizadores`, `detalhe_frequentadores_ps`, `detalhe_quimioterapia` e `detalhe_tea`.

## Telas

1. Centro de Comando
2. Gestão Populacional
3. Hiperutilizadores
4. Frequentadores PS
5. Risco Crescente
6. Grupos de Cuidado
7. Oncologia
8. Imunobiológicos
9. TEA
10. Custo Evitável
11. Beneficiários Prioritários
12. Oportunidades Financeiras
13. Qualidade dos Dados

## Exportação

Cada tela possui ações para CSV, Excel, PDF/impressão. A exportação usa os registros da visão atual.

## Observações executivas

- O painel não reprocessa a base bruta; usa apenas consolidados e arquivos detalhe.
- A cobertura de CID disponível é 17,1%, logo análises dependentes de diagnóstico são conservadoras.
- Nenhum imunobiológico foi localizado pelo dicionário de nome/TUSS disponível.
- O arquivo `assets/data.js` contém o datamart estático necessário para a SPA funcionar sem backend.
