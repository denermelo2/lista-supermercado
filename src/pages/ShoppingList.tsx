
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus, ShoppingCart, Check, X, User } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Product {
  id: string;
  name: string;
  category_id: string;
  usage_count: number;
  user_suggested?: boolean;
}

interface ListItem {
  id: string;
  list_id: string;
  product_id?: string;
  custom_product_name?: string;
  quantity: number;
  is_checked: boolean;
  product?: Product;
}

interface ShoppingListType {
  id: string;
  name: string;
  is_completed: boolean;
  completion_date?: string;
  store_name?: string;
}

// Função para capitalizar a primeira letra de cada palavra
const capitalizeWords = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Função para detectar categoria baseada no nome do produto
const detectCategory = (productName: string, categories: Category[]): string | null => {
  const name = productName.toLowerCase();
  
  // Mapeamento de palavras-chave para categorias
  const categoryKeywords = {
    'Frutas e Verduras': ['fruta', 'verdura', 'legume', 'banana', 'maçã', 'tomate', 'alface', 'cebola', 'batata', 'laranja', 'cenoura', 'abobrinha', 'brócolis'],
    'Carnes e Peixes': ['carne', 'frango', 'peixe', 'linguiça', 'bisteca', 'salmão', 'ovos', 'ovo'],
    'Laticínios': ['leite', 'queijo', 'iogurte', 'requeijão', 'manteiga', 'creme'],
    'Padaria': ['pão', 'baguete'],
    'Bebidas': ['água', 'refrigerante', 'suco', 'cerveja', 'café', 'bebida'],
    'Limpeza': ['detergente', 'sabão', 'sanitária', 'desinfetante', 'esponja', 'limpeza'],
    'Higiene': ['papel higiênico', 'sabonete', 'creme dental', 'shampoo', 'desodorante', 'higiene'],
    'Congelados': ['congelado', 'congelada'],
    'Enlatados': ['conserva', 'lata', 'atum', 'molho'],
    'Cereais e Grãos': ['arroz', 'feijão', 'açúcar', 'farinha', 'macarrão', 'cereal'],
    'Mercearia': ['óleo', 'sal', 'vinagre', 'azeite', 'maionese'],
    'Pet Shop': ['ração', 'pet', 'cão', 'gato', 'cachorro']
  };

  for (const [categoryName, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      const category = categories.find(cat => cat.name === categoryName);
      return category?.id || null;
    }
  }

  // Se não encontrar categoria específica, retorna "Mercearia" como padrão
  const merceariaCategory = categories.find(cat => cat.name === 'Mercearia');
  return merceariaCategory?.id || null;
};

