
-- Adicionar restrições UNIQUE para permitir ON CONFLICT
ALTER TABLE public.categories
ADD CONSTRAINT categories_name_key UNIQUE (name);

ALTER TABLE public.products
ADD CONSTRAINT products_name_key UNIQUE (name);

-- Inserir ou ATUALIZAR categorias padrão
INSERT INTO public.categories (name, icon) VALUES
('Frutas e Verduras', '🥬'),
('Carnes e Peixes', '🥩'),
('Laticínios', '🥛'),
('Padaria', '🍞'),
('Bebidas', '🥤'),
('Limpeza', '🧽'),
('Higiene', '🧴'),
('Congelados', '🧊'),
('Enlatados', '🥫'),
('Cereais e Grãos', '🌾'),
('Mercearia', '🍯'),
('Pet Shop', '🐾')
ON CONFLICT (name) DO UPDATE SET
  icon = EXCLUDED.icon;

-- Adicionar coluna para identificar produtos sugeridos pelo usuário
ALTER TABLE public.products
ADD COLUMN user_suggested BOOLEAN DEFAULT FALSE;

-- Inserir ou ATUALIZAR a lista de produtos
INSERT INTO public.products (name, category_id, usage_count, user_suggested) VALUES
-- Frutas e Verduras
('Banana Prata', (SELECT id FROM public.categories WHERE name = 'Frutas e Verduras'), 25, FALSE),
('Maçã Gala', (SELECT id FROM public.categories WHERE name = 'Frutas e Verduras'), 22, FALSE),
('Tomate Italiano', (SELECT id FROM public.categories WHERE name = 'Frutas e Verduras'), 18, FALSE),
('Alface Crespa', (SELECT id FROM public.categories WHERE name = 'Frutas e Verduras'), 15, FALSE),
('Cebola', (SELECT id FROM public.categories WHERE name = 'Frutas e Verduras'), 30, FALSE),
('Batata Inglesa', (SELECT id FROM public.categories WHERE name = 'Frutas e Verduras'), 28, FALSE),
('Laranja Pera', (SELECT id FROM public.categories WHERE name = 'Frutas e Verduras'), 19, FALSE),
('Cenoura', (SELECT id FROM public.categories WHERE name = 'Frutas e Verduras'), 24, FALSE),
('Abobrinha', (SELECT id FROM public.categories WHERE name = 'Frutas e Verduras'), 12, FALSE),
('Brócolis', (SELECT id FROM public.categories WHERE name = 'Frutas e Verduras'), 10, FALSE),

-- Carnes e Peixes
('Peito de Frango', (SELECT id FROM public.categories WHERE name = 'Carnes e Peixes'), 35, FALSE),
('Carne Moída (Patinho)', (SELECT id FROM public.categories WHERE name = 'Carnes e Peixes'), 28, FALSE),
('Linguiça Toscana', (SELECT id FROM public.categories WHERE name = 'Carnes e Peixes'), 22, FALSE),
('Bisteca Suína', (SELECT id FROM public.categories WHERE name = 'Carnes e Peixes'), 18, FALSE),
('Salmão', (SELECT id FROM public.categories WHERE name = 'Carnes e Peixes'), 10, FALSE),
('Ovos Brancos (Dúzia)', (SELECT id FROM public.categories WHERE name = 'Carnes e Peixes'), 40, FALSE),

-- Laticínios
('Leite Integral', (SELECT id FROM public.categories WHERE name = 'Laticínios'), 50, FALSE),
('Queijo Mussarela', (SELECT id FROM public.categories WHERE name = 'Laticínios'), 38, FALSE),
('Iogurte Natural', (SELECT id FROM public.categories WHERE name = 'Laticínios'), 25, FALSE),
('Requeijão Cremoso', (SELECT id FROM public.categories WHERE name = 'Laticínios'), 32, FALSE),
('Manteiga com Sal', (SELECT id FROM public.categories WHERE name = 'Laticínios'), 29, FALSE),
('Creme de Leite', (SELECT id FROM public.categories WHERE name = 'Laticínios'), 27, FALSE),

-- Padaria
('Pão Francês', (SELECT id FROM public.categories WHERE name = 'Padaria'), 60, FALSE),
('Pão de Forma Tradicional', (SELECT id FROM public.categories WHERE name = 'Padaria'), 45, FALSE),
('Baguete', (SELECT id FROM public.categories WHERE name = 'Padaria'), 20, FALSE),
('Pão de Queijo', (SELECT id FROM public.categories WHERE name = 'Padaria'), 35, FALSE),

