// Versão do sistema.
//
// Serve para o navegador perceber que está com uma página antiga aberta (aba velha,
// celular que não recarregou) e avisar o usuário. Isso já causou confusão: o
// coordenador digitava a senha nova e não entrava, porque a aba estava com o código
// antigo, que conferia a senha no próprio navegador.
//
// Suba este número (ou a data) a cada mudança que afete a tela de login.
export const VERSAO = '2026-10-22.1'