const ShoppingList = () => {
  const [currentList, setCurrentList] = useState<ShoppingListType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customProduct, setCustomProduct] = useState('');
  const [storeName, setStoreName] = useState('');
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar categorias
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Category[];
    }
  });

  // Buscar produtos por categoria
  const { data: products = [] } = useQuery({
    queryKey: ['products', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', selectedCategory)
        .order('usage_count', { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!selectedCategory
  });

  // Buscar lista atual
  const { data: listItems = [] } = useQuery({
    queryKey: ['listItems', currentList?.id],
    queryFn: async () => {
      if (!currentList?.id) return [];
      const { data, error } = await supabase
        .from('list_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('list_id', currentList.id)
        .order('created_at');
      if (error) throw error;
      return data as ListItem[];
    },
    enabled: !!currentList?.id
  });

  // Criar nova lista ao carregar a página
  useEffect(() => {
    createNewList();
  }, []);

  const createNewList = async () => {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .insert([{ name: 'Lista de Compras' }])
        .select()
        .single();
      
      if (error) throw error;
      setCurrentList(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar nova lista",
        variant: "destructive"
      });
    }
  };

  // Adicionar produto à lista
  const addProductMutation = useMutation({
    mutationFn: async ({ productId, customName }: { productId?: string; customName?: string }) => {
      if (!currentList?.id) throw new Error('Nenhuma lista ativa');
      
      let finalProductId = productId;
      
      // Se é um produto personalizado, criar/encontrar o produto no banco
      if (customName && !productId) {
        const formattedName = capitalizeWords(customName.trim());
        const detectedCategoryId = detectCategory(formattedName, categories);
        
        // Verificar se o produto já existe
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('name', formattedName)
          .single();
        
        if (existingProduct) {
          finalProductId = existingProduct.id;
        } else {
          // Criar novo produto
          const { data: newProduct, error: createError } = await supabase
            .from('products')
            .insert([{
              name: formattedName,
              category_id: detectedCategoryId,
              usage_count: 1,
              user_suggested: true
            }])
            .select()
            .single();
          
          if (createError) throw createError;
          finalProductId = newProduct.id;
        }
      }
      
      const { data, error } = await supabase
        .from('list_items')
        .insert([{
          list_id: currentList.id,
          product_id: finalProductId,
          custom_product_name: finalProductId ? null : customName,
          quantity: 1
        }])
        .select();
      
      if (error) throw error;
      
      // Atualizar contador de uso do produto
      if (finalProductId) {
        // Buscar o produto atual para obter o usage_count
        const { data: product, error: fetchError } = await supabase
          .from('products')
          .select('usage_count')
          .eq('id', finalProductId)
          .single();
        
        if (!fetchError && product) {
          const { error: updateError } = await supabase
            .from('products')
            .update({ usage_count: product.usage_count + 1 })
            .eq('id', finalProductId);
          
          if (updateError) {
            console.error('Erro ao atualizar contador:', updateError);
          }
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listItems'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setCustomProduct('');
      setSelectedCategory(null);
      toast({
        title: "Sucesso",
        description: "Produto adicionado à lista!"
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar produto",
        variant: "destructive"
      });
    }
  });

  // Atualizar quantidade
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (quantity <= 0) {
        const { error } = await supabase
          .from('list_items')
          .delete()
          .eq('id', itemId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('list_items')
          .update({ quantity })
          .eq('id', itemId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listItems'] });
    }
  });

  // Marcar item como comprado
  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, isChecked }: { itemId: string; isChecked: boolean }) => {
      const { error } = await supabase
        .from('list_items')
        .update({ is_checked: isChecked })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listItems'] });
    }
  });

  // Finalizar compra
  const completeShoppingMutation = useMutation({
    mutationFn: async () => {
      if (!currentList?.id) throw new Error('Nenhuma lista ativa');
      
      const { error } = await supabase
        .from('shopping_lists')
        .update({
          is_completed: true,
          completion_date: new Date().toISOString(),
          store_name: storeName || null
        })
        .eq('id', currentList.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Compra finalizada!",
        description: "Lista concluída com sucesso!"
      });
      setShowCompleteForm(false);
      setStoreName('');
      createNewList();
    }
  });

  const checkedItems = listItems.filter(item => item.is_checked);
  const uncheckedItems = listItems.filter(item => !item.is_checked);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-green-600" />
              <h1 className="text-xl font-bold text-gray-900">Lista de Compras</h1>
            </div>
            <div className="text-sm text-gray-500">
              {listItems.length} {listItems.length === 1 ? 'item' : 'itens'}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Categorias */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Adicionar por categoria</h2>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                className="justify-start text-xs"
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Produtos da categoria selecionada */}
        {selectedCategory && products.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-medium text-gray-900 mb-3">Produtos populares</h3>
            <div className="grid grid-cols-1 gap-2">
              {products.slice(0, 6).map((product) => (
                <Button
                  key={product.id}
                  variant="outline"
                  size="sm"
                  onClick={() => addProductMutation.mutate({ productId: product.id })}
                  className="justify-between"
                  disabled={addProductMutation.isPending}
                >
                  <div className="flex items-center gap-2">
                    <span>{product.name}</span>
                    {product.user_suggested && (
                      <User className="h-3 w-3 text-blue-500" title="Sugerido por usuário" />
                    )}
                  </div>
                  <Plus className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Adicionar produto customizado */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <Label htmlFor="custom-product" className="font-medium text-gray-900">
            Adicionar produto personalizado
          </Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="custom-product"
              value={customProduct}
              onChange={(e) => setCustomProduct(e.target.value)}
              placeholder="Digite o nome do produto..."
              className="flex-1"
            />
            <Button
              onClick={() => addProductMutation.mutate({ customName: customProduct })}
              disabled={!customProduct.trim() || addProductMutation.isPending}
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Lista de compras */}
        {listItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm">
            {/* Itens não comprados */}
            {uncheckedItems.length > 0 && (
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">A comprar</h3>
                <div className="space-y-2">
                  {uncheckedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 border rounded-lg">
                      <Checkbox
                        checked={item.is_checked}
                        onCheckedChange={(checked) =>
                          toggleItemMutation.mutate({ itemId: item.id, isChecked: !!checked })
                        }
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {item.product?.name || item.custom_product_name}
                          </span>
                          {item.product?.user_suggested && (
                            <User className="h-3 w-3 text-blue-500" title="Sugerido por usuário" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateQuantityMutation.mutate({
                              itemId: item.id,
                              quantity: item.quantity - 1
                            })
                          }
                          className="h-6 w-6 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateQuantityMutation.mutate({
                              itemId: item.id,
                              quantity: item.quantity + 1
                            })
                          }
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Itens comprados */}
            {checkedItems.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="w-full p-4 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-600">
                      Comprados ({checkedItems.length})
                    </h3>
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 pt-0">
                  <div className="space-y-2">
                    {checkedItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-2 border rounded-lg opacity-60">
                        <Checkbox
                          checked={item.is_checked}
                          onCheckedChange={(checked) =>
                            toggleItemMutation.mutate({ itemId: item.id, isChecked: !!checked })
                          }
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm line-through">
                              {item.product?.name || item.custom_product_name}
                            </span>
                            {item.product?.user_suggested && (
                              <User className="h-3 w-3 text-blue-500" title="Sugerido por usuário" />
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {/* Finalizar compra */}
        {listItems.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            {!showCompleteForm ? (
              <Button
                onClick={() => setShowCompleteForm(true)}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <Check className="h-4 w-4 mr-2" />
                Concluir Compra
              </Button>
            ) : (
              <div className="space-y-3">
                <Label htmlFor="store-name">Nome do mercado (opcional)</Label>
                <Input
                  id="store-name"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Ex: Supermercado ABC"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => completeShoppingMutation.mutate()}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={completeShoppingMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Finalizar
                  </Button>
                  <Button
                    onClick={() => setShowCompleteForm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingList;
