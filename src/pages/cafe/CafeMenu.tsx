import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeMenu } from '@/hooks/cafe/useCafeMenu';
import { useCafeTables } from '@/hooks/cafe/useCafeTables';
import { useCafePartner } from '@/hooks/cafe/useCafePartner';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Plus, Pencil, Trash2, UtensilsCrossed, Leaf, X, Check, MapPin, Coffee } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

const CafeMenu: React.FC = () => {
  const { user } = useCafeAuth();
  const { categories, items, addCategory, updateCategory, deleteCategory, addItem, updateItem, deleteItem } = useCafeMenu(user?.locationId);
  const { tables, zones, tablesByZone, addTable, updateTable, deleteTable } = useCafeTables(user?.locationId);
  const { partner } = useCafePartner(user?.locationId);
  const [activeTab, setActiveTab] = useState<'menu' | 'tables'>('menu');

  // Category dialog
  const [catDialog, setCatDialog] = useState(false);
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');

  // Item dialog
  const [itemDialog, setItemDialog] = useState(false);
  const [itemEditId, setItemEditId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ name: '', price: '', costPrice: '', description: '', categoryId: '', isVeg: true, prepTime: '' });

  // Table dialog
  const [tableDialog, setTableDialog] = useState(false);
  const [tableEditId, setTableEditId] = useState<string | null>(null);
  const [tableForm, setTableForm] = useState({ tableName: '', zone: 'indoor', capacity: '4' });

  const handleSaveCategory = async () => {
    if (!catName.trim() || !partner) return;
    if (catEditId) {
      const ok = await updateCategory(catEditId, { name: catName.trim() });
      if (ok) toast.success('Category updated');
    } else {
      const cat = await addCategory(catName.trim(), partner.id);
      if (cat) toast.success('Category added');
    }
    setCatDialog(false); setCatName(''); setCatEditId(null);
  };

  const handleDeleteCategory = async (id: string) => {
    const catItems = items.filter(i => i.categoryId === id);
    if (catItems.length > 0) { toast.error('Remove all items from this category first'); return; }
    const ok = await deleteCategory(id);
    if (ok) toast.success('Category deleted');
  };

  const handleSaveItem = async () => {
    if (!itemForm.name.trim() || !itemForm.price || !itemForm.categoryId) return;
    const data = {
      name: itemForm.name.trim(),
      price: parseFloat(itemForm.price),
      costPrice: itemForm.costPrice ? parseFloat(itemForm.costPrice) : undefined,
      description: itemForm.description || undefined,
      categoryId: itemForm.categoryId,
      isVeg: itemForm.isVeg,
      prepTimeMinutes: itemForm.prepTime ? parseInt(itemForm.prepTime) : undefined,
    };
    if (itemEditId) {
      const ok = await updateItem(itemEditId, data);
      if (ok) toast.success('Item updated');
    } else {
      const item = await addItem(data);
      if (item) toast.success('Item added');
    }
    setItemDialog(false); setItemEditId(null);
    setItemForm({ name: '', price: '', costPrice: '', description: '', categoryId: '', isVeg: true, prepTime: '' });
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
              <Button size="sm" onClick={() => { setCatDialog(true); setCatEditId(null); setCatName(''); }}
                className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-0">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-800/50 border border-gray-700/30 group">
                    <span className="text-sm text-white font-quicksand">{cat.name}</span>
                    <span className="text-xs text-gray-500">({items.filter(i => i.categoryId === cat.id).length})</span>
                    <button onClick={() => { setCatEditId(cat.id); setCatName(cat.name); setCatDialog(true); }} className="opacity-0 group-hover:opacity-100 ml-1"><Pencil className="h-3 w-3 text-gray-400" /></button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3 text-red-400" /></button>
                  </div>
                ))}
                {categories.length === 0 && <p className="text-sm text-gray-500 font-quicksand">No categories yet. Add one to get started.</p>}
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-heading text-white">Menu Items</CardTitle>
              <Button size="sm" onClick={() => {
                setItemDialog(true); setItemEditId(null);
                setItemForm({ name: '', price: '', costPrice: '', description: '', categoryId: categories[0]?.id || '', isVeg: true, prepTime: '' });
              }} className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-0" disabled={categories.length === 0}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-28rem)]">
                <div className="space-y-2">
                  {categories.map(cat => {
                    const catItems = items.filter(i => i.categoryId === cat.id);
                    if (catItems.length === 0) return null;
                    return (
                      <div key={cat.id}>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-quicksand">{cat.name}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                          {catItems.map(item => (
                            <div key={item.id} className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/30 group hover:border-orange-500/30 transition-all">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-white font-quicksand flex items-center gap-1">
                                    <span className={`h-2.5 w-2.5 rounded-sm border ${item.isVeg ? 'border-green-400' : 'border-red-400'}`}>
                                      <span className={`block h-1 w-1 rounded-full m-[2px] ${item.isVeg ? 'bg-green-400' : 'bg-red-400'}`} />
                                    </span>
                                    {item.name}
                                  </p>
                                  {item.description && <p className="text-[10px] text-gray-500 mt-0.5">{item.description}</p>}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => {
                                    setItemEditId(item.id);
                                    setItemForm({ name: item.name, price: String(item.price), costPrice: item.costPrice ? String(item.costPrice) : '', description: item.description || '', categoryId: item.categoryId, isVeg: item.isVeg, prepTime: item.prepTimeMinutes ? String(item.prepTimeMinutes) : '' });
                                    setItemDialog(true);
                                  }}><Pencil className="h-3 w-3 text-gray-400 hover:text-white" /></button>
                                  <button onClick={async () => { await deleteItem(item.id); toast.success('Item deleted'); }}><Trash2 className="h-3 w-3 text-red-400" /></button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-sm font-bold text-orange-400"><CurrencyDisplay amount={item.price} /></span>
                                <div className="flex items-center gap-2">
                                  {item.prepTimeMinutes && <span className="text-[10px] text-gray-500">{item.prepTimeMinutes}min</span>}
                                  <button onClick={() => updateItem(item.id, { isAvailable: !item.isAvailable })}
                                    className={`text-[10px] px-2 py-0.5 rounded-full ${item.isAvailable ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {item.isAvailable ? 'Available' : 'Unavailable'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
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
                                {!table.isOccupied && <button onClick={async () => { await deleteTable(table.id); toast.success('Table removed'); }}><Trash2 className="h-3 w-3 text-red-400" /></button>}
                              </div>
                            </div>
                            <p className="text-[10px] text-gray-500">{table.capacity} seats</p>
                            <span className={`text-[10px] mt-1 inline-block px-2 py-0.5 rounded-full ${
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
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader><DialogTitle className="text-white font-heading">{catEditId ? 'Edit Category' : 'Add Category'}</DialogTitle></DialogHeader>
          <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category name" className="bg-gray-800/50 border-gray-700 text-white" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)} className="border-gray-700 text-gray-400">Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={!catName.trim()} style={{ background: 'linear-gradient(135deg, #f97316, #6E59A5)' }} className="text-white border-0">Save</Button>
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
