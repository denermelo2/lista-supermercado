
-- Criar tabela de categorias de produtos
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de produtos
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de listas de compras
CREATE TABLE public.shopping_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Lista de Compras',
  is_completed BOOLEAN DEFAULT FALSE,
  completion_date TIMESTAMP WITH TIME ZONE,
  store_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de itens da lista
CREATE TABLE public.list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  custom_product_name TEXT,
  quantity INTEGER DEFAULT 1,
  is_checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para acesso público (sem autenticação por enquanto)
CREATE POLICY "Allow public access to categories" ON public.categories FOR ALL USING (true);
CREATE POLICY "Allow public access to products" ON public.products FOR ALL USING (true);
CREATE POLICY "Allow public access to shopping_lists" ON public.shopping_lists FOR ALL USING (true);
CREATE POLICY "Allow public access to list_items" ON public.list_items FOR ALL USING (true);

-- Inserir categorias padrão
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
('Cereais e Grãos', '🌾');

-- Inserir alguns produtos populares
INSERT INTO public.products (name, category_id, usage_count) VALUES
('Banana', (SELECT id FROM public.categories WHERE name = 'Frutas e Verduras'), 10),
('Maçã', (SELECT id FROM public.categories WHERE name = 'Frutas e Verduras'), 8),
('Tomate', (SELECT id FROM public.categories WHERE name = 'Frutas e Verduras'), 7),
('Alface', (SELECT id FROM public.categories WHERE name = 'Frutas e Verduras'), 6),
('Frango', (SELECT id FROM public.categories WHERE name = 'Carnes e Peixes'), 12),
('Carne Moída', (SELECT id FROM public.categories WHERE name = 'Carnes e Peixes'), 9),
('Leite', (SELECT id FROM public.categories WHERE name = 'Laticínios'), 15),
('Queijo', (SELECT id FROM public.categories WHERE name = 'Laticínios'), 8),
('Pão', (SELECT id FROM public.categories WHERE name = 'Padaria'), 20),
('Água', (SELECT id FROM public.categories WHERE name = 'Bebidas'), 10);
