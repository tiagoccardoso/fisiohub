# Migration dos módulos de gestão

Antes de publicar os arquivos, execute no Neon SQL Editor:

`database/20260623_management_modules_neon.sql`

A migration é incremental: adiciona os campos de endereço completo da clínica e a tabela
`analysis_reports`. Ela não remove nem altera registros existentes.
