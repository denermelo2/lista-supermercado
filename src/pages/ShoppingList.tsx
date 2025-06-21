import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Plus, User, Check, X, ShoppingCart, Minus } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { useToast } from "../components/ui/use-toast";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../components/ui/collapsible";
import Checkbox from "../components/ui/checkbox";
// ...demais imports e interfaces

// Função debounce customizada
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const ShoppingList = () => {
  // ... estados já existentes
  const [currentList, setCurrentList] = useState<ShoppingListType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customProduct, setCustomProduct] = useState('');
  const [storeName, setStoreName] = useState('');
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const { toast } = useToast();

  // Novos estados para autocomplete
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const debouncedCustomProduct = useDebounce(customProduct, 300);

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

  // Buscar produtos por categoria (produtos populares)
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
        .select('*, product:products(*)')
        .eq('list_id', currentList.id)
        .order('id');
      if (error) throw error;
      return data as ListItem[];
    },
    enabled: !!currentList?.id
  });

  // Função para buscar sugestões de produtos no banco (autocomplete)
  const fetchProductSuggestions = useCallback(async (name: string) => {
    if (!name || name.length < 2) {
      setSuggestedProducts([]);
      return;
    }
    setSearchLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike('name', `%${name}%`)
      .order('usage_count', { ascending: false })
      .limit(5);
    if (!error && data) setSuggestedProducts(data);
    setSearchLoading(false);
  }, []);

  // Efeito para buscar sugestões com debounce
  useEffect(() => {
    fetchProductSuggestions(debouncedCustomProduct);
  }, [debouncedCustomProduct, fetchProductSuggestions]);

  // Função para adicionar produto sugerido direto à lista
  const handleAddSuggested = (productId: string) => {
    addProductMutation.mutate({ productId });
    setCustomProduct('');
    setSuggestedProducts([]);
  };

  // ...mutations de addProductMutation, updateQuantityMutation, etc.
  // ...demais funções do componente

  // Aqui começa o JSX do componente:
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header, categorias, lista de compras, etc. */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <Label htmlFor="custom-product" className="font-medium text-gray-900">
          Adicionar produto personalizado
        </Label>
        <div className="flex gap-2 mt-2 relative">
          <Input
            id="custom-product"
            value={customProduct}
            onChange={e => setCustomProduct(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 150)}
            placeholder="Digite o nome do produto..."
            className="flex-1"
            autoComplete="off"
          />
          <Button
            onClick={() => addProductMutation.mutate({ customName: customProduct })}
            disabled={!customProduct.trim() || addProductMutation.isPending}
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {(inputFocused && suggestedProducts.length > 0) && (
            <div className="absolute z-50 left-0 top-full w-full bg-white border rounded shadow mt-1 max-h-60 overflow-y-auto">
              <div className="text-xs text-gray-500 p-2">Sugestões:</div>
              {suggestedProducts.map(product => (
                <button
                  key={product.id}
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between"
                  onMouseDown={() => handleAddSuggested(product.id)}
                  disabled={addProductMutation.isPending}
                >
                  <span>{product.name}</span>
                  {product.user_suggested && (
                    <User className="inline h-3 w-3 ml-1 text-blue-500" title="Sugerido por usuário" />
                  )}
                </button>
              ))}
              {searchLoading && (
                <div className="p-2 text-xs text-gray-400">Buscando...</div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* ...restante do seu componente */}
    </div>
  );
};

export default ShoppingList;