-- Bebidas
('Água Mineral sem Gás 1,5L', (SELECT id FROM public.categories WHERE name = 'Bebidas'), 40, FALSE),
('Refrigerante Cola 2L', (SELECT id FROM public.categories WHERE name = 'Bebidas'), 38, FALSE),
('Suco de Laranja Integral 1L', (SELECT id FROM public.categories WHERE name = 'Bebidas'), 25, FALSE),
('Cerveja Pilsen (Lata)', (SELECT id FROM public.categories WHERE name = 'Bebidas'), 33, FALSE),
('Café em Pó', (SELECT id FROM public.categories WHERE name = 'Bebidas'), 48, FALSE),

-- Limpeza
('Detergente Neutro', (SELECT id FROM public.categories WHERE name = 'Limpeza'), 35, FALSE),
('Sabão em Pó', (SELECT id FROM public.categories WHERE name = 'Limpeza'), 30, FALSE),
('Água Sanitária', (SELECT id FROM public.categories WHERE name = 'Limpeza'), 28, FALSE),
('Desinfetante Lavanda', (SELECT id FROM public.categories WHERE name = 'Limpeza'), 22, FALSE),
('Esponja Multiuso', (SELECT id FROM public.categories WHERE name = 'Limpeza'), 18, FALSE),

-- Higiene
('Papel Higiênico (4 rolos)', (SELECT id FROM public.categories WHERE name = 'Higiene'), 42, FALSE),
('Sabonete', (SELECT id FROM public.categories WHERE name = 'Higiene'), 37, FALSE),
('Creme Dental', (SELECT id FROM public.categories WHERE name = 'Higiene'), 39, FALSE),
('Shampoo', (SELECT id FROM public.categories WHERE name = 'Higiene'), 26, FALSE),
('Desodorante Aerossol', (SELECT id FROM public.categories WHERE name = 'Higiene'), 24, FALSE),

-- Congelados
('Batata Palito Congelada', (SELECT id FROM public.categories WHERE name = 'Congelados'), 28, FALSE),
('Pizza Congelada', (SELECT id FROM public.categories WHERE name = 'Congelados'), 19, FALSE),
('Pão de Queijo Congelado', (SELECT id FROM public.categories WHERE name = 'Congelados'), 25, FALSE),
('Lasanha Bolonhesa Congelada', (SELECT id FROM public.categories WHERE name = 'Congelados'), 17, FALSE),

-- Enlatados
('Milho Verde em Conserva', (SELECT id FROM public.categories WHERE name = 'Enlatados'), 33, FALSE),
('Ervilha em Conserva', (SELECT id FROM public.categories WHERE name = 'Enlatados'), 21, FALSE),
('Atum em Óleo', (SELECT id FROM public.categories WHERE name = 'Enlatados'), 26, FALSE),
('Molho de Tomate Tradicional', (SELECT id FROM public.categories WHERE name = 'Enlatados'), 41, FALSE),

-- Cereais e Grãos
('Arroz Branco Tipo 1', (SELECT id FROM public.categories WHERE name = 'Cereais e Grãos'), 55, FALSE),
('Feijão Carioca', (SELECT id FROM public.categories WHERE name = 'Cereais e Grãos'), 52, FALSE),
('Açúcar Refinado', (SELECT id FROM public.categories WHERE name = 'Cereais e Grãos'), 47, FALSE),
('Farinha de Trigo', (SELECT id FROM public.categories WHERE name = 'Cereais e Grãos'), 36, FALSE),
('Macarrão Espaguete', (SELECT id FROM public.categories WHERE name = 'Cereais e Grãos'), 39, FALSE),

-- Mercearia
('Óleo de Soja', (SELECT id FROM public.categories WHERE name = 'Mercearia'), 44, FALSE),
('Sal Refinado', (SELECT id FROM public.categories WHERE name = 'Mercearia'), 49, FALSE),
('Vinagre de Álcool', (SELECT id FROM public.categories WHERE name = 'Mercearia'), 23, FALSE),
('Azeite de Oliva Extra Virgem', (SELECT id FROM public.categories WHERE name = 'Mercearia'), 20, FALSE),
('Maionese', (SELECT id FROM public.categories WHERE name = 'Mercearia'), 31, FALSE),

-- Pet Shop
('Ração para Cães Adultos', (SELECT id FROM public.categories WHERE name = 'Pet Shop'), 15, FALSE),
('Ração para Gatos', (SELECT id FROM public.categories WHERE name = 'Pet Shop'), 12, FALSE)
ON CONFLICT (name) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  usage_count = EXCLUDED.usage_count,
  user_suggested = EXCLUDED.user_suggested;
