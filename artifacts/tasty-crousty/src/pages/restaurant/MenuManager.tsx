import React, { useState } from "react";
import { formatDA } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMenuCategories, useCreateMenuCategory, useDeleteMenuCategory,
  useListProducts, useCreateProduct, useDeleteProduct, useUpdateProduct,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Trash2, Edit2, ChefHat, Tag, Search, Loader2, PackageOpen,
} from "lucide-react";

interface Props {
  restaurantId: number;
}

function AddCategoryDialog({ restaurantId, open, onClose }: { restaurantId: number; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const create = useCreateMenuCategory();
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");

  const handleSave = () => {
    if (!name.trim()) { toast({ title: "Le nom est requis", variant: "destructive" }); return; }
    create.mutate(
      { restaurantId, data: { name: name.trim(), nameAr: nameAr.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Catégorie ajoutée ✓" });
          qc.invalidateQueries({ queryKey: [`/api/restaurants/${restaurantId}/categories`] });
          setName(""); setNameAr(""); onClose();
        },
        onError: (e: any) => toast({ title: "Erreur", description: e?.response?.data?.error, variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> Nouvelle catégorie</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Nom (français) <span className="text-destructive">*</span></Label>
            <Input id="cat-name" placeholder="Ex: Burgers, Pizzas, Boissons…" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-ar">Nom en arabe <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
            <Input id="cat-ar" dir="rtl" placeholder="مثال: برغر، بيتزا…" value={nameAr} onChange={e => setNameAr(e.target.value)} className="text-right" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ProductForm {
  name: string;
  nameAr: string;
  description: string;
  price: string;
  categoryId: string;
  preparationTime: string;
  isAvailable: boolean;
}

function ProductDialog({
  restaurantId, categories, product, open, onClose,
}: {
  restaurantId: number;
  categories: any[];
  product?: any;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const isEdit = !!product;

  const [form, setForm] = useState<ProductForm>({
    name: product?.name ?? "",
    nameAr: product?.nameAr ?? "",
    description: product?.description ?? "",
    price: product?.price != null ? String(product.price) : "",
    categoryId: product?.categoryId != null ? String(product.categoryId) : (categories[0]?.id ? String(categories[0].id) : ""),
    preparationTime: product?.preparationTime != null ? String(product.preparationTime) : "",
    isAvailable: product?.isAvailable ?? true,
  });

  React.useEffect(() => {
    if (open) {
      setForm({
        name: product?.name ?? "",
        nameAr: product?.nameAr ?? "",
        description: product?.description ?? "",
        price: product?.price != null ? String(product.price) : "",
        categoryId: product?.categoryId != null ? String(product.categoryId) : (categories[0]?.id ? String(categories[0].id) : ""),
        preparationTime: product?.preparationTime != null ? String(product.preparationTime) : "",
        isAvailable: product?.isAvailable ?? true,
      });
    }
  }, [open, product?.id]);

  const field = (key: keyof ProductForm) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  const handleSave = () => {
    if (!form.name.trim()) { toast({ title: "Le nom est requis", variant: "destructive" }); return; }
    if (!form.price || isNaN(Number(form.price))) { toast({ title: "Prix invalide", variant: "destructive" }); return; }
    if (!form.categoryId) { toast({ title: "Choisissez une catégorie", variant: "destructive" }); return; }

    const data = {
      name: form.name.trim(),
      nameAr: form.nameAr.trim() || undefined,
      description: form.description.trim() || undefined,
      price: Number(form.price),
      categoryId: Number(form.categoryId),
      preparationTime: form.preparationTime ? Number(form.preparationTime) : undefined,
      isAvailable: form.isAvailable,
    };

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: [`/api/restaurants/${restaurantId}/products`] });
      categories.forEach(c => qc.invalidateQueries({ queryKey: [`/api/restaurants/${restaurantId}/products`] }));
    };

    if (isEdit) {
      update.mutate(
        { productId: product.id, data },
        {
          onSuccess: () => { toast({ title: "Plat mis à jour ✓" }); invalidate(); onClose(); },
          onError: (e: any) => toast({ title: "Erreur", description: e?.response?.data?.error, variant: "destructive" }),
        }
      );
    } else {
      create.mutate(
        { restaurantId, data },
        {
          onSuccess: () => { toast({ title: "Plat ajouté ✓" }); invalidate(); onClose(); },
          onError: (e: any) => toast({ title: "Erreur", description: e?.response?.data?.error, variant: "destructive" }),
        }
      );
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-primary" />
            {isEdit ? "Modifier le plat" : "Ajouter un plat"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nom (français) <span className="text-destructive">*</span></Label>
              <Input placeholder="Ex: Burger Classic" {...field("name")} />
            </div>
            <div className="space-y-1.5">
              <Label>Nom en arabe</Label>
              <Input dir="rtl" placeholder="برغر كلاسيك" {...field("nameAr")} className="text-right" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea placeholder="Décrivez votre plat…" rows={2} {...field("description")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prix (DA) <span className="text-destructive">*</span></Label>
              <Input type="number" placeholder="850" {...field("price")} />
            </div>
            <div className="space-y-1.5">
              <Label>Temps de préparation (min)</Label>
              <Input type="number" placeholder="15" {...field("preparationTime")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Catégorie <span className="text-destructive">*</span></Label>
            <Select value={form.categoryId} onValueChange={val => setForm(f => ({ ...f, categoryId: val }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choisissez une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="available"
              checked={form.isAvailable}
              onCheckedChange={val => setForm(f => ({ ...f, isAvailable: val }))}
            />
            <Label htmlFor="available" className="cursor-pointer">Disponible à la commande</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {isEdit ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MenuManager({ restaurantId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [deleteCatId, setDeleteCatId] = useState<number | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);
  const [activeCatId, setActiveCatId] = useState<number | null>(null);
  const [searchProduct, setSearchProduct] = useState("");

  const deleteCat = useDeleteMenuCategory();
  const deleteProduct = useDeleteProduct();

  const { data: categories = [], isLoading: loadingCats } = useListMenuCategories(restaurantId, { query: { refetchOnMount: true } });
  const { data: allProducts = [], isLoading: loadingProducts } = useListProducts(restaurantId, {}, { query: { refetchOnMount: true } });

  const cats = categories as any[];
  const products = allProducts as any[];

  const selectedCat = activeCatId ?? (cats[0]?.id ?? null);

  const visibleProducts = products.filter((p: any) => {
    const matchCat = selectedCat == null || p.categoryId === selectedCat;
    const matchSearch = !searchProduct || p.name.toLowerCase().includes(searchProduct.toLowerCase()) || (p.nameAr && p.nameAr.includes(searchProduct));
    return matchCat && matchSearch;
  });

  const handleDeleteCat = () => {
    if (!deleteCatId) return;
    deleteCat.mutate({ categoryId: deleteCatId }, {
      onSuccess: () => {
        toast({ title: "Catégorie supprimée" });
        qc.invalidateQueries({ queryKey: [`/api/restaurants/${restaurantId}/categories`] });
        if (activeCatId === deleteCatId) setActiveCatId(null);
        setDeleteCatId(null);
      },
      onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
    });
  };

  const handleDeleteProduct = () => {
    if (!deleteProductId) return;
    deleteProduct.mutate({ productId: deleteProductId }, {
      onSuccess: () => {
        toast({ title: "Plat supprimé" });
        qc.invalidateQueries({ queryKey: [`/api/restaurants/${restaurantId}/products`] });
        setDeleteProductId(null);
      },
      onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Gestion du menu</h3>
          <p className="text-sm text-muted-foreground">{cats.length} catégorie{cats.length !== 1 ? "s" : ""} · {products.length} plat{products.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => setAddCatOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nouvelle catégorie
        </Button>
      </div>

      <div className="flex gap-4">
        {/* Category sidebar */}
        <aside className="w-48 shrink-0 space-y-1">
          {loadingCats ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-9 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : cats.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Aucune catégorie
            </div>
          ) : (
            cats.map((cat: any) => (
              <div
                key={cat.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors group ${selectedCat === cat.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setActiveCatId(cat.id)}
              >
                <span className="font-medium truncate">{cat.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); setDeleteCatId(cat.id); }}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity ml-1 ${selectedCat === cat.id ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-destructive"}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </aside>

        {/* Products panel */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un plat…"
                value={searchProduct}
                onChange={e => setSearchProduct(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button
              size="sm"
              onClick={() => setAddProductOpen(true)}
              disabled={cats.length === 0}
              title={cats.length === 0 ? "Créez d'abord une catégorie" : ""}
            >
              <Plus className="w-4 h-4 mr-1" /> Ajouter un plat
            </Button>
          </div>

          {loadingProducts ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <PackageOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">{cats.length === 0 ? "Commencez par créer une catégorie" : "Aucun plat dans cette catégorie"}</p>
              {cats.length > 0 && (
                <Button variant="ghost" size="sm" className="mt-3" onClick={() => setAddProductOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Ajouter votre premier plat
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleProducts.map((product: any) => (
                <Card key={product.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{product.name}</span>
                          {product.nameAr && <span className="text-xs text-muted-foreground" dir="rtl">{product.nameAr}</span>}
                          {!product.isAvailable && (
                            <Badge variant="secondary" className="text-xs">Indisponible</Badge>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{product.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="font-bold text-primary text-sm">{formatDA(product.price)}</span>
                          {product.preparationTime && (
                            <span className="text-xs text-muted-foreground">⏱ {product.preparationTime} min</span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {cats.find((c: any) => c.id === product.categoryId)?.name ?? "?"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => { setEditProduct(product); setAddProductOpen(true); }}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => setDeleteProductId(product.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddCategoryDialog restaurantId={restaurantId} open={addCatOpen} onClose={() => setAddCatOpen(false)} />

      <ProductDialog
        restaurantId={restaurantId}
        categories={cats}
        product={editProduct}
        open={addProductOpen}
        onClose={() => { setAddProductOpen(false); setEditProduct(null); }}
      />

      <AlertDialog open={deleteCatId !== null} onOpenChange={(o) => { if (!o) setDeleteCatId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. Les plats associés resteront en base mais ne seront plus affichés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCat} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteProductId !== null} onOpenChange={(o) => { if (!o) setDeleteProductId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce plat ?</AlertDialogTitle>
            <AlertDialogDescription>Le plat sera retiré de votre menu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
