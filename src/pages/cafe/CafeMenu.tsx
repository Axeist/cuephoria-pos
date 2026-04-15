import React, { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeMenu } from '@/hooks/cafe/useCafeMenu';
import { useCafeTables } from '@/hooks/cafe/useCafeTables';
import { useCafePartner } from '@/hooks/cafe/useCafePartner';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Plus, Pencil, Trash2, UtensilsCrossed, Leaf, X, Check, MapPin, Coffee, Upload, Download, Loader2, Search, EyeOff, Eye, ToggleLeft, ToggleRight, Package, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { CafeMenuItem } from '@/types/cafe.types';
import { CAFE_STOCK_ADMIN_PIN } from '@/constants/cafeInventory';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

const CafeMenu: React.FC = () => {
  const { user } = useCafeAuth();
  const isCafeAdmin = user?.role === 'cafe_admin';
  const { categories, items, addCategory, updateCategory, deleteCategory, addItem, updateItem, deleteItem, refresh, adjustStock } = useCafeMenu(user?.locationId);
  const { tables, zones, tablesByZone, addTable, updateTable, deleteTable } = useCafeTables(user?.locationId);
  const { partner } = useCafePartner(user?.locationId);
  const [activeTab, setActiveTab] = useState<'menu' | 'tables'>('menu');
  const [menuSearch, setMenuSearch] = useState('');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  const menuStats = useMemo(() => ({
    total: items.length,
    available: items.filter(i => i.isAvailable).length,
    unavailable: items.filter(i => !i.isAvailable).length,
    veg: items.filter(i => i.isVeg).length,
    nonVeg: items.filter(i => !i.isVeg).length,
    categories: categories.length,
    occupiedTables: tables.filter(t => t.isOccupied).length,
    totalTables: tables.length,
  }), [items, categories, tables]);

  // Category dialog
  const [catDialog, setCatDialog] = useState(false);
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catTracksInventory, setCatTracksInventory] = useState(false);

  // Item dialog
  const [itemDialog, setItemDialog] = useState(false);
  const [itemEditId, setItemEditId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ name: '', price: '', costPrice: '', description: '', categoryId: '', isVeg: true, prepTime: '', initialStock: '' });

  const [invDialog, setInvDialog] = useState<'add' | 'reduce' | null>(null);
  const [invItem, setInvItem] = useState<CafeMenuItem | null>(null);
  const [invQty, setInvQty] = useState('1');
  const [invPin, setInvPin] = useState('');

  // Table dialog
  const [tableDialog, setTableDialog] = useState(false);
  const [tableEditId, setTableEditId] = useState<string | null>(null);
  const [tableForm, setTableForm] = useState({ tableName: '', zone: 'indoor', capacity: '4' });

  // CSV upload
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvUploading, setCsvUploading] = useState(false);

  const downloadSampleCSV = () => {
    const header = 'category,name,price,cost_price,description,is_veg,prep_time_minutes';
    const rows = [
      'Starters,Masala Fries,149,60,Crispy fries with masala seasoning,true,10',
      'Starters,Paneer Tikka,199,80,Tandoori paneer cubes,true,15',
      'Starters,Chicken Wings,249,100,Spicy buffalo wings,false,12',
      'Main Course,Veg Biryani,229,90,Aromatic vegetable biryani,true,20',
      'Main Course,Chicken Biryani,279,110,Hyderabadi style biryani,false,25',
      'Beverages,Cold Coffee,129,40,Iced coffee with cream,true,5',
      'Beverages,Mango Shake,149,50,Fresh mango milkshake,true,5',
      'Beverages,Masala Chai,49,15,Indian spiced tea,true,5',
      'Desserts,Brownie,149,50,Warm chocolate brownie,true,8',
      'Desserts,Ice Cream Sundae,179,60,Vanilla with hot fudge,true,5',
    ];
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'cafe_menu_sample.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !partner || !user) return;
    setCsvUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { toast.error('CSV must have a header row and at least one data row'); return; }

      const header = lines[0].toLowerCase();
      if (!header.includes('category') || !header.includes('name') || !header.includes('price')) {
        toast.error('CSV must have columns: category, name, price'); return;
      }

      const cols = lines[0].split(',').map(c => c.trim().toLowerCase().replace(/\s+/g, '_'));
      const catIdx = cols.indexOf('category');
      const nameIdx = cols.indexOf('name');
      const priceIdx = cols.indexOf('price');
      const costIdx = cols.indexOf('cost_price');
      const descIdx = cols.indexOf('description');
      const vegIdx = cols.indexOf('is_veg');
      const prepIdx = cols.indexOf('prep_time_minutes');

      // Collect unique categories and auto-create missing ones
      const categoryMap = new Map<string, string>();
      categories.forEach(c => categoryMap.set(c.name.toLowerCase(), c.id));

      const dataRows = lines.slice(1);
      const newCategoryNames = new Set<string>();
      for (const line of dataRows) {
        const vals = parseCSVLine(line);
        const catName = vals[catIdx]?.trim();
        if (catName && !categoryMap.has(catName.toLowerCase())) {
          newCategoryNames.add(catName);
        }
      }

      // Create missing categories
      for (const catNameStr of newCategoryNames) {
        const cat = await addCategory(catNameStr, partner.id);
        if (cat) categoryMap.set(catNameStr.toLowerCase(), cat.id);
      }

      // Insert items
      let successCount = 0;
      let errorCount = 0;
      const itemRows: Array<Record<string, unknown>> = [];

      for (const line of dataRows) {
        const vals = parseCSVLine(line);
        const catName = vals[catIdx]?.trim();
        const itemName = vals[nameIdx]?.trim();
        const priceStr = vals[priceIdx]?.trim();
        if (!catName || !itemName || !priceStr) { errorCount++; continue; }

        const categoryId = categoryMap.get(catName.toLowerCase());
        if (!categoryId) { errorCount++; continue; }

        const price = parseFloat(priceStr);
        if (isNaN(price) || price <= 0) { errorCount++; continue; }

        itemRows.push({
          category_id: categoryId,
          location_id: user.locationId,
          name: itemName,
          price,
          cost_price: costIdx >= 0 && vals[costIdx]?.trim() ? parseFloat(vals[costIdx].trim()) || null : null,
          description: descIdx >= 0 ? vals[descIdx]?.trim() || null : null,
          is_veg: vegIdx >= 0 ? vals[vegIdx]?.trim().toLowerCase() !== 'false' : true,
          prep_time_minutes: prepIdx >= 0 && vals[prepIdx]?.trim() ? parseInt(vals[prepIdx].trim()) || null : null,
          sort_order: 0,
        });
      }

      if (itemRows.length > 0) {
        // Batch insert in chunks of 50
        for (let i = 0; i < itemRows.length; i += 50) {
          const chunk = itemRows.slice(i, i + 50);
          const { error } = await supabase.from('cafe_menu_items').insert(chunk);
          if (error) { console.error(error); errorCount += chunk.length; }
          else { successCount += chunk.length; }
        }
      }

      await refresh();
      toast.success(`Uploaded ${successCount} items${errorCount > 0 ? `, ${errorCount} skipped` : ''}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to process CSV');
    } finally {
      setCsvUploading(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  // Parse a CSV line respecting quoted fields
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
      current += ch;
    }
    result.push(current);
    return result;
  }

  const handleSaveCategory = async () => {
    if (!catName.trim() || !partner) return;
    if (catEditId) {
      const ok = await updateCategory(catEditId, { name: catName.trim(), tracksInventory: catTracksInventory });
      if (ok) toast.success('Category updated');
    } else {
      const cat = await addCategory(catName.trim(), partner.id, { tracksInventory: catTracksInventory });
      if (cat) toast.success('Category added');
    }
    setCatDialog(false); setCatName(''); setCatEditId(null); setCatTracksInventory(false);
  };

  const handleDeleteCategory = async (id: string) => {
    const catItems = items.filter(i => i.categoryId === id);
    if (catItems.length > 0) { toast.error('Remove all items from this category first'); return; }
    const ok = await deleteCategory(id);
    if (ok) toast.success('Category deleted');
  };

  const handleSaveItem = async () => {
    if (!itemForm.name.trim() || !itemForm.price || !itemForm.categoryId) return;
    const selectedCat = categories.find(c => c.id === itemForm.categoryId);
    const base = {
      name: itemForm.name.trim(),
      price: parseFloat(itemForm.price),
      costPrice: itemForm.costPrice ? parseFloat(itemForm.costPrice) : undefined,
      description: itemForm.description || undefined,
      categoryId: itemForm.categoryId,
      isVeg: itemForm.isVeg,
      prepTimeMinutes: itemForm.prepTime ? parseInt(itemForm.prepTime) : undefined,
    };
    if (itemEditId) {
      const upd = { ...base };
      if (selectedCat?.tracksInventory) {
        upd.stockQuantity = itemForm.initialStock.trim() === ''
          ? 0
          : Math.max(0, parseInt(itemForm.initialStock, 10) || 0);
      }
      const ok = await updateItem(itemEditId, upd);
      if (ok) toast.success('Item updated');
    } else {
      const extra = selectedCat?.tracksInventory
        ? {
            stockQuantity: itemForm.initialStock.trim() === ''
              ? 0
              : Math.max(0, parseInt(itemForm.initialStock, 10) || 0),
          }
        : {};
      const item = await addItem({ ...base, ...extra });
      if (item) toast.success('Item added');
    }
    setItemDialog(false); setItemEditId(null);
    setItemForm({ name: '', price: '', costPrice: '', description: '', categoryId: '', isVeg: true, prepTime: '', initialStock: '' });
  };

  const handleConfirmStockAdjust = async () => {
    if (!invItem || !invDialog) return;
    const q = parseInt(invQty, 10);
    if (Number.isNaN(q) || q <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    if (invDialog === 'reduce') {
      if (invPin !== CAFE_STOCK_ADMIN_PIN) {
        toast.error('Invalid admin PIN');
        return;
      }
      const ok = await adjustStock(invItem.id, q, 'reduce');
      if (ok) toast.success('Stock reduced');
      else toast.error('Could not update stock');
    } else {
      const ok = await adjustStock(invItem.id, q, 'add');
      if (ok) toast.success('Stock added');
      else toast.error('Could not update stock');
    }
    setInvDialog(null);
    setInvItem(null);
    setInvQty('1');
    setInvPin('');
  };

  const handleSaveTable = async () => {
    if (!tableForm.tableName.trim() || !partner) return;
    if (tableEditId) {
      const ok = await updateTable(tableEditId, { tableName: tableForm.tableName.trim(), zone: tableForm.zone, capacity: parseInt(tableForm.capacity) || 4 });
      if (ok) toast.success('Table updated');
    } else {
      const t = await addTable({ tableName: tableForm.tableName.trim(), zone: tableForm.zone, capacity: parseInt(tableForm.capacity) || 4, partnerId: partner.id });
      if (t) toast.success('Table added');
    }
    setTableDialog(false); setTableEditId(null);
    setTableForm({ tableName: '', zone: 'indoor', capacity: '4' });
  };

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text font-heading animate-slide-down">Menu & Tables</h1>
        <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
          <button onClick={() => setActiveTab('menu')} className={`px-4 py-2 rounded-md text-sm font-quicksand ${activeTab === 'menu' ? 'bg-orange-500/20 text-orange-400' : 'text-gray-400'}`}>
            <UtensilsCrossed className="h-4 w-4 inline mr-1" /> Menu
          </button>
          <button onClick={() => setActiveTab('tables')} className={`px-4 py-2 rounded-md text-sm font-quicksand ${activeTab === 'tables' ? 'bg-orange-500/20 text-orange-400' : 'text-gray-400'}`}>
            <MapPin className="h-4 w-4 inline mr-1" /> Tables
          </button>
        </div>
      </div>

      {activeTab === 'menu' ? (
        <div className="space-y-4">
          {/* Categories */}
          <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 animate-slide-up">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-heading text-white">Categories</CardTitle>
              <Button size="sm" onClick={() => { setCatDialog(true); setCatEditId(null); setCatName(''); setCatTracksInventory(false); }}
                className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-0">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-800/50 border border-gray-700/30 group">
                    {cat.tracksInventory && (
                      <Package className="h-3 w-3 text-amber-400/90 shrink-0" aria-hidden />
                    )}
                    <span className="text-sm text-white font-quicksand">{cat.name}</span>
                    <span className="text-xs text-gray-500">({items.filter(i => i.categoryId === cat.id).length})</span>
                    <button onClick={() => { setCatEditId(cat.id); setCatName(cat.name); setCatTracksInventory(cat.tracksInventory); setCatDialog(true); }} className="opacity-0 group-hover:opacity-100 ml-1"><Pencil className="h-3 w-3 text-gray-400" /></button>
                    {isCafeAdmin && (
                      <button onClick={() => handleDeleteCategory(cat.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3 text-red-400" /></button>
                    )}
                  </div>
                ))}
                {categories.length === 0 && <p className="text-sm text-gray-500 font-quicksand">No categories yet. Add one to get started.</p>}
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardHeader className="space-y-3">
              <div className="flex flex-row items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base font-heading text-white">Menu Items</CardTitle>
                  <span className="text-xs font-quicksand text-gray-500">
                    {menuStats.available}/{menuStats.total} available
                    {' · '}{menuStats.veg} veg · {menuStats.nonVeg} non-veg
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isCafeAdmin && (
                    <>
                      <Button size="sm" onClick={downloadSampleCSV} variant="outline" className="border-gray-700 text-gray-400 hover:text-white text-xs">
                        <Download className="h-3.5 w-3.5 mr-1" /> Sample CSV
                      </Button>
                      <Button size="sm" onClick={() => csvInputRef.current?.click()} disabled={csvUploading}
                        variant="outline" className="border-gray-700 text-gray-400 hover:text-white text-xs">
                        {csvUploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                        Upload CSV
                      </Button>
                      <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                    </>
                  )}
                  <Button size="sm" onClick={() => {
                    setItemDialog(true); setItemEditId(null);
                    setItemForm({ name: '', price: '', costPrice: '', description: '', categoryId: categories[0]?.id || '', isVeg: true, prepTime: '', initialStock: '' });
                  }} className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-0" disabled={categories.length === 0}>
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                  <Input value={menuSearch} onChange={e => setMenuSearch(e.target.value)}
                    placeholder="Search menu items..." className="h-8 pl-8 text-xs bg-gray-800/50 border-gray-700/50 text-white font-quicksand" />
                  {menuSearch && (
                    <button onClick={() => setMenuSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="h-3 w-3 text-gray-500" />
                    </button>
                  )}
                </div>
                <button onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-quicksand transition-all ${
                    showOnlyAvailable ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-800/50 text-gray-400 border border-gray-700/30'
                  }`}>
                  {showOnlyAvailable ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {showOnlyAvailable ? 'Available only' : 'Show all'}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-30rem)]">
                <div className="space-y-2">
                  {categories.map(cat => {
                    const catTracks = cat.tracksInventory;
                    let catItems = items.filter(i => i.categoryId === cat.id);
                    if (showOnlyAvailable) catItems = catItems.filter(i => i.isAvailable);
                    if (menuSearch) {
                      const q = menuSearch.toLowerCase();
                      catItems = catItems.filter(i => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
                    }
                    if (catItems.length === 0) return null;
                    return (
                      <div key={cat.id}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-quicksand flex items-center gap-1.5">
                            {catTracks && <Package className="h-3 w-3 text-amber-400/80" />}
                            {cat.name} ({catItems.length})
                          </p>
                          <button onClick={async () => {
                            const allAvailable = catItems.every(i => i.isAvailable);
                            for (const item of catItems) {
                              await updateItem(item.id, { isAvailable: !allAvailable });
                            }
                            toast.success(`${cat.name}: all items ${allAvailable ? 'hidden' : 'shown'}`);
                          }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-400 transition-colors font-quicksand" title="Toggle all availability">
                            {catItems.every(i => i.isAvailable) ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                            Toggle all
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                          {catItems.map(item => {
                            const tracksItem = catTracks;
                            return (
                            <div key={item.id} className={`p-3 rounded-lg border group hover:border-orange-500/30 transition-all ${
                              item.isAvailable ? 'bg-gray-800/40 border-gray-700/30' : 'bg-gray-800/20 border-red-500/20 opacity-60'
                            }`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-white font-quicksand flex items-center gap-1">
                                    <span className={`h-2.5 w-2.5 rounded-sm border ${item.isVeg ? 'border-green-400' : 'border-red-400'}`}>
                                      <span className={`block h-1 w-1 rounded-full m-[2px] ${item.isVeg ? 'bg-green-400' : 'bg-red-400'}`} />
                                    </span>
                                    {item.name}
                                  </p>
                                  {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => {
                                    setItemEditId(item.id);
                                    setItemForm({ name: item.name, price: String(item.price), costPrice: item.costPrice ? String(item.costPrice) : '', description: item.description || '', categoryId: item.categoryId, isVeg: item.isVeg, prepTime: item.prepTimeMinutes ? String(item.prepTimeMinutes) : '', initialStock: String(item.stockQuantity ?? 0) });
                                    setItemDialog(true);
                                  }}><Pencil className="h-3 w-3 text-gray-400 hover:text-white" /></button>
                                  {isCafeAdmin && (
                                    <button onClick={async () => { await deleteItem(item.id); toast.success('Item deleted'); }}><Trash2 className="h-3 w-3 text-red-400" /></button>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-orange-400"><CurrencyDisplay amount={item.price} /></span>
                                  {item.costPrice && (
                                    <span className="text-xs text-gray-600">cost: <CurrencyDisplay amount={item.costPrice} /></span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {item.prepTimeMinutes && <span className="text-xs text-gray-500">{item.prepTimeMinutes}min</span>}
                                  <button onClick={() => updateItem(item.id, { isAvailable: !item.isAvailable })}
                                    className={`text-xs px-2 py-0.5 rounded-full transition-all ${item.isAvailable ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {item.isAvailable ? 'Available' : 'Unavailable'}
                                  </button>
                                </div>
                              </div>
                              {tracksItem && (
                                <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-700/40">
                                  <span className="text-xs text-gray-400 font-quicksand">
                                    Stock: <span className="text-white font-semibold tabular-nums">{item.stockQuantity}</span>
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <Button type="button" size="sm" variant="outline"
                                      className="h-7 text-[10px] px-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                                      onClick={() => { setInvItem(item); setInvDialog('add'); setInvQty('1'); setInvPin(''); }}>
                                      <Plus className="h-3 w-3 mr-0.5" /> Add stock
                                    </Button>
                                    <Button type="button" size="sm" variant="outline"
                                      className="h-7 text-[10px] px-2 border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
                                      onClick={() => { setInvItem(item); setInvDialog('reduce'); setInvQty('1'); setInvPin(''); }}>
                                      <Minus className="h-3 w-3 mr-0.5" /> Reduce stock
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <UtensilsCrossed className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="font-quicksand text-sm">No menu items yet</p>
                      <p className="font-quicksand text-xs text-gray-600 mt-1">Add items manually or upload a CSV file</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Tables Tab */
        <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-heading text-white">Tables & Zones</CardTitle>
            <Button size="sm" onClick={() => { setTableDialog(true); setTableEditId(null); setTableForm({ tableName: '', zone: zones[0] || 'indoor', capacity: '4' }); }}
              className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-0">
              <Plus className="h-4 w-4 mr-1" /> Add Table
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-20rem)]">
              {zones.length === 0 && tables.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MapPin className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="font-quicksand">No tables yet. Add your first table to create a zone.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {zones.map(zone => (
                    <div key={zone}>
                      <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-3 font-quicksand flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-orange-400" /> {zone}
                        <span className="text-xs text-gray-600">({(tablesByZone[zone] || []).length} tables)</span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {(tablesByZone[zone] || []).map(table => (
                          <div key={table.id} className={`p-3 rounded-xl border-2 transition-all group ${
                            table.isOccupied ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/30 bg-green-500/5 hover:border-green-500/60'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-base font-bold text-white font-heading">{table.tableName}</span>
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                                <button onClick={() => {
                                  setTableEditId(table.id);
                                  setTableForm({ tableName: table.tableName, zone: table.zone, capacity: String(table.capacity) });
                                  setTableDialog(true);
                                }}><Pencil className="h-3 w-3 text-gray-400" /></button>
                                {isCafeAdmin && !table.isOccupied && <button onClick={async () => { await deleteTable(table.id); toast.success('Table removed'); }}><Trash2 className="h-3 w-3 text-red-400" /></button>}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">{table.capacity} seats</p>
                            <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${
                              table.isOccupied ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                            }`}>
                              {table.isOccupied ? 'Occupied' : 'Available'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Category Dialog */}
      <Dialog open={catDialog} onOpenChange={(open) => {
        setCatDialog(open);
        if (!open) { setCatEditId(null); setCatName(''); setCatTracksInventory(false); }
      }}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader><DialogTitle className="text-white font-heading">{catEditId ? 'Edit Category' : 'Add Category'}</DialogTitle></DialogHeader>
          <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category name" className="bg-gray-800/50 border-gray-700 text-white" autoFocus />
          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-700/50 bg-gray-800/30 px-3 py-2.5">
            <div className="space-y-0.5 min-w-0">
              <Label htmlFor="cat-tracks-inv" className="text-white text-sm font-quicksand cursor-pointer">Track inventory</Label>
              <p className="text-xs text-gray-500 font-quicksand">Stock counts and add/reduce controls for items in this category.</p>
            </div>
            <Switch id="cat-tracks-inv" checked={catTracksInventory} onCheckedChange={setCatTracksInventory} className="shrink-0 data-[state=checked]:bg-orange-500" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)} className="border-gray-700 text-gray-400">Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={!catName.trim()} style={{ background: 'linear-gradient(135deg, #f97316, #6E59A5)' }} className="text-white border-0">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={invDialog !== null} onOpenChange={(open) => {
        if (!open) { setInvDialog(null); setInvItem(null); setInvQty('1'); setInvPin(''); }
      }}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white font-heading">{invDialog === 'reduce' ? 'Reduce stock' : 'Add stock'}</DialogTitle>
          </DialogHeader>
          {invItem && (
            <p className="text-sm text-gray-400 font-quicksand truncate" title={invItem.name}>{invItem.name}</p>
          )}
          {invDialog === 'reduce' && (
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs font-quicksand">Admin PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={invPin}
                onChange={e => setInvPin(e.target.value)}
                placeholder="Enter PIN"
                className="bg-gray-800/50 border-gray-700 text-white"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs font-quicksand">Quantity</Label>
            <Input
              type="number"
              min={1}
              value={invQty}
              onChange={e => setInvQty(e.target.value)}
              className="bg-gray-800/50 border-gray-700 text-white"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setInvDialog(null); setInvItem(null); setInvPin(''); }} className="border-gray-700 text-gray-400">Cancel</Button>
            <Button onClick={handleConfirmStockAdjust} style={{ background: 'linear-gradient(135deg, #f97316, #6E59A5)' }} className="text-white border-0">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader><DialogTitle className="text-white font-heading">{itemEditId ? 'Edit Item' : 'Add Item'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} placeholder="Item name" className="bg-gray-800/50 border-gray-700 text-white" />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} placeholder="Price" className="bg-gray-800/50 border-gray-700 text-white" />
              <Input type="number" value={itemForm.costPrice} onChange={e => setItemForm(f => ({ ...f, costPrice: e.target.value }))} placeholder="Cost price (optional)" className="bg-gray-800/50 border-gray-700 text-white" />
            </div>
            <Input value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" className="bg-gray-800/50 border-gray-700 text-white" />
            <select value={itemForm.categoryId} onChange={e => setItemForm(f => ({ ...f, categoryId: e.target.value }))}
              className="w-full h-10 px-3 rounded-md bg-gray-800/50 border border-gray-700 text-white text-sm">
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex items-center gap-4">
              <button onClick={() => setItemForm(f => ({ ...f, isVeg: !f.isVeg }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-quicksand ${itemForm.isVeg ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                <Leaf className="h-4 w-4" /> {itemForm.isVeg ? 'Veg' : 'Non-Veg'}
              </button>
              <Input type="number" value={itemForm.prepTime} onChange={e => setItemForm(f => ({ ...f, prepTime: e.target.value }))}
                placeholder="Prep time (min)" className="bg-gray-800/50 border-gray-700 text-white flex-1" />
            </div>
            {categories.find(c => c.id === itemForm.categoryId)?.tracksInventory && (
              <div className="space-y-1.5">
                <Label className="text-gray-400 text-xs font-quicksand">{itemEditId ? 'Stock on hand' : 'Initial stock'}</Label>
                <Input
                  type="number"
                  min={0}
                  value={itemForm.initialStock}
                  onChange={e => setItemForm(f => ({ ...f, initialStock: e.target.value }))}
                  placeholder="0"
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)} className="border-gray-700 text-gray-400">Cancel</Button>
            <Button onClick={handleSaveItem} disabled={!itemForm.name.trim() || !itemForm.price} style={{ background: 'linear-gradient(135deg, #f97316, #6E59A5)' }} className="text-white border-0">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Dialog */}
      <Dialog open={tableDialog} onOpenChange={setTableDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader><DialogTitle className="text-white font-heading">{tableEditId ? 'Edit Table' : 'Add Table'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={tableForm.tableName} onChange={e => setTableForm(f => ({ ...f, tableName: e.target.value }))} placeholder="Table name (e.g. T1, R-5)" className="bg-gray-800/50 border-gray-700 text-white" autoFocus />
            <Input value={tableForm.zone} onChange={e => setTableForm(f => ({ ...f, zone: e.target.value }))} placeholder="Zone (e.g. indoor, rooftop, counter)" className="bg-gray-800/50 border-gray-700 text-white" list="zone-suggestions" />
            <datalist id="zone-suggestions">
              {zones.map(z => <option key={z} value={z} />)}
              <option value="indoor" /><option value="rooftop" /><option value="counter" />
            </datalist>
            <Input type="number" value={tableForm.capacity} onChange={e => setTableForm(f => ({ ...f, capacity: e.target.value }))} placeholder="Capacity (seats)" className="bg-gray-800/50 border-gray-700 text-white" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTableDialog(false)} className="border-gray-700 text-gray-400">Cancel</Button>
            <Button onClick={handleSaveTable} disabled={!tableForm.tableName.trim()} style={{ background: 'linear-gradient(135deg, #f97316, #6E59A5)' }} className="text-white border-0">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CafeMenu;
