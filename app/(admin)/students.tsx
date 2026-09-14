// O Zeca é dono E professor. A área dele não tinha turma nenhuma: is_admin
// curto-circuita o roteamento, então ele nunca via as telas de (teacher).
// Mesma tela, exposta na aba do admin — sem duplicar comportamento.
export { default } from '../(teacher)/students';
