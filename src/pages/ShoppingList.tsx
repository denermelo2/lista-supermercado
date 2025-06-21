import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus, ShoppingCart, Check, X, User, List, Save, Edit, Trash2, Share2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

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
  created_at: string;
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

// Função utilitária para normalizar strings (remover acentos e padronizar case)
const normalize = (str: string) => str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const ShoppingList = () => {
  const [currentList, setCurrentList] = useState<ShoppingListType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customProduct, setCustomProduct] = useState('');
  const [storeName, setStoreName] = useState('');
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [manualCategory, setManualCategory] = useState<string | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [showListsMenu, setShowListsMenu] = useState(false);
  const [userLists, setUserLists] = useState<ShoppingListType[]>([]);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveAction, setSaveAction] = useState<'nova' | 'existente' | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalResults, setGlobalResults] = useState<Product[]>([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Buscar itens da lista atual
  const { data: listItems = [] } = useQuery({
    queryKey: ['listItems', currentList?.id],
    queryFn: async () => {
      if (!currentList?.id) return [];
      const { data, error } = await supabase
        .from('list_items')
        .select(`*, product:products(*)`)
        .eq('list_id', currentList.id)
        .order('created_at');
      if (error) throw error;
      return data as ListItem[];
    },
    enabled: !!currentList?.id
  });

  // Buscar listas do usuário logado
  const fetchUserLists = async () => {
    const user = await supabase.auth.getUser();
    if (!user?.data?.user) return;
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('user_id', user.data.user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setUserLists(data);
  };

  // Busca global de produtos
  useEffect(() => {
    if (!globalSearch.trim()) {
      setGlobalResults([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .ilike('name', `%${globalSearch.trim()}%`);
      setGlobalResults(data || []);
    })();
  }, [globalSearch]);

  // Salvar lista (atualizar nome, garantir user_id) usando modal
  const handleSaveList = () => setShowSaveDialog(true);
  const handleSaveDialogAction = async (action: 'nova' | 'existente') => {
    setShowSaveDialog(false);
    setSaveAction(null);
    const user = await supabase.auth.getUser();
    if (!user?.data?.user || !currentList) return;
    if (action === 'nova') {
      // Criar nova lista
      const { data: newList, error: createError } = await supabase
        .from('shopping_lists')
        .insert({ name: currentList.name || 'Lista de Compras', user_id: user.data.user.id })
        .select()
        .single();
      if (!createError && newList) {
        // Copiar itens da lista atual para a nova
        if (listItems.length > 0) {
          const itemsToInsert = listItems.map(item => ({
            list_id: newList.id,
            product_id: item.product_id,
            custom_product_name: item.custom_product_name,
            quantity: item.quantity,
            is_checked: item.is_checked
          }));
          await supabase.from('list_items').insert(itemsToInsert);
        }
        setCurrentList(newList);
        localStorage.setItem('shoppingListId', newList.id);
        toast({ title: 'Nova lista criada!', description: 'Sua lista foi salva como nova.' });
        fetchUserLists();
      }
    } else {
      // Atualizar lista existente
      await supabase
        .from('shopping_lists')
        .update({ name: currentList.name || 'Lista de Compras', user_id: user.data.user.id })
        .eq('id', currentList.id);
      toast({ title: 'Lista salva!', description: 'Sua lista foi atualizada.' });
      fetchUserLists();
    }
  };

  // Carregar lista selecionada
  const handleLoadList = (list: ShoppingListType) => {
    setCurrentList(list);
    localStorage.setItem('shoppingListId', list.id);
    setShowListsMenu(false);
  };

  // Buscar lista do localStorage ou criar nova
  useEffect(() => {
    const fetchOrCreateList = async () => {
      setIsLoadingList(true);
      const savedListId = localStorage.getItem('shoppingListId');
      if (savedListId) {
        // Tentar buscar a lista no banco
        const { data: list, error } = await supabase
          .from('shopping_lists')
          .select('*')
          .eq('id', savedListId)
          .single();
        if (list && !list.is_completed) {
          setCurrentList(list);
          setIsLoadingList(false);
          return;
        } else {
          // Se não existe ou está concluída, remove do localStorage
          localStorage.removeItem('shoppingListId');
        }
      }
      // Criar nova lista
      const { data: newList, error: createError } = await supabase
        .from('shopping_lists')
        .insert([{ name: 'Lista de Compras' }])
        .select()
        .single();
      if (!createError && newList) {
        setCurrentList(newList);
        localStorage.setItem('shoppingListId', newList.id);
      }
      setIsLoadingList(false);
    };
    fetchOrCreateList();
  }, []);

  // Buscar produtos similares ao digitar
  useEffect(() => {
    if (!customProduct.trim()) {
      setSimilarProducts([]);
      setShowCategorySelect(false);
      return;
    }
    const search = normalize(customProduct.trim());
    // Buscar em todas as categorias
    (async () => {
      const { data: allProducts } = await supabase.from('products').select('*');
      if (allProducts) {
        const similars = allProducts.filter((p: Product) => normalize(p.name).includes(search));
        setSimilarProducts(similars);
        setShowCategorySelect(similars.length === 0);
      }
    })();
  }, [customProduct]);

  const createNewList = async () => {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .insert([{ name: 'Lista de Compras' }])
        .select()
        .single();
      if (error) throw error;
      setCurrentList(data);
      localStorage.setItem('shoppingListId', data.id);
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
        const detectedCategoryId = manualCategory || detectCategory(formattedName, categories);
        
        // Verificar se o produto já existe (case-insensitive, sem acento)
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .ilike('name', formattedName);
        
        if (existingProduct && existingProduct.length > 0) {
          finalProductId = existingProduct[0].id;
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
      setManualCategory(null);
      setShowCategorySelect(false);
      setSimilarProducts([]);
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

  // Editar nome da lista
  const handleEditList = (list: ShoppingListType) => {
    setEditingListId(list.id);
    setEditingListName(list.name || '');
  };
  const handleSaveEditList = async (list: ShoppingListType) => {
    await supabase
      .from('shopping_lists')
      .update({ name: editingListName })
      .eq('id', list.id);
    setEditingListId(null);
    fetchUserLists();
  };
  const handleDeleteList = async (list: ShoppingListType) => {
    if (!window.confirm('Tem certeza que deseja excluir esta lista? Essa ação não pode ser desfeita.')) return;
    await supabase
      .from('shopping_lists')
      .delete()
      .eq('id', list.id);
    fetchUserLists();
    // Se deletou a lista atual, limpa do localStorage e recarrega
    if (currentList?.id === list.id) {
      localStorage.removeItem('shoppingListId');
      window.location.reload();
    }
  };

  // Função para formatar data
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // Função para gerar link de compartilhamento
  const getShareUrl = () => {
    if (!currentList) return window.location.href;
    return `${window.location.origin}/?list=${currentList.id}`;
  };

  // Função para copiar link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Função para compartilhar no WhatsApp
  const handleShareWhatsApp = () => {
    const url = getShareUrl();
    const text = encodeURIComponent(`Confira minha lista de compras: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Renderização condicional para loading
  if (isLoadingList || !currentList) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span>Carregando lista...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Menu superior */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-20 flex flex-col gap-2 md:flex-row md:items-center md:justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-green-600" />
          <h1 className="text-xl font-bold text-gray-900">Lista de Compras</h1>
        </div>
        {/* Busca global de produtos - destaque */}
        <div className="w-full md:w-[480px] mx-auto relative order-3 md:order-none">
          <Input
            placeholder="Buscar produto em todo o mercado..."
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            className="pl-10 text-lg border-2 border-green-500 shadow-lg focus:ring-4 focus:ring-green-200 transition h-14 font-semibold bg-green-50 placeholder:text-green-700"
          />
          {globalResults.length > 0 && (
            <div className="absolute left-0 right-0 top-16 bg-white border rounded shadow-lg z-30 max-h-60 overflow-auto">
              {globalResults.map(prod => (
                <button
                  key={prod.id}
                  className="w-full text-left px-4 py-2 hover:bg-green-50 flex items-center justify-between"
                  onClick={() => addProductMutation.mutate({ productId: prod.id })}
                >
                  <span>{prod.name}</span>
                  <Plus className="w-4 h-4 text-green-600" />
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Botão Compartilhar Lista - só ícone, sutil */}
        <button
          className="flex items-center justify-center text-gray-500 hover:text-blue-600 p-2 rounded-full border border-transparent hover:border-blue-200 bg-transparent transition order-2 md:order-none"
          onClick={() => setShowShareDialog(true)}
          title="Compartilhar Lista"
        >
          <Share2 className="w-6 h-6" />
        </button>
        <button
          className="flex items-center gap-1 text-green-700 hover:text-green-900 font-semibold px-3 py-1 rounded border border-green-100 bg-green-50 hover:bg-green-100 transition"
          onClick={() => { fetchUserLists(); setShowListsMenu((v) => !v); }}
        >
          <List className="w-5 h-5" /> Minhas Listas
        </button>
        {/* Menu dropdown de listas */}
        {showListsMenu && (
          <div className="absolute right-4 top-16 bg-white border rounded shadow-lg z-30 w-80 max-h-96 overflow-auto">
            <div className="p-2 font-bold border-b">Minhas Listas</div>
            {userLists.length === 0 && <div className="p-2 text-gray-500">Nenhuma lista encontrada</div>}
            {userLists.map(list => (
              <div key={list.id} className={`flex items-center gap-2 px-4 py-2 border-b last:border-b-0 ${currentList?.id === list.id ? 'bg-green-100 font-bold' : ''}`}> 
                {editingListId === list.id ? (
                  <>
                    <input
                      className="flex-1 border rounded p-1 text-sm"
                      value={editingListName}
                      onChange={e => setEditingListName(e.target.value)}
                      autoFocus
                    />
                    <button className="text-green-600 hover:text-green-800" onClick={() => handleSaveEditList(list)}><Check className="w-4 h-4" /></button>
                    <button className="text-gray-400 hover:text-red-500" onClick={() => setEditingListId(null)}><X className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <button
                      className="flex-1 text-left truncate"
                      onClick={() => handleLoadList(list)}
                    >
                      {list.name || 'Lista de Compras'}
                      {list.is_completed && <span className="ml-2 text-xs text-gray-400">(concluída)</span>}
                      <div className="text-xs text-gray-400">{formatDate(list.created_at)}</div>
                    </button>
                    <button className="text-blue-600 hover:text-blue-800" onClick={() => handleEditList(list)} title="Editar"><Edit className="w-4 h-4" /></button>
                    <button className="text-red-600 hover:text-red-800" onClick={() => handleDeleteList(list)} title="Excluir"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
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
                      <User className="h-3 w-3 text-blue-500" />
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
              disabled={!customProduct.trim() || addProductMutation.isPending || (similarProducts.length > 0)}
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {/* Sugestões de produtos similares */}
          {similarProducts.length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-gray-600 mb-1">Produtos similares encontrados:</div>
              <div className="flex flex-wrap gap-2">
                {similarProducts.map((prod) => (
                  <Button key={prod.id} size="sm" variant="outline" onClick={() => addProductMutation.mutate({ productId: prod.id })}>
                    {prod.name}
                  </Button>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2">Se não encontrou, continue digitando para cadastrar novo produto.</div>
            </div>
          )}
          {/* Seleção manual de categoria */}
          {showCategorySelect && (
            <div className="mt-2">
              <Label className="text-xs">Categoria:</Label>
              <select
                className="block w-full border rounded p-1 mt-1"
                value={manualCategory || ''}
                onChange={e => setManualCategory(e.target.value)}
              >
                <option value="">Selecione a categoria</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
          )}
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
                            <User className="h-3 w-3 text-blue-500" />
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
                              <User className="h-3 w-3 text-blue-500" />
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
            {/* Botão Salvar Lista */}
            <Button
              onClick={handleSaveList}
              className="w-full mb-2 bg-blue-600 hover:bg-blue-700"
              size="lg"
              variant="default"
            >
              <Save className="h-4 w-4 mr-2" /> Salvar Lista
            </Button>
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

      {/* Modal de confirmação para salvar lista */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Como deseja salvar sua lista?</AlertDialogTitle>
            <AlertDialogDescription>
              Você pode criar uma nova lista (duplicando os itens atuais) ou atualizar a lista existente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSaveDialogAction('nova')}>Criar Nova Lista</AlertDialogAction>
            <AlertDialogAction onClick={() => handleSaveDialogAction('existente')}>Salvar Existente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de compartilhamento */}
      <AlertDialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Compartilhar Lista</AlertDialogTitle>
            <AlertDialogDescription>
              Compartilhe sua lista de compras com outras pessoas!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            <button
              className="w-full flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded p-2 font-semibold justify-center"
              onClick={handleCopyLink}
            >
              {copied ? 'Link copiado!' : 'Copiar link da lista'}
            </button>
            <button
              className="w-full flex items-center gap-2 bg-green-100 hover:bg-green-200 rounded p-2 font-semibold justify-center text-green-800"
              onClick={handleShareWhatsApp}
            >
              Compartilhar no WhatsApp
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ShoppingList;
